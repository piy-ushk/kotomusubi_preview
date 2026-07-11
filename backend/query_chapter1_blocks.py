from supabase_service import supabase_client
import json
import sys

# Get blocks for Chapter 1 lesson
chapter1_id = '3f3edc46-8f20-83b5-8b83-813292c5056f'
res = supabase_client.table('lesson_blocks').select('id, role, sort_order, content_json').eq('lesson_id', chapter1_id).order('sort_order').execute()
blocks = res.data or []

sys.stdout.buffer.write((f"Total blocks: {len(blocks)}\n").encode('utf-8'))
for b in blocks[:10]:
    # Truncate content_json for readability
    content = json.loads(b['content_json']) if b.get('content_json') else {}
    sys.stdout.buffer.write((json.dumps({'id': b['id'], 'role': b['role'], 'content_type': content.get('type', 'unknown')}, ensure_ascii=False) + '\n').encode('utf-8'))
