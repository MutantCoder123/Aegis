import pymongo
import os
import uuid
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

def seed():
    mongo_uri = os.getenv("MONGO_URI") or os.getenv("MONGODB_URLI") or "mongodb://localhost:27017"
    print(f"[*] Connecting to: {mongo_uri}")
    client = pymongo.MongoClient(mongo_uri)
    db = client["aegis_telemetry"]
    coll = db["social_intel"]
    
    # Clear existing
    # coll.delete_many({})
    
    base_dir = "/home/indranil/GoogleSolution/DigitalAssetProtection"
    official_dir = os.path.join(base_dir, "official_archive")
    
    # Pick a few files from official_archive to simulate intercepted piracy
    files = [f for f in os.listdir(official_dir) if f.endswith(".mp4")][:10]
    
    platforms = ["Telegram", "Reddit", "Twitter", "Web", "TikTok"]
    
    for i, f in enumerate(files):
        full_path = os.path.join(official_dir, f)
        platform = platforms[i % len(platforms)]
        
        doc = {
            "id": uuid.uuid4().hex[:8],
            "raw_url": full_path,
            "platform": platform,
            "scanned": False,
            "timestamp": datetime.now().isoformat()
        }
        coll.insert_one(doc)
        print(f"[Seed] Added {platform} link to CLOUD DB: {f}")

if __name__ == "__main__":
    seed()
