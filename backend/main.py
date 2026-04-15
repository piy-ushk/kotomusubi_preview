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
    levels = [{"id": p["id"], "title": notion.extract_page_title(p)} for p in pages]
    
    level_order = ["Super Beginner", "超初級", "Beginner", "初級", "Upper Intermediate", "中上級"]
    def get_sort_key(l):
        title = l["title"].lower()
        for i, order in enumerate(level_order):
            if order.lower() in title: return i
        return 999
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
    blocks = await notion.fetch_page_blocks(lesson_id)
    
    # Chunking blocks into slides based on headings or callouts (anchors)
    slides = []
    current_slide = {"title": "Introduction", "content": []}
    
    for block in blocks:
        text = extract_text(block).strip()
        b_type = block["type"]
        
        is_anchor = False
        if b_type in ["heading_1", "heading_2", "heading_3", "callout"]:
            if text and (len(text) < 50): # Heuristic for slide anchors
                is_anchor = True
        
        if is_anchor:
            if current_slide["content"]:
                slides.append(current_slide)
            current_slide = {"title": text, "content": [block]}
        else:
            current_slide["content"].append(block)
            
    if current_slide["content"]:
        slides.append(current_slide)
        
    return {
        "id": lesson_id,
        "slides": slides
    }
