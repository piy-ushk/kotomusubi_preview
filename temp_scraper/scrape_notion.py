import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        print("Navigating to Notion...")
        # Increase timeout and wait for domcontentloaded
        try:
            await page.goto("https://app.notion.com/p/357edc468f2080d1bf32f8b92fb5ebde", wait_until="load", timeout=60000)
        except Exception as e:
            print("Goto warning:", e)
            
        print("Waiting for notion page content...")
        await page.wait_for_timeout(10000) # hard wait 10s
        
        html_content = await page.content()
        with open("notion_raw.html", "w", encoding="utf-8") as f:
            f.write(html_content)
        
        # Extract text from code blocks
        code_blocks = await page.query_selector_all(".notion-code-block")
        print(f"Found {len(code_blocks)} code blocks.")
        for i, block in enumerate(code_blocks):
            text = await block.inner_text()
            with open(f"code_block_{i}.txt", "w", encoding="utf-8") as f:
                f.write(text)
                
        # Find audio links
        audio_elements = await page.query_selector_all("a[href*='.mp3'], a[href*='.m4a'], a[href*='.wav'], audio")
        print(f"Found {len(audio_elements)} audio links.")
        for i, audio in enumerate(audio_elements):
            href = await audio.get_attribute("href") or await audio.get_attribute("src")
            print(f"Found audio link: {href}")
            
        print("Done!")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
