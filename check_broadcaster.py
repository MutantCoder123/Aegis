import asyncio
import os
import sys

sys.path.append(os.getcwd())
from database import AsyncSessionLocal
from sqlalchemy import text

async def check():
    async with AsyncSessionLocal() as session:
        res = await session.execute(text("SELECT b.name, b.id, count(v.id) FROM official_asset_vectors v JOIN broadcasters b ON v.broadcaster_id = b.id WHERE v.match_id = 'MASTER_TEST_001' GROUP BY b.name, b.id"))
        for r in res:
            print(f"Broadcaster Name: {r[0]}, ID: {r[1]}, Vectors: {r[2]}")

if __name__ == "__main__":
    asyncio.run(check())
