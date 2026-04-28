from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import router as analyze_router
from services.matching_engine import initialize_ground_truth

from database import engine, Base

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Call initialize_ground_truth() from the matching engine during startup
    initialize_ground_truth()
    
    # Init PostgreSQL Schema for AI records
    async with engine.begin() as conn:
        from sqlalchemy import text
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        await conn.run_sync(Base.metadata.create_all)
    import logging
    logging.getLogger(__name__).info("[Aegis] ✅ Vector Vault table ready (official_asset_vectors with HNSW index)")
    yield
    # Cleanup if needed

app = FastAPI(title="Sports Media Copyright Detection System", lifespan=lifespan)

# Configure CORS to allow all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Wire up the router
app.include_router(analyze_router)

# Serve official archive statically for playback
from fastapi.staticfiles import StaticFiles
import os
archive_path = os.path.join(os.getcwd(), "official_archive")
os.makedirs(archive_path, exist_ok=True)
app.mount("/official_archive", StaticFiles(directory=archive_path), name="official_archive")

@app.get("/")
def root():
    return {"message": "Sports Media Copyright Engine Running. Use /analyze_media to process payloads."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
