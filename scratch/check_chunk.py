import asyncio
from database import AsyncSessionLocal, OfficialAssetVector
from sqlalchemy import select

async def check_chunk():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(OfficialAssetVector).where(OfficialAssetVector.video_chunk_url.contains("seg003.ts")))
        record = result.scalars().first()
        if record:
            print(f"Found record for seg003.ts: match_id={record.match_id}")
        else:
            print("seg003.ts not found in DB as official asset.")

if __name__ == "__main__":
    asyncio.run(check_chunk())
