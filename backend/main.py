from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import asyncio
import os
import json
from dotenv import load_dotenv
from pydantic import BaseModel
from supabase import create_client, Client
import db
import sync_service

load_dotenv()
db.init_db()

app = FastAPI()

# Mount static files for images
os.makedirs(os.path.join(os.path.dirname(__file__), "static", "images"), exist_ok=True)
app.mount("/static", StaticFiles(directory=os.path.join(os.path.dirname(__file__), "static")), name="static")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

if SUPABASE_URL and SUPABASE_ANON_KEY:
    supabase_client: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
else:
    supabase_client = None

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not supabase_client:
        return "default_user"
    token = credentials.credentials
    try:
        response = supabase_client.auth.get_user(token)
        if response and response.user:
            return response.user.id
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Japanese Textbook API (SQLite Sync Edition) is running"}

@app.post("/api/sync")
async def trigger_sync(background_tasks: BackgroundTasks):
    api_key = os.getenv("NOTION_API_KEY")
    db_id = os.getenv("NOTION_DATABASE_ID")
    if not api_key or not db_id:
        raise HTTPException(status_code=500, detail="Missing Notion credentials in .env")
        
    service = sync_service.SyncService(api_key, db_id)
    # Run sync in background so it doesn't block the request timeout
    background_tasks.add_task(service.sync_all)
    return {"success": True, "message": "Sync started in background."}

@app.get("/api/textbooks")
async def get_textbooks():
    conn = db.get_connection()
    c = conn.cursor()
    c.execute("SELECT id, title FROM textbooks ORDER BY sort_order ASC")
    res = [{"id": r["id"], "title": r["title"]} for r in c.fetchall()]
    conn.close()
    return res

@app.get("/api/textbooks/{textbook_id}/levels")
async def get_levels(textbook_id: str):
    conn = db.get_connection()
    c = conn.cursor()
    c.execute("SELECT id, title, cover_url FROM levels WHERE textbook_id = ? ORDER BY sort_order ASC", (textbook_id,))
    res = [{"id": r["id"], "title": r["title"], "cover": r["cover_url"]} for r in c.fetchall()]
    conn.close()
    return res

@app.get("/api/levels/{level_id}/lessons")
async def get_lessons(level_id: str):
    conn = db.get_connection()
    c = conn.cursor()
    c.execute("SELECT id, chapter_id, title, is_chapter, sort_order FROM lessons WHERE level_id = ? ORDER BY is_chapter DESC, sort_order ASC", (level_id,))
    rows = c.fetchall()
    conn.close()
    
    # Rebuild hierarchical structure for chapters
    chapters = {}
    standalone_lessons = []
    
    for r in rows:
        if r["is_chapter"]:
            chapters[r["id"]] = {"id": r["id"], "title": r["title"], "is_chapter": True, "lessons": [], "sort_order": r["sort_order"]}
        elif r["chapter_id"]:
            if r["chapter_id"] in chapters:
                chapters[r["chapter_id"]]["lessons"].append({"id": r["id"], "title": r["title"], "sort_order": r["sort_order"]})
        else:
            standalone_lessons.append({"id": r["id"], "title": r["title"], "sort_order": r["sort_order"]})
            
    # Sort children within chapters
    for ch in chapters.values():
        ch["lessons"].sort(key=lambda x: x["sort_order"])
        
    all_lessons = list(chapters.values()) + standalone_lessons
    all_lessons.sort(key=lambda x: x["sort_order"])
    
    # Clean out sort_order for response
    for item in all_lessons:
        item.pop("sort_order", None)
        if "lessons" in item:
            for l in item["lessons"]:
                l.pop("sort_order", None)
                
    return all_lessons

class AnnotationRequest(BaseModel):
    block_id: str
    action: str
    content: str = ""

@app.post("/api/lessons/{lesson_id}/annotations")
async def add_lesson_annotation(lesson_id: str, req: AnnotationRequest, user_id: str = Depends(get_current_user)):
    ann_id = db.add_annotation(user_id, lesson_id, req.block_id, req.action, req.content)
    return {"success": True, "annotation_id": ann_id}

@app.delete("/api/annotations/{annotation_id}")
async def remove_annotation(annotation_id: int, user_id: str = Depends(get_current_user)):
    db.delete_annotation(annotation_id, user_id)
    return {"success": True}

@app.get("/api/lessons/{lesson_id}")
async def get_lesson_content(lesson_id: str, user_id: str = Depends(get_current_user)):
    conn = db.get_connection()
    c = conn.cursor()
    
    # Title
    c.execute("SELECT title FROM lessons WHERE id = ?", (lesson_id,))
    row = c.fetchone()
    title = row["title"] if row else ""
    
    # Blocks
    c.execute("SELECT role, content_json FROM lesson_blocks WHERE lesson_id = ? ORDER BY sort_order ASC", (lesson_id,))
    blocks_rows = c.fetchall()
    
    learning_slides = []
    test_sections = []
    
    for br in blocks_rows:
        try:
            content = json.loads(br["content_json"])
            if br["role"] == "learning":
                learning_slides.append(content)
            else:
                test_sections.append(content)
        except:
            pass
            
    # Vocabulary
    c.execute("SELECT id, jp, reading, en, kanji, pos, example FROM vocabulary WHERE lesson_id = ?", (lesson_id,))
    vocab_rows = c.fetchall()
    vocabulary = [
        {
            "id": vr["id"],
            "word": vr["jp"],
            "reading": vr["reading"],
            "meaning": vr["en"],
            "kanji": vr["kanji"],
            "pos": vr["pos"],
            "example": vr["example"],
            "status": "not yet"
        }
        for vr in vocab_rows
    ]
    
    conn.close()
    
    annotations = db.get_annotations(user_id, lesson_id)
        
    return {
        "id": lesson_id,
        "title": title,
        "learning_slides": learning_slides,
        "test_sections": test_sections,
        "vocabulary": vocabulary,
        "annotations": annotations
    }
