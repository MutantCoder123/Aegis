import os
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, Index, CheckConstraint, Boolean, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from motor.motor_asyncio import AsyncIOMotorClient
import uuid
from pgvector.sqlalchemy import Vector

load_dotenv()

# --- SUPABASE CLOUD POSTGRESQL CONFIGURATION ---
POSTGRES_URL = os.getenv("SUPABASE_DB_URL")

if POSTGRES_URL:
    if "[YOUR-PASSWORD]" in POSTGRES_URL or "[YOUR_ENCODED_PASSWORD]" in POSTGRES_URL:
        print("\n[!] WARNING: Database password placeholder detected in .env.")
    
    # Auto-fix protocol for asyncpg
    if "postgresql://" in POSTGRES_URL and "postgresql+asyncpg://" not in POSTGRES_URL:
        POSTGRES_URL = POSTGRES_URL.replace("postgresql://", "postgresql+asyncpg://")
        
    # Remove sslmode from URI if present, as asyncpg handles it via connect_args
    if "sslmode=require" in POSTGRES_URL:
        POSTGRES_URL = POSTGRES_URL.replace("?sslmode=require", "").replace("&sslmode=require", "")
else:
    POSTGRES_URL = "postgresql+asyncpg://aegis_admin:hackathon2026@localhost/aegis_db"

engine = create_async_engine(
    POSTGRES_URL, 
    echo=False,
    connect_args={
        "ssl": "require" if "supabase" in POSTGRES_URL else False,
        "statement_cache_size": 0,
        "prepared_statement_cache_size": 0,
    }
)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
Base = declarative_base()

class Broadcaster(Base):
    """
    Multi-tenant organization table.
    """
    __tablename__ = "broadcasters"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    slug = Column(String(50), nullable=False, unique=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class BroadcasterKey(Base):
    """
    Dynamic X-Source-Key storage for secure ingestion.
    """
    __tablename__ = "broadcaster_keys"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    broadcaster_id = Column(UUID(as_uuid=True), ForeignKey("broadcasters.id"), index=True)
    api_key = Column(String(128), nullable=False, unique=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ProcessedStream(Base):
    __tablename__ = "processed_streams"
    
    id = Column(Integer, primary_key=True, index=True)
    broadcaster_id = Column(UUID(as_uuid=True), ForeignKey("broadcasters.id"), index=True, nullable=True)
    media_url = Column(String, index=True)
    platform = Column(String(50), nullable=True)
    ai_classification = Column(String)
    confidence_score = Column(Float)
    action_taken = Column(String)
    reasoning = Column(Text, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

class OfficialAssetVector(Base):
    """
    PostgreSQL table for high-performance Vector Vault indexing.
    Storage for 512-d CLIP embeddings from official broadcasts.
    """
    __tablename__ = "official_asset_vectors"
    __table_args__ = (
        Index(
            "hnsw_index_official_asset_vectors",
            "vector",
            postgresql_using="hnsw",
            postgresql_with={"m": 16, "ef_construction": 64},
            postgresql_ops={"vector": "vector_cosine_ops"},
        ),
        CheckConstraint(
            "source_origin IN ('official_broadcaster', 'secure_vod_ingest')", 
            name="ck_source_origin"
        ),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    broadcaster_id = Column(UUID(as_uuid=True), ForeignKey("broadcasters.id"), index=True, nullable=True)
    match_id = Column(String, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    # 512 matches CLIP-ViT-B-32 output dimensions
    vector = Column(Vector(512))
    
    # Trust & origin metadata
    source_origin = Column(String(50), nullable=False, server_default='official_broadcaster')
    
    # Smart Video Archiving
    video_chunk_url = Column(String, nullable=True)
    is_highlight = Column(Boolean, default=False)
    is_static_ref = Column(Boolean, default=False)
    viral_engagement_score = Column(Integer, default=0)

    extra_metadata = Column("metadata", JSONB, default={})

# Helper function to get PostgreSQL session
async def get_postgres_db():
    async with AsyncSessionLocal() as session:
        yield session


# --- REMOTE MONGODB ATLAS CONFIGURATION ---
# Handle both common naming conventions
MONGO_URI = os.getenv("MONGO_URI") or os.getenv("MONGODB_URLI") or "mongodb://localhost:27017"
mongo_client = AsyncIOMotorClient(MONGO_URI)

# Access the unstructured DB
mongo_db = mongo_client["aegis_telemetry"]

# Collection definitions for the unstructured data lake
raw_telemetry_collection = mongo_db["raw_telemetry"]
social_intel_collection = mongo_db["social_intel"]
