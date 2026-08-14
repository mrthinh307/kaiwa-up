import uuid
from datetime import datetime

from pydantic import BaseModel


class ShadowingRecordSegmentResponse(BaseModel):
    recording_id: uuid.UUID
    attempt_id: uuid.UUID
    segment_id: str
    storage_key: str
    duration_seconds: int
    created_at: datetime


class ShadowingRecordingPlaybackResponse(BaseModel):
    recording_id: uuid.UUID
    playback_url: str
    duration_seconds: int
    created_at: datetime
