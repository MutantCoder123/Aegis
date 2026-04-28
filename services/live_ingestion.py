import asyncio
import cv2
from collections import deque
from PIL import Image

# Global rolling buffer retaining strictly the latest 20 frames (approx 60 seconds at 1 frame per 3s)
rolling_buffer = deque(maxlen=20)

def _live_ingestion_sync(video_source: str):
    """
    Blocking CV2 logic to run in a thread executor.
    Seeks standard intervals and calculates CLIP similarities.
    """
    print(f"[*] Live CV2 buffer initiated for source: {video_source}")
    
    cap = cv2.VideoCapture(video_source)
    fps = cap.get(cv2.CAP_PROP_FPS)
    if not fps or fps == 0:
        fps = 30.0

    frame_interval = int(fps * 3) # Read 1 frame every 3 seconds
    frame_count = 0

    while cap.isOpened():
        # Fast seeking (grab skips reading the actual matrix until retrieve)
        ret = cap.grab()
        if not ret:
            break

        if frame_count % frame_interval == 0:
            # We hit exactly our 3s boundary, extract the actual frame
            ret, frame = cap.retrieve()
            if ret:
                # Convert BGR to RGB for matching engine
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                pil_img = Image.fromarray(frame_rgb)
                
                # Import matching logic lazily
                from services.matching_engine import calculate_similarity
                
                try:
                    sim = calculate_similarity(pil_img)
                    timestamp = frame_count / fps
                    rolling_buffer.append({
                        "timestamp": timestamp,
                        "confidence": sim
                    })
                    print(f"[LIVE CV BUFFER] T+{timestamp:.2f}s | Confidence: {sim:.2f} | Buffer Mem: {len(rolling_buffer)}")
                except Exception as e:
                    print(f"[LIVE CV ERROR] Engine crash: {e}")

        frame_count += 1

    cap.release()
    print(f"[*] Live CV2 buffer closed for source: {video_source}")

async def start_live_ingestion(video_source: str):
    """
    Asynchronous hook to start the live video monitoring thread without blocking FastAPI.
    """
    await asyncio.to_thread(_live_ingestion_sync, video_source)
