import asyncio
from database import AsyncSessionLocal, engine
from sqlalchemy import text

async def clear():
    async with engine.begin() as conn:
        await conn.execute(text("TRUNCATE TABLE processed_streams RESTART IDENTITY CASCADE"))
    print("Cleaned processed_streams table.")

if __name__ == "__main__":
    asyncio.run(clear())
