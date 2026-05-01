import asyncio
from sqlalchemy import text
from database import AsyncSessionLocal
from services.vault_worker import process_master_vod
import os

async def total_reset():
    # 1. Clear everything
    async with AsyncSessionLocal() as session:
        print("[*] Wiping Forensic Ledger and Vector Vault...")
        await session.execute(text("DELETE FROM processed_streams;"))
        await session.execute(text("DELETE FROM official_asset_vectors;"))
        await session.commit()
        print("[+] Database wiped clean.")

    # 2. Re-ingest the LARGE VOD as Ground Truth
    match_id = "LAKERS_WARRIORS_001"
    video_path = os.path.abspath("official_archive/LAKERS_WARRIORS_001_7a1ab0a8.mp4")
    broadcaster_id = "1158f98f-be1c-4639-9bb9-92c03645a4cc" # NBA UUID
    
    print(f"[*] Re-ingesting 75MB Master VOD: {video_path}...")
    from database import AsyncSessionLocal as db_session_factory
    await process_master_vod(
        video_path=video_path,
        match_id=match_id,
        db_session_factory=db_session_factory,
        broadcaster_id=broadcaster_id
    )
    print("[+] Master VOD Ingested with new segment-linked logic.")

if __name__ == "__main__":
    asyncio.run(total_reset())
