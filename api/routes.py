from fastapi import APIRouter, HTTPException, status, Depends, BackgroundTasks, Header, Form, File, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, or_
from models.schemas import (
    MediaAnalysisRequest, AnalysisResponse, SimulateLiveRequest,
    IngestVODRequest, TelemetryReport, IngestOfficialRequest,
    VaultIngestRequest, EnforcementActionRequest
)
from services.matching_engine import download_image_to_memory, calculate_similarity, search_vault, flag_highlight, evaluate_suspect_sequence
from services.ai_arbiter import adjudicate_edge_case, adjudicate_stream
from services.vision_pipeline import UniversalSampler
from services.vault_worker import continuous_ingest_broadcast
from database import (
    get_postgres_db,
    ProcessedStream,
    OfficialAssetVector,
    Broadcaster as BroadcasterModel,
    social_intel_collection,
    raw_telemetry_collection,
    AsyncSessionLocal,
    BroadcasterKey,
)
import random
import uuid
import asyncio
import json
import logging

def debug_vault(msg):
    with open("/tmp/vault_debug.log", "a") as f:
        f.write(f"{datetime.datetime.now()} - {msg}\n")

router = APIRouter()

from services.live_ingestion import start_live_ingestion
from services.vod_processor import process_vod_asset
import datetime
import os

class FirehosePubSub:
    def __init__(self):
        self.subscribers = []

    def subscribe(self):
        queue = asyncio.Queue()
        self.subscribers.append(queue)
        return queue

    def unsubscribe(self, queue):
        if queue in self.subscribers:
            self.subscribers.remove(queue)

    async def publish(self, event_type, data):
        print(f"[PubSub] Publishing {event_type} to {len(self.subscribers)} subscribers")
        for queue in self.subscribers:
            await queue.put((event_type, data))

firehose_pubsub = FirehosePubSub()

DEMO_MATCHES = {
    "nba": [
        {
            "id": "LAKERS_WARRIORS_001",
            "title": "Lakers vs Warriors",
            "league": "NBA",
            "venue": "Crypto.com Arena",
            "date": "Live now",
            "status": "live",
            "detections": 1248,
            "revenue": 156000,
        },
        {
            "id": "NBA_ARCHIVE_044",
            "title": "Celtics vs Heat",
            "league": "NBA",
            "venue": "Broadcast Zone A",
            "date": "Today",
            "status": "monitoring",
            "detections": 684,
            "revenue": 82400,
        },
        {
            "id": "NBA_NIGHTCAP_088",
            "title": "Bucks vs Knicks",
            "league": "NBA",
            "venue": "Remote Production",
            "date": "Tonight",
            "status": "resolved",
            "detections": 392,
            "revenue": 43800,
        },
    ],
    "ufc": [
        {
            "id": "UFC_301_MAIN_001",
            "title": "Title Fight Main Card",
            "league": "UFC",
            "venue": "T-Mobile Arena",
            "date": "Live now",
            "status": "live",
            "detections": 1432,
            "revenue": 205000,
        },
        {
            "id": "UFC_ARCHIVE_044",
            "title": "Prelims Live",
            "league": "UFC",
            "venue": "Broadcast Zone A",
            "date": "Today",
            "status": "monitoring",
            "detections": 711,
            "revenue": 93400,
        },
    ],
    "fifa": [
        {
            "id": "FIFA_FINAL_001",
            "title": "Final Matchday Live",
            "league": "World Football",
            "venue": "Lusail Stadium",
            "date": "Live now",
            "status": "live",
            "detections": 2084,
            "revenue": 10300000,
        },
        {
            "id": "FIFA_ARCHIVE_044",
            "title": "Group Stage Replay",
            "league": "FIFA",
            "venue": "Broadcast Zone A",
            "date": "Today",
            "status": "monitoring",
            "detections": 938,
            "revenue": 4100000,
        },
    ],
}

DEMO_HEATMAP = [
    {"minute": minute, "detections": detections}
    for minute, detections in zip(
        [0, 8, 15, 22, 30, 38, 45, 52, 60, 68, 75, 82, 90],
        [18, 42, 64, 51, 86, 112, 96, 138, 121, 165, 144, 118, 72],
    )
]

DEMO_REVENUE_SERIES = [
    {"month": "Jun", "projected": 92000, "recovered": 52000},
    {"month": "Jul", "projected": 108000, "recovered": 69000},
    {"month": "Aug", "projected": 116000, "recovered": 76000},
    {"month": "Sep", "projected": 131000, "recovered": 88000},
    {"month": "Oct", "projected": 149000, "recovered": 112000},
    {"month": "Nov", "projected": 162000, "recovered": 126000},
]

ASSET_TYPE_TO_FILE_TYPE = {
    "Live HLS": "video",
    "Master VOD": "video",
    "Highlight Reel": "video",
    "Press Photo": "image",
    "Key Frame": "image",
}


async def tenant_context(
    x_source_key: str = Header(..., alias="X-Source-Key"),
    x_broadcaster_id: str = Header(..., alias="X-Broadcaster-ID"),
    db: AsyncSession = Depends(get_postgres_db),
):
    """
    Resolve the active tenant from the headers used by the React UI.
    Local demo keys are allowed when the DB has not been seeded yet; real keys
    are still prevented from crossing broadcaster boundaries.
    """
    broadcaster = None
    try:
        broadcaster_uuid = uuid.UUID(x_broadcaster_id)
        result = await db.execute(select(BroadcasterModel).where(BroadcasterModel.id == broadcaster_uuid))
        broadcaster = result.scalars().first()
    except ValueError:
        result = await db.execute(select(BroadcasterModel).where(BroadcasterModel.slug == x_broadcaster_id))
        broadcaster = result.scalars().first()

    key_result = await db.execute(
        select(BroadcasterKey).where(
            BroadcasterKey.api_key == x_source_key,
            BroadcasterKey.is_active == True,
        )
    )
    key_record = key_result.scalars().first()

    if key_record and broadcaster and key_record.broadcaster_id != broadcaster.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="X-Source-Key does not belong to X-Broadcaster-ID.",
        )

    return {
        "id": broadcaster.id if broadcaster else None,
        "slug": broadcaster.slug if broadcaster else x_broadcaster_id,
        "name": broadcaster.name if broadcaster else x_broadcaster_id.upper(),
    }


def _demo_matches(slug: str):
    return DEMO_MATCHES.get(slug, DEMO_MATCHES["nba"])


def _demo_threats(match_id: str):
    return [
        {
            "id": "THR-9041",
            "matchId": match_id,
            "platform": "Telegram",
            "url": "https://t.me/courtside_hd/live",
            "cosineDistance": 0.963,
            "status": "pending",
            "reach": 38200,
            "timestamp": "2026-04-28T13:41:08Z",
            "vectorUuid": "vec_7f4c1c0a9d82",
        },
        {
            "id": "THR-9040",
            "matchId": match_id,
            "platform": "X",
            "url": "https://x.com/streamhub_24",
            "cosineDistance": 0.918,
            "status": "claimed",
            "reach": 21100,
            "timestamp": "2026-04-28T13:39:21Z",
            "vectorUuid": "vec_a18e81d0234b",
        },
        {
            "id": "THR-9038",
            "matchId": match_id,
            "platform": "Discord",
            "url": "https://discord.gg/livepass",
            "cosineDistance": 0.887,
            "status": "dismantled",
            "reach": 14600,
            "timestamp": "2026-04-28T13:31:44Z",
            "vectorUuid": "vec_faa92291bb02",
        },
    ]


def _demo_assets(slug: str):
    matches = _demo_matches(slug)
    primary = matches[0]
    secondary = matches[1] if len(matches) > 1 else primary
    prefix = primary["league"].split()[0].upper()
    return [
        {
            "id": f"VAULT-{prefix}-001",
            "matchName": primary["title"],
            "type": "Live HLS",
            "media": "video",
            "meta": "1080p HLS ladder",
            "vectorCount": 18420,
            "ingestedAt": "12m ago",
            "videoUrl": None,
            "imageUrl": None,
        },
        {
            "id": f"VAULT-{prefix}-002",
            "matchName": secondary["title"],
            "type": "Master VOD",
            "media": "video",
            "meta": "Archive master",
            "vectorCount": 42600,
            "ingestedAt": "2h ago",
            "videoUrl": None,
            "imageUrl": None,
        },
        {
            "id": f"VAULT-{prefix}-003",
            "matchName": "Official key frame set",
            "type": "Key Frame",
            "media": "image",
            "meta": "Static references",
            "vectorCount": 512,
            "ingestedAt": "Today",
            "videoUrl": None,
            "imageUrl": "/placeholder.svg",
        },
    ]


def _sse(event: str, payload: dict):
    return f"event: {event}\ndata: {json.dumps(payload)}\n\n"


def _stream_status(action_taken: str | None):
    action = (action_taken or "").lower()
    if action in {"takedown", "dismantled"}:
        return "dismantled"
    if action in {"monetize", "monetized", "claim", "claimed"}:
        return "claimed"
    return "pending"


def _revenue_for_stream(stream: ProcessedStream):
    confidence = stream.confidence_score or 0
    action = (stream.action_taken or "").lower()
    multiplier = 155 if action == "monetize" else 85 if action == "takedown" else 28
    return round(max(1, confidence) * multiplier * 100)


def _asset_type_from_origin(origin: str | None, is_static_ref: bool | None):
    if is_static_ref:
        return "Key Frame"
    if origin == "secure_vod_ingest":
        return "Master VOD"
    return "Live HLS"

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


@router.get("/api/matches/summary")
async def get_matches_summary(
    tenant=Depends(tenant_context),
    db: AsyncSession = Depends(get_postgres_db),
):
    tenant_id = tenant["id"]
    if not tenant_id:
        matches = _demo_matches(tenant["slug"])
        return {
            "totalDetections": sum(m["detections"] for m in matches),
            "revenueRecovered": sum(m["revenue"] for m in matches),
            "liveOperations": len([m for m in matches if m["status"] == "live"]),
            "totalOperations": len(matches),
            "matches": matches,
            "revenueSeries": DEMO_REVENUE_SERIES,
        }

    vector_result = await db.execute(
        select(
            OfficialAssetVector.match_id,
            func.count(OfficialAssetVector.id).label("vector_count"),
            func.min(OfficialAssetVector.timestamp).label("first_seen"),
        )
        .where(OfficialAssetVector.broadcaster_id == tenant_id)
        .group_by(OfficialAssetVector.match_id)
        .order_by(func.max(OfficialAssetVector.timestamp).desc())
        .limit(12)
    )
    vector_rows = vector_result.all()

    stream_result = await db.execute(
        select(ProcessedStream)
        .where(ProcessedStream.broadcaster_id == tenant_id)
        .order_by(ProcessedStream.id.desc())
        .limit(500)
    )
    streams = stream_result.scalars().all()

    if not vector_rows and not streams:
        matches = _demo_matches(tenant["slug"])
        return {
            "totalDetections": sum(m["detections"] for m in matches),
            "revenueRecovered": sum(m["revenue"] for m in matches),
            "liveOperations": len([m for m in matches if m["status"] == "live"]),
            "totalOperations": len(matches),
            "matches": matches,
            "revenueSeries": DEMO_REVENUE_SERIES,
        }

    match_ids = [row.match_id for row in vector_rows if row.match_id]
    if not match_ids:
        match_ids = ["LIVE_LEDGER"]

    matches = []
    unmatched_streams = list(streams)
    for index, match_id in enumerate(match_ids):
        scoped_streams = [
            stream
            for stream in streams
            if match_id in (stream.media_url or "") or match_id in (stream.reasoning or "")
        ]
        if not scoped_streams and index == 0:
            scoped_streams = unmatched_streams

        detections = len(scoped_streams)
        revenue = sum(_revenue_for_stream(stream) for stream in scoped_streams)
        matches.append(
            {
                "id": match_id,
                "title": match_id.replace("_", " ").title(),
                "league": tenant["name"],
                "venue": "Vector Vault",
                "date": "Live now" if index == 0 else "Indexed",
                "status": "live" if index == 0 else "monitoring",
                "detections": detections,
                "revenue": revenue,
            }
        )

    total_revenue = sum(m["revenue"] for m in matches)
    revenue_series = []
    for idx, month in enumerate(["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"], start=1):
        recovered = round(total_revenue * (0.35 + idx * 0.11))
        revenue_series.append(
            {
                "month": month,
                "projected": max(recovered + 1, round(recovered * 1.42)),
                "recovered": recovered,
            }
        )

    return {
        "totalDetections": sum(m["detections"] for m in matches),
        "revenueRecovered": total_revenue,
        "liveOperations": len([m for m in matches if m["status"] == "live"]),
        "totalOperations": len(matches),
        "matches": matches,
        "revenueSeries": revenue_series,
    }


@router.get("/api/matches/{match_id}/heatmap")
async def get_match_heatmap(
    match_id: str,
    tenant=Depends(tenant_context),
    db: AsyncSession = Depends(get_postgres_db),
):
    tenant_id = tenant["id"]
    if not tenant_id:
        return DEMO_HEATMAP

    stream_result = await db.execute(
        select(ProcessedStream)
        .where(ProcessedStream.broadcaster_id == tenant_id)
        .order_by(ProcessedStream.timestamp.asc())
        .limit(500)
    )
    streams = [
        stream
        for stream in stream_result.scalars().all()
        if match_id in (stream.media_url or "") or match_id in (stream.reasoning or "")
    ]

    if not streams:
        return DEMO_HEATMAP

    base = min(stream.timestamp for stream in streams if stream.timestamp)
    buckets = {minute: 0 for minute in [0, 8, 15, 22, 30, 38, 45, 52, 60, 68, 75, 82, 90]}
    bucket_keys = list(buckets.keys())
    for stream in streams:
        if not stream.timestamp:
            continue
        elapsed = max(0, int((stream.timestamp - base).total_seconds() / 60))
        nearest = min(bucket_keys, key=lambda minute: abs(minute - elapsed))
        buckets[nearest] += 1

    return [{"minute": minute, "detections": max(count, 1)} for minute, count in buckets.items()]


@router.get("/api/matches/{match_id}/threats")
async def get_match_threats(
    match_id: str,
    tenant=Depends(tenant_context),
    db: AsyncSession = Depends(get_postgres_db),
):
    tenant_id = tenant["id"]
    if not tenant_id:
        return _demo_threats(match_id)

    stream_result = await db.execute(
        select(ProcessedStream)
        .where(
            or_(
                ProcessedStream.broadcaster_id == tenant_id,
                ProcessedStream.broadcaster_id == None
            )
        )
        .order_by(ProcessedStream.id.desc())
        .limit(100)
    )
    all_streams = stream_result.scalars().all()
    
    # Filter by match_id if applicable, or show all for the broadcaster
    streams = []
    for s in all_streams:
        # If it's already assigned to this broadcaster, show it
        if s.broadcaster_id == tenant_id:
            streams.append(s)
            continue
        
        # If it's unassigned but mentions the match or was scanned by this tenant context
        if match_id in (s.media_url or "") or match_id in (s.reasoning or "") or s.confidence_score > 0.4:
            streams.append(s)

    if not streams:
        return _demo_threats(match_id)

    threats = []
    for stream in streams:
        timestamp = stream.timestamp or datetime.datetime.now(datetime.timezone.utc)
        threats.append(
            {
                "id": f"THR-{stream.id}",
                "matchId": match_id,
                "platform": stream.platform or "Unknown",
                "url": stream.media_url,
                "cosineDistance": round(stream.confidence_score or 0, 3),
                "status": _stream_status(stream.action_taken),
                "reach": int(max(1000, (stream.confidence_score or 0.5) * 42000)),
                "timestamp": timestamp.astimezone(datetime.timezone.utc).isoformat().replace("+00:00", "Z"),
                "vectorUuid": f"processed_stream_{stream.id}",
            }
        )

    return threats


@router.get("/api/vault/assets")
async def get_vault_assets(
    tenant=Depends(tenant_context),
    db: AsyncSession = Depends(get_postgres_db),
):
    tenant_id = tenant["id"]
    if not tenant_id:
        return _demo_assets(tenant["slug"])

    # Priority:
    # 1. URLs that don't match the segment pattern (LAKERS_WARRIORS_001_XXXXXXXX.mp4)
    # 2. Or just the min URL to get the first segment
    result = await db.execute(
        select(
            OfficialAssetVector.match_id,
            OfficialAssetVector.source_origin,
            func.min(OfficialAssetVector.video_chunk_url).label("representative_url"),
            OfficialAssetVector.is_static_ref,
            func.count(OfficialAssetVector.id).label("vector_count"),
            func.max(OfficialAssetVector.timestamp).label("last_ingested"),
        )
        .where(OfficialAssetVector.broadcaster_id == tenant_id)
        .group_by(
            OfficialAssetVector.match_id,
            OfficialAssetVector.source_origin,
            OfficialAssetVector.is_static_ref,
        )
        .order_by(func.max(OfficialAssetVector.timestamp).desc())
        .limit(48)
    )
    rows = result.all()
    if not rows:
        return _demo_assets(tenant["slug"])

    assets = []
    for row in rows:
        asset_type = _asset_type_from_origin(row.source_origin, row.is_static_ref)
        media = ASSET_TYPE_TO_FILE_TYPE.get(asset_type, "video")
        ingested_at = row.last_ingested.astimezone(datetime.timezone.utc).isoformat().replace("+00:00", "Z")
        
        # Correctly pick the representative URL (first chunk or image source)
        media_url = row.representative_url
        
        assets.append(
            {
                "id": f"VAULT-{row.match_id}-{len(assets) + 1:03d}",
                "matchName": row.match_id.replace("_", " ").title(),
                "type": asset_type,
                "media": media,
                "meta": row.source_origin or "official_broadcaster",
                "vectorCount": row.vector_count,
                "ingestedAt": ingested_at,
                "videoUrl": media_url if media == "video" else None,
                "imageUrl": media_url if media == "image" else None,
            }
        )
    return assets


@router.post("/api/vault/ingest", status_code=status.HTTP_202_ACCEPTED)
async def ingest_vault_asset(
    background_tasks: BackgroundTasks,
    match_id: str = Form(...),
    display_name: str = Form(...),
    asset_type: str = Form(...),
    source_url: str = Form(None),
    file_type_override: str = Form(None, alias="file_type"),
    file: UploadFile = File(None),
    x_broadcaster: str = Header(None, alias="X-Broadcaster-ID"),
    x_source_key: str = Header(None, alias="X-Source-Key"),
):
    debug_vault(f"Headers received: X-Broadcaster-ID={x_broadcaster}, X-Source-Key={x_source_key}")
    
    # Determine tenant
    tenant_id = None
    if x_broadcaster and x_source_key:
        async with AsyncSessionLocal() as session:
            # Use a safer query to avoid UUID casting errors
            import uuid
            is_uuid = False
            try:
                uuid.UUID(x_broadcaster)
                is_uuid = True
            except:
                pass
            
            if is_uuid:
                stmt = select(BroadcasterModel).join(BroadcasterKey).where(
                    (BroadcasterModel.id == x_broadcaster),
                    BroadcasterKey.api_key == x_source_key
                )
            else:
                stmt = select(BroadcasterModel).join(BroadcasterKey).where(
                    (BroadcasterModel.slug == x_broadcaster),
                    BroadcasterKey.api_key == x_source_key
                )
            
            debug_vault(f"Executing identity verification query (is_uuid={is_uuid})...")
            try:
                result = await session.execute(stmt)
                b = result.scalars().first()
                if b:
                    tenant_id = b.id
                    debug_vault(f"Identity verified for tenant_id={tenant_id}")
                else:
                    debug_vault(f"No broadcaster found for slug={x_broadcaster} and key={x_source_key}")
            except Exception as e:
                debug_vault(f"Query Error: {e}")
                raise e
    
    if not tenant_id:
         debug_vault("Auth failed: tenant_id is None")
         raise HTTPException(status_code=401, detail="Protection Key (X-Source-Key) is required for Vault Ingestion")

    debug_vault(f"Vault Ingest Request approved: match_id={match_id}, tenant_id={tenant_id}")

    file_type = file_type_override or ASSET_TYPE_TO_FILE_TYPE.get(asset_type, "video")
    
    # Logic for file vs URL
    final_source = source_url
    temp_path = None
    if file:
        import shutil
        import tempfile
        import os
        suff = os.path.splitext(file.filename)[1]
        fd, temp_path = tempfile.mkstemp(suffix=suff)
        with os.fdopen(fd, 'wb') as tmp:
            shutil.copyfileobj(file.file, tmp)
        final_source = temp_path
        debug_vault(f"File uploaded to {temp_path}")

    if not final_source:
        debug_vault("Error: Missing asset source")
        raise HTTPException(status_code=400, detail="Missing asset source (file or URL)")

    from services.vault_worker import process_master_vod

    async def run_and_cleanup(_path, _match, _b_id, _f_type, _t_path):
        uv_logger = logging.getLogger("uvicorn.error")
        debug_vault(f"Background Task Started: path={_path}, match={_match}, broadcaster={_b_id}")
        try:
            await process_master_vod(
                _path,
                _match,
                AsyncSessionLocal,
                "secure_vod_ingest",
                _b_id,
                _f_type,
            )
            debug_vault(f"Background Task Finished Successfully: {_match}")
        except Exception as e:
            uv_logger.error(f"[Vault] Background task error: {e}")
            debug_vault(f"Background Task Error: {e}")
        finally:
            if _t_path and os.path.exists(_t_path):
                try:
                    os.remove(_t_path)
                    debug_vault(f"Cleaned up temp file: {_t_path}")
                except:
                    pass

    background_tasks.add_task(
        run_and_cleanup,
        final_source,
        match_id,
        tenant_id,
        file_type,
        temp_path
    )

    return {
        "status": "indexing_started",
        "match_id": match_id,
        "display_name": display_name,
        "asset_type": asset_type,
        "file_type": file_type,
        "broadcaster_id": str(tenant_id),
    }


@router.get("/api/streams/firehose")
async def stream_firehose(
    tenant=Depends(tenant_context),
):
    queue = firehose_pubsub.subscribe()

    async def events():
        try:
            while True:
                event_type, payload = await queue.get()
                yield _sse(event_type, payload)
        finally:
            firehose_pubsub.unsubscribe(queue)

    return StreamingResponse(events(), media_type="text/event-stream")



@router.post("/api/enforcement/{stream_id}/action")
async def enforce_stream_action(
    stream_id: str,
    request: EnforcementActionRequest,
    tenant=Depends(tenant_context),
    db: AsyncSession = Depends(get_postgres_db),
):
    action = request.action.upper()
    if action not in {"TAKEDOWN", "MONETIZE"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="action must be TAKEDOWN or MONETIZE",
        )

    normalized_status = "dismantled" if action == "TAKEDOWN" else "claimed"
    stream_pk = stream_id.removeprefix("THR-").removeprefix("LIVE-")
    if stream_pk.isdigit():
        result = await db.execute(select(ProcessedStream).where(ProcessedStream.id == int(stream_pk)))
        stream = result.scalars().first()
        
        # Allow action if it belongs to tenant OR is unassigned (Claiming ownership)
        if stream and (stream.broadcaster_id == tenant["id"] or stream.broadcaster_id is None):
            if stream.broadcaster_id is None and tenant["id"]:
                stream.broadcaster_id = tenant["id"] # Assign to this tenant now!
            
            stream.action_taken = "Takedown" if action == "TAKEDOWN" else "Monetize"
            db.add(stream)
            await db.commit()
            await db.refresh(stream)
            return {
                "id": f"THR-{stream.id}",
                "status": normalized_status,
                "action": action,
                "revenueRecovered": _revenue_for_stream(stream),
                "audit": "ledger_updated_and_assigned",
            }

    return {
        "id": stream_id,
        "status": normalized_status,
        "action": action,
        "revenueRecovered": 0 if action == "TAKEDOWN" else 420,
        "audit": "demo_acknowledged",
    }

@router.post("/api/telemetry/report")
async def report_telemetry(payload: TelemetryReport):
    # Insert raw ping into Mongo data lake
    doc = payload.dict()
    doc["timestamp"] = datetime.datetime.now(datetime.timezone.utc)
    await raw_telemetry_collection.insert_one(doc)

    # Publish to real-time firehose
    now = datetime.datetime.now(datetime.timezone.utc)
    print(f"[Telemetry] Received from {payload.source}, publishing log...")
    await firehose_pubsub.publish("log", {
        "id": random.randint(1000, 9999),
        "ts": now.strftime("%H:%M:%S.%f")[:12],
        "lvl": "SCAN" if payload.source == "firehose_simulator" else "VECTOR",
        "text": f"Source: {payload.source} | URL: {payload.url[:50]}..."
    })

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

        # Publish to real-time firehose
        now = datetime.datetime.now(datetime.timezone.utc)
        await firehose_pubsub.publish("action", {
            "id": new_stream_record.id,
            "ts": now.strftime("%H:%M:%S.%f")[:12],
            "matchId": matched_id or "LAKERS_WARRIORS_001",
            "cosine": normalized_confidence,
            "platform": request.platform,
            "url": request.media_url,
            "verdict": "INFRINGEMENT_CONFIRMED" if normalized_confidence >= 0.9 else "BORDERLINE",
            "reasoning": reasoning.split(".")[:4],
        })

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
