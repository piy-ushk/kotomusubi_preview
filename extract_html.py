import sys, re

with open('6-1-tekudasai-lesson.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the index of <div class="page">
idx = content.find('<div class="page">')
if idx != -1:
    page_content = content[idx + len('<div class="page">'):]
    # Remove the last </div> and </body> </html>
    page_content = re.sub(r'</div>\s*</body>\s*</html>\s*$', '', page_content)
    
    page_content = re.sub(r'<div class="toolbar">.*?</div>', '', page_content, flags=re.DOTALL)
    
    jsx = page_content.replace('class="', 'className="')
    # Unclosed tags
    jsx = re.sub(r'<br>', '<br />', jsx)
    jsx = re.sub(r'<hr>', '<hr />', jsx)
    jsx = re.sub(r'<img(.*?)(?<!/)>', r'<img\1 />', jsx)
    jsx = re.sub(r'checked>', 'checked />', jsx)
    
    # HTML attributes to React camelCase
    jsx = jsx.replace('onclick="', 'onClick="')
    jsx = jsx.replace('colspan="', 'colSpan="')
    
    with open('frontend/src/pages/Lesson6_1.jsx', 'w', encoding='utf-8') as out:
        out.write('import React, { useState } from "react";\n\n')
        out.write('export default function Lesson6_1({ translateAll }) {\n')
        out.write('  return (\n    <div className={`grammar-lesson-page ${translateAll ? \'show-en\' : \'\'}`}>\n      <div className="page">\n')
        out.write(jsx)
        out.write('\n      </div>\n    </div>\n  );\n}\n')
    print('Successfully created Lesson6_1.jsx')
else:
    print('Failed to find page container')
