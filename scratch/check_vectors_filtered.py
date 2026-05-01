import asyncio
from sqlalchemy import text
from database import AsyncSessionLocal

async def check_vectors():
    async with AsyncSessionLocal() as session:
        result = await session.execute(text("SELECT video_chunk_url, timestamp, match_id FROM official_asset_vectors WHERE match_id = 'LAKERS_WARRIORS_001' ORDER BY id DESC LIMIT 20;"))
        rows = result.fetchall()
        print(f"{'Match ID':<20} | {'Video Chunk URL':<80} | {'Timestamp'}")
        print("-" * 120)
        for row in rows:
            print(f"{str(row[2]):<20} | {str(row[0]):<80} | {row[1]}")

if __name__ == "__main__":
    asyncio.run(check_vectors())
