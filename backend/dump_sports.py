import asyncio, os, json
from dotenv import load_dotenv
load_dotenv()
from notion_service import NotionService

notion = NotionService(os.getenv('NOTION_API_KEY'))

async def main():
    textbooks = await notion.fetch_database_pages(os.getenv('NOTION_DATABASE_ID'))
    tb_id = None
    for tb in textbooks:
        title = notion.extract_page_title(tb)
        if "Topic Talk" in title:
            tb_id = tb["id"]
            break
            
    if not tb_id:
        print("Topic Talk textbook not found")
        return

    levels = await notion.fetch_child_database_ids(tb_id)
    les_id = None
    
    for lvl_id in levels:
        level_pages = await notion.fetch_database_pages(lvl_id)
        for lp in level_pages:
            title = notion.extract_page_title(lp)
            # Fetch lessons in this level
            lesson_dbs = await notion.fetch_child_database_ids(lp["id"])
            for db_id in lesson_dbs:
                lessons = await notion.fetch_database_pages(db_id)
                for l in lessons:
                    ltitle = notion.extract_page_title(l)
                    if "スポーツ" in ltitle or "Sports" in ltitle:
                        les_id = l["id"]
                        break
                if les_id: break
            if les_id: break
        if les_id: break
        
    if les_id:
        blocks = await notion.fetch_blocks_with_children(les_id)
        with open('sports_blocks.json', 'w', encoding='utf-8') as f:
            json.dump(blocks, f, ensure_ascii=False, indent=2)

asyncio.run(main())
