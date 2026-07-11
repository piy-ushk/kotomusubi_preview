from supabase_service import supabase_client
import json
import sys

# Get blocks for Chapter 1 lesson
chapter1_id = '3f3edc46-8f20-83b5-8b83-813292c5056f'
res = supabase_client.table('lesson_blocks').select('id, role, sort_order, content_json').eq('lesson_id', chapter1_id).order('sort_order').execute()
blocks = res.data or []

for b in blocks:
    content_raw = b.get('content_json', '')
    content = json.loads(content_raw)
    
    # Find child_database items
    for item in content.get('content', []):
        if item.get('type') == 'child_database':
            items = item.get('database_items', [])
            sys.stdout.buffer.write((f"Found {len(items)} database items\n").encode('utf-8'))
            for di in items:
                sys.stdout.buffer.write((f"  - {di.get('title')}: {di.get('id')}\n").encode('utf-8'))
            
            # Now look at the first item (1-1) page_blocks
            if items:
                first_item = items[0]
                page_blocks = first_item.get('page_blocks', [])
                sys.stdout.buffer.write((f"\nFirst item ({first_item.get('title')}) has {len(page_blocks)} page_blocks\n").encode('utf-8'))
                for pb in page_blocks[:5]:
                    pb_type = pb.get('type', 'unknown')
                    if pb_type == 'paragraph':
                        text = pb.get('paragraph', {}).get('rich_text', [{}])[0].get('plain_text', '') if pb.get('paragraph', {}).get('rich_text') else ''
                        sys.stdout.buffer.write((f"  [{pb_type}] {text[:80]}\n").encode('utf-8'))
                    elif pb_type == 'image':
                        url = pb.get('image', {}).get('file', {}).get('url', '')
                        sys.stdout.buffer.write((f"  [{pb_type}] {url[:80]}\n").encode('utf-8'))
                    else:
                        sys.stdout.buffer.write((f"  [{pb_type}]\n").encode('utf-8'))
