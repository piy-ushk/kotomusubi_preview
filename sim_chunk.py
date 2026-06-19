import sqlite3, json, sys
sys.stdout.reconfigure(encoding='utf-8')
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
                if j == 0:
                    pb = item.get('page_blocks', [])
                    count = 0
                    for k, b in enumerate(pb):
                        t = b.get('type')
                        if t in ('heading_1', 'heading_2', 'heading_3'):
                            rt = b.get(t, {}).get('rich_text', [])
                            text = rt[0].get('plain_text', '') if rt else ''
                            print(f'-- Chunk Break at {k} (Type: {t}, Text: {text}) --')
                            print(f'Previous chunk had {count} blocks')
                            count = 0
                        else:
                            count += 1
                    print(f'Last chunk size: {count}')
