import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

def reset_scanned():
    uri = os.getenv("MONGODB_URLI")
    print(f"[*] Resetting scanned status in: {uri}")
    client = MongoClient(uri)
    db = client["aegis_telemetry"]
    coll = db["social_intel"]
    
    res = coll.update_many({}, {"$set": {"scanned": False}})
    print(f"[+] Modified {res.modified_count} documents.")

if __name__ == "__main__":
    reset_scanned()
