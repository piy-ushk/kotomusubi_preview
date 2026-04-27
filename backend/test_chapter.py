import asyncio
import os
from dotenv import load_dotenv
import httpx
import json

load_dotenv()
api_key = os.getenv('NOTION_API_KEY')
headers = {
    'Authorization': f'Bearer {api_key}',
    'Notion-Version': '2022-06-28'
}

async def run():
    out = open('out_chapter.txt', 'w', encoding='utf-8')
    async with httpx.AsyncClient() as client:
        # Get blocks of Chapter 13
        chapter_id = '24cedc46-8f20-82cd-a17a-81cb7c98835e'
        r = await client.get(f'https://api.notion.com/v1/blocks/{chapter_id}/children', headers=headers)
        blocks = r.json().get('results', [])
        
        for b in blocks:
            if b['type'] == 'child_database':
                out.write(f"Found child DB: {b['id']}\n")
                r = await client.post(f'https://api.notion.com/v1/databases/{b["id"]}/query', headers=headers)
                pages = r.json().get('results', [])
                # Order pages by some property maybe? Let's check their titles
                for p in pages:
                    props = list(p['properties'].keys())
                    title = ""
                    for k, v in p['properties'].items():
                        if v['type'] == 'title':
                            title = "".join(t['plain_text'] for t in v['title'])
                    out.write(f"Page ID: {p['id']} Title: {title} Properties: {props}\n")
                    r = await client.get(f'https://api.notion.com/v1/blocks/{p["id"]}/children', headers=headers)
                    pb = r.json().get('results', [])
                    out.write(f"  Blocks: {[x['type'] for x in pb]}\n")
    out.close()

asyncio.run(run())
