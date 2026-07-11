from supabase_service import supabase_client
import json

# Get lessons in the beginner level
res = supabase_client.table('lessons').select('id, title, level_id, sort_order').execute()
lessons = res.data or []

# Filter for chapter 1-1 related lessons — look for sort_order=1
found = [l for l in lessons if l.get('sort_order') == 1]
# Also show all lessons with sort_order <= 5 to find Chapter 1 range
sample = sorted(lessons, key=lambda x: (x.get('level_id', ''), x.get('sort_order', 0)))[:20]

print(f"Total lessons: {len(lessons)}")
print(f"1-1 related: {len(found)}")
for l in found:
    import sys
    sys.stdout.buffer.write((json.dumps(l, ensure_ascii=False)+'\n').encode('utf-8'))
