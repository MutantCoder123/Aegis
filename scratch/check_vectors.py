import asyncio
from sqlalchemy import text
from database import AsyncSessionLocal

async def check_vectors():
    async with AsyncSessionLocal() as session:
        result = await session.execute(text("SELECT video_chunk_url, timestamp FROM official_asset_vectors ORDER BY id DESC LIMIT 20;"))
        rows = result.fetchall()
        print(f"{'Video Chunk URL':<80} | {'Timestamp'}")
        print("-" * 100)
        for row in rows:
            print(f"{str(row[0]):<80} | {row[1]}")

if __name__ == "__main__":
    asyncio.run(check_vectors())
