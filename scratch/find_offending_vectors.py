import asyncio
from sqlalchemy import text
from database import AsyncSessionLocal

async def find_offending_vectors():
    async with AsyncSessionLocal() as session:
        result = await session.execute(text("SELECT DISTINCT match_id, video_chunk_url FROM official_asset_vectors WHERE video_chunk_url LIKE '%7a1ab0a8%';"))
        rows = result.fetchall()
        print("Vectors pointing to 7a1ab0a8:")
        for row in rows:
            print(f"Match ID: {row[0]}, URL: {row[1]}")

if __name__ == "__main__":
    asyncio.run(find_offending_vectors())
