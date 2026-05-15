from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import re
from dotenv import load_dotenv
from pydantic import BaseModel
from notion_service import NotionService
import db

load_dotenv()
db.init_db()

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

notion = NotionService(api_key=os.getenv("NOTION_API_KEY", ""))

@app.get("/")
async def root():
    return {"message": "Japanese Textbook API is running"}

@app.get("/api/textbooks")
async def get_textbooks():
    db_id = os.getenv("NOTION_DATABASE_ID")
    if not db_id:
        raise HTTPException(status_code=500, detail="NOTION_DATABASE_ID not configured")
    
    pages = await notion.fetch_database_pages(db_id)
    textbooks = []
    for page in pages:
        textbooks.append({
            "id": page["id"],
            "title": notion.extract_page_title(page)
        })
    
    # Sort matching original logic
    textbook_order = ["Grammar Textbook", "Japanese Travel Column", "Topic Talk"]
    def get_sort_key(t):
        title = t["title"].lower()
        for i, order in enumerate(textbook_order):
            if order.lower() in title: return i
        return 999
    textbooks.sort(key=get_sort_key)
    return textbooks

@app.get("/api/textbooks/{textbook_id}/levels")
async def get_levels(textbook_id: str):
    db_ids = await notion.fetch_child_database_ids(textbook_id)
    if not db_ids: return []
    pages = await notion.fetch_database_pages(db_ids[0])
    
    levels = []
    for p in pages:
        cover_url = ""
        if p.get("cover"):
            cover_type = p["cover"]["type"]
            cover_url = p["cover"][cover_type]["url"]
            
        # Optional: check if there's a custom image property if cover is none
        if not cover_url and "properties" in p:
            for prop in p["properties"].values():
                if prop.get("type") == "files" and prop.get("files") and len(prop["files"]) > 0:
                    file_info = prop["files"][0]
                    if file_info.get("type") in ["file", "external"]:
                        f_type = file_info["type"]
                        cover_url = file_info[f_type]["url"]
                        break
        
        levels.append({
            "id": p["id"],
            "title": notion.extract_page_title(p),
            "cover": cover_url
        })
    
    level_order = ["Super Beginner", "超初級", "Beginner", "初級", "Upper Intermediate", "中上級"]
    def get_sort_key(l):
        title = l["title"].lower()
        for i, order in enumerate(level_order):
            if order.lower() in title: return i
        return 999
        
    levels.reverse()  # Reverse to fix Notion's default reverse-chronological created_time ordering
    levels.sort(key=get_sort_key)
    return levels

@app.get("/api/levels/{level_id}/lessons")
async def get_lessons(level_id: str):
    db_ids = await notion.fetch_child_database_ids(level_id)
    if not db_ids: return []
    
    level_page = await notion.fetch_page(level_id)
    level_title = notion.extract_page_title(level_page)
    is_upper_intermediate = "Upper" in level_title or "中上級" in level_title

    all_lessons = []
    for db_id in db_ids:
        pages = await notion.fetch_database_pages(db_id)
        for p in pages:
            if is_upper_intermediate:
                # Check if this page has child databases (meaning it's a chapter)
                child_dbs_in_page = await notion.fetch_child_database_ids(p["id"])
                if child_dbs_in_page:
                    for child_db_id in child_dbs_in_page:
                        sub_pages = await notion.fetch_database_pages(child_db_id)
                        all_lessons.extend([{"id": sp["id"], "title": notion.extract_page_title(sp)} for sp in sub_pages])
                else:
                    all_lessons.append({"id": p["id"], "title": notion.extract_page_title(p)})
            else:
                all_lessons.append({"id": p["id"], "title": notion.extract_page_title(p)})
    
    # Sort by numbers only — ignores text prefix so "Capter12" and "Chapter 12" both sort as [12].
    # Falls back to full title string if no number found.
    import re as _re
    def natural_sort_key(x):
        title = x["title"]
        nums = _re.findall(r'\d+', title)
        if nums:
            return [int(n) for n in nums]
        return [9999, title.lower()]
    
    all_lessons.sort(key=natural_sort_key)
        
    return all_lessons

def extract_text(block):
    b_type = block["type"]
    data = block.get(b_type, {})
    if not data: return ""
    if "rich_text" in data:
        return "".join([rt["plain_text"] for rt in data["rich_text"]])
    return ""

def has_emoji(text):
    return any(32 <= ord(c) <= 126 for c in text) is False or re.search(r'[^\w\s,.!?]', text) # Simplified emoji check

class AnnotationRequest(BaseModel):
    block_id: str
    action: str
    content: str = ""

@app.post("/api/lessons/{lesson_id}/annotations")
async def add_lesson_annotation(lesson_id: str, req: AnnotationRequest):
    user_id = "default_user" # Simplified for MVP
    ann_id = db.add_annotation(user_id, lesson_id, req.block_id, req.action, req.content)
    return {"success": True, "annotation_id": ann_id}

@app.delete("/api/annotations/{annotation_id}")
async def remove_annotation(annotation_id: int):
    db.delete_annotation(annotation_id)
    return {"success": True}

@app.get("/api/lessons/{lesson_id}")
async def get_lesson_content(lesson_id: str):
    blocks = await notion.fetch_blocks_with_children(lesson_id)
    
    # Gather child DB IDs from the lesson itself AND from any child_page blocks
    top_blocks = await notion.fetch_page_blocks(lesson_id)
    
    def is_vocab_db(block):
        if block["type"] != "child_database": return False
        title = block.get("child_database", {}).get("title", "").lower()
        return any(k in title for k in ["new word", "vocabulary", "vocab", "単語", "word"])

    def is_vocab_item(page_props):
        """
        Checks if a database item is marked as a 'NEW WORD'.
        The marker can be in the Title or any other property.
        """
        marker = "NEW WORD"
        for pn, pd in page_props.items():
            content = ""
            ptype = pd.get("type")
            if ptype == "title":
                content = "".join([rt.get("plain_text", "") for rt in pd.get("title", [])])
            elif ptype == "rich_text":
                content = "".join([rt.get("plain_text", "") for rt in pd.get("rich_text", [])])
            elif ptype == "select":
                content = pd.get("select", {}).get("name", "") if pd.get("select") else ""
            elif ptype == "multi_select":
                content = ",".join([ms.get("name", "") for ms in pd.get("multi_select", [])])
            
            if marker in content.upper():
                return True
        return False

    def map_vocab_properties(props):
        """
        Maps Notion properties to a standard vocabulary object.
        Supports both English and Japanese property names.
        """
        vocab = {
            "jp": "",
            "reading": "",
            "en": "",
            "kanji": "",
            "pos": "",
            "example": ""
        }

        # 1. Map Japanese / Title
        for pn in ["Name", "Word", "名前", "単語"]:
            if pn in props and props[pn].get("type") == "title":
                vocab["jp"] = "".join([rt.get("plain_text", "") for rt in props[pn].get("title", [])])
                break

        # 2. Map Reading
        for pn in ["Reading", "Hiragana", "Pronunciation", "よみかた", "読み方", "ひらがな"]:
            if pn in props:
                ptype = props[pn].get("type")
                if ptype == "rich_text":
                    vocab["reading"] = "".join([rt.get("plain_text", "") for rt in props[pn].get("rich_text", [])])
                elif ptype == "title":
                    vocab["reading"] = "".join([rt.get("plain_text", "") for rt in props[pn].get("title", [])])
                if vocab["reading"]: break

        # 3. Map English / Meaning
        for pn in ["English", "Meaning", "Translation", "いみ", "意味"]:
            if pn in props:
                ptype = props[pn].get("type")
                if ptype == "rich_text":
                    vocab["en"] = "".join([rt.get("plain_text", "") for rt in props[pn].get("rich_text", [])])
                if vocab["en"]: break

        # 4. Map Kanji
        for pn in ["Kanji", "かんじ", "漢字"]:
            if pn in props:
                ptype = props[pn].get("type")
                if ptype == "rich_text":
                    vocab["kanji"] = "".join([rt.get("plain_text", "") for rt in props[pn].get("rich_text", [])])
                if vocab["kanji"]: break

        # 5. Map Part of Speech
        for pn in ["POS", "Type", "ひんし", "品詞"]:
            if pn in props:
                ptype = props[pn].get("type")
                if ptype == "rich_text":
                    vocab["pos"] = "".join([rt.get("plain_text", "") for rt in props[pn].get("rich_text", [])])
                elif ptype == "select":
                    vocab["pos"] = props[pn].get("select", {}).get("name", "")
                if vocab["pos"]: break

        # 6. Map Example
        for pn in ["Example", "Reibun", "れいぶん", "例文"]:
            if pn in props:
                ptype = props[pn].get("type")
                if ptype == "rich_text":
                    vocab["example"] = "".join([rt.get("plain_text", "") for rt in props[pn].get("rich_text", [])])
                if vocab["example"]: break

        return vocab

    child_db_ids = [b["id"] for b in top_blocks if is_vocab_db(b)]
    
    # Also look inside child_page blocks for embedded databases
    for b in top_blocks:
        if b["type"] == "child_page":
            try:
                sub_blocks = await notion.fetch_page_blocks(b["id"])
                child_db_ids.extend([sb["id"] for sb in sub_blocks if is_vocab_db(sb)])
            except Exception:
                continue

    # Fallback: if NO specific vocabulary databases are found, we might be in a legacy structure
    if not child_db_ids:
        child_db_ids = [b["id"] for b in top_blocks if b["type"] == "child_database"]
        for b in top_blocks:
            if b["type"] == "child_page":
                try:
                    sub_blocks = await notion.fetch_page_blocks(b["id"])
                    child_db_ids.extend([sb["id"] for sb in sub_blocks if sb["type"] == "child_database"])
                except Exception:
                    continue
    
    vocabulary = []
    # Process child databases
    for db_id in child_db_ids:
        try:
            db_pages = await notion.fetch_database_pages(db_id)
            for p in db_pages:
                props = p.get("properties", {})
                
                # Check if it's a vocabulary item (marked or in a vocab DB)
                # If we're in a fallback mode (no vocab-named DBs), we only take items with markers
                # or those that clearly look like vocabulary items (have yomikata/imi)
                item_vocab = map_vocab_properties(props)
                
                if is_vocab_item(props) or (item_vocab["jp"] and (item_vocab["reading"] or item_vocab["en"])):
                    if item_vocab["jp"]:
                        vocabulary.append({
                            "id": p["id"],
                            "word": item_vocab["jp"],
                            "reading": item_vocab["reading"],
                            "meaning": item_vocab["en"],
                            "kanji": item_vocab["kanji"],
                            "pos": item_vocab["pos"],
                            "example": item_vocab["example"],
                            "status": "not yet"
                        })
        except Exception as e:
            print(f"Error fetching vocab database {db_id}: {e}")
            continue
    
    # Chunking blocks into sections based on headings or callouts (anchors)
    learning_slides = []
    test_sections = []
    
    current_section = {"title": "Introduction", "content": []}
    current_role = "learning"
    in_vocab_section = False
    
    # Flatten child_page blocks inline so their content appears in the lesson slides
    def flatten_blocks(raw_blocks):
        result = []
        for b in raw_blocks:
            if b["type"] == "child_page":
                # Inline the sub-page's children instead of the child_page block itself
                children = b.get("children", [])
                result.extend(flatten_blocks(children))
            else:
                result.append(b)
        return result
    
    blocks = flatten_blocks(blocks)
    
    for block in blocks:
        b_type = block["type"]
        text = extract_text(block).strip()
        text_lower = text.lower()
        
        # Skip empty text blocks that have no children, preventing empty spaces
        if b_type in ["paragraph", "heading_1", "heading_2", "heading_3", "bulleted_list_item", "numbered_list_item", "quote"]:
            if not text and not block.get("has_children"):
                continue

        is_anchor = False
        # Use divider or major headings to split slides cleanly
        if b_type in ["heading_1", "heading_2", "heading_3", "divider"]:
            is_anchor = True
        
        if is_anchor:
            # Save the previous section if it has meaningful content
            # Images, callouts, paragraphs etc are all meaningful
            meaningful = any(
                b["type"] not in ["divider"] and (
                    b["type"] == "image" or 
                    extract_text(b).strip() or 
                    b.get("has_children")
                )
                for b in current_section["content"]
            )
            if meaningful:
                if current_role == "learning":
                    learning_slides.append(current_section)
                else:
                    test_sections.append(current_section)
            
            # Determine new role from text if present
            if text:
                if any(keyword in text_lower for keyword in ["question", "discussion", "test", "quiz", "revise", "exercise", "practice", "質問", "ディスカッション", "テスト"]):
                    current_role = "test"
                    in_vocab_section = False
                elif any(keyword in text_lower for keyword in ["vocabulary", "new word", "単語", "新出単語", "新出"]):
                    current_role = "learning"
                    in_vocab_section = True
                elif any(keyword in text_lower for keyword in ["article", "grammar", "reading", "learning", "topic", "talk", "記事", "文法", "introduction", "はじめに"]):
                    current_role = "learning"
                    in_vocab_section = False
            
            # Start new section (do not include divider block in content)
            current_section = {
                "title": text if b_type != "divider" else "",
                "content": [block] if b_type != "divider" else []
            }
        else:
            current_section["content"].append(block)
            
        # If we are in a vocabulary section, try to extract words inline (fallback if no child DB)
        if in_vocab_section and not vocabulary and text and b_type not in ["heading_1", "heading_2", "heading_3", "divider"]:
            # Pattern: "JP | Reading | EN" or "JP | EN"
            parts = re.split(r'[|｜]', text)
            if len(parts) >= 2:
                jp_raw = parts[0].strip()
                # Try to separate Kanji and Reading if in "Kanji(Reading)" format
                reading = ""
                jp = jp_raw
                match = re.match(r'(.+)[(（](.+)[)）]', jp_raw)
                if match:
                    jp = match.group(1).strip()
                    reading = match.group(2).strip()
                
                if len(parts) >= 3:
                    if not reading: reading = parts[1].strip()
                    en = parts[2].strip()
                else:
                    en = parts[1].strip()
                
                vocabulary.append({
                    "id": block["id"],
                    "jp": jp,
                    "reading": reading,
                    "en": en,
                    "lesson_id": lesson_id
                })
            
    # Save the last section if meaningful
    meaningful = any(
        b["type"] not in ["divider"] and (
            b["type"] == "image" or 
            extract_text(b).strip() or 
            b.get("has_children")
        )
        for b in current_section["content"]
    )
    if meaningful:
        if current_role == "learning":
            learning_slides.append(current_section)
        else:
            test_sections.append(current_section)
        
    user_id = "default_user"
    annotations = db.get_annotations(user_id, lesson_id)
        
    return {
        "id": lesson_id,
        "learning_slides": learning_slides,
        "test_sections": test_sections,
        "vocabulary": vocabulary,
        "annotations": annotations
    }
