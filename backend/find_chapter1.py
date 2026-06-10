import asyncio, os, json
from dotenv import load_dotenv
load_dotenv()
from notion_service import NotionService
notion = NotionService(os.getenv('NOTION_API_KEY'))

async def main():
    import httpx
    # Search for pages matching "Chapter 1"
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.notion.com/v1/search",
            headers=notion.headers,
            json={"query": "Chapter 1"}
        )
        data = response.json()
        for result in data.get("results", []):
            if result["object"] == "page":
                title = notion.extract_page_title(result)
                if title:
                    print("Found page:", title, "ID:", result["id"])
                    if "Chapter 1" in title or "Chapter1" in title:
                        blocks = await notion.fetch_blocks_with_children(result["id"])
                        with open("chapter1_blocks.json", "w", encoding="utf-8") as f:
                            json.dump(blocks, f, ensure_ascii=False, indent=2)
                        print("Saved blocks to chapter1_blocks.json")
                        return

asyncio.run(main())
