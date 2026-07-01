import asyncio
from sync_service import SyncService
import os
import json
from dotenv import load_dotenv

load_dotenv()
async def main():
    api_key = os.getenv('NOTION_API_KEY')
    db_id = os.getenv('NOTION_DATABASE_ID')
    service = SyncService(api_key, db_id)
    pages = await service.notion.fetch_database_pages(db_id)
    result = []
    for p in pages:
        props = p.get('properties', {})
        # Print all property names
        result.append(list(props.keys()))
    with open('prop_keys.json', 'w', encoding='utf-8') as f:
        json.dump(result[0] if result else [], f, ensure_ascii=False)

asyncio.run(main())
