import asyncio
from database import engine
from sqlalchemy import text

async def run():
    async with engine.begin() as conn:
        print("Dropping table...")
        await conn.execute(text("DROP TABLE IF EXISTS processed_streams"))
        print("Done.")

asyncio.run(run())
