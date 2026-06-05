import asyncio, os, json
from dotenv import load_dotenv
load_dotenv()
from notion_service import NotionService

notion = NotionService(os.getenv('NOTION_API_KEY'))

async def main():
    textbooks = await notion.fetch_database_pages(os.getenv('NOTION_DATABASE_ID'))
    tb_id = textbooks[0]['id']
    levels = await notion.fetch_child_database_ids(tb_id)
    level_pages = await notion.fetch_database_pages(levels[0])
    with open('levels.txt', 'w', encoding='utf-8') as f:
        for lp in level_pages:
            title = notion.extract_page_title(lp)
            f.write("Level: " + title + "\n")
            lesson_dbs = await notion.fetch_child_database_ids(lp['id'])
            for db_id in lesson_dbs:
                lessons = await notion.fetch_database_pages(db_id)
                for l in lessons:
                    ltitle = notion.extract_page_title(l)
                    f.write("  - " + ltitle + " (" + l['id'] + ")\n")

asyncio.run(main())
