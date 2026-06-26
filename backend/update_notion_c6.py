import os
import sys
import base64
import uuid
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from notion_client import Client
from supabase import create_client, Client as SupabaseClient

sys.stdout.reconfigure(encoding='utf-8')

# Load environment variables
load_dotenv('.env')
NOTION_API_KEY = os.getenv('NOTION_API_KEY')
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

PAGE_ID = '737edc46-8f20-83d6-ba9e-01100678d7ba'
BUCKET_NAME = 'media-cache'
HTML_FILE = '../6-1-tekudasai-lesson.html'

notion = Client(auth=NOTION_API_KEY)
supabase: SupabaseClient = create_client(SUPABASE_URL, SUPABASE_KEY)

def upload_base64_image(b64_string, ext):
    file_id = str(uuid.uuid4())
    filename = f"notion_sync/{file_id}.{ext}"
    
    # decode base64
    if b64_string.startswith('data:image'):
        header, b64_string = b64_string.split(',', 1)
        
    image_data = base64.b64decode(b64_string)
    
    # upload to supabase
    res = supabase.storage.from_(BUCKET_NAME).upload(
        path=filename,
        file=image_data,
        file_options={"content-type": f"image/{ext}"}
    )
    
    # get public url
    public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(filename)
    return public_url

def parse_html_to_blocks():
    with open(HTML_FILE, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f.read(), 'html.parser')
    
    blocks = []
    
    # helper
    def text_block(content):
        return {
            "type": "text",
            "text": {"content": content[:2000]} # Notion limits
        }
        
    def add_paragraph(text):
        if not text.strip(): return
        blocks.append({
            "object": "block",
            "type": "paragraph",
            "paragraph": {
                "rich_text": [text_block(text)]
            }
        })

    def add_heading_2(text):
        if not text.strip(): return
        blocks.append({
            "object": "block",
            "type": "heading_2",
            "heading_2": {
                "rich_text": [text_block(text)]
            }
        })

    def add_heading_3(text):
        if not text.strip(): return
        blocks.append({
            "object": "block",
            "type": "heading_3",
            "heading_3": {
                "rich_text": [text_block(text)]
            }
        })
        
    def add_quote(text):
        if not text.strip(): return
        blocks.append({
            "object": "block",
            "type": "quote",
            "quote": {
                "rich_text": [text_block(text)]
            }
        })
        
    def add_bullet(text):
        if not text.strip(): return
        blocks.append({
            "object": "block",
            "type": "bulleted_list_item",
            "bulleted_list_item": {
                "rich_text": [text_block(text)]
            }
        })
        
    def add_image(url):
        blocks.append({
            "object": "block",
            "type": "image",
            "image": {
                "type": "external",
                "external": {"url": url}
            }
        })
    
    page_div = soup.find('div', class_='page')
    if not page_div:
        return blocks
        
    for section in page_div.find_all(['header', 'section']):
        for elem in section.descendants:
            if getattr(elem, 'name', None) in ['h1', 'h2']:
                add_heading_2(elem.get_text().strip())
            elif getattr(elem, 'name', None) == 'h3':
                add_heading_3(elem.get_text().strip())
            elif getattr(elem, 'name', None) == 'p':
                # Skip nested p's inside examples/drills if we handle them separately?
                # For simplicity, we just extract text from p.
                # Avoid if it's inside a button or toggle.
                parent = elem.parent
                if parent.name not in ['button', 'details', 'summary', 'li', 'td', 'th']:
                    add_paragraph(elem.get_text().strip())
            elif getattr(elem, 'name', None) == 'img':
                src = elem.get('src', '')
                if src.startswith('data:image'):
                    # determine ext
                    ext = 'png'
                    if 'jpeg' in src: ext = 'jpg'
                    if 'webp' in src: ext = 'webp'
                    print("Uploading image...")
                    try:
                        url = upload_base64_image(src, ext)
                        add_image(url)
                    except Exception as e:
                        print(f"Failed to upload image: {e}")
            elif getattr(elem, 'name', None) == 'div' and 'bubble' in elem.get('class', []):
                add_quote(elem.get_text().strip())
            elif getattr(elem, 'name', None) == 'li':
                add_bullet(elem.get_text().strip())
            elif getattr(elem, 'name', None) == 'td':
                text = elem.get_text().strip()
                if text:
                    # just append as bullet list to mimic table for now since native table block API is complex 
                    add_bullet(text)
                
    return blocks

def clear_notion_page(page_id):
    print("Clearing old blocks...")
    has_more = True
    next_cursor = None
    blocks_to_delete = []
    
    while has_more:
        res = notion.blocks.children.list(block_id=page_id, start_cursor=next_cursor)
        for b in res.get('results', []):
            blocks_to_delete.append(b['id'])
        has_more = res.get('has_more', False)
        next_cursor = res.get('next_cursor')
        
    for b_id in blocks_to_delete:
        try:
            notion.blocks.delete(block_id=b_id)
        except Exception as e:
            print(f"Error deleting block {b_id}: {e}")

def append_blocks_in_chunks(page_id, blocks):
    print(f"Appending {len(blocks)} blocks...")
    chunk_size = 50
    for i in range(0, len(blocks), chunk_size):
        chunk = blocks[i:i+chunk_size]
        notion.blocks.children.append(block_id=page_id, children=chunk)
        print(f"Appended {i + len(chunk)} / {len(blocks)}")

if __name__ == "__main__":
    blocks = parse_html_to_blocks()
    print(f"Parsed {len(blocks)} blocks from HTML")
    clear_notion_page(PAGE_ID)
    append_blocks_in_chunks(PAGE_ID, blocks)
    print("Done!")
