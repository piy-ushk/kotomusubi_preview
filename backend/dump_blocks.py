import asyncio, os, json
from dotenv import load_dotenv
load_dotenv()
from notion_service import NotionService

notion = NotionService(os.getenv('NOTION_API_KEY'))

async def main():
    textbooks = await notion.fetch_database_pages(os.getenv('NOTION_DATABASE_ID'))
    tb_id = None
    for tb in textbooks:
        if "Grammar" in notion.extract_page_title(tb):
            tb_id = tb["id"]
            break
            
    levels = await notion.fetch_child_database_ids(tb_id)
    level_pages = await notion.fetch_database_pages(levels[0])
    lvl_id = None
    for lp in level_pages:
        title = notion.extract_page_title(lp)
        if "Super Beginner" in title or "超初級" in title:
            lvl_id = lp["id"]
            break
            
    lesson_dbs = await notion.fetch_child_database_ids(lvl_id)
    les_id = None
    for db_id in lesson_dbs:
        lessons = await notion.fetch_database_pages(db_id)
        for l in lessons:
            ltitle = notion.extract_page_title(l)
            if "あいさつ" in ltitle or "Greeting" in ltitle:
                les_id = l["id"]
                break
        if les_id: break
        
    if les_id:
        blocks = await notion.fetch_blocks_with_children(les_id)
        with open('lesson_blocks.json', 'w', encoding='utf-8') as f:
            json.dump(blocks, f, ensure_ascii=False, indent=2)

asyncio.run(main())
