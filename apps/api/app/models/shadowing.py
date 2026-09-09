"""Immutable target snapshots and durable work for submitted Shadowing recordings."""

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, PrimaryKeyUuidMixin, TimestampMixin


class ShadowingWorkerHeartbeat(Base):
    __tablename__ = "shadowing_worker_heartbeats"

    worker_id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    heartbeat_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.clock_timestamp(), index=True
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.clock_timestamp()
    )


class ShadowingAttemptSegment(PrimaryKeyUuidMixin, TimestampMixin, Base):
    __tablename__ = "shadowing_attempt_segments"
    __table_args__ = (
        UniqueConstraint("attempt_id", "segment_index", name="uq_shadowing_attempt_segment"),
        CheckConstraint("segment_index >= 0", name="shadowing_segment_index_nonnegative"),
        CheckConstraint(
            "start_time_ms >= 0 AND end_time_ms > start_time_ms",
            name="shadowing_segment_timing_valid",
        ),
        CheckConstraint("length(trim(script)) > 0", name="shadowing_segment_script_nonempty"),
        CheckConstraint(
            "duration_ms IS NULL OR duration_ms >= 0", name="shadowing_segment_duration_nonnegative"
        ),
        CheckConstraint(
            "transcription_status IN ('not_recorded', 'not_requested', 'queued', 'processing', "
            "'completed', 'no_speech', 'failed', 'unavailable', 'not_evaluable')",
            name="shadowing_segment_transcription_status",
        ),
    )

    attempt_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("exercise_attempts.id", ondelete="CASCADE"), nullable=False
    )
    segment_index: Mapped[int] = mapped_column(Integer, nullable=False)
    script: Mapped[str] = mapped_column(Text, nullable=False)
    start_time_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    end_time_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    recording_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("recordings.id", ondelete="SET NULL"), nullable=True
    )
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    completion_eligible: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=text("false")
    )
    transcription_status: Mapped[str] = mapped_column(
        String(24), nullable=False, default="not_recorded", server_default="not_recorded"
    )
    transcript: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_code: Mapped[str | None] = mapped_column(String(100), nullable=True)
    comparison: Mapped[dict[str, object] | None] = mapped_column(JSONB, nullable=True)


class ShadowingJob(PrimaryKeyUuidMixin, TimestampMixin, Base):
    __tablename__ = "shadowing_jobs"
    __table_args__ = (
        UniqueConstraint(
            "attempt_id", "kind", "input_fingerprint", "batch_index", name="uq_shadowing_job_input"
        ),
        CheckConstraint(
            "kind IN ('transcribe_recording', 'evaluate_batch', 'summarize_feedback')",
            name="shadowing_job_kind",
        ),
        CheckConstraint(
            "status IN ('queued', 'processing', 'completed', 'failed')", name="shadowing_job_status"
        ),
        CheckConstraint(
            "attempt_count >= 0 AND max_attempts >= 1 AND batch_index >= 0",
            name="shadowing_job_counts_valid",
        ),
        CheckConstraint(
            "status != 'processing' OR (lease_token IS NOT NULL AND locked_until IS NOT NULL)",
            name="shadowing_job_processing_lease",
        ),
        Index("ix_shadowing_jobs_claim", "kind", "status", "available_at", "created_at"),
        Index(
            "ix_shadowing_jobs_expired",
            "locked_until",
            postgresql_where=text("status = 'processing'"),
        ),
    )

    attempt_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("exercise_attempts.id", ondelete="CASCADE"), nullable=False
    )
    recording_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("recordings.id", ondelete="SET NULL"), nullable=True
    )
    evaluation_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("ai_evaluations.id", ondelete="CASCADE"), nullable=True
    )
    kind: Mapped[str] = mapped_column(String(32), nullable=False)
    input_fingerprint: Mapped[str] = mapped_column(String(64), nullable=False)
    batch_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    payload: Mapped[dict[str, object]] = mapped_column(JSONB, nullable=False)
    result: Mapped[dict[str, object] | None] = mapped_column(JSONB, nullable=True)
    status: Mapped[str] = mapped_column(
        String(16), nullable=False, default="queued", server_default="queued"
    )
    attempt_count: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )
    max_attempts: Mapped[int] = mapped_column(
        Integer, nullable=False, default=3, server_default="3"
    )
    available_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    lease_token: Mapped[uuid.UUID | None] = mapped_column(Uuid, nullable=True)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    heartbeat_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    error_code: Mapped[str | None] = mapped_column(String(100), nullable=True)
