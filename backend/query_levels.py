from supabase_service import supabase_client
import json
import sys

# Get all levels first
res = supabase_client.table('levels').select('id, title, textbook_id').execute()
levels = res.data or []

# Get grammar textbook 
res2 = supabase_client.table('textbooks').select('id, title').execute()
textbooks = res2.data or []

sys.stdout.buffer.write(('Textbooks:\n').encode('utf-8'))
for t in textbooks:
    sys.stdout.buffer.write((json.dumps(t, ensure_ascii=False) + '\n').encode('utf-8'))

sys.stdout.buffer.write(('Levels:\n').encode('utf-8'))
for l in levels:
    sys.stdout.buffer.write((json.dumps(l, ensure_ascii=False) + '\n').encode('utf-8'))
