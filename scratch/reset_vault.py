import asyncio
from sqlalchemy import text
from database import AsyncSessionLocal
from services.vault_worker import process_master_vod
import os

async def reset_and_reingest():
    match_id = "LAKERS_WARRIORS_001"
    # Pick a specific file to re-ingest
    video_path = os.path.abspath("official_archive/LAKERS_WARRIORS_001_c667dc3f.mp4")
    broadcaster_id = "1158f98f-be1c-4639-9bb9-92c03645a4cc" # NBA UUID
    
    async with AsyncSessionLocal() as session:
        print(f"[*] Clearing vault for {match_id}...")
        await session.execute(text("DELETE FROM official_asset_vectors WHERE match_id = :mid"), {"mid": match_id})
        await session.commit()
        
    print(f"[*] Starting re-ingestion of {video_path}...")
    from database import AsyncSessionLocal as db_session_factory
    try:
        await process_master_vod(
            video_path=video_path,
            match_id=match_id,
            db_session_factory=db_session_factory,
            broadcaster_id=broadcaster_id
        )
        print("[*] Re-ingestion complete.")
    except Exception as e:
        print(f"[!] Re-ingestion failed: {e}")

if __name__ == "__main__":
    asyncio.run(reset_and_reingest())
