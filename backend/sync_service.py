import asyncio
import os
import json
import re
import urllib.parse
from typing import Dict, Any, List
import httpx

from notion_service import NotionService
import db

STATIC_IMG_DIR = os.path.join(os.path.dirname(__file__), "static", "images")
os.makedirs(STATIC_IMG_DIR, exist_ok=True)

class SyncService:
    def __init__(self, api_key: str, db_id: str):
        self.notion = NotionService(api_key=api_key)
        self.root_db_id = db_id
        
    async def download_image(self, url: str, prefix: str) -> str:
        """Downloads an image from URL to local static folder and returns the local path."""
        if not url or url.startswith("/static/"):
            return url
            
        try:
            # Generate a clean filename based on the URL or prefix
            parsed_url = urllib.parse.urlparse(url)
            # Some Notion URLs have very long query params, we only want a hash or the basename
            base_name = os.path.basename(parsed_url.path)
            if not base_name:
                base_name = "image.png"
                
            # Make sure it has an extension
            if '.' not in base_name:
                base_name += ".png"
                
            safe_name = f"{prefix}_{hash(url)}_{base_name}"
            safe_name = re.sub(r'[^a-zA-Z0-9_\-\.]', '_', safe_name)
            local_path = os.path.join(STATIC_IMG_DIR, safe_name)
            
            # Skip if already downloaded (basic caching)
            if not os.path.exists(local_path):
                async with httpx.AsyncClient() as client:
                    resp = await client.get(url)
                    resp.raise_for_status()
                    with open(local_path, "wb") as f:
                        f.write(resp.content)
                        
            return f"/static/images/{safe_name}"
        except Exception as e:
            print(f"Failed to download image {url}: {e}")
            return url # Fallback to original url if download fails

    async def _process_image_blocks(self, blocks: List[Dict], prefix: str):
        """Recursively process blocks and download images."""
        for block in blocks:
            if block["type"] == "image":
                img_data = block.get("image", {})
                img_type = img_data.get("type")
                if img_type in ["file", "external"]:
                    original_url = img_data[img_type]["url"]
                    local_url = await self.download_image(original_url, f"block_{block['id']}")
                    block["image"][img_type]["url"] = local_url
            
            if "children" in block:
                await self._process_image_blocks(block["children"], prefix)

    async def sync_all(self):
        """Main entry point to perform a full sync."""
        conn = db.get_connection()
        c = conn.cursor()
        
        # Clear existing non-user data safely
        c.execute("DELETE FROM textbooks")
        c.execute("DELETE FROM levels")
        c.execute("DELETE FROM lessons")
        c.execute("DELETE FROM lesson_blocks")
        c.execute("DELETE FROM vocabulary")
        
        try:
            # 1. Fetch Textbooks
            print(f"Fetching textbooks from root DB: {self.root_db_id}")
            textbook_pages = await self.notion.fetch_database_pages(self.root_db_id)
            
            textbook_order = ["Grammar Textbook", "Japanese Travel Column", "Topic Talk"]
            
            for tb_page in textbook_pages:
                tb_id = tb_page["id"]
                title = self.notion.extract_page_title(tb_page)
                
                sort_val = 999
                for i, order in enumerate(textbook_order):
                    if order.lower() in title.lower(): sort_val = i
                    
                c.execute("INSERT INTO textbooks (id, title, sort_order) VALUES (?, ?, ?)", 
                          (tb_id, title, sort_val))
                
                await self._sync_levels(tb_id, title, c)
                
            c.execute("INSERT INTO sync_metadata (status, details) VALUES ('SUCCESS', 'Full sync completed')")
            conn.commit()
            print("Sync complete!")
        except Exception as e:
            c.execute("INSERT INTO sync_metadata (status, details) VALUES ('ERROR', ?)", (str(e),))
            conn.commit()
            print(f"Sync failed: {e}")
            raise e
        finally:
            conn.close()

    async def _sync_levels(self, textbook_id: str, textbook_title: str, c):
        print(f"  Fetching levels for {textbook_title}")
        db_ids = await self.notion.fetch_child_database_ids(textbook_id)
        if not db_ids: return
        
        level_pages = await self.notion.fetch_database_pages(db_ids[0])
        level_order = ["Super Beginner", "超初級", "Beginner", "初級", "Upper Intermediate", "中上級"]
        
        for idx, p in enumerate(reversed(level_pages)): # Reverse chronological fix
            lvl_id = p["id"]
            title = self.notion.extract_page_title(p)
            
            cover_url = ""
            if p.get("cover"):
                ctype = p["cover"]["type"]
                cover_url = p["cover"][ctype]["url"]
            elif "properties" in p:
                for prop in p["properties"].values():
                    if prop.get("type") == "files" and prop.get("files"):
                        finfo = prop["files"][0]
                        if finfo.get("type") in ["file", "external"]:
                            ftype = finfo["type"]
                            cover_url = finfo[ftype]["url"]
                            break
                            
            if cover_url:
                cover_url = await self.download_image(cover_url, f"cover_{lvl_id}")
                
            sort_val = 999
            for i, order in enumerate(level_order):
                if order.lower() in title.lower(): sort_val = i
                
            c.execute("INSERT INTO levels (id, textbook_id, title, cover_url, sort_order) VALUES (?, ?, ?, ?, ?)",
                      (lvl_id, textbook_id, title, cover_url, sort_val))
                      
            await self._sync_lessons(lvl_id, title, c)

    async def _sync_lessons(self, level_id: str, level_title: str, c):
        print(f"    Fetching lessons for level {level_title}")
        
        if "テーマ：" in level_title or "Topic:" in level_title:
            # Topic talk theme is the lesson itself
            c.execute("INSERT INTO lessons (id, level_id, chapter_id, title, is_chapter, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
                      (level_id, level_id, None, level_title, False, 0))
            await self._sync_lesson_content(level_id, c)
            return

        db_ids = await self.notion.fetch_child_database_ids(level_id)
        if not db_ids: return

        is_upper_intermediate = "Upper" in level_title or "中上級" in level_title
        
        def extract_number(t):
            nums = re.findall(r'\d+', t)
            return int(nums[0]) if nums else 9999

        for db_id in db_ids:
            pages = await self.notion.fetch_database_pages(db_id)
            for p in pages:
                p_id = p["id"]
                title = self.notion.extract_page_title(p)
                sort_val = extract_number(title)
                
                if is_upper_intermediate:
                    child_dbs = await self.notion.fetch_child_database_ids(p_id)
                    if child_dbs:
                        c.execute("INSERT INTO lessons (id, level_id, chapter_id, title, is_chapter, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
                                  (p_id, level_id, None, title, True, sort_val))
                                  
                        for child_db_id in child_dbs:
                            sub_pages = await self.notion.fetch_database_pages(child_db_id)
                            for sp in sub_pages:
                                sp_id = sp["id"]
                                sp_title = self.notion.extract_page_title(sp)
                                sp_sort = extract_number(sp_title)
                                
                                c.execute("INSERT INTO lessons (id, level_id, chapter_id, title, is_chapter, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
                                          (sp_id, level_id, p_id, sp_title, False, sp_sort))
                                await self._sync_lesson_content(sp_id, c)
                    else:
                        c.execute("INSERT INTO lessons (id, level_id, chapter_id, title, is_chapter, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
                                  (p_id, level_id, None, title, False, sort_val))
                        await self._sync_lesson_content(p_id, c)
                else:
                    c.execute("INSERT INTO lessons (id, level_id, chapter_id, title, is_chapter, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
                              (p_id, level_id, None, title, False, sort_val))
                    await self._sync_lesson_content(p_id, c)

    # --- Copying parsing logic directly from old main.py ---
    def _extract_text(self, block):
        b_type = block["type"]
        data = block.get(b_type, {})
        if not data: return ""
        if "rich_text" in data:
            return "".join([rt["plain_text"] for rt in data["rich_text"]])
        return ""

    def _should_expand(self, db_title, page_title, props):
        title = (db_title or "").lower()
        page = page_title or ""
        if any(k in title for k in ["vocabulary", "vocab", "new word", "word", "単語", "新出"]): return False
        if any(k in title for k in ["new database", "chapter", "lesson", "test", "チェック", "レベル"]): return True
        if re.search(r'【\s*\d+[-ー]\d+\s*】', page): return True
        if re.search(r'(chapter|lesson|test)', page, re.IGNORECASE): return True
        marker = " ".join(str(v) for v in props.values()).upper()
        return "NEW WORD" not in marker and len(props) <= 3

    def _map_vocab(self, props):
        vocab = {"jp": "", "reading": "", "en": "", "kanji": "", "pos": "", "example": ""}
        for pn, pd in props.items():
            if pd.get("type") == "title":
                vocab["jp"] = "".join([rt.get("plain_text", "") for rt in pd.get("title", [])])
                break
        for pn in ["Reading", "Hiragana", "Pronunciation", "よみかた", "読み方", "ひらがな"]:
            if pn in props:
                ptype = props[pn].get("type")
                if ptype == "rich_text": vocab["reading"] = "".join([rt.get("plain_text", "") for rt in props[pn].get("rich_text", [])])
                elif ptype == "title": vocab["reading"] = "".join([rt.get("plain_text", "") for rt in props[pn].get("title", [])])
                if vocab["reading"]: break
        for pn in ["English", "Meaning", "Translation", "いみ", "意味"]:
            if pn in props:
                if props[pn].get("type") == "rich_text": vocab["en"] = "".join([rt.get("plain_text", "") for rt in props[pn].get("rich_text", [])])
                if vocab["en"]: break
        for pn in ["Kanji", "かんじ", "漢字"]:
            if pn in props:
                if props[pn].get("type") == "rich_text": vocab["kanji"] = "".join([rt.get("plain_text", "") for rt in props[pn].get("rich_text", [])])
                if vocab["kanji"]: break
        for pn in ["POS", "Type", "ひんし", "品詞"]:
            if pn in props:
                ptype = props[pn].get("type")
                if ptype == "rich_text": vocab["pos"] = "".join([rt.get("plain_text", "") for rt in props[pn].get("rich_text", [])])
                elif ptype == "select": vocab["pos"] = props[pn].get("select", {}).get("name", "")
                if vocab["pos"]: break
        for pn in ["Example", "Reibun", "れいぶん", "例文"]:
            if pn in props:
                if props[pn].get("type") == "rich_text": vocab["example"] = "".join([rt.get("plain_text", "") for rt in props[pn].get("rich_text", [])])
                if vocab["example"]: break
        return vocab

    async def _fetch_inline_databases(self, blocks_list):
        for b in blocks_list:
            if b["type"] == "child_database":
                try:
                    db_title = b.get("child_database", {}).get("title", "")
                    db_pages = await self.notion.fetch_database_pages(b["id"])
                    
                    items = []
                    for p in db_pages:
                        props = p.get("properties", {})
                        item_vocab = self._map_vocab(props)
                        
                        extra = {}
                        for pn, pd in props.items():
                            ptype = pd.get("type")
                            content = ""
                            if ptype == "title": content = "".join([rt.get("plain_text", "") for rt in pd.get("title", [])])
                            elif ptype == "rich_text": content = "".join([rt.get("plain_text", "") for rt in pd.get("rich_text", [])])
                            elif ptype == "select": content = pd.get("select", {}).get("name", "") if pd.get("select") else ""
                            elif ptype == "multi_select": content = ",".join([ms.get("name", "") for ms in pd.get("multi_select", [])])
                            if content: extra[pn] = content
                            
                        p_title = self.notion.extract_page_title(p)
                        page_blocks = []
                        if self._should_expand(db_title, p_title, extra):
                            page_blocks = await self.notion.fetch_blocks_with_children(p["id"])
                            await self._fetch_inline_databases(page_blocks)
                            
                        items.append({
                            "id": p["id"],
                            "title": p_title,
                            "vocab": item_vocab,
                            "raw_props": extra,
                            "page_blocks": page_blocks
                        })
                    b["database_items"] = items
                except Exception as e:
                    print(f"Error inline DB {b['id']}: {e}")
            if "children" in b:
                await self._fetch_inline_databases(b["children"])

    def _find_all_databases(self, blocks_list):
        dbs = []
        for b in blocks_list:
            if b["type"] == "child_database": dbs.append(b)
            if "children" in b: dbs.extend(self._find_all_databases(b["children"]))
        return dbs
        
    def _flatten_blocks(self, raw_blocks):
        res = []
        for b in raw_blocks:
            if b["type"] == "child_page":
                res.extend(self._flatten_blocks(b.get("children", [])))
            else:
                res.append(b)
        return res

    async def _sync_lesson_content(self, lesson_id: str, c):
        print(f"      Fetching content for lesson {lesson_id}")
        blocks = await self.notion.fetch_blocks_with_children(lesson_id)
        
        await self._fetch_inline_databases(blocks)
        await self._process_image_blocks(blocks, f"lesson_{lesson_id}")
        
        all_dbs = self._find_all_databases(blocks)
        
        # Insert Vocab
        for db_block in all_dbs:
            title = db_block.get("child_database", {}).get("title", "").lower()
            items = db_block.get("database_items", [])
            for item in items:
                v = item["vocab"]
                if v["jp"]:
                    c.execute('''
                        INSERT OR REPLACE INTO vocabulary (id, lesson_id, jp, reading, en, kanji, pos, example)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (item["id"], lesson_id, v["jp"], v["reading"], v["en"], v["kanji"], v["pos"], v["example"]))

        # Chunk blocks into learning and test sections
        blocks = self._flatten_blocks(blocks)
        
        learning_slides = []
        test_sections = []
        
        current_section = {"title": "Introduction", "content": []}
        current_role = "learning"
        in_vocab_section = False
        
        for block in blocks:
            b_type = block["type"]
            text = self._extract_text(block).strip()
            text_lower = text.lower()
            
            if b_type in ["paragraph", "heading_1", "heading_2", "heading_3", "bulleted_list_item", "numbered_list_item", "quote"]:
                if not text and not block.get("has_children"): continue
                
            is_anchor = b_type in ["heading_1", "heading_2", "heading_3", "divider"]
            
            if is_anchor:
                meaningful = any(b["type"] != "divider" and (b["type"] in ["image", "child_database"] or self._extract_text(b).strip() or b.get("has_children")) for b in current_section["content"])
                if meaningful:
                    if current_role == "learning": learning_slides.append(current_section)
                    else: test_sections.append(current_section)
                    
                if text:
                    if any(k in text_lower for k in ["question", "discussion", "test", "quiz", "revise", "exercise", "practice", "質問", "ディスカッション", "テスト"]):
                        current_role = "test"
                        in_vocab_section = False
                    elif any(k in text_lower for k in ["vocabulary", "new word", "単語", "新出単語", "新出"]):
                        current_role = "learning"
                        in_vocab_section = True
                    elif any(k in text_lower for k in ["article", "grammar", "reading", "learning", "topic", "talk", "記事", "文法", "introduction", "はじめに"]):
                        current_role = "learning"
                        in_vocab_section = False
                        
                current_section = {"title": text if b_type != "divider" else "", "content": [block] if b_type != "divider" else []}
            else:
                current_section["content"].append(block)
                
            # Inline vocab parsing
            if in_vocab_section and text and b_type not in ["heading_1", "heading_2", "heading_3", "divider"]:
                parts = re.split(r'[|｜]', text)
                if len(parts) >= 2:
                    jp_raw = parts[0].strip()
                    reading = ""
                    jp = jp_raw
                    match = re.match(r'(.+)[(（](.+)[)）]', jp_raw)
                    if match:
                        jp, reading = match.group(1).strip(), match.group(2).strip()
                    en = parts[2].strip() if len(parts) >= 3 else parts[1].strip()
                    
                    c.execute('''
                        INSERT OR REPLACE INTO vocabulary (id, lesson_id, jp, reading, en, kanji)
                        VALUES (?, ?, ?, ?, ?, ?)
                    ''', (block["id"], lesson_id, jp, reading, en, ""))
                    
        meaningful = any(b["type"] != "divider" and (b["type"] in ["image", "child_database"] or self._extract_text(b).strip() or b.get("has_children")) for b in current_section["content"])
        if meaningful:
            if current_role == "learning": learning_slides.append(current_section)
            else: test_sections.append(current_section)
            
        # Store the chunked structures into lesson_blocks
        for i, slide in enumerate(learning_slides):
            c.execute("INSERT INTO lesson_blocks (id, lesson_id, role, content_json, sort_order) VALUES (?, ?, ?, ?, ?)",
                      (f"{lesson_id}_learn_{i}", lesson_id, "learning", json.dumps(slide), i))
                      
        for i, slide in enumerate(test_sections):
            c.execute("INSERT INTO lesson_blocks (id, lesson_id, role, content_json, sort_order) VALUES (?, ?, ?, ?, ?)",
                      (f"{lesson_id}_test_{i}", lesson_id, "test", json.dumps(slide), i))

if __name__ == "__main__":
    import asyncio
    import sys
    from dotenv import load_dotenv
    sys.stdout.reconfigure(encoding='utf-8')
    load_dotenv()
    api_key = os.getenv("NOTION_API_KEY")
    db_id = os.getenv("NOTION_DATABASE_ID")
    
    if not api_key or not db_id:
        print("Missing credentials in .env")
        exit(1)
        
    db.init_db() # Ensure schema exists
    service = SyncService(api_key, db_id)
    asyncio.run(service.sync_all())
