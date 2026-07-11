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
from supabase_service import supabase_client
import db
import sync_service
from notion_service import NotionService

load_dotenv()
db.init_db()

from contextlib import asynccontextmanager
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import cache_all_media

scheduler = AsyncIOScheduler()

async def scheduled_sync():
    api_key = os.getenv("NOTION_API_KEY")
    db_id = os.getenv("NOTION_DATABASE_ID")
    if not api_key or not db_id:
        print("Scheduled Sync failed: Missing credentials")
        return
        
    print("Starting scheduled 24-hour sync...")
    try:
        service = sync_service.SyncService(api_key, db_id)
        await service.sync_all()
        print("Sync complete. Starting media cache to Supabase...")
        await cache_all_media.main()
        print("Scheduled job completed successfully.")
    except Exception as e:
        print(f"Scheduled job failed: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Add a scheduled job to run every 24 hours
    scheduler.add_job(scheduled_sync, 'interval', hours=24)
    scheduler.start()
    yield
    scheduler.shutdown()

app = FastAPI(lifespan=lifespan)

# Mount static files for local audio/images fallback if needed
os.makedirs(os.path.join(os.path.dirname(__file__), "static", "images"), exist_ok=True)
app.mount("/static", StaticFiles(directory=os.path.join(os.path.dirname(__file__), "static")), name="static")



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
    return await cache_all_media.ensure_supabase_media(block_id, block_data[img_type]["url"], "image/png", notion_service)

async def ensure_local_audio(block_id: str, block_data: dict, notion_service: NotionService) -> str:
    aud_type = block_data.get("type")
    if aud_type not in ["file", "external"]:
        return ""
    return await cache_all_media.ensure_supabase_media(block_id, block_data[aud_type]["url"], "audio/mpeg", notion_service)

async def ensure_local_cover(level_id: str, url: str, notion_service: NotionService) -> str:
    if not url or "supabase.co" in url:
        return url
        
    try:
        parsed_url = urllib.parse.urlparse(url)
        base_name = os.path.basename(parsed_url.path)
        ext = os.path.splitext(base_name)[1]
        if not ext or len(ext) > 10:
            ext = ".png"
            
        url_hash = hashlib.md5(url.encode('utf-8')).hexdigest()[:12]
        bucket_path = f"media/cover_{level_id}_{url_hash}{ext}"
        
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
                
            from supabase_service import SupabaseService
            sb_service = SupabaseService()
            public_url = sb_service.upload_file_bytes(bucket_path, resp.content, content_type="image/png")
            return public_url if public_url else url
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
                if orig_url and "supabase.co" not in orig_url:
                    local_url = await ensure_local_image(block["id"], img_data, notion_service)
                    if local_url != orig_url:
                        block["image"][img_type]["url"] = local_url
                        modified = True
        elif b_type == "audio":
            aud_data = block.get("audio", {})
            aud_type = aud_data.get("type")
            if aud_type in ["file", "external"]:
                orig_url = aud_data[aud_type]["url"]
                if orig_url and "supabase.co" not in orig_url:
                    local_url = await ensure_local_audio(block["id"], aud_data, notion_service)
                    if local_url != orig_url:
                        block["audio"][aud_type]["url"] = local_url
                        modified = True
                        
        tasks = []
        if "children" in block and block["children"]:
            tasks.extend([process_block(child) for child in block["children"]])
        if b_type == "child_database":
            db_items = block.get("database_items", [])
            for item in db_items:
                p_blocks = item.get("page_blocks", [])
                if p_blocks:
                    tasks.extend([process_block(pb) for pb in p_blocks])
        if tasks:
            await asyncio.gather(*tasks)

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

async def run_full_sync_sequence(api_key: str, db_id: str):
    try:
        service = sync_service.SyncService(api_key, db_id)
        print("Starting background Notion sync...")
        await service.sync_all()
        print("Notion sync complete. Starting media upload to Supabase...")
        import cache_all_media
        await cache_all_media.main()
        print("Full sync and upload sequence complete.")
    except Exception as e:
        print(f"Background sync sequence failed: {e}")

@app.api_route("/api/sync", methods=["GET", "POST"])
async def trigger_sync(background_tasks: BackgroundTasks):
    api_key = os.getenv("NOTION_API_KEY")
    db_id = os.getenv("NOTION_DATABASE_ID")
    if not api_key or not db_id:
        raise HTTPException(status_code=500, detail="Missing Notion credentials in .env")
        
    # Run sync and cache sequentially in background
    background_tasks.add_task(run_full_sync_sequence, api_key, db_id)
    
    return {"success": True, "message": "Sync and Supabase cache started in background."}

@app.get("/api/debug/supabase")
async def debug_supabase():
    from supabase_service import SupabaseService
    sb_service = SupabaseService()
    try:
        url = sb_service.upload_file_bytes("media/debug_test.txt", b"Hello from Render!", "text/plain")
        if url:
            return {"success": True, "url": url}
        else:
            return {"success": False, "error": "Upload returned None"}
    except Exception as e:
        return {"success": False, "error": str(e)}

class NoteRequest(BaseModel):
    content: str

@app.post("/api/lessons/{lesson_id}/note")
def save_note(lesson_id: str, req: NoteRequest, current_user = Depends(get_current_user)):
    user_id = current_user.get("sub")
    success = db.save_lesson_note(user_id, lesson_id, req.content)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to save note")
    return {"success": True}

@app.get("/api/lessons/{lesson_id}/note")
def get_note(lesson_id: str, current_user = Depends(get_current_user)):
    user_id = current_user.get("sub")
    note = db.get_lesson_note(user_id, lesson_id)
    return {"content": note}

@app.get("/api/notes")
def get_all_notes(current_user = Depends(get_current_user)):
    user_id = current_user.get("sub")
    notes = db.get_all_notes(user_id)
    return {"notes": notes}

@app.get("/api/textbooks")
async def get_textbooks():
    if not supabase_client: return []
    res = supabase_client.table('textbooks').select('id, title').order('sort_order').execute()
    return res.data

async def cache_levels_covers_background(rows_data: list, ns: NotionService):
    for r in rows_data:
        lvl_id = r["id"]
        cover_url = r["cover_url"]
        try:
            local_cover_url = await ensure_local_cover(lvl_id, cover_url, ns)
            if local_cover_url != cover_url and supabase_client:
                supabase_client.table('levels').update({'cover_url': local_cover_url}).eq('id', lvl_id).execute()
        except Exception as e:
            print(f"Background cover caching failed for {lvl_id}: {e}")

@app.get("/api/textbooks/{textbook_id}/levels")
async def get_levels(textbook_id: str, background_tasks: BackgroundTasks):
    if not supabase_client: return []
    db_res = supabase_client.table('levels').select('id, title, cover_url').eq('textbook_id', textbook_id).order('sort_order').execute()
    rows = db_res.data
    
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
        
    if need_caching and ns:
        background_tasks.add_task(cache_levels_covers_background, need_caching, ns)
        
    return res

@app.get("/api/levels/{level_id}/lessons")
async def get_lessons(level_id: str):
    if not supabase_client: return []
    # Order by is_chapter DESC, sort_order ASC
    db_res = supabase_client.table('lessons').select('id, chapter_id, title, is_chapter, sort_order').eq('level_id', level_id).order('is_chapter', desc=True).order('sort_order', desc=False).execute()
    rows = db_res.data
    
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
    if not supabase_client:
        return {"id": lesson_id, "title": "", "learning_slides": [], "test_sections": [], "vocabulary": [], "annotations": {}}
        
    # Title
    title_res = supabase_client.table('lessons').select('title').eq('id', lesson_id).execute()
    title = title_res.data[0]['title'] if title_res.data else ""
    
    # Blocks
    blocks_res = supabase_client.table('lesson_blocks').select('id, role, content_json').eq('lesson_id', lesson_id).order('sort_order').execute()
    
    learning_slides = []
    test_sections = []
    
    for br in blocks_res.data:
        try:
            content = json.loads(br["content_json"])
            if br["role"] == "learning":
                learning_slides.append(content)
            else:
                test_sections.append(content)
        except Exception as e:
            print(f"Error loading lesson block: {e}")
            
    # Vocabulary
    vocab_res = supabase_client.table('vocabulary').select('id, jp, reading, en, kanji, pos, example').eq('lesson_id', lesson_id).execute()
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
        for vr in vocab_res.data
    ]
    
    annotations = db.get_annotations(user_id, lesson_id)
        
    return {
        "id": lesson_id,
        "title": title,
        "learning_slides": learning_slides,
        "test_sections": test_sections,
        "vocabulary": vocabulary,
        "annotations": annotations
    }
