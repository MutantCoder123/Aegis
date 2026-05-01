import asyncio
import os
import sys

sys.path.append(os.getcwd())
from database import AsyncSessionLocal
from sqlalchemy import text

async def check():
    async with AsyncSessionLocal() as session:
        ids = ["MASTER_TEST_001", "MASTER_TEST_002", "MASTER_TEST_003", "MASTER_TEST_004", "MASTER_TEST_005", "MASTER_TEST_006"]
        for mid in ids:
            res = await session.execute(text("SELECT count(*) FROM official_asset_vectors WHERE match_id = :mid"), {"mid": mid})
            print(f"Vectors for {mid}: {res.scalar()}")

if __name__ == "__main__":
    asyncio.run(check())
