import asyncio
from database import engine
from sqlalchemy import text

async def migrate():
    async with engine.begin() as conn:
        print("[*] Migrating database schema...")
        await conn.execute(text("ALTER TABLE processed_streams ADD COLUMN IF NOT EXISTS matched_official_url TEXT"))
        await conn.execute(text("ALTER TABLE processed_streams ADD COLUMN IF NOT EXISTS matched_official_id TEXT"))
        print("[+] Migration successful.")

if __name__ == "__main__":
    asyncio.run(migrate())
