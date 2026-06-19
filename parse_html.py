import sys, re
from bs4 import BeautifulSoup
sys.stdout.reconfigure(encoding='utf-8')

with open('6-1-tekudasai-lesson.html', 'r', encoding='utf-8') as f:
    soup = BeautifulSoup(f, 'html.parser')
    for section in soup.find_all('section', class_='section'):
        title = section.find('h2', class_='section-title')
        if title:
            print('Section:', title.get_text())
        else:
            print('Section: (No title)')
        
        for child in section.find_all(['h3', 'table', 'div']):
            classes = child.get('class', [])
            if 'subhead' in classes or 'form-table' in classes or 'ta-chart' in classes or 'examples' in classes or 'drills' in classes or 'dialogue' in classes:
                text = child.get_text(strip=True)[:50]
                c_str = '.'.join(classes)
                print(f'  {child.name}.{c_str} -> {text}')
