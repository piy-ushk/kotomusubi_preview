import sqlite3
import json

conn = sqlite3.connect('backend/app.db')
conn.row_factory = sqlite3.Row
c = conn.cursor()

c.execute("SELECT id, lesson_id, role, content_json FROM lesson_blocks")
rows = c.fetchall()

images_found = []

for r in rows:
    content = json.loads(r['content_json'])
    
    def find_images(obj, path=""):
        if isinstance(obj, dict):
            if obj.get('type') == 'image':
                images_found.append({
                    "block_id": r['id'],
                    "lesson_id": r['lesson_id'],
                    "role": r['role'],
                    "image_data": obj
                })
            for k, v in obj.items():
                find_images(v, f"{path}.{k}" if path else k)
        elif isinstance(obj, list):
            for i, item in enumerate(obj):
                find_images(item, f"{path}[{i}]")

    find_images(content)

print(f"Total image blocks found: {len(images_found)}")
# Write a few of them to see what the urls are
with open("backend/inspect_images.txt", "w", encoding="utf-8") as f:
    for img in images_found[:50]:
        f.write(f"Lesson: {img['lesson_id']}, Role: {img['role']}, Block: {img['block_id']}\n")
        f.write(f"Image Data: {json.dumps(img['image_data'], indent=2, ensure_ascii=False)}\n")
        f.write("-" * 50 + "\n")

conn.close()
