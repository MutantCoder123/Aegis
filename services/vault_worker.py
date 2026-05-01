"""
Aegis Vector Vault Worker
=========================
Continuously samples an official broadcast stream via HLS Manifest polling,
generates CLIP embeddings, and persists them into the `official_asset_vectors` 
pgvector table without segment overlap or accumulator drift.
"""

import asyncio
import logging
import os
import datetime
import glob
import shutil
import tempfile
import uuid
from typing import Optional
from services.s3_utils import upload_to_s3
from services.media_extractor import MediaExtractor

import numpy as np
from PIL import Image
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

def debug_vault(msg):
    with open("/tmp/vault_debug.log", "a") as f:
        f.write(f"{datetime.datetime.now()} - {msg}\n")

# ── Lazy CLIP singleton ────────────────────────────────────────────────────────
_clip_model: Optional[SentenceTransformer] = None


def _get_clip_model() -> SentenceTransformer:
    global _clip_model
    if _clip_model is None:
        logger.info("[VaultWorker] Loading CLIP model clip-ViT-B-32 …")
        _clip_model = SentenceTransformer("clip-ViT-B-32")
    return _clip_model


# ── Downloading and Chunk extraction ───────────────────────────────────────────
async def _download_segment(url: str, out_path: str) -> bool:
    """Download an HLS segment directly to a local file."""
    import aiohttp
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as resp:
                if resp.status == 200:
                    with open(out_path, 'wb') as f:
                        f.write(await resp.read())
                    return True
                else:
                    logger.warning(f"[VaultWorker] Segment download HTTP error: {resp.status}")
    except Exception as e:
        logger.error(f"[VaultWorker] Segment download error: {e}")
    return False

async def _extract_middle_frame(chunk_path: str, duration: float) -> Optional[str]:
    """Extract a frame from the exact middle of the chunk."""
    out_path = os.path.join(tempfile.gettempdir(), f"vault_frame_{uuid.uuid4().hex[:10]}.jpg")
    mid_time = duration / 2.0
    
    cmd = [
        "ffmpeg",
        "-y",
        "-ss", str(mid_time),
        "-i", chunk_path,
        "-frames:v", "1",
        "-q:v", "2",
        "-vf", "scale=224:224",
        out_path,
    ]
    def _run():
        try:
            import subprocess as _sp
            result = _sp.run(cmd, capture_output=True, timeout=15)
            if result.returncode != 0:
                logger.warning(f"[VaultWorker] ffmpeg dict output warning: {result.stderr.decode()}")
            return result.returncode == 0
        except Exception as exc:
            logger.warning(f"[VaultWorker] ffmpeg subprocess error: {exc}")
            return False

    success = await asyncio.to_thread(_run)
    if success and os.path.exists(out_path) and os.path.getsize(out_path) > 0:
        return out_path
    return None

async def _upload_asset(local_path: str, match_id: str, is_static: bool = False) -> Optional[str]:
    """
    Saves an asset (video or image) to a permanent storage location.
    If AWS environment variables are set, uploads to S3. 
    Otherwise, saves to the local /official_archive/ directory for development.
    """
    import shutil
    ext = os.path.splitext(local_path)[1] or (".jpg" if is_static else ".ts")
    filename = f"{match_id}_{uuid.uuid4().hex[:8]}{ext}"
    
    # Try S3 first
    s3_key = f"assets/{match_id}/{filename}"
    s3_url = upload_to_s3(local_path, s3_key)
    if s3_url and s3_url.startswith("https://"):
        return s3_url

    # Fallback to local archive
    archive_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "official_archive")
    os.makedirs(archive_dir, exist_ok=True)
    dest_path = os.path.join(archive_dir, filename)
    try:
        def _copy():
            shutil.copy2(local_path, dest_path)
        await asyncio.to_thread(_copy)
        return f"/official_archive/{filename}"
    except Exception as e:
        logger.error(f"[VaultWorker] Local upload failed: {e}")
        return None


# ── Vectorize a byte frame ───────────────────────────────────────────────────
async def _vectorize_bytes(frame_bytes: bytes) -> Optional[np.ndarray]:
    """Return a 512-d CLIP embedding for the given JPEG bytes using PIL."""
    import io
    def _encode():
        try:
            model = _get_clip_model()
            img = Image.open(io.BytesIO(frame_bytes)).convert("RGB")
            debug_vault("CLIP Model Loaded & Image Opened. Encoding...")
            return model.encode(img)
        except Exception as exc:
            debug_vault(f"Vectorize Error: {exc}")
            logger.warning(f"[VaultWorker] Encoding error: {exc}")
            return None

    return await asyncio.to_thread(_encode)


# ── Database insert ────────────────────────────────────────────────────────────
async def _store_vector(
    vector: np.ndarray,
    match_id: str,
    stream_url: str,
    video_chunk_url: Optional[str],
    db_session_factory,
    source_origin: str,
    broadcaster_id: str,
    timestamp: Optional[datetime.datetime] = None,
    is_static_ref: bool = False
) -> bool:
    """Insert one OfficialAssetVector row into PostgreSQL."""
    try:
        from database import OfficialAssetVector
        debug_vault(f"Attempting to store vector for match={match_id}, broadcaster={broadcaster_id}")
        record = OfficialAssetVector(
            match_id=match_id,
            broadcaster_id=broadcaster_id,
            vector=vector.tolist(),
            video_chunk_url=video_chunk_url,
            is_highlight=False,
            is_static_ref=is_static_ref,
            viral_engagement_score=0,
            source_origin=source_origin,
            extra_metadata={"stream_url": stream_url},
        )
        # Apply strict program_date_time timestamp if extracted from the HLS manifest
        if timestamp is not None:
            record.timestamp = timestamp
            
        async with db_session_factory() as session:
            session.add(record)
            await session.commit()
            debug_vault(f"Stored vector for match={match_id} (id={record.id})")
        return True
    except Exception as exc:
        logger.error(f"[VaultWorker] DB insert failed: {exc}")
        return False


# ══════════════════════════════════════════════════════════════════════════════
# PUBLIC API
# ══════════════════════════════════════════════════════════════════════════════
async def continuous_ingest_broadcast(
    stream_url: str,
    match_id: str,
    interval_seconds: int,
    db_session_factory,
    source_origin: str = "official_broadcaster",
    broadcaster_id: Optional[str] = None
) -> None:
    """
    Background task: Use HLS manifest polling to capture segments,
    generate a CLIP vector, and persist it to the Vector Vault with absolute UTC tracking.
    """
    import m3u8
    import aiohttp
    from datetime import timedelta

    logger.info(
        f"[VaultWorker] 🚀 Starting HLS continuous ingest — "
        f"match_id={match_id!r}, url={stream_url[:80]}"
    )

    segment_queue = asyncio.Queue(maxsize=100)
    last_sequence_num = -1

    async def fetch_manifest():
        nonlocal last_sequence_num
        while True:
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(stream_url) as resp:
                        if resp.status == 200:
                            m3u8_str = await resp.text()
                            playlist = m3u8.loads(m3u8_str, uri=stream_url)

                            # Handle Master Playlists (Variant streams)
                            if playlist.is_variant:
                                best_variant = max(playlist.playlists, key=lambda p: p.stream_info.bandwidth if p.stream_info else 0)
                                async with session.get(best_variant.absolute_uri) as resp2:
                                    if resp2.status == 200:
                                        m3u8_str_var = await resp2.text()
                                        playlist = m3u8.loads(m3u8_str_var, uri=best_variant.absolute_uri)

                            for seg in playlist.segments:
                                seq_num = playlist.media_sequence + playlist.segments.index(seg)
                                if last_sequence_num == -1 or seq_num > last_sequence_num:
                                    logger.debug(f"[VaultWorker] Queued valid segment {seq_num}")
                                    await segment_queue.put(seg)
                                    last_sequence_num = seq_num
            except asyncio.CancelledError:
                raise
            except Exception as e:
                logger.warning(f"[VaultWorker] Manifest fetch error: {e}")
            
            # Use interval provided, or default to standard HLS polling time
            await asyncio.sleep(interval_seconds)

    async def process_segments():
        vectors_inserted = 0
        while True:
            try:
                seg = await segment_queue.get()
                try:
                    segment_url = seg.absolute_uri
                    duration = seg.duration or 5.0
                    seg_timestamp = seg.program_date_time or datetime.datetime.now(datetime.timezone.utc)

                    chunk_path = os.path.join(tempfile.gettempdir(), f"vault_chunk_{uuid.uuid4().hex[:10]}.ts")
                    
                    # Piped streaming to fetch 1 frame per 2 seconds, while also writing chunk via pipe copy
                    cmd = [
                        "ffmpeg", "-y", "-i", segment_url,
                        "-c", "copy", chunk_path,
                        "-vf", "fps=1/2,scale=224:224", "-q:v", "2", "-f", "image2pipe", "-vcodec", "mjpeg", "-"
                    ]
                    
                    proc = await asyncio.create_subprocess_exec(
                        *cmd,
                        stdout=asyncio.subprocess.PIPE,
                        stderr=asyncio.subprocess.DEVNULL
                    )

                    frames = []
                    buffer = b""
                    while True:
                        if proc.stdout is None:
                            break
                        chunk = await proc.stdout.read(8192)
                        if not chunk:
                            break
                        buffer += chunk
                        while True:
                            start = buffer.find(b"\\xff\\xd8")
                            end = buffer.find(b"\\xff\\xd9")
                            if start != -1 and end != -1 and end > start:
                                img_data = buffer[start:end+2]
                                frames.append(img_data)
                                buffer = buffer[end+2:]
                            else:
                                break
                                
                    await proc.wait()
                    
                    if proc.returncode != 0 or not frames:
                        try: os.remove(chunk_path)
                        except OSError: pass
                        raise RuntimeError("Failed to extract frames via pipe")

                    # Mock Upload
                    video_chunk_url = await _upload_asset(chunk_path, match_id)

                    try: os.remove(chunk_path)
                    except OSError: pass
                    
                    for idx, frame_bytes in enumerate(frames):
                        vector = await _vectorize_bytes(frame_bytes)
                        if vector is None:
                            continue
                            
                        # Adjust timestamp offset based on fps=1/2
                        offset_seconds = idx * 2.0
                        frame_timestamp = seg_timestamp + timedelta(seconds=offset_seconds)

                        ok = await _store_vector(
                            vector, 
                            match_id, 
                            stream_url, 
                            video_chunk_url, 
                            db_session_factory, 
                            source_origin,
                            broadcaster_id,
                            timestamp=frame_timestamp
                        )
                        
                        if ok:
                            vectors_inserted += 1
                            logger.info(
                                f"[VaultWorker] ✅ Streaming vector #{vectors_inserted} stored "
                                f"(match_id={match_id!r}, dim=512, ts={frame_timestamp})"
                            )

                except Exception as segment_err:
                    logger.error(f"[VaultWorker] Segment processing error: {segment_err}")
                finally:
                    segment_queue.task_done()
            except asyncio.CancelledError:
                raise

    try:
        await asyncio.gather(fetch_manifest(), process_segments())
    except asyncio.CancelledError:
        logger.info("[VaultWorker] Task cancelled — shutting down gracefully.")


async def process_master_vod(
    video_path: str,
    match_id: str,
    db_session_factory,
    source_origin: str = "secure_vod_ingest",
    broadcaster_id: Optional[str] = None,
    file_type: str = "video"
) -> None:
    debug_vault(f"process_master_vod START: {match_id}, type={file_type}, broadcaster={broadcaster_id}")
    """
    Indexes a full Master VOD MP4 or a static JPEG/PNG image into the Ground Truth Vector Vault.
    """
    if file_type == "image":
        logger.info(f"[VaultWorker] 🚀 Processing static image reference: {video_path}")
        try:
            with open(video_path, "rb") as f:
                img_bytes = f.read()
            
            vector = await _vectorize_bytes(img_bytes)
            if vector is not None:
                ok = await _store_vector(
                    vector, 
                    match_id, 
                    video_path, 
                    None, 
                    db_session_factory, 
                    source_origin, 
                    broadcaster_id,
                    is_static_ref=True
                )
                if ok:
                    logger.info(f"[VaultWorker] ✅ Static image reference stored for {match_id}")
            return
        except Exception as e:
            logger.error(f"[VaultWorker] Static image processing failed: {e}")
            return

    logger.info(f"[VaultWorker] 🚀 Starting process_master_vod (Video) for {video_path}")
    # Archive the asset if it's a local file.
    master_vod_url = None
    is_url = video_path.startswith(("http://", "https://"))
    
    if not is_url:
        master_vod_url = await _upload_asset(video_path, match_id)
        debug_vault(f"Master VOD archived: {master_vod_url}")
    else:
        master_vod_url = video_path
        debug_vault(f"Using remote URL for VOD reference: {master_vod_url}")

    if is_url:
        logger.info(f"[VaultWorker] 🌐 Resolving stream URL for: {video_path}")
        resolved_url = await MediaExtractor.get_stream_url(video_path)
        if not resolved_url:
            logger.error(f"[VaultWorker] ❌ Failed to resolve URL: {video_path}")
            return
            
        logger.info(f"[VaultWorker] 🌐 Streaming frames directly from URL: {resolved_url}")
        vectors_inserted = 0
        vod_start_time = datetime.datetime.now(datetime.timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        
        frame_idx = 0
        async for frame_bytes in MediaExtractor.stream_frames(resolved_url, is_live=False):
            vector = await _vectorize_bytes(frame_bytes)
            if vector is not None:
                # Assuming stream_frames returns 1fps as per its implementation
                frame_timestamp = vod_start_time + datetime.timedelta(seconds=frame_idx)
                
                ok = await _store_vector(
                    vector, 
                    match_id, 
                    video_path, 
                    video_path, # Use original URL for playback reference
                    db_session_factory, 
                    source_origin, 
                    broadcaster_id,
                    timestamp=frame_timestamp
                )
                if ok:
                    vectors_inserted += 1
            
            frame_idx += 1
            # Limit to 300 frames (5 minutes) for reference ingestion to prevent infinite loops on long VODs
            if frame_idx >= 300:
                break
        
        logger.info(f"[VaultWorker] ✅ Streaming ingestion completed. {vectors_inserted} vectors stored for {match_id}.")
        return

    # LOCAL FILE LOGIC (Segmentation)
    temp_dir = tempfile.mkdtemp(prefix="vault_master_")
    
    cmd = [
        "ffmpeg",
        "-y",
        "-i", video_path,
        "-f", "segment",
        "-segment_time", "5",
        "-c", "copy",
        os.path.join(temp_dir, "out_%03d.mp4")
    ]
    
    def _run():
        try:
            import subprocess as _sp
            result = _sp.run(cmd, capture_output=True)
            return result.returncode == 0
        except Exception as e:
            logger.error(f"[VaultWorker] ffmpeg segmentation exception: {e}")
            return False
            
    logger.info("[VaultWorker] Segmenting master VOD via ffmpeg...")
    success = await asyncio.to_thread(_run)
    
    if not success:
        logger.error(f"[VaultWorker] ffmpeg segmentation failed for {video_path}")
        shutil.rmtree(temp_dir, ignore_errors=True)
        return
        
    chunk_files = sorted(glob.glob(os.path.join(temp_dir, "out_*.mp4")))
    logger.info(f"[VaultWorker] Segmented into {len(chunk_files)} chunks. Starting extraction...")
    
    vectors_inserted = 0
    total_chunks = len(chunk_files)
    
    # Use a stable start time for the VOD (e.g. today at midnight) and add offsets
    vod_start_time = datetime.datetime.now(datetime.timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    for i, chunk_path in enumerate(chunk_files):
        try:
            # Piped streaming to fetch 1 frame per 2 seconds
            pipe_cmd = [
                "ffmpeg", "-y", "-i", chunk_path,
                "-vf", "fps=1/2,scale=224:224", "-q:v", "2", "-f", "image2pipe", "-vcodec", "mjpeg", "-"
            ]
            
            proc = await asyncio.create_subprocess_exec(
                *pipe_cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.DEVNULL
            )

            frames = []
            buffer = b""
            while True:
                if proc.stdout is None:
                    break
                chunk = await proc.stdout.read(8192)
                if not chunk:
                    break
                buffer += chunk
                while True:
                    start = buffer.find(b"\xff\xd8")
                    end = buffer.find(b"\xff\xd9")
                    if start != -1 and end != -1 and end > start:
                        img_data = buffer[start:end+2]
                        frames.append(img_data)
                        buffer = buffer[end+2:]
                    else:
                        break
                        
            await proc.wait()

            if not frames:
                continue

            # Calculate timestamp for this chunk (5s interval)
            chunk_timestamp = vod_start_time + datetime.timedelta(seconds=i * 5)
            video_chunk_url = await _upload_asset(chunk_path, match_id)
            
            for frame_idx, frame_bytes in enumerate(frames):
                vector = await _vectorize_bytes(frame_bytes)
                if vector is None:
                    continue
                
                # Fine-grained timestamp within the chunk (2s frame interval)
                frame_timestamp = chunk_timestamp + datetime.timedelta(seconds=frame_idx * 2)
                
                # Use the specific chunk URL for this vector so the UI plays the exact segment matched.
                ok = await _store_vector(
                    vector, 
                    match_id, 
                    video_path, 
                    video_chunk_url, 
                    db_session_factory, 
                    source_origin, 
                    broadcaster_id,
                    timestamp=frame_timestamp
                )
                if ok:
                    vectors_inserted += 1
        except Exception as e:
            logger.error(f"[VaultWorker] Error processing chunk {i}: {e}")
            
    # Final cleanup of segments
    shutil.rmtree(temp_dir, ignore_errors=True)
    logger.info(f"[VaultWorker] ✅ process_master_vod completed. {vectors_inserted} vectors stored for {total_chunks} chunks ({match_id}).")
