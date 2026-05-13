import httpx
import os
from typing import List, Dict, Any

class NotionService:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.notion.com/v1"
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json",
        }

    async def fetch_database_pages(self, database_id: str) -> List[Dict[str, Any]]:
        results = []
        next_cursor = None
        async with httpx.AsyncClient() as client:
            while True:
                payload = {"start_cursor": next_cursor} if next_cursor else {}
                response = await client.post(
                    f"{self.base_url}/databases/{database_id}/query",
                    headers=self.headers,
                    json=payload,
                )
                response.raise_for_status()
                data = response.json()
                results.extend(data.get("results", []))
                next_cursor = data.get("next_cursor")
                if not next_cursor:
                    break
        return results

    async def fetch_page_blocks(self, page_id: str) -> List[Dict[str, Any]]:
        results = []
        next_cursor = None
        async with httpx.AsyncClient() as client:
            while True:
                url = f"{self.base_url}/blocks/{page_id}/children"
                if next_cursor:
                    url += f"?start_cursor={next_cursor}"
                response = await client.get(url, headers=self.headers)
                response.raise_for_status()
                data = response.json()
                results.extend(data.get("results", []))
                next_cursor = data.get("next_cursor")
                if not next_cursor:
                    break
        return results

    async def fetch_blocks_with_children(self, page_id: str) -> List[Dict[str, Any]]:
        """Fetches blocks and recursively fetches children for blocks that support them."""
        blocks = await self.fetch_page_blocks(page_id)
        for block in blocks:
            if block.get("has_children"):
                # Recursive fetch for nested content blocks
                if block["type"] in ["toggle", "table", "column_list", "column", "callout",
                                     "bulleted_list_item", "numbered_list_item", "child_page"]:
                    block["children"] = await self.fetch_blocks_with_children(block["id"])
        return blocks

    async def fetch_child_database_ids(self, page_id: str) -> List[str]:
        blocks = await self.fetch_page_blocks(page_id)
        return [b["id"] for b in blocks if b["type"] == "child_database"]

    async def fetch_page(self, page_id: str) -> Dict[str, Any]:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/pages/{page_id}",
                headers=self.headers
            )
            response.raise_for_status()
            return response.json()

    def extract_page_title(self, page: Dict[str, Any]) -> str:
        try:
            properties = page.get("properties", {})
            title_prop = None
            
            # First try to find the property of type 'title'
            for prop_name, prop_data in properties.items():
                if prop_data.get("type") == "title":
                    title_prop = prop_data
                    break
            
            # Fallback to common names if the above fails for some reason
            if not title_prop:
                title_prop = properties.get("名前") or properties.get("Name") or properties.get("title") or properties.get("Title")
                
            if not title_prop:
                return ""
            
            title_rich_text = title_prop.get("title", [])
            return "".join([p.get("plain_text", "") for p in title_rich_text]).strip()
        except Exception:
            return ""
