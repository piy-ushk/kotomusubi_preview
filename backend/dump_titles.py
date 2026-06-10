import asyncio, os, json
from dotenv import load_dotenv
load_dotenv()
from notion_service import NotionService
notion = NotionService(os.getenv('NOTION_API_KEY'))

async def main():
    pages = await notion.fetch_database_pages('d56edc46-8f20-8263-ab11-812094d276b3')
    titles = [notion.extract_page_title(p) for p in pages]
    print(titles)

asyncio.run(main())
