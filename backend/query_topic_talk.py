import os
import asyncio
from dotenv import load_dotenv
from notion_service import NotionService
import json

async def main():
    load_dotenv()
    notion = NotionService(api_key=os.getenv("NOTION_API_KEY", ""))
    
    db_id = os.getenv("NOTION_DATABASE_ID")
    pages = await notion.fetch_database_pages(db_id)
    tb_id = None
    for page in pages:
        if "Topic Talk" in notion.extract_page_title(page):
            tb_id = page["id"]
            break
            
    if not tb_id:
        print("Topic Talk not found")
        return
        
    print(f"Topic Talk ID: {tb_id}")
    
    # Levels
    level_db_ids = await notion.fetch_child_database_ids(tb_id)
    if not level_db_ids:
        print("No levels db found")
        return
        
    levels = await notion.fetch_database_pages(level_db_ids[0])
    if not levels:
        print("No levels found")
        return
        
    print(f"Number of levels: {len(levels)}")
    for i, lvl in enumerate(levels):
        title = notion.extract_page_title(lvl).encode('utf-8', 'replace').decode('utf-8')
        print(f"Level {i} ID: {lvl['id']} - Title: {title}")

if __name__ == "__main__":
    asyncio.run(main())
