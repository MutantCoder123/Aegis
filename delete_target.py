import asyncio
import os
import sys

sys.path.append(os.getcwd())
from database import social_intel_collection, mongo_db

async def delete():
    print("Deleting Tj0YrgOAfhs from social_intel_collection and cache...")
    await social_intel_collection.delete_many({"raw_url": "https://www.youtube.com/watch?v=Tj0YrgOAfhs"})
    # Also delete from sieve cache so it's not discarded as duplicate
    await mongo_db["processed_urls_cache"].delete_many({"url": "https://www.youtube.com/watch?v=Tj0YrgOAfhs"})
    print("Deleted.")

if __name__ == "__main__":
    asyncio.run(delete())
