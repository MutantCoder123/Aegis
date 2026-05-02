# Aegis Ingestion Worker - VERSION 2.0 - FIXED POLLING
import asyncio
import os
import random
import re
from datetime import datetime, timezone
import traceback
import httpx
from services.media_extractor import MediaExtractor
from services.vector_vault import CLIPVectorizer, VaultSearch
from services.temporal_guard import TemporalGuard
from services.config import USE_MOCK_SERVICES
if USE_MOCK_SERVICES:
    from services.mocks import mock_handoff_to_arbiter as handoff_to_arbiter
else:
    from services.arbiter_handoff import handoff_to_arbiter
from models.schemas import IngestionMode
import hashlib
from database import mongo_db, social_intel_collection

# --- 1. REDDIT DAEMON ---
async def scrape_reddit():
    print("[*] Starting Reddit daemon...")
    reddit_client_id = os.getenv("REDDIT_CLIENT_ID")
    if not reddit_client_id:
        print("[!] No REDDIT_CLIENT_ID provided. Skipping simulation.")
        return
    import praw
    reddit = praw.Reddit(
        client_id=os.getenv("REDDIT_CLIENT_ID"),
        client_secret=os.getenv("REDDIT_CLIENT_SECRET"),
        user_agent="AegisBot/1.0",
    )
    subreddit = reddit.subreddit("soccerstreams")
    try:
        for comment in subreddit.stream.comments(skip_existing=True):
            url_match = re.search(r"(?P<url>https?://[^\s]+)", comment.body)
            if url_match:
                 await social_intel_collection.insert_one({
                     "platform": "Reddit",
                     "raw_url": url_match.group("url"),
                     "timestamp": datetime.now(timezone.utc).isoformat(),
                     "scanned": False
                 })
                 print("[Reddit] Link ingested.")
    except Exception as e:
        print(f"[Reddit Error] {e}")

# --- 2. TELEGRAM LISTENER ---
async def scrape_telegram():
    print("[*] Starting Telegram listener...")
    api_id = os.getenv("TELEGRAM_API_ID")
    if not api_id:
        print("[!] No TELEGRAM_API_ID provided. Skipping simulation.")
        return
    from telethon import TelegramClient, events
    client = TelegramClient('aegis_session', int(api_id), os.getenv("TELEGRAM_API_HASH"))
    await client.start()
    @client.on(events.NewMessage(chats=['LiveMatchHD']))
    async def handler(event):
        url_match = re.search(r"(?P<url>https?://[^\s]+)", event.text)
        if url_match:
             await social_intel_collection.insert_one({
                 "platform": "Telegram",
                 "raw_url": url_match.group("url"),
                 "timestamp": datetime.now(timezone.utc).isoformat(),
                 "scanned": False
             })
             print("[Telegram] Link ingested.")
    await client.run_until_disconnected()

# --- 3. STEALTH EXTRACTION PIPELINE ---
async def run_stealth_extractor():
    print("[*] Stealth Extraction Worker initiated.")
    
    # Initialize CLIP model once
    vectorizer = CLIPVectorizer()
    
    # STARTUP RESET: Mark everything as pending to scan from start
    print("[Worker] Startup Reset: Clearing 'scanned' status for all records...")
    await social_intel_collection.update_many({}, {"$set": {"scanned": False}})
    
    while True:
        try:
            # CHECK MONGODB
            pending_count = await social_intel_collection.count_documents({"scanned": False})
            
            target = None
            if pending_count > 0:
                # Targeted Intelligence Pipeline: Pull LIVE targets before POST_MATCH
                target = await social_intel_collection.find_one_and_update(
                    {"scanned": False},
                    {"$set": {"scanned": True, "processing_started_at": datetime.now(timezone.utc)}},
                    sort=[("ingestion_mode", 1), ("priority_score", -1)]
                )
            
            if not target:
                await asyncio.sleep(10)
                continue
            
            raw_url = target.get('raw_url')
            mode = target.get('ingestion_mode', IngestionMode.POST_MATCH)
            platform = target.get('platform', 'Unknown')
            
            print(f"[Worker] Found target: {raw_url} | Mode: {mode}")

            # Notify UI of new target scanning
            async with httpx.AsyncClient() as client:
                try:
                    await client.post("http://127.0.0.1:8000/api/internal/publish", json={
                        "event_type": "target",
                        "data": {
                            "id": str(target.get('_id')),
                            "ts": datetime.now(timezone.utc).strftime("%H:%M:%S"),
                            "url": raw_url,
                            "platform": platform,
                            "velocity": random.randint(100, 500),
                            "status": "scanning"
                        }
                    })
                except: pass

            # 1. Resolve Media Stream URL
            stream_url = await MediaExtractor.get_stream_url(raw_url)
            if not stream_url:
                print(f"[!] Extraction Failed: Could not resolve stream for {raw_url}")
                async with httpx.AsyncClient() as client:
                    try:
                        await client.post("http://127.0.0.1:8000/api/internal/publish", json={
                            "event_type": "target",
                            "data": {
                                "id": str(target.get('_id')),
                                "ts": datetime.now(timezone.utc).strftime("%H:%M:%S"),
                                "url": raw_url,
                                "platform": platform,
                                "velocity": 0,
                                "status": "failed"
                            }
                        })
                    except: pass
                continue

            # 2. Process Stream In-Memory
            is_live = (mode == IngestionMode.LIVE)
            print(f"[*] Starting In-Memory Extraction ({'LIVE' if is_live else 'VOD'}) at 1fps...")
            
            frame_count = 0
            target_state = {"last_match_id": None, "consecutive": 0}

            async for frame_bytes in MediaExtractor.stream_frames(stream_url, is_live=is_live):
                frame_count += 1
                
                # SIMULATION GATE: For mock targets, force an AI escalation periodically to test the Arbiter
                if USE_MOCK_SERVICES and "mock_" in raw_url and frame_count == 10:
                    print(f"[Simulation] Forcing Mock AI Escalation for {raw_url}")
                    asyncio.create_task(handoff_to_arbiter(
                        frame_bytes=frame_bytes,
                        url=raw_url,
                        platform=platform,
                        similarity=0.82, # Simulated gray zone score
                        metadata=target.get("metadata", {})
                    ))

                if frame_count % 10 == 0:
                    async with httpx.AsyncClient() as client:
                        try:
                            await client.post("http://127.0.0.1:8000/api/internal/publish", json={
                                "event_type": "target",
                                "data": {
                                    "id": str(target.get('_id')),
                                    "ts": datetime.now(timezone.utc).strftime("%H:%M:%S"),
                                    "url": raw_url,
                                    "platform": platform,
                                    "velocity": random.randint(100, 500),
                                    "status": f"scanning ({frame_count}f)"
                                }
                            })
                        except: pass

                # PHASE 4: Vector Vault & Temporal Guard
                try:
                    # 1. Vectorize
                    vector = vectorizer.vectorize(frame_bytes)
                    
                    # 2. Search Vault
                    match_data = await VaultSearch.find_nearest(vector)
                    
                    if match_data:
                        # Apply Logo Sieve Color Penalty
                        from services.logo_sieve import LogoSieve
                        color_multiplier = LogoSieve.evaluate(frame_bytes, match_data)
                        match_data['similarity'] = match_data['similarity'] * color_multiplier

                        match_id = match_data['asset'].match_id
                        if match_id == target_state["last_match_id"]:
                            target_state["consecutive"] += 1
                        else:
                            target_state["last_match_id"] = match_id
                            target_state["consecutive"] = 1

                        # 3. Adjudicate (Temporal Guard)
                        adjudication = TemporalGuard.evaluate(match_data, mode, target_state["consecutive"])
                        verdict = adjudication["verdict"]
                        confidence = adjudication["confidence"]
                        
                        if verdict in ["CONFIRMED_MALICIOUS", "RESTREAM_SUSPECTED"]:
                            print(f"[Phase 4] {verdict} | Conf: {confidence:.2f} | Asset: {match_data['asset'].match_id}")
                            
                            # Save to Database so it appears in Forensic Ledger
                            from database import AsyncSessionLocal, ProcessedStream
                            async with AsyncSessionLocal() as session:
                                new_stream = ProcessedStream(
                                    broadcaster_id=match_data['asset'].broadcaster_id,
                                    platform=platform,
                                    media_url=f"{raw_url}&start={frame_count}" if "?" in raw_url else f"{raw_url}?start={frame_count}",
                                    action_taken="pending",
                                    confidence_score=confidence,
                                    matched_official_url=match_data['asset'].video_chunk_url,
                                    matched_official_id=match_data['asset'].match_id,
                                    matched_timestamp=match_data['asset'].timestamp,
                                    timestamp=datetime.now(timezone.utc),
                                    reasoning=str([
                                        f"→ Match Found: {match_data['asset'].match_id}",
                                        f"→ Confidence Score: {int(confidence * 100)}%",
                                        f"→ Mode: {mode}",
                                        f"→ Temporal Guard: {verdict}"
                                    ])
                                )
                                session.add(new_stream)
                                await session.commit()
                                await session.refresh(new_stream)
                                db_id = new_stream.id

                            # Emit PubSub Event to UI via Relay
                            event_data = {
                                "id": str(db_id),
                                "ts": datetime.now(timezone.utc).strftime("%H:%M:%S"),
                                "matchId": match_data['asset'].match_id,
                                "cosine": float(confidence),
                                "platform": platform,
                                "url": raw_url,
                                "verdict": verdict,
                                "matchedOfficialUrl": match_data['asset'].video_chunk_url,
                                "pirateTime": int(frame_count),
                                "reasoning": [
                                    f"→ Match Found: {match_data['asset'].match_id}",
                                    f"→ Confidence Score: {int(confidence * 100)}%",
                                    f"→ Mode: {mode}",
                                    f"→ Temporal Guard: {verdict}"
                                ]
                            }
                            
                            async with httpx.AsyncClient() as client:
                                try:
                                    await client.post("http://127.0.0.1:8000/api/internal/publish", json={
                                        "event_type": "action",
                                        "data": event_data
                                    })
                                except Exception as e:
                                    import traceback
                                    print(f"[!] Relay failed: {repr(e)}\n{traceback.format_exc()}")

                        elif verdict == "TIER_3_REQUIRED":
                            print(f"[Phase 5] Escalating Gray Zone to Gemini AI Arbiter...")
                            # NON-BLOCKING HANDOFF: Spawn a background task
                            asyncio.create_task(handoff_to_arbiter(
                                frame_bytes=frame_bytes,
                                url=raw_url,
                                platform=platform,
                                similarity=confidence,
                                metadata=target.get("metadata", {})
                            ))
                            
                            # Log the escalation to the UI relay
                            async with httpx.AsyncClient() as client:
                                try:
                                    await client.post("http://127.0.0.1:8000/api/internal/publish", json={
                                        "event_type": "log",
                                        "data": {
                                            "id": f"esc-{datetime.now().timestamp()}",
                                            "ts": datetime.now(timezone.utc).strftime("%H:%M:%S"),
                                            "url": raw_url,
                                            "msg": "⚠️ Gray Zone detected. Escalating to Gemini AI Arbiter for semantic analysis..."
                                        }
                                    })
                                except: pass

                        if verdict == "CONFIRMED_MALICIOUS" and is_live:
                            # For live mirrors, we don't need to keep scanning if we're certain.
                            # But for this demo, let's keep going to show stability.
                            pass

                except Exception as e:
                    print(f"[Phase 4 Error] {e}")

                # If it's a VOD (POST_MATCH) and we've gathered enough frames (e.g., 60), we can stop.
                if not is_live and frame_count >= 60:
                    print("[Worker] VOD sample limit reached. Moving to next target.")
                    break
            
            print(f"[Worker] Finished processing {raw_url}. Total frames: {frame_count}")

        except Exception as e:
            print(f"[Worker Error] {e}")
            traceback.print_exc()
        await asyncio.sleep(5)

async def run_worker():
    await asyncio.gather(scrape_reddit(), scrape_telegram(), run_stealth_extractor())

if __name__ == "__main__":
    asyncio.run(run_worker())
