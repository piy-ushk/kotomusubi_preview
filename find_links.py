import re
from bs4 import BeautifulSoup
html = open('temp_scraper/notion_raw.html', encoding='utf-8').read()
soup = BeautifulSoup(html, 'html.parser')
links = [a.get('href') for a in soup.find_all('a') if a.get('href')]
for l in set(links): print(l)
