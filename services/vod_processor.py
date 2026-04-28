import asyncio
import cv2
import os
from scenedetect import open_video, SceneManager, ContentDetector

async def _save_to_postgres(match_id: str, start_sec: float, end_sec: float, sim: float):
    """Writes VOD archive to Postgres isolated local scope"""
    from database import AsyncSessionLocal, ProcessedStream
    async with AsyncSessionLocal() as db:
        record = ProcessedStream(
            media_url=f"vod_archive/{match_id}",
            ai_classification="VOD Archival Deep Scan",
            confidence_score=sim,
            action_taken="Archived",
            reasoning=f"Identified scene cluster T+{start_sec:.2f}s to T+{end_sec:.2f}s"
        )
        db.add(record)
        await db.commit()
        print(f"[*] DB Write OK: VOD Archival segment {start_sec:.2f} -> {end_sec:.2f}")

def _process_vod_sync(video_path: str, match_id: str):
    """
    Blocking PySceneDetect and OpenCV logic.
    Calculates exact scene change hashes, extracts the middle frame of each scene
    to avoid blurry camera cuts, and checks similarity before writing to DB.
    """
    if not os.path.exists(video_path):
        print(f"[X] VOD path does not exist: {video_path}")
        return

    print(f"[*] PySceneDetect initialising for VOD: {video_path}")
    video = open_video(video_path)
    scene_manager = SceneManager()
    
    # Standard threshold 27.0 for content variation
    scene_manager.add_detector(ContentDetector(threshold=27.0))
    scene_manager.detect_scenes(video)
    
    scene_list = scene_manager.get_scene_list()
    print(f"[*] PySceneDetect computed {len(scene_list)} distinct scenes. Beginning extraction.")

    cap = cv2.VideoCapture(video_path)

    from PIL import Image
    from services.matching_engine import calculate_similarity

    for i, (start_time, end_time) in enumerate(scene_list):
        # Calculate exactly the middle index frame of this chunk
        middle_frame_idx = int((start_time.get_frames() + end_time.get_frames()) / 2)
        cap.set(cv2.CAP_PROP_POS_FRAMES, middle_frame_idx)
        
        ret, frame = cap.read()
        if ret:
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            pil_img = Image.fromarray(frame_rgb)
            
            try:
                # Compare similarity to our official vector bank
                sim = calculate_similarity(pil_img)
                print(f"   ∟ Processing Scene [{i+1}/{len(scene_list)}] | Center T+{middle_frame_idx} | Confidence: {sim:.2f}")
                
                # Await a Postgres background save from inside this thread
                # By creating a fresh loop block
                try:
                    loop = asyncio.get_running_loop()
                    loop.create_task(_save_to_postgres(match_id, start_time.get_seconds(), end_time.get_seconds(), sim))
                except RuntimeError:
                    # If this thread does not have an event loop attached yet
                    asyncio.run(_save_to_postgres(match_id, start_time.get_seconds(), end_time.get_seconds(), sim))
            except Exception as e:
                print(f"[!] Engine error on scene {i+1}: {e}")

    cap.release()
    print(f"[*] PySceneDetect cycle complete for VOD: {video_path}")

async def process_vod_asset(video_path: str, match_id: str):
    """
    Hooks the heavy calculation off the main FastAPI event loop into a specific thread executor.
    """
    await asyncio.to_thread(_process_vod_sync, video_path, match_id)
