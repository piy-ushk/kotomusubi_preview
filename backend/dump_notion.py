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
    data = []
    for p in pages:
        props = p.get('properties', {})
        files = props.get('ファイル&メディア', {}).get('files', [])
        title_prop = props.get('テキスト', {}).get('title', [])
        title = title_prop[0]['plain_text'] if title_prop else 'Untitled'
        data.append({'title': title, 'files': files})
    
    with open('notion_pages_dump.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

asyncio.run(main())
