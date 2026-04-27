import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "annotations.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS annotations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            lesson_id TEXT,
            block_id TEXT,
            action TEXT,
            content TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

def add_annotation(user_id, lesson_id, block_id, action, content):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        INSERT INTO annotations (user_id, lesson_id, block_id, action, content)
        VALUES (?, ?, ?, ?, ?)
    ''', (user_id, lesson_id, block_id, action, content))
    conn.commit()
    inserted_id = c.lastrowid
    conn.close()
    return inserted_id

def delete_annotation(annotation_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('DELETE FROM annotations WHERE id = ?', (annotation_id,))
    conn.commit()
    conn.close()
    return True

def get_annotations(user_id, lesson_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT block_id, action, content, id FROM annotations WHERE user_id = ? AND lesson_id = ? ORDER BY id ASC', (user_id, lesson_id))
    rows = c.fetchall()
    conn.close()
    
    ann_dict = {}
    for r in rows:
        b_id, act, txt, a_id = r
        if b_id not in ann_dict:
            ann_dict[b_id] = []
        ann_dict[b_id].append({
            "id": a_id,
            "action": act,
            "content": txt
        })
    return ann_dict
