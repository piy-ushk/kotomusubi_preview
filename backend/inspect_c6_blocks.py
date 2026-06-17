import sqlite3
import json

conn = sqlite3.connect('backend/app.db')
conn.row_factory = sqlite3.Row
c = conn.cursor()

# Query blocks for lesson d59edc46-8f20-8354-8805-01959648e824
c.execute("SELECT id, role, content_json FROM lesson_blocks WHERE lesson_id = 'd59edc46-8f20-8354-8805-01959648e824'")
rows = c.fetchall()

print(f"Total blocks for Chapter 6 lesson: {len(rows)}")

for r in rows:
    content = json.loads(r['content_json'])
    
    # Check if there are image blocks
    def print_images(obj, path=""):
        if isinstance(obj, dict):
            if obj.get('type') == 'image':
                print(f"Found Image in block {r['id']} (path {path}):")
                print(json.dumps(obj, indent=2, ensure_ascii=False))
            for k, v in obj.items():
                print_images(v, f"{path}.{k}" if path else k)
        elif isinstance(obj, list):
            for i, item in enumerate(obj):
                print_images(item, f"{path}[{i}]")
                
    print_images(content)

conn.close()
