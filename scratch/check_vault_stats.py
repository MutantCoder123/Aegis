import asyncio
from database import AsyncSessionLocal
from sqlalchemy import text

async def check():
    async with AsyncSessionLocal() as session:
        res = await session.execute(text("SELECT match_id, count(*) FROM official_asset_vectors GROUP BY match_id"))
        rows = res.fetchall()
        for row in rows:
            print(f"Match: {row[0]}, Count: {row[1]}")

if __name__ == "__main__":
    asyncio.run(check())
