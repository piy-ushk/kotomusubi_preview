import os
from supabase_service import supabase_client

def init_db():
    pass # Tables should be created manually in Supabase SQL Editor

# --- Annotation Functions ---
def add_annotation(user_id, lesson_id, block_id, action, content):
    if not supabase_client:
        return None
        
    data, count = supabase_client.table("annotations").insert({
        "user_id": user_id,
        "lesson_id": lesson_id,
        "block_id": block_id,
        "action": action,
        "content": content
    }).execute()
    
    if data and len(data[1]) > 0:
        return data[1][0]['id']
    return None

def delete_annotation(annotation_id, user_id):
    if not supabase_client:
        return False
        
    supabase_client.table("annotations").delete().eq("id", annotation_id).eq("user_id", user_id).execute()
    return True

def get_annotations(user_id, lesson_id):
    if not supabase_client:
        return {}
        
    res = supabase_client.table("annotations").select("*").eq("user_id", user_id).eq("lesson_id", lesson_id).order("id", desc=False).execute()
    
    ann_dict = {}
    for r in res.data:
        b_id, act, txt, a_id = r['block_id'], r['action'], r['content'], r['id']
        if b_id not in ann_dict:
            ann_dict[b_id] = []
        ann_dict[b_id].append({
            "id": a_id,
            "action": act,
            "content": txt
        })
    return ann_dict
