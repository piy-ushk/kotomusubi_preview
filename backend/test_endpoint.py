import asyncio
import httpx

async def run():
    async with httpx.AsyncClient() as client:
        # We need a level id for Upper Intermediate.
        # From previous script, Upper Intermediate Level ID is what?
        # Let's just hit the endpoint directly using the dev server if it's running.
        pass

if __name__ == '__main__':
    asyncio.run(run())
