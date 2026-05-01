import asyncio
import os
import sys
import datetime

# Add the project root to sys.path to ensure absolute imports work
sys.path.append(os.getcwd())

from database import AsyncSessionLocal, OfficialAssetVector, Broadcaster
from sqlalchemy import select
from services.media_extractor import MediaExtractor
from services.vector_vault import CLIPVectorizer

async def ingest():
    url = "https://www.youtube.com/watch?v=Tj0YrgOAfhs"
    match_id = "MASTER_TEST_001"
    
    print(f"[*] Starting ingestion for Master Asset: {match_id}")
    print(f"[*] Target URL: {url}")
    
    # 1. Resolve Stream URL
    stream_url = await MediaExtractor.get_stream_url(url)
    if not stream_url:
        print("[!] Failed to resolve stream URL.")
        return
    
    # 2. Get/Create Broadcaster
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(Broadcaster))
        broadcaster = res.scalars().first()
        if not broadcaster:
            print("[*] No broadcaster found. Creating 'Aegis Global'...")
            broadcaster = Broadcaster(name="Aegis Global", slug="aegis-global")
            session.add(broadcaster)
            await session.commit()
            await session.refresh(broadcaster)
        b_id = broadcaster.id
    
    # 3. Initialize Vectorizer
    vectorizer = CLIPVectorizer()
    
    # 4. Stream Frames & Ingest
    frame_count = 0
    # Re-open session for the loop
    async with AsyncSessionLocal() as session:
        print("[*] Starting extraction and vectorization...")
        async for frame_bytes in MediaExtractor.stream_frames(stream_url, is_live=False):
            frame_count += 1
            # Vectorize
            # Convert bytearray to bytes if needed, though Image.open handles it
            vector = vectorizer.vectorize(frame_bytes)
            
            # Create Vector Entry
            new_vector = OfficialAssetVector(
                broadcaster_id=b_id,
                match_id=match_id,
                vector=vector,
                source_origin='official_broadcaster',
                timestamp=datetime.datetime.now(datetime.timezone.utc)
            )
            session.add(new_vector)
            
            if frame_count % 5 == 0:
                print(f"[*] Ingested {frame_count} frames...")
                await session.commit()
            
            # For the precision test, 30 frames (30 seconds) is plenty for matching.
            if frame_count >= 30:
                break
        
        await session.commit()
        print(f"\n[+] SUCCESS: Ingested {frame_count} frames for {match_id}")
        print(f"[+] Ground Truth established in PostgreSQL Vector Vault.")

if __name__ == "__main__":
    asyncio.run(ingest())
