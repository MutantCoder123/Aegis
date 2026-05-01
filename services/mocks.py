import asyncio
import random
import datetime
import hashlib
from typing import List, Optional
from services.velocity_sieve import VelocitySieve
from models.schemas import IngestionMode

class MockYouTubeRadar:
    @staticmethod
    async def hunt(keywords: List[str]):
        print(f"[MockYouTubeRadar] Simulating hunt for keywords: {keywords}")
        await asyncio.sleep(1)
        
        # Generate 5-10 fake targets
        num_targets = random.randint(5, 10)
        for i in range(num_targets):
            # Varied velocity: some low (below 500), some very high (above 5,000)
            if random.random() > 0.5:
                views = random.randint(100, 400) # Low
            else:
                views = random.randint(5000, 20000) # High
                
            upload_time = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=random.randint(1, 24))
            
            # Occasionally use a real public stream for testing the extractor/worker flow
            if random.random() > 0.7:
                url = "https://www.youtube.com/watch?v=21X5lGlDOfg" # NASA Live (or similar)
            else:
                url = f"https://www.youtube.com/watch?v=mock_{hashlib.md5(str(random.random()).encode()).hexdigest()[:8]}"
            
            await VelocitySieve.evaluate_target(
                url=url,
                platform="YouTube",
                source="youtube_radar",
                views=views,
                upload_time=upload_time,
                metadata={
                    "title": f"MOCK: {random.choice(keywords)} - Live Stream {i}",
                    "channel": f"Mock Sports Channel {random.randint(1, 10)}"
                }
            )

class MockSocialRadar:
    @staticmethod
    async def hunt(hashtags: List[str], platform: str):
        print(f"[MockSocialRadar] Simulating hunt on {platform} for hashtags: {hashtags}")
        await asyncio.sleep(1)
        
        num_targets = random.randint(5, 10)
        for i in range(num_targets):
            if random.random() > 0.5:
                views = random.randint(50, 450)
            else:
                views = random.randint(10000, 100000)
                
            upload_time = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=random.randint(1, 12))
            
            # Occasionally use a real public stream
            if random.random() > 0.7:
                url = "https://www.youtube.com/watch?v=21X5lGlDOfg"
            else:
                url = f"https://www.{platform.lower()}.com/p/mock_{hashlib.md5(str(random.random()).encode()).hexdigest()[:8]}"
            
            await VelocitySieve.evaluate_target(
                url=url,
                platform=platform.title(),
                source="social_radar",
                views=views,
                upload_time=upload_time,
                metadata={"hashtag": random.choice(hashtags)}
            )

async def mock_handoff_to_arbiter(
    frame_bytes: bytearray, 
    url: str, 
    platform: str, 
    similarity: float, 
    metadata: dict
):
    """
    Mock version of Arbiter Handoff.
    Simulates Gemini AI adjudication with latency and fake reasoning.
    """
    from database import AsyncSessionLocal, ProcessedStream
    from datetime import datetime, timezone
    import httpx
    
    print(f"[MockArbiterHandoff] Simulating Gray Zone adjudication for: {url}")
    await asyncio.sleep(3) # Simulating LLM thinking time
    
    # Pseudo-random verdict based on URL hash
    url_hash = int(hashlib.md5(url.encode()).hexdigest(), 16)
    is_malicious = (url_hash % 2 == 0)
    
    classification = "Hostile Piracy" if is_malicious else "Viral Fan Edit"
    recommended_action = "ISSUE DMCA TAKEDOWN" if is_malicious else "CLAIM MONETIZATION"
    reasoning = f"MOCK VERDICT: Detected {'unauthorized reupload' if is_malicious else 'transformative fan commentary'} over match footage."
    
    # Database Persistence
    async with AsyncSessionLocal() as session:
        new_entry = ProcessedStream(
            media_url=url,
            platform=platform,
            ai_classification=classification,
            confidence_score=similarity,
            action_taken=recommended_action,
            reasoning=reasoning,
            timestamp=datetime.now(timezone.utc)
        )
        session.add(new_entry)
        await session.commit()

    # PubSub Emit
    event_type = "action" if is_malicious else "log"
    event_data = {
        "id": f"mock-arb-{datetime.now().timestamp()}",
        "ts": datetime.now(timezone.utc).strftime("%H:%M:%S"),
        "matchId": "MOCK-AI-VERDICT",
        "cosine": similarity,
        "platform": platform,
        "url": url,
        "verdict": "CONFIRMED_MALICIOUS" if is_malicious else "WHITELISTED_FAN_EDIT",
        "reasoning": [
            f"→ [MOCK] Classification: {classification}",
            f"→ [MOCK] Action: {recommended_action}",
            f"→ [MOCK] AI Reasoning: {reasoning}"
        ]
    }
    
    async with httpx.AsyncClient() as client:
        try:
            await client.post("http://127.0.0.1:8000/api/internal/publish", json={
                "event_type": event_type,
                "data": event_data
            })
        except: pass
