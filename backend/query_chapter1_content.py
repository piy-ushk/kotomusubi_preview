from supabase_service import supabase_client
import json
import sys

# Get blocks for Chapter 1 lesson
chapter1_id = '3f3edc46-8f20-83b5-8b83-813292c5056f'
res = supabase_client.table('lesson_blocks').select('id, role, sort_order, content_json').eq('lesson_id', chapter1_id).order('sort_order').execute()
blocks = res.data or []

for b in blocks:
    content_raw = b.get('content_json', '')
    try:
        content = json.loads(content_raw)
        with open('chapter1_content.json', 'w', encoding='utf-8') as f:
            json.dump(content, f, ensure_ascii=False, indent=2)
        sys.stdout.buffer.write((f"Saved content for block: {b['id']}\n").encode('utf-8'))
    except Exception as e:
        sys.stdout.buffer.write((f"Error: {e}\n").encode('utf-8'))
