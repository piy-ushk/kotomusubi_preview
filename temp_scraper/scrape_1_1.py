import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        print('Navigating...')
        try:
            await page.goto('https://app.notion.com/p/357edc468f2080d1bf32f8b92fb5ebde', wait_until='load', timeout=60000)
        except Exception as e:
            print("Goto warning:", e)
        await page.wait_for_timeout(10000)
        
        # Click the link that contains 1-1
        link = page.locator('text="1-1"')
        if await link.count() > 0:
            print('Found link! Clicking...')
            await link.first.click()
            await page.wait_for_timeout(10000)
            html = await page.content()
            with open('notion_1_1.html', 'w', encoding='utf-8') as f:
                f.write(html)
            
            # Extract text from code blocks
            code_blocks = await page.query_selector_all('.notion-code-block')
            print(f'Found {len(code_blocks)} code blocks.')
            for i, block in enumerate(code_blocks):
                text = await block.inner_text()
                with open(f'code_block_{i}.txt', 'w', encoding='utf-8') as f:
                    f.write(text)
            
            # Find audio links
            audio_elements = await page.query_selector_all('a[href*=\'.mp3\']')
            for a in audio_elements:
                print('Audio link:', await a.get_attribute('href'))
                
            print('Saved 1-1 HTML!')
        else:
            print('Could not find 1-1 link')
            
        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
