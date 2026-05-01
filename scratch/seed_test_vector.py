import asyncio
import os
import cv2
from services.vault_worker import _vectorize_bytes, _store_vector
from database import AsyncSessionLocal, Broadcaster
from sqlalchemy.future import select

async def seed_test_vector():
    video_path = "official_archive/LAKERS_WARRIORS_001_43c003b7.mp4"
    if not os.path.exists(video_path):
        print("Video not found.")
        return

    # Extract first frame
    cap = cv2.VideoCapture(video_path)
    success, frame = cap.read()
    if not success:
        print("Failed to read frame.")
        return
    cap.release()

    # Convert to JPEG bytes for _vectorize_bytes
    is_success, buffer = cv2.imencode(".jpg", frame)
    if not is_success:
        print("Failed to encode frame.")
        return
    frame_bytes = buffer.tobytes()

    # Vectorize
    vector = await _vectorize_bytes(frame_bytes)
    if vector is None:
        print("Failed to vectorize frame.")
        return

    # Get NBA broadcaster ID
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Broadcaster).where(Broadcaster.slug == "nba"))
        b = result.scalars().first()
        if not b:
            print("NBA Broadcaster not found. Run seed_data.py first.")
            return
        b_id = str(b.id)

    # Store in vault
    success = await _store_vector(
        vector=vector, 
        match_id="LAKERS_WARRIORS_001", 
        stream_url=f"http://localhost:8000/{video_path}", 
        video_chunk_url=f"/official_archive/{os.path.basename(video_path)}",
        db_session_factory=AsyncSessionLocal,
        source_origin="official_broadcaster",
        broadcaster_id=b_id
    )

    if success:
        print("Successfully seeded vault with test vector from video.")
    else:
        print("Failed to seed vault.")

if __name__ == "__main__":
    asyncio.run(seed_test_vector())
