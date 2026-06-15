import sqlite3
import os
import json

DB_PATH = os.path.join(os.path.dirname(__file__), "app.db") # Rename DB for clarity, old one was annotations.db, let's start fresh with app.db to avoid conflicts

def get_connection():
    # Helper to return connection with dictionary rows
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    c = conn.cursor()
    
    # 1. Annotations (User data)
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

    # 2. Sync Status
    c.execute('''
        CREATE TABLE IF NOT EXISTS sync_metadata (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            last_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            status TEXT,
            details TEXT
        )
    ''')

    # 3. Core Content Schema (Synced from Notion)
    c.execute('''
        CREATE TABLE IF NOT EXISTS textbooks (
            id TEXT PRIMARY KEY,
            title TEXT,
            sort_order INTEGER,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    c.execute('''
        CREATE TABLE IF NOT EXISTS levels (
            id TEXT PRIMARY KEY,
            textbook_id TEXT,
            title TEXT,
            cover_url TEXT,
            sort_order INTEGER,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    c.execute('''
        CREATE TABLE IF NOT EXISTS lessons (
            id TEXT PRIMARY KEY,
            level_id TEXT,
            chapter_id TEXT,
            title TEXT,
            is_chapter BOOLEAN,
            sort_order INTEGER,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    c.execute('''
        CREATE TABLE IF NOT EXISTS lesson_blocks (
            id TEXT PRIMARY KEY,
            lesson_id TEXT,
            role TEXT,
            content_json TEXT,
            sort_order INTEGER
        )
    ''')

    c.execute('''
        CREATE TABLE IF NOT EXISTS vocabulary (
            id TEXT PRIMARY KEY,
            lesson_id TEXT,
            jp TEXT,
            reading TEXT,
            en TEXT,
            kanji TEXT,
            pos TEXT,
            example TEXT,
            status TEXT DEFAULT 'not yet'
        )
    ''')

    conn.commit()
    conn.close()

# --- Annotation Functions ---
def add_annotation(user_id, lesson_id, block_id, action, content):
    conn = get_connection()
    c = conn.cursor()
    c.execute('''
        INSERT INTO annotations (user_id, lesson_id, block_id, action, content)
        VALUES (?, ?, ?, ?, ?)
    ''', (user_id, lesson_id, block_id, action, content))
    conn.commit()
    inserted_id = c.lastrowid
    conn.close()
    return inserted_id

def delete_annotation(annotation_id, user_id):
    conn = get_connection()
    c = conn.cursor()
    c.execute('DELETE FROM annotations WHERE id = ? AND user_id = ?', (annotation_id, user_id))
    conn.commit()
    conn.close()
    return True

def get_annotations(user_id, lesson_id):
    conn = get_connection()
    c = conn.cursor()
    c.execute('SELECT block_id, action, content, id FROM annotations WHERE user_id = ? AND lesson_id = ? ORDER BY id ASC', (user_id, lesson_id))
    rows = c.fetchall()
    conn.close()
    
    ann_dict = {}
    for r in rows:
        b_id, act, txt, a_id = r['block_id'], r['action'], r['content'], r['id']
        if b_id not in ann_dict:
            ann_dict[b_id] = []
        ann_dict[b_id].append({
            "id": a_id,
            "action": act,
            "content": txt
        })
    return ann_dict
