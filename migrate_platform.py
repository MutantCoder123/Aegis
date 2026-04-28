import asyncio
from database import engine

async def migrate():
    async with engine.begin() as conn:
        from sqlalchemy import text
        try:
            await conn.execute(text("ALTER TABLE processed_streams ADD COLUMN IF NOT EXISTS platform VARCHAR(50);"))
            print("Migration successful.")
        except Exception as e:
            print(f"Error: {e}")

asyncio.run(migrate())
