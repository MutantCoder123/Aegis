import requests
import time
import asyncio
from database import AsyncSessionLocal, OfficialAssetVector
from sqlalchemy.future import select

# 1. Trigger the vault ingest
response = requests.post(
    "http://127.0.0.1:8000/api/vault/ingest",
    data={
        "match_id": "MASTER_YT_TEST_01",
        "display_name": "YouTube VOD Test",
        "asset_type": "Remote VOD",
        "file_type": "video",
        "source_url": "https://www.youtube.com/watch?v=jNQXAC9IVRw"
    },
    headers={
        "X-Broadcaster-ID": "test-broadcaster",
        "X-Source-Key": "test-key"
    }
)
print("Ingest API Response:", response.status_code, response.text)

# 2. Give the background task time to fetch manifest and insert vectors
print("Waiting 15 seconds for background worker to ingest some frames...")
time.sleep(15)

# 3. Check DB for vectors
async def check():
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(OfficialAssetVector).filter_by(match_id="MASTER_YT_TEST_01")
        )
        rows = result.scalars().all()
        print(f"\n--- DB Results for MASTER_YT_TEST_01 ---")
        print(f"Total Vectors stored: {len(rows)}")
        if rows:
            print(f"Sample video_chunk_url: {rows[0].video_chunk_url}")
        else:
            print("No vectors found! Something failed in the background task.")

if __name__ == "__main__":
    asyncio.run(check())
