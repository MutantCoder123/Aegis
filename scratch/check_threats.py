import asyncio
from sqlalchemy import text
from database import AsyncSessionLocal

async def check_threats():
    async with AsyncSessionLocal() as session:
        result = await session.execute(text("SELECT id, matched_official_url, matched_official_id FROM processed_streams ORDER BY id DESC LIMIT 10;"))
        rows = result.fetchall()
        print(f"{'ID':<10} | {'Match ID':<20} | {'Matched Official URL'}")
        print("-" * 100)
        for row in rows:
            print(f"{row[0]:<10} | {str(row[2]):<20} | {str(row[1])}")

if __name__ == "__main__":
    asyncio.run(check_threats())
