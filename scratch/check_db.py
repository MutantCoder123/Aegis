import asyncio
from database import AsyncSessionLocal
from sqlalchemy import text

async def check():
    async with AsyncSessionLocal() as session:
        res = await session.execute(text("SELECT id, media_url, matched_official_url FROM processed_streams"))
        rows = res.fetchall()
        print(f"[*] Found {len(rows)} processed streams.")
        for row in rows:
            print(f"ID: {row.id} | Media: {row.media_url} | Match: {row.matched_official_url}")

if __name__ == "__main__":
    asyncio.run(check())
