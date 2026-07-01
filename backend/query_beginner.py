from supabase_service import supabase_client
import json
import sys

# Get lessons in the Beginner level (初級)
beginner_level_id = '33fedc46-8f20-80a4-9c32-f4987a4b1a00'
res = supabase_client.table('lessons').select('id, title, sort_order, is_chapter, chapter_id').eq('level_id', beginner_level_id).order('sort_order').execute()
lessons = res.data or []

sys.stdout.buffer.write((f"Total beginner lessons: {len(lessons)}\n").encode('utf-8'))
for l in lessons[:20]:  # First 20
    sys.stdout.buffer.write((json.dumps(l, ensure_ascii=False) + '\n').encode('utf-8'))
