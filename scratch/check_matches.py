import asyncio
from database import AsyncSessionLocal, OfficialAssetVector
from sqlalchemy import select, distinct

async def check_matches():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(distinct(OfficialAssetVector.match_id)))
        matches = result.scalars().all()
        print(f"Match IDs in DB: {matches}")

if __name__ == "__main__":
    asyncio.run(check_matches())
