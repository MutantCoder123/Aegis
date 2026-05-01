import asyncio
import os
import random
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGODB_URLI")
DB_NAME = "aegis_telemetry"
COLLECTION_NAME = "social_intel"

async def seed_pending_queue():
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]
    collection = db[COLLECTION_NAME]
    
    # Get 10 random files from official_archive
    archive_dir = "official_archive"
    all_files = [f for f in os.listdir(archive_dir) if f.endswith(".mp4")]
    if not all_files:
        print("[!] No .mp4 files found in official_archive.")
        return
        
    sample_files = random.sample(all_files, min(10, len(all_files)))
    
    new_docs = []
    for filename in sample_files:
        full_path = os.path.abspath(os.path.join(archive_dir, filename))
        new_docs.append({
            "raw_url": full_path,
            "platform": "Web",
            "scanned": False,
            "metadata": {
                "source": "manual_seed",
                "filename": filename
            }
        })
        
    if new_docs:
        result = await collection.insert_many(new_docs)
        print(f"[+] Successfully inserted {len(result.inserted_ids)} pending links into {COLLECTION_NAME}.")
    else:
        print("[!] No documents to insert.")

if __name__ == "__main__":
    asyncio.run(seed_pending_queue())
