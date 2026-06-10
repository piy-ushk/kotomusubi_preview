import httpx
import json

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
    
    for lvl in levels:
        print(f"\nLevel: {lvl['title']}")
        les_resp = httpx.get(f"http://localhost:8000/api/levels/{lvl['id']}/lessons")
        lessons = les_resp.json()
        for les in lessons:
            print(f"- {les['title']} ({les['id']})")
            if "Chapter 1" in les['title']:
                print(f"!!! FOUND CHAPTER 1: {les['id']}")

main()
