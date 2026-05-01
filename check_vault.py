import asyncio
from database import AsyncSessionLocal, OfficialAssetVector
from sqlalchemy.future import select

async def check():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(OfficialAssetVector).filter(OfficialAssetVector.video_chunk_url.like('%youtube.com%')))
        rows = result.scalars().all()
        if rows:
            print(f"Found {len(rows)} vectors with YouTube URL!")
            print(f"Sample match_id: {rows[0].match_id}, URL: {rows[0].video_chunk_url}")
        else:
            print("No YouTube URLs found in OfficialAssetVector. Let's check Broadcaster or general assets.")

if __name__ == "__main__":
    asyncio.run(check())
