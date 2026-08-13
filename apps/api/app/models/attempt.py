"""Persistence models for exercise attempts, recordings, evaluations, and review schedules."""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, CreatedAtMixin, PrimaryKeyUuidMixin
from app.models.enums import AiEvaluationStatus, AttemptStatus, RecordingKind

if TYPE_CHECKING:
    from app.models.gamification import XpTransaction


class ExerciseAttempt(PrimaryKeyUuidMixin, Base):
    __tablename__ = "exercise_attempts"
    __table_args__ = (
        CheckConstraint("attempt_number >= 1", name="exercise_attempts_number_positive"),
        CheckConstraint(
            "status IN ('IN_PROGRESS', 'COMPLETED')",
            name="attempt_status",
        ),
        CheckConstraint(
            "score IS NULL OR score BETWEEN 0 AND 100",
            name="exercise_attempts_score_range",
        ),
        CheckConstraint(
            "correct_count IS NULL OR correct_count >= 0",
            name="exercise_attempts_correct_count_nonnegative",
        ),
        CheckConstraint(
            "total_count IS NULL OR total_count >= 0",
            name="exercise_attempts_total_count_nonnegative",
        ),
        CheckConstraint(
            "correct_count IS NULL OR total_count IS NULL OR correct_count <= total_count",
            name="exercise_attempts_correct_not_above_total",
        ),
        UniqueConstraint(
            "user_id", "content_id", "attempt_number", name="uq_exercise_attempts_order"
        ),
        Index(
            "ix_exercise_attempts_user_id_completed_at",
            "user_id",
            text("completed_at DESC"),
            postgresql_include=("content_id", "status", "score"),
        ),
        Index(
            "ix_exercise_attempts_content_id_completed_at",
            "content_id",
            text("completed_at DESC"),
        ),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    content_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("learning_contents.id", ondelete="RESTRICT"), nullable=False
    )
    attempt_number: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    status: Mapped[AttemptStatus] = mapped_column(
        Enum(AttemptStatus, name="attempt_status", native_enum=False, length=32),
        nullable=False,
        default=AttemptStatus.IN_PROGRESS,
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    score: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    correct_count: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    total_count: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    response_started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    response_started_on_time: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    answer_payload: Mapped[dict[str, object] | None] = mapped_column(JSONB, nullable=True)

    recordings: Mapped[list["Recording"]] = relationship(
        back_populates="attempt",
        cascade="all, delete-orphan",
    )
    evaluations: Mapped[list["AiEvaluation"]] = relationship(
        back_populates="attempt",
        cascade="all, delete-orphan",
    )
    xp_transaction: Mapped["XpTransaction | None"] = relationship(
        back_populates="attempt", uselist=False
    )
    review_schedule: Mapped["ReviewSchedule | None"] = relationship(
        back_populates="last_attempt",
        uselist=False,
        foreign_keys="ReviewSchedule.last_attempt_id",
    )


class Recording(PrimaryKeyUuidMixin, CreatedAtMixin, Base):
    __tablename__ = "recordings"
    __table_args__ = (
        CheckConstraint(
            "kind IN ('SHADOWING', 'REFLEX', 'TUTOR_VOICE')",
            name="recording_kind",
        ),
        CheckConstraint(
            "duration_ms IS NULL OR duration_ms >= 0",
            name="recordings_duration_nonnegative",
        ),
        Index(
            "ix_recordings_user_id_created_at",
            "user_id",
            text("created_at DESC"),
        ),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    attempt_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("exercise_attempts.id", ondelete="CASCADE"), nullable=True
    )
    kind: Mapped[RecordingKind] = mapped_column(
        Enum(RecordingKind, name="recording_kind", native_enum=False, length=32),
        nullable=False,
    )
    storage_key: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    mime_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    transcription_ja: Mapped[str | None] = mapped_column(Text, nullable=True)
    expired_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    attempt: Mapped[ExerciseAttempt | None] = relationship(back_populates="recordings")
    evaluations: Mapped[list["AiEvaluation"]] = relationship(
        back_populates="recording",
        cascade="all, delete-orphan",
    )


class AiEvaluation(PrimaryKeyUuidMixin, CreatedAtMixin, Base):
    __tablename__ = "ai_evaluations"
    __table_args__ = (
        CheckConstraint(
            "status IN ('PENDING', 'COMPLETED', 'FAILED')",
            name="ai_evaluation_status",
        ),
        CheckConstraint(
            "similarity_score IS NULL OR similarity_score BETWEEN 0 AND 100",
            name="ai_evaluations_similarity_score_range",
        ),
        CheckConstraint(
            "fluency_score IS NULL OR fluency_score BETWEEN 0 AND 100",
            name="ai_evaluations_fluency_score_range",
        ),
        Index(
            "ix_ai_evaluations_attempt_id_created_at",
            "attempt_id",
            text("created_at DESC"),
        ),
    )

    attempt_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("exercise_attempts.id", ondelete="CASCADE"), nullable=False
    )
    recording_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("recordings.id", ondelete="SET NULL"), nullable=True
    )
    status: Mapped[AiEvaluationStatus] = mapped_column(
        Enum(AiEvaluationStatus, name="ai_evaluation_status", native_enum=False, length=32),
        nullable=False,
        default=AiEvaluationStatus.PENDING,
    )
    provider: Mapped[str | None] = mapped_column(String(100), nullable=True)
    model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    similarity_score: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    fluency_score: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    details: Mapped[dict[str, object] | None] = mapped_column(JSONB, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    attempt: Mapped[ExerciseAttempt] = relationship(back_populates="evaluations")
    recording: Mapped[Recording | None] = relationship(back_populates="evaluations")


class ReviewSchedule(Base):
    __tablename__ = "review_schedules"
    __table_args__ = (
        CheckConstraint("interval_days >= 0", name="review_schedules_interval_nonnegative"),
        CheckConstraint("ease_factor > 0", name="review_schedules_ease_factor_positive"),
        CheckConstraint("repetitions >= 0", name="review_schedules_repetitions_nonnegative"),
        Index("ix_review_schedules_user_id_due_at", "user_id", "due_at"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    content_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("learning_contents.id", ondelete="CASCADE"), primary_key=True
    )
    due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    interval_days: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=1)
    ease_factor: Mapped[Decimal] = mapped_column(Numeric(4, 2), nullable=False, default=2.5)
    repetitions: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=0)
    last_attempt_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("exercise_attempts.id", ondelete="SET NULL"), nullable=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    last_attempt: Mapped[ExerciseAttempt | None] = relationship(
        back_populates="review_schedule",
        foreign_keys=[last_attempt_id],
    )
