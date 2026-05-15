import asyncio
import os
import sys
from dotenv import load_dotenv
from notion_service import NotionService

if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer)

load_dotenv()

async def test_fetch():
    api_key = os.getenv("NOTION_API_KEY")
    db_id = os.getenv("NOTION_DATABASE_ID")
    notion = NotionService(api_key)
    
    pages = await notion.fetch_database_pages(db_id)
    grammar_textbook = next(p for p in pages if "Grammar" in notion.extract_page_title(p))
    
    level_db_ids = await notion.fetch_child_database_ids(grammar_textbook["id"])
    level_pages = await notion.fetch_database_pages(level_db_ids[0])
    level_page = next(p for p in level_pages if "Beginner" in notion.extract_page_title(p))
    
    print(f"\n--- Scanning Level: {notion.extract_page_title(level_page)} ---")
    blocks = await notion.fetch_page_blocks(level_page["id"])
    for b in blocks:
        if b["type"] == "child_database":
            print(f" - DB: '{b.get('child_database', {}).get('title', '')}', ID: {b['id']}")

if __name__ == "__main__":
    asyncio.run(test_fetch())
