import asyncio
from database import AsyncSessionLocal, OfficialAssetVector
from sqlalchemy import select

async def get_any_chunk():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(OfficialAssetVector.video_chunk_url).limit(1))
        url = result.scalar()
        print(f"Sample indexed chunk: {url}")

if __name__ == "__main__":
    asyncio.run(get_any_chunk())
