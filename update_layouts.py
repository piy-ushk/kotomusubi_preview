import re
from pathlib import Path

files = [
    'frontend/src/pages/GrammarLessonLayout.jsx',
    'frontend/src/pages/TravelLessonLayout.jsx',
    'frontend/src/pages/TopicTalkLessonLayout.jsx'
]

for f in files:
    path = Path(f)
    if not path.exists():
        continue
    content = path.read_text(encoding='utf-8')
    if 'AutoTranslate' not in content:
        content = re.sub(r'import React(.*?);', r'import React\1;\nimport AutoTranslate from \'../components/AutoTranslate\';', content, count=1)
        
        # Replace exact strings
        content = content.replace('<p className="en">{en}</p>', '<AutoTranslate text={en} targetLang={translationLanguage} className="en" />')
        content = content.replace('<p className="en">{english}</p>', '<AutoTranslate text={english} targetLang={translationLanguage} className="en" />')
        content = content.replace('<p className="en">{meaning}</p>', '<AutoTranslate text={meaning} targetLang={translationLanguage} className="en" />')
        content = content.replace('<div className="en">{en}</div>', '<AutoTranslate text={en} targetLang={translationLanguage} className="en" as="div" />')
        content = content.replace('<div className="en" style={{ fontSize: \'0.85rem\', color: \'var(--text-muted)\' }}>{en}</div>', '<AutoTranslate text={en} targetLang={translationLanguage} className="en" as="div" style={{ fontSize: \'0.85rem\', color: \'var(--text-muted)\' }} />')
        
        path.write_text(content, encoding='utf-8')
        print(f'Updated {f}')

static_files = [
    'frontend/src/pages/Lesson1_1.jsx',
    'frontend/src/pages/Lesson6_1.jsx'
]

for f in static_files:
    path = Path(f)
    if not path.exists():
        continue
    content = path.read_text(encoding='utf-8')
    if 'AutoTranslate' not in content:
        content = re.sub(r'import React(.*?)from\s+[\'"]react[\'"];', r'import React\1from \'react\';\nimport AutoTranslate from \'../components/AutoTranslate\';', content, count=1)
        
        # Replace static strings
        def repl_p(m):
            return f'<AutoTranslate text={{`{m.group(1)}`}} targetLang={{translationLanguage}} className="en" />'
        def repl_div(m):
            return f'<AutoTranslate text={{`{m.group(1)}`}} targetLang={{translationLanguage}} className="en" as="div" />'
            
        content = re.sub(r'<p className="en">(.*?)</p>', repl_p, content)
        content = re.sub(r'<div className="en">(.*?)</div>', repl_div, content)
        
        path.write_text(content, encoding='utf-8')
        print(f'Updated {f}')
