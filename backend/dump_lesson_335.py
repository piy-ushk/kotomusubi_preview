import asyncio, os, json
from dotenv import load_dotenv
load_dotenv()
from notion_service import NotionService
notion = NotionService(os.getenv('NOTION_API_KEY'))

async def main():
    blocks = await notion.fetch_blocks_with_children('335edc46-8f20-826a-bf6b-8187b4185b4c')
    with open('test_blocks.json', 'w', encoding='utf-8') as f:
        json.dump(blocks, f, ensure_ascii=False, indent=2)

asyncio.run(main())
