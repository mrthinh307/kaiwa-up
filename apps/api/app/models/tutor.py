"""Persistence models for AI tutor sessions and messages."""

import uuid
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Enum,
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
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, CreatedAtMixin, PrimaryKeyUuidMixin
from app.models.enums import JlptLevel, TutorSender


class TutorSession(PrimaryKeyUuidMixin, Base):
    __tablename__ = "tutor_sessions"
    __table_args__ = (
        CheckConstraint(
            "difficulty IS NULL OR difficulty IN ('N5', 'N4', 'N3', 'N2', 'N1')",
            name="tutor_session_jlpt_level",
        ),
        CheckConstraint(
            "status IN ('active', 'completed')",
            name="tutor_session_status",
        ),
        Index(
            "ix_tutor_sessions_user_id_started_at",
            "user_id",
            text("started_at DESC"),
        ),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    topic: Mapped[str | None] = mapped_column(String(255), nullable=True)
    difficulty: Mapped[JlptLevel | None] = mapped_column(
        Enum(
            JlptLevel,
            name="tutor_jlpt_level",
            native_enum=False,
            values_callable=lambda enum_type: [item.value for item in enum_type],
        ),
        nullable=True,
    )
    scenario: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="active")
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    messages: Mapped[list["TutorMessage"]] = relationship(
        back_populates="session",
        cascade="all, delete-orphan",
    )


class TutorMessage(PrimaryKeyUuidMixin, CreatedAtMixin, Base):
    __tablename__ = "tutor_messages"
    __table_args__ = (
        CheckConstraint("sender IN ('USER', 'AI')", name="tutor_sender"),
        CheckConstraint("sequence_number >= 1", name="tutor_messages_sequence_positive"),
        UniqueConstraint("session_id", "sequence_number", name="uq_tutor_messages_sequence"),
    )

    session_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("tutor_sessions.id", ondelete="CASCADE"), nullable=False
    )
    sender: Mapped[TutorSender] = mapped_column(
        Enum(TutorSender, name="tutor_sender", native_enum=False, length=32),
        nullable=False,
    )
    sequence_number: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    recording_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("recordings.id", ondelete="SET NULL"), nullable=True
    )
    feedback: Mapped[dict[str, object] | None] = mapped_column(JSONB, nullable=True)

    session: Mapped[TutorSession] = relationship(back_populates="messages")
