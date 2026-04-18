from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import re
from dotenv import load_dotenv
from notion_service import NotionService

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
    all_lessons = []
    for db_id in db_ids:
        pages = await notion.fetch_database_pages(db_id)
        all_lessons.extend([{"id": p["id"], "title": notion.extract_page_title(p)} for p in pages])
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

@app.get("/api/lessons/{lesson_id}")
async def get_lesson_content(lesson_id: str):
    blocks = await notion.fetch_blocks_with_children(lesson_id)
    
    # Chunking blocks into sections based on headings or callouts (anchors)
    learning_slides = []
    test_sections = []
    
    current_section = {"title": "Introduction", "content": []}
    current_role = "learning"
    
    for block in blocks:
        text = extract_text(block).strip()
        text_lower = text.lower()
        b_type = block["type"]
        
        is_anchor = False
        if b_type in ["heading_1", "heading_2", "heading_3", "callout"]:
            if text and (len(text) < 100): # Heuristic for section anchors
                is_anchor = True
        
        if is_anchor:
            # Save the previous section
            if current_section["content"]:
                if current_role == "learning":
                    learning_slides.append(current_section)
                else:
                    test_sections.append(current_section)
            
            # Determine new role
            if any(keyword in text_lower for keyword in ["question", "discussion", "test", "quiz", "revise", "exercise", "practice", "質問", "ディスカッション", "テスト"]):
                current_role = "test"
            elif any(keyword in text_lower for keyword in ["vocabulary", "article", "grammar", "reading", "learning", "topic", "talk", "単語", "記事", "文法"]):
                current_role = "learning"
                
            current_section = {"title": text, "content": [block]}
        else:
            current_section["content"].append(block)
            
    if current_section["content"]:
        if current_role == "learning":
            learning_slides.append(current_section)
        else:
            test_sections.append(current_section)
        
    return {
        "id": lesson_id,
        "learning_slides": learning_slides,
        "test_sections": test_sections
    }
