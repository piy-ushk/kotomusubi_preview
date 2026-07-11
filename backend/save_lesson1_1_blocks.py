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
    
    for item in content.get('content', []):
        if item.get('type') == 'child_database':
            items = item.get('database_items', [])
            first_item = items[0] if items else None
            if not first_item:
                continue
            
            # Check if it's the chapter database
            if 'レベルチェック' in first_item.get('title', ''):
                continue
                
            page_blocks = first_item.get('page_blocks', [])
            
            with open('lesson1_1_blocks.json', 'w', encoding='utf-8') as f:
                json.dump(page_blocks, f, ensure_ascii=False, indent=2)
            sys.stdout.buffer.write((f"Saved {len(page_blocks)} blocks from '{first_item.get('title')}' to lesson1_1_blocks.json\n").encode('utf-8'))
            break
