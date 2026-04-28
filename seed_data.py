import asyncio
import uuid
from database import AsyncSessionLocal, Broadcaster, BroadcasterKey
from sqlalchemy.future import select

async def seed():
    # Ensure tables exist
    from database import engine, Base
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    async with AsyncSessionLocal() as session:
        # Define broadcasters to match frontend slugs
        broadcasters_data = [
            {"name": "National Basketball Association", "slug": "nba", "key": "nba_live_source_key"},
            {"name": "Ultimate Fighting Championship", "slug": "ufc", "key": "ufc_live_source_key"},
            {"name": "FIFA World Cup", "slug": "fifa", "key": "fifa_live_source_key"},
        ]
        
        for data in broadcasters_data:
            # Check if broadcaster exists
            result = await session.execute(select(Broadcaster).where(Broadcaster.slug == data["slug"]))
            b = result.scalars().first()
            
            if not b:
                print(f"Creating broadcaster: {data['name']}")
                b = Broadcaster(name=data["name"], slug=data["slug"])
                session.add(b)
                await session.flush() # Get the ID
            
            # Check if key exists
            key_result = await session.execute(
                select(BroadcasterKey).where(BroadcasterKey.broadcaster_id == b.id)
            )
            k = key_result.scalars().first()
            
            if not k:
                print(f"Adding API key for {data['slug']}")
                k = BroadcasterKey(broadcaster_id=b.id, api_key=data["key"], is_active=True)
                session.add(k)
        
        await session.commit()
        print("Seeding completed successfully.")

if __name__ == "__main__":
    asyncio.run(seed())
