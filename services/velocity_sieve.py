import datetime
from typing import Optional, Dict
import hashlib
from database import mongo_db
from services.queue_orchestrator import QueueOrchestrator
from services.pubsub import firehose_pubsub

class VelocitySieve:
    THRESHOLD_VIEWS_PER_HOUR = 500
    CACHE_EXPIRY_HOURS = 48

    @staticmethod
    async def evaluate_target(url: str, platform: str, source: str, views: int, upload_time: datetime.datetime, metadata: Optional[dict] = None):
        """
        De-duplicates and filters targets based on velocity metrics.
        """
        # 1. De-duplication
        cache_col = mongo_db["processed_urls_cache"]
        existing = await cache_col.find_one({"url": url})
        
        now = datetime.datetime.now(datetime.timezone.utc)
        if existing:
            first_seen = existing["first_seen"]
            # Ensure first_seen is aware
            if first_seen.tzinfo is None:
                first_seen = first_seen.replace(tzinfo=datetime.timezone.utc)
            
            # Check if it's within 48 hours
            if (now - first_seen).total_seconds() < VelocitySieve.CACHE_EXPIRY_HOURS * 3600:
                print(f"[Sieve] Duplicate discarded: {url}")
                return False
        
        # 2. Velocity Gate
        # Ensure upload_time is aware
        if upload_time.tzinfo is None:
            upload_time = upload_time.replace(tzinfo=datetime.timezone.utc)
            
        hours_since_upload = max(0.1, (now - upload_time).total_seconds() / 3600)
        velocity = views / hours_since_upload
        
        print(f"[Sieve] Evaluating {url} | Velocity: {velocity:.2f} views/hr")
        
        if velocity < VelocitySieve.THRESHOLD_VIEWS_PER_HOUR:
            print(f"[Sieve] Low velocity discarded ({velocity:.2f} < {VelocitySieve.THRESHOLD_VIEWS_PER_HOUR})")
            return False

        # 3. Cache the URL
        await cache_col.update_one(
            {"url": url},
            {"$set": {"url": url, "first_seen": now}},
            upsert=True
        )

        # 4. Promote to Orchestrator
        metrics = {
            "views": views,
            "velocity_vph": round(velocity, 2),
            "upload_time": upload_time.isoformat()
        }
        
        await QueueOrchestrator.promote_post_match_target(
            url=url,
            platform=platform,
            source=source,
            metadata=metadata,
            velocity_metrics=metrics
        )

        # Emit a "target" event for the UI "Live System Log"
        await firehose_pubsub.publish("target", {
            "id": hashlib.md5(url.encode()).hexdigest()[:8],
            "ts": datetime.datetime.now(datetime.timezone.utc).strftime("%H:%M:%S"),
            "url": url,
            "platform": platform,
            "velocity": round(velocity, 2),
            "status": "Analyzing..."
        })
        
        return True
