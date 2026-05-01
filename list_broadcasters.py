import asyncio
import os
import sys

sys.path.append(os.getcwd())
from database import AsyncSessionLocal, Broadcaster, BroadcasterKey
from sqlalchemy import select

async def check():
    async with AsyncSessionLocal() as session:
        print("--- Broadcasters ---")
        res = await session.execute(select(Broadcaster))
        for b in res.scalars().all():
            print(f"ID: {b.id} | Slug: {b.slug} | Name: {b.name}")
            
        print("\n--- Keys ---")
        res = await session.execute(select(BroadcasterKey))
        for k in res.scalars().all():
            print(f"Broadcaster: {k.broadcaster_id} | Key: {k.api_key} | Active: {k.is_active}")

if __name__ == "__main__":
    asyncio.run(check())
