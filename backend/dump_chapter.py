import asyncio, os, json
from dotenv import load_dotenv
load_dotenv()
from notion_service import NotionService
import httpx

notion = NotionService(os.getenv('NOTION_API_KEY'))

async def main():
    tb_resp = httpx.get("http://localhost:8000/api/textbooks", timeout=10.0)
    tb_id = None
    for tb in tb_resp.json():
        if "Grammar Textbook" in tb["title"]:
            tb_id = tb["id"]
            break
            
    lvl_resp = httpx.get(f"http://localhost:8000/api/textbooks/{tb_id}/levels", timeout=10.0)
    lvl_id = None
    for lvl in lvl_resp.json():
        if "Super Beginner" in lvl["title"] or "超初級" in lvl["title"]:
            lvl_id = lvl["id"]
            break
            
    les_resp = httpx.get(f"http://localhost:8000/api/levels/{lvl_id}/lessons", timeout=10.0)
    les_id = None
    for les in les_resp.json():
        if "Chapter" in les["title"]:
            print(f"Found Chapter lesson: {les['title']} ({les['id']})")
            les_id = les["id"]
            blocks = await notion.fetch_blocks_with_children(les_id)
            with open('chapter_blocks.json', 'w', encoding='utf-8') as f:
                json.dump(blocks, f, ensure_ascii=False, indent=2)
            print("Dumped chapter_blocks.json")
            break

asyncio.run(main())
