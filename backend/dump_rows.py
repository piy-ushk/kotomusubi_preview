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
        row = {}
        for k, v in props.items():
            vtype = v.get('type')
            if vtype == 'title':
                arr = v.get('title', [])
                row[k] = arr[0]['plain_text'] if arr else ''
            elif vtype == 'rich_text':
                arr = v.get('rich_text', [])
                row[k] = arr[0]['plain_text'] if arr else ''
            elif vtype == 'select':
                sel = v.get('select')
                row[k] = sel['name'] if sel else ''
            elif vtype == 'files':
                row[k] = [f.get('name') for f in v.get('files', [])]
            else:
                row[k] = vtype
        result.append(row)
    with open('notion_rows.json', 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

asyncio.run(main())
