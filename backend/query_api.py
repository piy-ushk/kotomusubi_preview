import httpx

def main():
    tb_resp = httpx.get("http://localhost:8000/api/textbooks")
    textbooks = tb_resp.json()
    tb_id = None
    for tb in textbooks:
        if "Grammar Textbook" in tb["title"]:
            tb_id = tb["id"]
            break
            
    lvl_resp = httpx.get(f"http://localhost:8000/api/textbooks/{tb_id}/levels")
    levels = lvl_resp.json()
    lvl_id = None
    for lvl in levels:
        if "Super Beginner" in lvl["title"] or "超初級" in lvl["title"]:
            lvl_id = lvl["id"]
            break
            
    les_resp = httpx.get(f"http://localhost:8000/api/levels/{lvl_id}/lessons")
    lessons = les_resp.json()
    les_id = None
    for les in lessons:
        if "あいさつ" in les["title"] or "Greeting" in les["title"]:
            les_id = les["id"]
            break
            
    if les_id:
        print(f"Found lesson: {les_id}")
        content_resp = httpx.get(f"http://localhost:8000/api/lessons/{les_id}")
        content = content_resp.json()
        import json
        with open('lesson_content.json', 'w', encoding='utf-8') as f:
            json.dump(content, f, ensure_ascii=False, indent=2)
        print("Dumped lesson_content.json")

main()
