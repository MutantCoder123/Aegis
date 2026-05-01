import datetime
from typing import Optional, Dict
from database import social_intel_collection
from models.schemas import IngestionMode

class QueueOrchestrator:
    @staticmethod
    async def promote_live_target(url: str, platform: str, source: str, metadata: Optional[dict] = None):
        """
        Assigns ingestion_mode="LIVE" and priority_score=100.
        """
        now = datetime.datetime.now(datetime.timezone.utc)
        target_doc = {
            "raw_url": url,
            "platform": platform or "Web",
            "scanned": False,
            "scraped_at": now,
            "promotion_source": source,
            "metadata": metadata or {},
            "ingestion_mode": IngestionMode.LIVE,
            "priority_score": 100,
            "velocity_metrics": {}
        }
        
        await social_intel_collection.update_one(
            {"raw_url": url},
            {"$set": target_doc},
            upsert=True
        )
        return target_doc

    @staticmethod
    async def promote_post_match_target(url: str, platform: str, source: str, metadata: Optional[dict] = None, velocity_metrics: Optional[Dict[str, int]] = None):
        """
        Assigns ingestion_mode="POST_MATCH" and calculates priority_score based on velocity_metrics (views per hour).
        """
        now = datetime.datetime.now(datetime.timezone.utc)
        metrics = velocity_metrics or {}
        views_per_hour = metrics.get("views", 0)
        
        # Priority score calculation: scale views to 0-99 range (below LIVE priority)
        priority_score = min(99, views_per_hour // 100)
        
        target_doc = {
            "raw_url": url,
            "platform": platform or "Web",
            "scanned": False,
            "scraped_at": now,
            "promotion_source": source,
            "metadata": metadata or {},
            "ingestion_mode": IngestionMode.POST_MATCH,
            "priority_score": priority_score,
            "velocity_metrics": metrics
        }
        
        await social_intel_collection.update_one(
            {"raw_url": url},
            {"$set": target_doc},
            upsert=True
        )
        return target_doc
