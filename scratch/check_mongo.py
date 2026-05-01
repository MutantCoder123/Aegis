import os
from pymongo import MongoClient

def check_mongo():
    uri = os.environ.get("MONGODB_URLI")
    client = MongoClient(uri)
    db = client["aegis_telemetry"]
    pending = db.social_intel.count_documents({"scanned": False})
    print(f"[*] Total pending links in MongoDB: {pending}")
    
    if pending > 0:
        docs = list(db.social_intel.find({"scanned": False}).limit(5))
        for doc in docs:
            print(f" - URL: {doc.get('url')} | Type: {doc.get('type')}")

if __name__ == "__main__":
    check_mongo()
