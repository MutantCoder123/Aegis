import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

def debug_mongo():
    uri = os.environ.get("MONGODB_URLI")
    client = MongoClient(uri)
    db = client["aegis_telemetry"]
    coll = db["social_intel"]
    
    total = coll.count_documents({})
    p_false = coll.count_documents({"scanned": False})
    p_true = coll.count_documents({"scanned": True})
    p_missing = coll.count_documents({"scanned": {"$exists": False}})
    
    print(f"Total: {total}")
    print(f"Scanned False: {p_false}")
    print(f"Scanned True: {p_true}")
    print(f"Scanned Missing: {p_missing}")
    
    if p_false > 0:
        doc = coll.find_one({"scanned": False})
        print(f"Sample pending: {doc}")

if __name__ == "__main__":
    debug_mongo()
