from pathlib import Path
files = [
    'frontend/src/pages/GrammarLessonLayout.jsx',
    'frontend/src/pages/TravelLessonLayout.jsx',
    'frontend/src/pages/TopicTalkLessonLayout.jsx',
    'frontend/src/pages/Lesson1_1.jsx',
    'frontend/src/pages/Lesson6_1.jsx'
]
for f in files:
    p = Path(f)
    if p.exists():
        content = p.read_text(encoding='utf-8')
        content = content.replace(r"\'", "'")
        p.write_text(content, encoding='utf-8')
        print(f"Fixed {f}")
