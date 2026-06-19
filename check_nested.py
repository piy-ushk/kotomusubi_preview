import sqlite3, json
conn = sqlite3.connect('backend/app.db')
conn.row_factory = sqlite3.Row
c = conn.cursor()
c.execute("SELECT content_json FROM lesson_blocks WHERE lesson_id = 'd59edc46-8f20-8354-8805-01959648e824'")
rows = c.fetchall()
for r in rows:
    content = json.loads(r['content_json'])
    for i, block in enumerate(content.get('content', [])):
        if 'database_items' in block:
            for j, item in enumerate(block['database_items']):
                pb = item.get('page_blocks', [])
                print('DB Item', j, ': blocks count =', len(pb))
                for pb_block in pb:
                    t = pb_block.get('block', {}).get('type')
                    if t in ('heading_1', 'heading_2'):
                        print('  Nested heading:', t)
