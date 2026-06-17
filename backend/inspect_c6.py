import sqlite3
import json
import sys

conn = sqlite3.connect('backend/app.db')
conn.row_factory = sqlite3.Row
c = conn.cursor()

c.execute("SELECT id, title, level_id FROM lessons")
lessons = [dict(r) for r in c.fetchall()]

with open("backend/inspect_output.txt", "w", encoding="utf-8") as f:
    f.write("LESSONS:\n")
    f.write(json.dumps(lessons, indent=2, ensure_ascii=False))

conn.close()
print("Done writing to inspect_output.txt")
