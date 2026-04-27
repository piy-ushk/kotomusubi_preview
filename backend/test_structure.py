import asyncio
import os
from dotenv import load_dotenv
import httpx

load_dotenv()
api_key = os.getenv('NOTION_API_KEY')
headers = {
    'Authorization': f'Bearer {api_key}',
    'Notion-Version': '2022-06-28'
}

async def run():
    async with httpx.AsyncClient() as client:
        r = await client.post('https://api.notion.com/v1/databases/' + os.getenv('NOTION_DATABASE_ID') + '/query', headers=headers)
        tbs = r.json().get('results', [])
        
        for tb in tbs:
            title = tb['properties'].get('Name', {}).get('title', [])
            title_text = title[0]['plain_text'] if title else ''
            print('Textbook:', title_text, tb['id'])
            
            r = await client.get(f'https://api.notion.com/v1/blocks/{tb["id"]}/children', headers=headers)
            level_dbs = [b['id'] for b in r.json().get('results', []) if b['type'] == 'child_database']
            
            for l_db in level_dbs:
                r = await client.post(f'https://api.notion.com/v1/databases/{l_db}/query', headers=headers)
                levels = r.json().get('results', [])
                for level in levels:
                    l_title = level['properties'].get('title', {}).get('title', []) or level['properties'].get('Name', {}).get('title', [])
                    if not l_title: 
                        for prop in level['properties'].values():
                            if prop.get('type') == 'title':
                                l_title = prop.get('title', [])
                    l_title_str = l_title[0]['plain_text'] if l_title else 'Unknown'
                    print('  Level:', l_title_str)
                    
                    if 'Upper Intermediate' in l_title_str or '中上級' in l_title_str:
                        r = await client.get(f'https://api.notion.com/v1/blocks/{level["id"]}/children', headers=headers)
                        blocks = r.json().get('results', [])
                        print('    Level Blocks:', [b['type'] for b in blocks])
                        for b in blocks:
                            if b['type'] == 'child_database':
                                r = await client.post(f'https://api.notion.com/v1/databases/{b["id"]}/query', headers=headers)
                                pages = r.json().get('results', [])
                                for p in pages:
                                    p_title = p['properties'].get('title', {}).get('title', []) or p['properties'].get('Name', {}).get('title', [])
                                    if not p_title:
                                        for prop in p['properties'].values():
                                            if prop.get('type') == 'title': p_title = prop.get('title', [])
                                    p_title_str = p_title[0]['plain_text'] if p_title else 'Unknown'
                                    print('      Page:', p_title_str, p['id'])
                                    r = await client.get(f'https://api.notion.com/v1/blocks/{p["id"]}/children', headers=headers)
                                    pb = r.json().get('results', [])
                                    print('        Blocks inside page:', [x['type'] for x in pb])
                            elif b['type'] == 'child_page':
                                print('      Child Page:', b['child_page']['title'])
                                r = await client.get(f'https://api.notion.com/v1/blocks/{b["id"]}/children', headers=headers)
                                pb = r.json().get('results', [])
                                print('        Blocks inside child_page:', [x['type'] for x in pb])

asyncio.run(run())
