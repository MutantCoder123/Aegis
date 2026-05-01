import asyncio
import os
import sys

sys.path.append(os.getcwd())
from database import social_intel_collection

async def clear_mocks():
    print("Clearing mock targets from social_intel_collection...")
    # Delete everything except our test target
    res = await social_intel_collection.delete_many({"raw_url": {"$ne": "https://www.youtube.com/watch?v=Tj0YrgOAfhs"}})
    print(f"Deleted {res.deleted_count} targets. Only test target should remain.")

if __name__ == "__main__":
    asyncio.run(clear_mocks())
