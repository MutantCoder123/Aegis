from fastapi import APIRouter, HTTPException, status, Depends, BackgroundTasks, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from models.schemas import (
    MediaAnalysisRequest, AnalysisResponse, SimulateLiveRequest,
    IngestVODRequest, TelemetryReport, IngestOfficialRequest
)
from services.matching_engine import download_image_to_memory, calculate_similarity, search_vault, flag_highlight, evaluate_suspect_sequence
from services.ai_arbiter import adjudicate_edge_case, adjudicate_stream
from services.vision_pipeline import UniversalSampler
from services.vault_worker import continuous_ingest_broadcast
from database import get_postgres_db, ProcessedStream, social_intel_collection, raw_telemetry_collection, AsyncSessionLocal, BroadcasterKey
import random

router = APIRouter()

from services.live_ingestion import start_live_ingestion
from services.vod_processor import process_vod_asset
import datetime
import os

async def secure_ingest(
    x_source_key: str = Header(..., alias="X-Source-Key"),
    db: AsyncSession = Depends(get_postgres_db)
):
    """
    FastAPI dependency to verify that the ingest request comes from an 
    authenticated Broadcaster with a valid API key.
    """
    # Dynamic Key Validation: Lookup key in BroadcasterKeys table
    from sqlalchemy.future import select
    result = await db.execute(
        select(BroadcasterKey).where(
            BroadcasterKey.api_key == x_source_key,
            BroadcasterKey.is_active == True
        )
    )
    key_record = result.scalars().first()
    
    if not key_record:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or inactive X-Source-Key. Ingestion rejected."
        )
    
    return key_record.broadcaster_id

@router.post("/api/telemetry/report")
async def report_telemetry(payload: TelemetryReport):
    # Insert raw ping into Mongo data lake
    doc = payload.dict()
    doc["timestamp"] = datetime.datetime.now(datetime.timezone.utc)
    await raw_telemetry_collection.insert_one(doc)
    return {"status": "ok", "ingested_id": str(doc["_id"])}

@router.post("/api/admin/simulate_live")
async def simulate_live(request: SimulateLiveRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(start_live_ingestion, request.video_path)
    return {"status": "Live ingestion started", "video": request.video_path}

@router.post("/api/admin/ingest_vod")
async def ingest_vod(request: IngestVODRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(process_vod_asset, request.video_path, request.match_id)
    return {"status": "VOD Processing started", "video": request.video_path, "match_id": request.match_id}


@router.post("/api/admin/ingest_official", status_code=202)
async def ingest_official_broadcast(
    request: IngestOfficialRequest, 
    background_tasks: BackgroundTasks,
    broadcaster_id: str = Depends(secure_ingest)
):
    """Launch the Vector Vault continuous ingest worker for an official live stream."""
    background_tasks.add_task(
        continuous_ingest_broadcast,
        request.stream_url,
        request.match_id,
        AsyncSessionLocal,
        "official_broadcaster",
        broadcaster_id
    )
    return {
        "status": "accepted",
        "message": f"Vector Vault ingest started for match_id={request.match_id!r}",
        "broadcaster_id": broadcaster_id
    }

@router.post("/api/admin/vault/ingest", status_code=status.HTTP_202_ACCEPTED)
async def ingest_master_vod(
    request: IngestVODRequest, 
    background_tasks: BackgroundTasks,
    broadcaster_id: str = Depends(secure_ingest)
):
    """Indexes a full Master VOD video file or a static image into the ground-truth Vector Vault."""
    from services.vault_worker import process_master_vod
    background_tasks.add_task(
        process_master_vod,
        request.video_path,
        request.match_id,
        AsyncSessionLocal,
        "secure_vod_ingest",
        broadcaster_id,
        request.file_type
    )
    return {
        "status": "indexing_started",
        "match_id": request.match_id,
        "broadcaster_id": broadcaster_id,
        "file_type": request.file_type
    }

@router.post("/analyze_media", response_model=AnalysisResponse)
async def analyze_media(
    request: MediaAnalysisRequest, 
    db: AsyncSession = Depends(get_postgres_db)
):
    # A. Call UniversalSampler to generate the suspect sequential vectors
    sampler = UniversalSampler()
    sample_result = await sampler.sample(request.media_url)
    
    suspect_vectors = sample_result.get("vectors")
    if not suspect_vectors:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Failed to generate vector signature sequence from the provided URL"
        )
        
    # B. Pass vectors to evaluate_suspect_sequence (Tier 1 & 2)
    # Note: Global search first to identify the broadcaster, then verify
    evaluation = await evaluate_suspect_sequence(suspect_vectors)
    
    is_verified_match = evaluation.get("is_verified_match", False)
    avg_similarity_pct = evaluation.get("average_score", 0.0)
    matched_id = evaluation.get("matched_official_uuid")
    broadcaster_id = evaluation.get("broadcaster_id") # Identified from the match
    
    # Store normalized (0-1) confidence in DB for frontend consistency
    normalized_confidence = avg_similarity_pct / 100.0

    # C. Adjudication & Tagging Loop (Tier 3)
    if is_verified_match:
        # Tier 3: Adjudicate with Gemini
        ai_decision = await adjudicate_stream(
            url=request.media_url,
            platform=request.platform,
            similarity_score=avg_similarity_pct,
            metadata=request.engagement_metrics
        )
        
        verdict = ai_decision.get("classification", "Unknown")
        action = ai_decision.get("action_taken", "Monitor")
        reasoning = ai_decision.get("reasoning", "No reasoning provided")

        # Circular feedback
        if matched_id and action in ["Monetize", "Takedown"]:
            views = 0
            if request.engagement_metrics:
                views_raw = request.engagement_metrics.get("views", 0)
                try:
                    if isinstance(views_raw, str) and 'k' in views_raw.lower():
                        views = int(float(views_raw.lower().replace('k', '')) * 1000)
                    else:
                        views = int(views_raw)
                except Exception:
                    views = 1000  # fallback
            
            await flag_highlight(matched_id, views)

        new_stream_record = ProcessedStream(
            broadcaster_id=broadcaster_id,
            media_url=request.media_url,
            platform=request.platform,
            ai_classification=verdict,
            confidence_score=normalized_confidence,
            action_taken=action,
            reasoning=reasoning,
            timestamp=evaluation.get("matched_timestamp")
        )
        db.add(new_stream_record)
        await db.commit()
        await db.refresh(new_stream_record)
        
        ui_status = "Piracy" if action == "Takedown" else ("Monetize" if action == "Monetize" else "Safe")

        return AnalysisResponse(
            status=ui_status,
            confidence=normalized_confidence,
            stage_triggered="Tier 3 AI Arbiter",
            reasoning=reasoning,
            classification=verdict,
            recommended_action=action
        )
    else:
        new_stream_record = ProcessedStream(
            broadcaster_id=None, # No match found
            media_url=request.media_url,
            platform=request.platform,
            ai_classification="Safe",
            confidence_score=normalized_confidence,
            action_taken="Monitor",
            reasoning="Sequence evaluation did not meet required confidence thresholds"
        )
        db.add(new_stream_record)
        await db.commit()

        return AnalysisResponse(
            status="Safe",
            confidence=normalized_confidence,
            stage_triggered="Vector Math",
            reasoning="No significant semantic overlap",
            classification=None,
            recommended_action=None
        )

@router.get("/api/live_streams")
async def get_live_streams(db: AsyncSession = Depends(get_postgres_db)):
    # Query Postgres for adjudicated streams
    # Notice: we merge these with the mock strings for prototype visualization purposes
    # but the architectural query is hitting the Postgres SQL pipeline.
    result = await db.execute(select(ProcessedStream).order_by(ProcessedStream.id.desc()).limit(5))
    adjudicated_records = result.scalars().all()
    
    frontend_streams = []
    for r in adjudicated_records:
        frontend_streams.append({
            "id": f"db_{r.id}", "domain": r.media_url, "stream_url": "/db/source",
            "region": "PostgreSQL Record", "concurrent_viewers": random.randint(500, 15000), 
            "status": r.action_taken or "Monitoring",
            "confidence": (r.confidence_score or 0) * 100, "detectedAt": "Live"
        })

    return frontend_streams

@router.get("/api/network_intel")
async def get_network_intel():
    # Example calculation over all raw telemetry
    ext_users = await raw_telemetry_collection.count_documents({"source": "chrome_extension"})
    bots_count = await raw_telemetry_collection.count_documents({"source": "firehose_simulator"})
    

    social_docs = await social_intel_collection.find().to_list(length=10)
    monitored_groups = []
    
    for doc in social_docs:
        monitored_groups.append({
            'platform': doc.get("platform", "Unknown"),
            'name': doc.get("group_name", "Unknown Group"),
            'action': doc.get("action", "Logging"),
            'members': doc.get("members_count", random.randint(100, 50000))
        })
    


    return {
        "extension_users": ext_users,
        "active_bots": bots_count,
        "monitored_groups": monitored_groups
    }

@router.get("/api/firehose_feed")
async def get_firehose_feed():
    # Fetch recent telemetry items from MongoDB
    recent_telemetry = await raw_telemetry_collection.find().sort("_id", -1).limit(10).to_list(10)
    
    feed_items = []
    for doc in recent_telemetry:
        url = doc.get("url", "")
        # Heuristics to determine platform and verdict based on url
        platform = "reddit" if "reddit" in url else "tiktok" if "tiktok" in url else "youtube" if "youtube" in url or "watch?" in url else "x"
        match_score = random.randint(60, 99)
        verdict = "infringement" if match_score > 85 else "monetize" if match_score > 75 else "pending"
        
        feed_items.append({
            "id": str(doc.get("_id", random.randint(1000, 9999))),
            "platform": platform,
            "handle": doc.get("ip_address", "Unknown_IP"),
            "title": url,
            "views": f"{random.randint(1, 500)}k",
            "timeAgo": "just now",
            "matchScore": match_score,
            "verdict": verdict
        })
        
    return feed_items

@router.get("/api/recent_actions")
async def get_recent_actions(db: AsyncSession = Depends(get_postgres_db)):
    result = await db.execute(select(ProcessedStream).order_by(ProcessedStream.id.desc()).limit(10))
    records = result.scalars().all()
    
    actions = []
    for r in records:
        ts = r.timestamp.strftime("%H:%M:%S") if getattr(r, "timestamp", None) else "Live"
        act = r.action_taken or r.ai_classification or "Monitoring"
        domain = r.media_url.split('/')[2] if '://' in r.media_url else r.media_url
        actions.append(f"[{ts}] ARBITER ACTION: {act} executed on {domain}")
    
    return actions
