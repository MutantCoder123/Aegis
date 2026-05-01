import asyncio
import os
from database import AsyncSessionLocal, OfficialAssetVector
from sqlalchemy import select
from dotenv import load_dotenv

load_dotenv()

async def check_vault():
    async with AsyncSessionLocal() as session:
        stmt = select(OfficialAssetVector).where(OfficialAssetVector.video_chunk_url != None).limit(5)
        result = await session.execute(stmt)
        rows = result.scalars().all()
        
        print(f"[*] Found {len(rows)} vectors with URLs")
        for row in rows:
            print(f"ID: {row.id} | Match: {row.match_id} | URL: {row.video_chunk_url}")

if __name__ == "__main__":
    asyncio.run(check_vault())
