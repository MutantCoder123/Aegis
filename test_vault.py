import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
import numpy as np
import uuid
from database import engine, Base, AsyncSessionLocal
from sqlalchemy import text
from services.matching_engine import search_vault
from services.vault_worker import _store_vector

async def test_vector_vault():
    print("Testing Vector Vault...")
    # Create extension and tables
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        await conn.run_sync(Base.metadata.create_all)
        
    print("Database schema verified.")

    # Insert a dummy vector
    dummy_vector = np.random.rand(512).astype(np.float32)
    dummy_vector /= np.linalg.norm(dummy_vector)  # normalize

    match_id = "test_match_" + str(uuid.uuid4())[:8]

    # Insert
    success = await _store_vector(dummy_vector, match_id, "mock_url", AsyncSessionLocal)
    
    if not success:
        print("Failed to store test vector.")
        return False
        
    print(f"Stored test vector with match_id={match_id}")
    
    # Query using search_vault
    # Use the same vector to query; similarity should be ~100%
    result = await search_vault(dummy_vector, match_id=match_id)
    
    if not result:
        print("Search returned None.")
        return False
        
    print("Search Result:", result)
    score = result.get('score')
    if score is not None and score > 99.0:
        print("Test passed! Similarity is high.")
        return True
    else:
        print("Test failed. Low similarity or missing score.")
        return False

if __name__ == "__main__":
    success = asyncio.run(test_vector_vault())
    sys.exit(0 if success else 1)
