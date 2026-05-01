import asyncio
import os
from database import AsyncSessionLocal
from services.vault_worker import process_master_vod

async def index_test_asset():
    # We'll index seg003.ts as an official asset so the scanner finds it
    asset_path = "/home/indranil/GoogleSolution/DigitalAssetProtection/demo_stream/seg003.ts"
    match_id = "LAKERS_WARRIORS_001"
    
    print(f"[*] Indexing {asset_path} into Vector Vault for {match_id}...")
    
    # We need a broadcaster ID. Let's find one.
    from database import Broadcaster
    from sqlalchemy import select
    
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(Broadcaster).limit(1))
        b = res.scalars().first()
        if not b:
            print("[!] No broadcaster found. Please run the app or seed the DB first.")
            return
        b_id = b.id

    await process_master_vod(
        asset_path,
        match_id,
        AsyncSessionLocal,
        source_origin="secure_vod_ingest",
        broadcaster_id=b_id,
        file_type="video"
    )
    print("[+] Successfully indexed test asset. The scanner should now find a match!")

if __name__ == "__main__":
    asyncio.run(index_test_asset())
