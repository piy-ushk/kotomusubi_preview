from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import asyncio
import os
import json
import hashlib
import urllib.parse
import httpx
from dotenv import load_dotenv
from pydantic import BaseModel
from supabase import create_client, Client
import db
import sync_service
from notion_service import NotionService

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

# Dynamic Media Caching & Downloading Helpers
STATIC_IMG_DIR = os.path.join(os.path.dirname(__file__), "static", "images")
STATIC_AUD_DIR = os.path.join(os.path.dirname(__file__), "static", "audio")
os.makedirs(STATIC_IMG_DIR, exist_ok=True)
os.makedirs(STATIC_AUD_DIR, exist_ok=True)

async def ensure_local_image(block_id: str, block_data: dict, notion_service: NotionService) -> str:
    img_type = block_data.get("type")
    if img_type not in ["file", "external"]:
        return ""
    url = block_data[img_type]["url"]
    if not url or url.startswith("/static/"):
        return url
        
    parsed_url = urllib.parse.urlparse(url)
    base_name = os.path.basename(parsed_url.path)
    ext = os.path.splitext(base_name)[1]
    if not ext or len(ext) > 10:
        ext = ".png"
        
    url_hash = hashlib.md5(url.encode('utf-8')).hexdigest()[:12]
    safe_name = f"block_{block_id}_{url_hash}{ext}"
    local_path = os.path.join(STATIC_IMG_DIR, safe_name)
    local_url = f"/static/images/{safe_name}"
    
    if os.path.exists(local_path):
        return local_url
        
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url)
            if resp.status_code in [401, 403]:
                print(f"Image URL for block {block_id} expired. Fetching fresh block info...")
                fresh_block = await notion_service.fetch_block(block_id)
                fresh_img_data = fresh_block.get("image", {})
                fresh_img_type = fresh_img_data.get("type")
                if fresh_img_type in ["file", "external"]:
                    url = fresh_img_data[fresh_img_type]["url"]
                    resp = await client.get(url)
                    resp.raise_for_status()
            else:
                resp.raise_for_status()
                
            with open(local_path, "wb") as f:
                f.write(resp.content)
            return local_url
    except Exception as e:
        print(f"Failed to dynamically download image for block {block_id}: {e}")
        return url

async def ensure_local_audio(block_id: str, block_data: dict, notion_service: NotionService) -> str:
    aud_type = block_data.get("type")
    if aud_type not in ["file", "external"]:
        return ""
    url = block_data[aud_type]["url"]
    if not url or url.startswith("/static/"):
        return url
        
    parsed_url = urllib.parse.urlparse(url)
    base_name = os.path.basename(parsed_url.path)
    ext = os.path.splitext(base_name)[1]
    if not ext or len(ext) > 10:
        ext = ".mp3"
        
    url_hash = hashlib.md5(url.encode('utf-8')).hexdigest()[:12]
    safe_name = f"block_{block_id}_{url_hash}{ext}"
    local_path = os.path.join(STATIC_AUD_DIR, safe_name)
    local_url = f"/static/audio/{safe_name}"
    
    if os.path.exists(local_path):
        return local_url
        
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url)
            if resp.status_code in [401, 403]:
                print(f"Audio URL for block {block_id} expired. Fetching fresh block info...")
                fresh_block = await notion_service.fetch_block(block_id)
                fresh_aud_data = fresh_block.get("audio", {})
                fresh_aud_type = fresh_aud_data.get("type")
                if fresh_aud_type in ["file", "external"]:
                    url = fresh_aud_data[fresh_aud_type]["url"]
                    resp = await client.get(url)
                    resp.raise_for_status()
            else:
                resp.raise_for_status()
                
            with open(local_path, "wb") as f:
                f.write(resp.content)
            return local_url
    except Exception as e:
        print(f"Failed to dynamically download audio for block {block_id}: {e}")
        return url

async def ensure_local_cover(level_id: str, url: str, notion_service: NotionService) -> str:
    if not url or url.startswith("/static/"):
        return url
        
    try:
        parsed_url = urllib.parse.urlparse(url)
        base_name = os.path.basename(parsed_url.path)
        ext = os.path.splitext(base_name)[1]
        if not ext or len(ext) > 10:
            ext = ".png"
            
        url_hash = hashlib.md5(url.encode('utf-8')).hexdigest()[:12]
        safe_name = f"cover_{level_id}_{url_hash}{ext}"
        local_path = os.path.join(STATIC_IMG_DIR, safe_name)
        local_url = f"/static/images/{safe_name}"
        
        if os.path.exists(local_path):
            return local_url
            
        async with httpx.AsyncClient() as client:
            resp = await client.get(url)
            if resp.status_code in [401, 403]:
                print(f"Cover URL for level {level_id} expired. Fetching fresh page info...")
                fresh_page = await notion_service.fetch_page(level_id)
                cover_data = fresh_page.get("cover")
                if cover_data:
                    ctype = cover_data["type"]
                    url = cover_data[ctype]["url"]
                    resp = await client.get(url)
                    resp.raise_for_status()
            else:
                resp.raise_for_status()
                
            with open(local_path, "wb") as f:
                f.write(resp.content)
            return local_url
    except Exception as e:
        print(f"Failed to download cover for level {level_id}: {e}")
        return url

async def process_and_cache_media(content: dict, notion_service: NotionService) -> bool:
    modified = False
    
    async def process_block(block):
        nonlocal modified
        b_type = block.get("type")
        if b_type == "image":
            img_data = block.get("image", {})
            img_type = img_data.get("type")
            if img_type in ["file", "external"]:
                orig_url = img_data[img_type]["url"]
                if orig_url and not orig_url.startswith("/static/"):
                    local_url = await ensure_local_image(block["id"], img_data, notion_service)
                    if local_url != orig_url:
                        block["image"][img_type]["url"] = local_url
                        modified = True
        elif b_type == "audio":
            aud_data = block.get("audio", {})
            aud_type = aud_data.get("type")
            if aud_type in ["file", "external"]:
                orig_url = aud_data[aud_type]["url"]
                if orig_url and not orig_url.startswith("/static/"):
                    local_url = await ensure_local_audio(block["id"], aud_data, notion_service)
                    if local_url != orig_url:
                        block["audio"][aud_type]["url"] = local_url
                        modified = True
                        
        if "children" in block and block["children"]:
            child_tasks = [process_block(child) for child in block["children"]]
            await asyncio.gather(*child_tasks)

    top_blocks = content.get("content", [])
    if top_blocks:
        await asyncio.gather(*(process_block(b) for b in top_blocks))
        
    return modified

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

async def cache_levels_covers_background(rows_data: list, ns: NotionService):
    conn = db.get_connection()
    c = conn.cursor()
    for r in rows_data:
        lvl_id = r["id"]
        cover_url = r["cover_url"]
        try:
            local_cover_url = await ensure_local_cover(lvl_id, cover_url, ns)
            if local_cover_url != cover_url:
                c.execute("UPDATE levels SET cover_url = ? WHERE id = ?", (local_cover_url, lvl_id))
                conn.commit()
        except Exception as e:
            print(f"Background cover caching failed for {lvl_id}: {e}")
    conn.close()

@app.get("/api/textbooks/{textbook_id}/levels")
async def get_levels(textbook_id: str, background_tasks: BackgroundTasks):
    conn = db.get_connection()
    c = conn.cursor()
    c.execute("SELECT id, title, cover_url FROM levels WHERE textbook_id = ? ORDER BY sort_order ASC", (textbook_id,))
    rows = c.fetchall()
    
    api_key = os.getenv("NOTION_API_KEY")
    ns = NotionService(api_key) if api_key else None
    
    res = []
    need_caching = []
    for r in rows:
        lvl_id = r["id"]
        cover_url = r["cover_url"]
        
        if cover_url and cover_url.startswith("https://"):
            need_caching.append({"id": lvl_id, "cover_url": cover_url})
            
        res.append({"id": lvl_id, "title": r["title"], "cover": cover_url})
        
    conn.close()
    
    if need_caching and ns:
        background_tasks.add_task(cache_levels_covers_background, need_caching, ns)
        
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
    
    # Blocks (retrieve with ID to support inline cache updating)
    c.execute("SELECT id, role, content_json FROM lesson_blocks WHERE lesson_id = ? ORDER BY sort_order ASC", (lesson_id,))
    blocks_rows = c.fetchall()
    
    api_key = os.getenv("NOTION_API_KEY")
    ns = NotionService(api_key) if api_key else None
    
    learning_slides = []
    test_sections = []
    
    for br in blocks_rows:
        try:
            content = json.loads(br["content_json"])
            
            # Dynamically cache image/audio blocks on demand
            if ns:
                modified = await process_and_cache_media(content, ns)
                if modified:
                    c.execute("UPDATE lesson_blocks SET content_json = ? WHERE id = ?", 
                              (json.dumps(content), br["id"]))
                    conn.commit()
            
            if br["role"] == "learning":
                learning_slides.append(content)
            else:
                test_sections.append(content)
        except Exception as e:
            print(f"Error loading/caching lesson block: {e}")
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
