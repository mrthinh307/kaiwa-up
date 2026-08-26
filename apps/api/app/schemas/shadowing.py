import enum
import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.models.enums import AttemptStatus


class ShadowingMode(enum.StrEnum):
    SEGMENTED = "segmented"
    CONTINUOUS = "continuous"


class ShadowingRecordSegmentResponse(BaseModel):
    recording_id: uuid.UUID
    attempt_id: uuid.UUID
    segment_id: str
    storage_key: str
    duration_seconds: int
    created_at: datetime


class ShadowingRecordContinuousResponse(BaseModel):
    recording_id: uuid.UUID
    attempt_id: uuid.UUID
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
    request_ai_review: bool = Field(default=False)


class ShadowingUserProgressSummary(BaseModel):
    total_exp: int
    current_level: int
    exp_to_next_level: int


class ShadowingCorrection(BaseModel):
    original: str
    corrected: str
    reason: str


class ShadowingAiFeedback(BaseModel):
    similarity_score: float | None = None
    fluency_score: float | None = None
    feedback: str | None = None
    corrections: list[ShadowingCorrection] = Field(default_factory=list)
    hints: list[str] = Field(default_factory=list)
    user_transcript: str | None = None


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
    ai_feedback: ShadowingAiFeedback | None = None


class ShadowingSegmentReviewItem(BaseModel):
    segment_index: int
    script: str
    start_time_ms: int = 0
    end_time_ms: int = 0
    recorded: bool
    recording_id: uuid.UUID | None = None
    playback_url: str | None = None
    duration_seconds: int | None = None
    user_transcript: str | None = None
    similarity_score: float | None = None


class ShadowingAttemptReviewResponse(BaseModel):
    attempt_id: uuid.UUID
    content_id: uuid.UUID
    title: str
    difficulty: str
    mode: ShadowingMode = ShadowingMode.SEGMENTED
    audio_url: str | None = None
    status: AttemptStatus
    score: float | None = None
    earned_exp: int = 0
    completed_at: datetime | None = None
    total_segments: int
    completed_segments: int
    material_duration_seconds: float | None = None
    user_continuous_recording_url: str | None = None
    user_continuous_duration_seconds: int | None = None
    user_continuous_transcript: str | None = None
    ai_feedback: ShadowingAiFeedback | None = None
    segments: list[ShadowingSegmentReviewItem]


class ShadowingRecordedSegmentSummary(BaseModel):
    segment_id: str
    recording_id: uuid.UUID
    duration_seconds: int
    storage_key: str | None = None
    playback_url: str | None = None
    created_at: datetime


class ShadowingContinuousRecordingSummary(BaseModel):
    recording_id: uuid.UUID
    storage_key: str
    playback_url: str | None = None
    duration_seconds: int
    created_at: datetime | None = None


class ShadowingResumeResponse(BaseModel):
    attempt_id: uuid.UUID
    content_id: uuid.UUID
    attempt_number: int
    mode: ShadowingMode = ShadowingMode.SEGMENTED
    total_segments: int
    recorded_segments: list[ShadowingRecordedSegmentSummary] = Field(default_factory=list)
    continuous_recording: ShadowingContinuousRecordingSummary | None = None
    total_attempts: int = 0
