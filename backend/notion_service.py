import asyncio
import httpx
import os
from typing import List, Dict, Any

class NotionService:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.notion.com/v1"
        self.timeout = httpx.Timeout(120.0, connect=10.0)
        self._block_fetch_semaphore = asyncio.Semaphore(8)
        self._api_lock = asyncio.Lock()
        self._last_request_time = 0.0
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json",
        }

    async def _request_with_retry(self, client: httpx.AsyncClient, method: str, url: str, **kwargs):
        import time
        max_retries = 10
        base_delay = 2
        for attempt in range(max_retries):
            # Strictly space out requests to respect Notion's 3 requests per second limit
            async with self._api_lock:
                now = time.time()
                elapsed = now - getattr(self, "_last_request_time", 0.0)
                if elapsed < 0.34:
                    await asyncio.sleep(0.34 - elapsed)
                self._last_request_time = time.time()
                
            try:
                response = await client.request(method, url, headers=self.headers, **kwargs)
                if response.status_code in [429, 502, 503, 504]:
                    retry_after_header = response.headers.get("Retry-After")
                    delay = int(retry_after_header) if retry_after_header else base_delay * (2 ** attempt)
                    # Cap max delay to 60s so it doesn't wait indefinitely if attempt is high
                    delay = min(delay, 60)
                    print(f"Notion API {response.status_code} at {url}, retrying {attempt+1}/{max_retries} in {delay}s...")
                    await asyncio.sleep(delay)
                    continue
                response.raise_for_status()
                return response
            except httpx.HTTPStatusError as e:
                # Do not retry 400 Bad Request, 401, 403, 404
                if e.response.status_code >= 400 and e.response.status_code < 500 and e.response.status_code != 429:
                    raise e
                if attempt == max_retries - 1: raise e
                print(f"HTTP error {e} at {url}, retrying {attempt+1}/{max_retries}...")
                await asyncio.sleep(base_delay * (2 ** attempt))
            except httpx.RequestError as e:
                print(f"Network error at {url}, retrying {attempt+1}/{max_retries}: {e}")
                if attempt == max_retries - 1: raise e
                await asyncio.sleep(base_delay * (2 ** attempt))
        raise Exception(f"Failed after {max_retries} retries")

    async def fetch_database_pages(self, database_id: str) -> List[Dict[str, Any]]:
        results = []
        next_cursor = None
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            while True:
                payload = {"start_cursor": next_cursor} if next_cursor else {}
                response = await self._request_with_retry(client, "POST", f"{self.base_url}/databases/{database_id}/query", json=payload)
                data = response.json()
                results.extend(data.get("results", []))
                next_cursor = data.get("next_cursor")
                if not next_cursor:
                    break
        return results

    async def _fetch_page_blocks_with_client(self, page_id: str, client: httpx.AsyncClient) -> List[Dict[str, Any]]:
        results = []
        next_cursor = None
        async with self._block_fetch_semaphore:
            while True:
                url = f"{self.base_url}/blocks/{page_id}/children"
                if next_cursor:
                    url += f"?start_cursor={next_cursor}"
                response = await self._request_with_retry(client, "GET", url)
                data = response.json()
                results.extend(data.get("results", []))
                next_cursor = data.get("next_cursor")
                if not next_cursor:
                    break
        return results

    async def fetch_page_blocks(self, page_id: str) -> List[Dict[str, Any]]:
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            return await self._fetch_page_blocks_with_client(page_id, client)

    async def _fetch_blocks_with_children_with_client(self, page_id: str, client: httpx.AsyncClient) -> List[Dict[str, Any]]:
        blocks = await self._fetch_page_blocks_with_client(page_id, client)
        async def hydrate_block(block: Dict[str, Any]) -> None:
            if block.get("has_children") or block["type"] == "child_page":
                if block["type"] in ["toggle", "table", "column_list", "column", "callout",
                                     "bulleted_list_item", "numbered_list_item", "child_page",
                                     "heading_1", "heading_2", "heading_3"]:
                    block["children"] = await self._fetch_blocks_with_children_with_client(block["id"], client)
        await asyncio.gather(*(hydrate_block(block) for block in blocks))
        return blocks

    async def fetch_blocks_with_children(self, page_id: str) -> List[Dict[str, Any]]:
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            return await self._fetch_blocks_with_children_with_client(page_id, client)

    async def fetch_child_database_ids(self, page_id: str) -> List[str]:
        blocks = await self.fetch_page_blocks(page_id)
        return [b["id"] for b in blocks if b["type"] == "child_database"]

    async def fetch_block(self, block_id: str) -> Dict[str, Any]:
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await self._request_with_retry(client, "GET", f"{self.base_url}/blocks/{block_id}")
            return response.json()

    async def fetch_page(self, page_id: str) -> Dict[str, Any]:
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await self._request_with_retry(client, "GET", f"{self.base_url}/pages/{page_id}")
            return response.json()

    def extract_page_title(self, page: Dict[str, Any]) -> str:
        try:
            properties = page.get("properties", {})
            title_prop = None
            for prop_name, prop_data in properties.items():
                if prop_data.get("type") == "title":
                    title_prop = prop_data
                    break
            if not title_prop:
                title_prop = properties.get("名前") or properties.get("Name") or properties.get("title") or properties.get("Title")
            if not title_prop:
                return ""
            title_rich_text = title_prop.get("title", [])
            return "".join([p.get("plain_text", "") for p in title_rich_text]).strip()
        except Exception:
            return ""
