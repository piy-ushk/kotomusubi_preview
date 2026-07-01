from supabase_service import supabase_client
import json
import sys

# Get blocks for Chapter 6 lesson
chapter6_id = 'd59edc46-8f20-8354-8805-01959648e824'
res = supabase_client.table('lesson_blocks').select('id, role, sort_order, content_json').eq('lesson_id', chapter6_id).order('sort_order').execute()
blocks = res.data or []

sys.stdout.buffer.write((f"Total blocks in Ch6: {len(blocks)}\n").encode('utf-8'))
for b in blocks[:3]:
    content_raw = b.get('content_json', '')
    sys.stdout.buffer.write((f"Block: {b['id']} | content start: {content_raw[:300]}\n").encode('utf-8'))
    sys.stdout.buffer.write(b'\n')
