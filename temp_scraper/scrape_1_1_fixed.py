import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        print('Navigating...')
        await page.goto('https://app.notion.com/p/357edc468f2080d1bf32f8b92fb5ebde', wait_until='load', timeout=60000)
        await page.wait_for_timeout(10000)
        
        # Find all a tags
        links = await page.query_selector_all('a')
        target_href = None
        for link in links:
            text = await link.inner_text()
            if '1-1' in text:
                target_href = await link.get_attribute('href')
                print('Found 1-1 link text:', text, 'href:', target_href)
                break
                
        if target_href:
            print('Navigating to', target_href)
            await page.goto('https://app.notion.com' + target_href, wait_until='load', timeout=60000)
            await page.wait_for_timeout(10000)
            
            code_blocks = await page.query_selector_all('.notion-code-block')
            print(f'Found {len(code_blocks)} code blocks on 1-1 page.')
            for i, block in enumerate(code_blocks):
                text = await block.inner_text()
                with open(f'code_1_1_{i}.txt', 'w', encoding='utf-8') as f:
                    f.write(text)
            print('Saved code blocks from 1-1!')
        else:
            print('Could not find 1-1 link')
            
        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
