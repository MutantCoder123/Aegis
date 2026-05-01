import io
import asyncio
import base64
import httpx
import logging
from PIL import Image
from datetime import datetime, timezone
from services.ai_arbiter import adjudicate_edge_case
from database import AsyncSessionLocal, ProcessedStream

logger = logging.getLogger(__name__)

async def handoff_to_arbiter(
    frame_bytes: bytearray, 
    url: str, 
    platform: str, 
    similarity: float, 
    metadata: dict
):
    """
    Asynchronous middleware to handle Gray Zone targets via Gemini AI Arbiter.
    """
    try:
        print(f"[ArbiterHandoff] Escalating Gray Zone target to Gemini: {url}")
        
        # 1. Convert bytearray to PIL Image for the existing module
        image = Image.open(io.BytesIO(frame_bytes)).convert("RGB")
        
        # 2. Context Construction
        post_text = metadata.get("text") or metadata.get("description") or f"Suspected piracy on {platform}"
        context_str = f"Platform: {platform} | Similarity: {similarity:.2f} | Source: {url} | Context: {post_text}"
        
        # 3. Call Existing Module (Async-wrapped)
        # We use asyncio.to_thread because adjudicate_edge_case is synchronous
        verdict = await asyncio.to_thread(adjudicate_edge_case, image, context_str)
        
        is_malicious = verdict.get("is_pirated", False)
        classification = verdict.get("classification", "Unknown")
        recommended_action = verdict.get("recommended_action", "NONE")
        reasoning = verdict.get("reasoning", "No reasoning provided.")

        print(f"[ArbiterHandoff] Gemini Verdict: {'MALICIOUS' if is_malicious else 'TRANSFORMATIVE'} | {classification}")

        # 4. Database & PubSub Routing
        async with AsyncSessionLocal() as session:
            new_entry = ProcessedStream(
                media_url=url,
                platform=platform,
                ai_classification=classification,
                confidence_score=similarity,
                action_taken=recommended_action,
                reasoning=reasoning,
                matched_official_url=None, # T3 is usually an edge case
                timestamp=datetime.now(timezone.utc)
            )
            session.add(new_entry)
            await session.commit()

        # 5. PubSub Emit
        event_type = "action" if is_malicious else "log"
        event_data = {
            "id": f"arb-{datetime.now().timestamp()}",
            "ts": datetime.now(timezone.utc).strftime("%H:%M:%S"),
            "matchId": "AI-ARBITER-VERDICT",
            "cosine": similarity,
            "platform": platform,
            "url": url,
            "verdict": "CONFIRMED_MALICIOUS" if is_malicious else "WHITELISTED_FAN_EDIT",
            "reasoning": [
                f"→ Gemini Classification: {classification}",
                f"→ Action: {recommended_action}",
                f"→ AI Reasoning: {reasoning}"
            ]
        }
        
        async with httpx.AsyncClient() as client:
            try:
                await client.post("http://127.0.0.1:8000/api/internal/publish", json={
                    "event_type": event_type,
                    "data": event_data
                })
            except Exception as e:
                logger.error(f"[ArbiterHandoff] PubSub Relay Failed: {e}")

    except Exception as e:
        logger.error(f"[ArbiterHandoff] Critical Failure: {e}")
        # Default to Pending Manual Review in DB
        async with AsyncSessionLocal() as session:
            error_entry = ProcessedStream(
                media_url=url,
                platform=platform,
                ai_classification="PENDING_MANUAL_REVIEW",
                confidence_score=similarity,
                action_taken="MONITOR",
                reasoning=f"Arbiter handoff failed: {str(e)}",
                timestamp=datetime.now(timezone.utc)
            )
            session.add(error_entry)
            await session.commit()
