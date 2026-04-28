from pydantic import BaseModel
from typing import Optional, List

class MediaAnalysisRequest(BaseModel):
    media_url: str
    username: str
    post_text: str
    platform: str = "Unknown"
    engagement_metrics: Optional[dict] = {}

class AnalysisResponse(BaseModel):
    status: str
    confidence: float
    stage_triggered: str
    reasoning: str
    classification: Optional[str] = None
    recommended_action: Optional[str] = None

class SimulateLiveRequest(BaseModel):
    video_path: str

class IngestVODRequest(BaseModel):
    video_path: str
    match_id: str
    file_type: str = "video" # "video" or "image"

class TelemetryReport(BaseModel):
    source: str
    url: str
    action: str
    metadata: Optional[dict] = {}

class IngestOfficialRequest(BaseModel):
    stream_url: str
    match_id: str
    interval_seconds: int = 10

class VaultIngestRequest(BaseModel):
    match_id: str
    display_name: str
    source_url: str
    asset_type: str = "Live HLS"
    file_type: str = "video"

class EnforcementActionRequest(BaseModel):
    action: str
