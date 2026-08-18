import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.models.enums import AttemptStatus


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


class ShadowingSubmitRequest(BaseModel):
    attempt_id: uuid.UUID
    replay_count: int = Field(default=0, ge=0)


class ShadowingUserProgressSummary(BaseModel):
    total_exp: int
    current_level: int
    exp_to_next_level: int


class ShadowingSubmitResponse(BaseModel):
    attempt_id: uuid.UUID
    status: AttemptStatus
    score: float
    xp_earned: int
    content_type: str = "shadowing"
    difficulty: str
    message: str = "Bạn đã hoàn thành bài luyện."
    user_progress: ShadowingUserProgressSummary
    completed_at: datetime


class ShadowingSegmentReviewItem(BaseModel):
    segment_index: int
    script: str
    start_time_ms: int = 0
    end_time_ms: int = 0
    recorded: bool
    recording_id: uuid.UUID | None = None
    playback_url: str | None = None
    duration_seconds: int | None = None


class ShadowingAttemptReviewResponse(BaseModel):
    attempt_id: uuid.UUID
    content_id: uuid.UUID
    title: str
    difficulty: str
    audio_url: str | None = None
    status: AttemptStatus
    score: float | None = None
    earned_exp: int = 0
    completed_at: datetime | None = None
    total_segments: int
    completed_segments: int
    segments: list[ShadowingSegmentReviewItem]
