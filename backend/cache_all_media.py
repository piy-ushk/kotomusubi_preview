import asyncio
import os
import json
import sqlite3
import hashlib
import urllib.parse
import httpx
import io
from PIL import Image
from dotenv import load_dotenv

# Reconfigure stdout for utf-8
import sys
sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()

from notion_service import NotionService

STATIC_IMG_DIR = os.path.join(os.path.dirname(__file__), "static", "images")
STATIC_AUD_DIR = os.path.join(os.path.dirname(__file__), "static", "audio")
os.makedirs(STATIC_IMG_DIR, exist_ok=True)
os.makedirs(STATIC_AUD_DIR, exist_ok=True)

# Limit overall concurrent downloads to avoid timeouts/resets
SEMAPHORE = asyncio.Semaphore(4)

async def ensure_supabase_media(block_id: str, url: str, content_type: str, notion_service: NotionService) -> str:
    if not url:
        return url
        
    # Skip if it's already a WebP or MP3 on Supabase
    if "supabase.co" in url and (url.endswith(".webp") or url.endswith(".mp3") or "audio" in content_type):
        return url
        
    parsed_url = urllib.parse.urlparse(url)
    base_name = os.path.basename(parsed_url.path)
    ext = os.path.splitext(base_name)[1]
    if not ext or len(ext) > 10:
        ext = ".webp" if "image" in content_type else ".mp3"
        
    # Always force webp extension for images
    if "image" in content_type:
        ext = ".webp"
        
    url_hash = hashlib.md5(url.encode('utf-8')).hexdigest()[:12]
    # Path in bucket: e.g. media/block_123_abc.png
    bucket_path = f"media/block_{block_id}_{url_hash}{ext}"
    
    # Need to check if already exists? Supabase will upsert.
    # To save bandwidth, if the url in DB already points to our supabase, we skip (handled above).
    # If the file already exists in Supabase but we don't know it, we just overwrite for now.
    
    async with SEMAPHORE:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                needs_fresh = False
                if not url.startswith("http"):
                    needs_fresh = True
                    resp = None
                else:
                    resp = await client.get(url)
                    if resp.status_code in [401, 403, 404]:
                        needs_fresh = True

                if needs_fresh:
                    print(f"  [Media Expired/Local] Block {block_id}. Fetching fresh block...")
                    fresh_block = await notion_service.fetch_block(block_id)
                    media_key = "image" if "image" in content_type else "audio"
                    fresh_data = fresh_block.get(media_key, {})
                    fresh_type = fresh_data.get("type")
                    if fresh_type in ["file", "external"]:
                        url = fresh_data[fresh_type]["url"]
                        resp = await client.get(url)
                        resp.raise_for_status()
                else:
                    resp.raise_for_status()
                
                upload_bytes = resp.content
                # Convert image to WEBP to save space and load faster
                if "image" in content_type:
                    try:
                        img = Image.open(io.BytesIO(upload_bytes))
                        if img.mode in ("RGBA", "P"):
                            img = img.convert("RGBA")
                        else:
                            img = img.convert("RGB")
                        out_io = io.BytesIO()
                        img.save(out_io, format="WEBP", quality=80)
                        upload_bytes = out_io.getvalue()
                        content_type = "image/webp"
                    except Exception as e:
                        print(f"  [WebP Conversion Failed] {e}")
                    
                # Upload to Supabase
                from supabase_service import SupabaseService
                sb_service = SupabaseService()
                public_url = sb_service.upload_file_bytes(bucket_path, upload_bytes, content_type=content_type)
                
                if public_url:
                    print(f"  [Cached Media Supabase] {public_url}")
                    return public_url
                else:
                    return url
        except Exception as e:
            print(f"  [Failed Media] Block {block_id}: {e}")
            return url

async def ensure_local_image(block_id: str, block_data: dict, notion_service: NotionService) -> str:
    img_type = block_data.get("type")
    if img_type not in ["file", "external"]:
        return ""
    return await ensure_supabase_media(block_id, block_data[img_type]["url"], "image/png", notion_service)

async def ensure_local_audio(block_id: str, block_data: dict, notion_service: NotionService) -> str:
    aud_type = block_data.get("type")
    if aud_type not in ["file", "external"]:
        return ""
    return await ensure_supabase_media(block_id, block_data[aud_type]["url"], "audio/mpeg", notion_service)

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

async def main():
    api_key = os.getenv("NOTION_API_KEY")
    if not api_key:
        print("Error: NOTION_API_KEY not found in environment")
        return
        
    ns = NotionService(api_key)
    
    db_path = os.path.join(os.path.dirname(__file__), "app.db")
    print(f"Connecting to database: {db_path}")
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    c.execute("SELECT id, lesson_id, role, content_json FROM lesson_blocks")
    rows = c.fetchall()
    print(f"Found {len(rows)} lesson blocks in database. Scanning for media...")
    
    total_modified = 0
    for idx, r in enumerate(rows):
        block_row_id = r["id"]
        lesson_id = r["lesson_id"]
        role = r["role"]
        try:
            content = json.loads(r["content_json"])
            
            # Run the concurrent media cache parser
            modified = await process_and_cache_media(content, ns)
            if modified:
                c.execute("UPDATE lesson_blocks SET content_json = ? WHERE id = ?", 
                          (json.dumps(content), block_row_id))
                conn.commit()
                total_modified += 1
                print(f"[{idx+1}/{len(rows)}] Updated block {block_row_id} for lesson {lesson_id}")
            else:
                if (idx + 1) % 100 == 0:
                    print(f"[{idx+1}/{len(rows)}] Scanned...")
        except Exception as e:
            print(f"Error processing block row {block_row_id}: {e}")
            
    # Also download/cache Level Covers
    print("\nScanning levels covers...")
    c.execute("SELECT id, title, cover_url FROM levels")
    levels = c.fetchall()
    
    async def ensure_local_cover(level_id: str, url: str) -> str:
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
            
            async with SEMAPHORE:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    needs_fresh = False
                    if not url.startswith("http"):
                        needs_fresh = True
                        resp = None
                    else:
                        resp = await client.get(url)
                        if resp.status_code in [401, 403, 404]:
                            needs_fresh = True

                    if needs_fresh:
                        print(f"  [Cover Expired/Local] Level {level_id}. Fetching fresh cover...")
                        fresh_page = await ns.fetch_page(level_id)
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
                    
                    if public_url:
                        print(f"  [Cached Cover Supabase] {public_url}")
                        return public_url
                    return url
        except Exception as e:
            print(f"  [Failed Cover] Level {level_id}: {e}")
            return url

    for lvl in levels:
        lvl_id = lvl["id"]
        cover_url = lvl["cover_url"]
        if cover_url and "supabase.co" not in cover_url:
            local_cover = await ensure_local_cover(lvl_id, cover_url)
            if local_cover != cover_url:
                c.execute("UPDATE levels SET cover_url = ? WHERE id = ?", (local_cover, lvl_id))
                conn.commit()
                print(f"Updated cover for level: {lvl['title']}")

    conn.close()
    print(f"\nCompleted! Total lesson block rows modified: {total_modified}")

if __name__ == "__main__":
    asyncio.run(main())
