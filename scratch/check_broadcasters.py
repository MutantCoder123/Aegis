import asyncio
from sqlalchemy import text
from database import AsyncSessionLocal

async def check_broadcasters():
    async with AsyncSessionLocal() as session:
        result = await session.execute(text("SELECT id, slug FROM broadcasters;"))
        rows = result.fetchall()
        print("Broadcasters:")
        for row in rows:
            print(f"ID: {row[0]}, Slug: {row[1]}")

if __name__ == "__main__":
    asyncio.run(check_broadcasters())
