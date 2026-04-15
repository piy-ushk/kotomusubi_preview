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
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/databases/{database_id}/query",
                headers=self.headers,
                json={},
            )
            response.raise_for_status()
            return response.json().get("results", [])

    async def fetch_page_blocks(self, page_id: str) -> List[Dict[str, Any]]:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/blocks/{page_id}/children",
                headers=self.headers,
            )
            response.raise_for_status()
            return response.json().get("results", [])

    async def fetch_child_database_ids(self, page_id: str) -> List[str]:
        blocks = await self.fetch_page_blocks(page_id)
        return [b["id"] for b in blocks if b["type"] == "child_database"]

    def extract_page_title(self, page: Dict[str, Any]) -> str:
        try:
            properties = page.get("properties", {})
            title_prop = properties.get("名前") or properties.get("Name") or properties.get("title") or properties.get("Title")
            if not title_prop:
                return ""
            
            title_rich_text = title_prop.get("title", [])
            return "".join([p.get("plain_text", "") for p in title_rich_text]).strip()
        except Exception:
            return ""
