import os
import datetime
from typing import Dict, Any, Optional
from models.schemas import IngestionMode

class TemporalGuard:
    THRESHOLD_CONFIRMED = float(os.getenv("SIMILARITY_THRESHOLD_CONFIRMED", "0.95"))
    THRESHOLD_GRAY_ZONE = 0.75
    THRESHOLD_DISCARD = 0.70
    BROADCAST_DELAY_SECONDS = 60  # Allowance for standard stream delay

    @staticmethod
    def evaluate(match_data: Dict[str, Any], ingestion_mode: IngestionMode, consecutive_frames: int = 1) -> Dict[str, Any]:
        """
        Adjudicates a match based on ingestion mode and temporal constraints.
        """
        similarity = match_data["similarity"]
        asset = match_data["asset"]
        
        # 1. Similarity Thresholding
        if similarity < TemporalGuard.THRESHOLD_DISCARD:
            return {"verdict": "DISCARD", "confidence": similarity}

        # 2. Temporal Guard Logic
        if ingestion_mode == IngestionMode.LIVE:
            now = datetime.datetime.now(datetime.timezone.utc)
            match_time = asset.timestamp
            
            # If match_time has no timezone, assume UTC
            if match_time.tzinfo is None:
                match_time = match_time.replace(tzinfo=datetime.timezone.utc)
            
            time_diff = (now - match_time).total_seconds()
            
            # LIVE check: Must be within reasonable window of the current clock
            if abs(time_diff) > TemporalGuard.BROADCAST_DELAY_SECONDS:
                # If similarity is very high but time is off, it might be a "Restream" of an old match.
                if similarity > TemporalGuard.THRESHOLD_CONFIRMED:
                    return {
                        "verdict": "RESTREAM_SUSPECTED",
                        "confidence": similarity,
                        "reason": f"High similarity ({similarity:.2f}) but match is {abs(time_diff):.0f}s old."
                    }
                return {"verdict": "DISCARD", "confidence": similarity, "reason": "Temporal mismatch for LIVE mode."}

        # 3. Gray Zone Routing & Consecutive Checking
        if similarity >= TemporalGuard.THRESHOLD_CONFIRMED:
            if consecutive_frames >= 3:
                return {
                    "verdict": "CONFIRMED_MALICIOUS",
                    "confidence": similarity,
                    "match_id": asset.match_id,
                    "timestamp": asset.timestamp.isoformat(),
                    "reason": f"3+ consecutive frames matched above {TemporalGuard.THRESHOLD_CONFIRMED} threshold."
                }
            else:
                return {
                    "verdict": "PENDING_CONSECUTIVE",
                    "confidence": similarity,
                    "match_id": asset.match_id,
                    "timestamp": asset.timestamp.isoformat(),
                    "reason": f"High similarity but lacks consecutive proof ({consecutive_frames}/3)."
                }
        elif similarity >= TemporalGuard.THRESHOLD_GRAY_ZONE:
            return {
                "verdict": "TIER_3_REQUIRED",
                "confidence": similarity,
                "match_id": asset.match_id,
                "timestamp": asset.timestamp.isoformat(),
                "reason": "Similarity in gray zone (0.75 - 0.95). Escalating to AI Arbiter."
            }
        
        return {"verdict": "DISCARD", "confidence": similarity}
