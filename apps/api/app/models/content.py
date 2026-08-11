"""Persistence models for learning content and exercise extensions."""

import uuid
from datetime import datetime

from sqlalchemy import (
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    SmallInteger,
    String,
    Text,
    Uuid,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, CreatedAtMixin, TimestampMixin
from app.models.enums import ContentStatus, ContentType


class LearningContent(TimestampMixin, Base):
    __tablename__ = "learning_contents"
    __table_args__ = (
        Index(
            "ix_learning_contents_published_catalog",
            "content_type",
            "difficulty",
            text("published_at DESC"),
            postgresql_where=text("status = 'published'"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, server_default=func.uuidv7())
    content_type: Mapped[ContentType] = mapped_column(
        Enum(ContentType, name="content_type", native_enum=False, length=32),
        nullable=False,
    )
    status: Mapped[ContentStatus] = mapped_column(
        Enum(ContentStatus, name="content_status", native_enum=False, length=32),
        nullable=False,
        default=ContentStatus.DRAFT,
    )
    slug: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    short_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    topic: Mapped[str | None] = mapped_column(String(100), nullable=True)
    difficulty: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=1)
    audio_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    audio_duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    transcript_ja: Mapped[str | None] = mapped_column(Text, nullable=True)
    base_exp: Mapped[int] = mapped_column(Integer, nullable=False, default=50)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    shadowing: Mapped["ShadowingExercise | None"] = relationship(
        back_populates="content", uselist=False
    )
    dictation: Mapped["DictationExercise | None"] = relationship(
        back_populates="content", uselist=False
    )
    reflex: Mapped["ReflexExercise | None"] = relationship(back_populates="content", uselist=False)
    translation: Mapped["TranslationExercise | None"] = relationship(
        back_populates="content", uselist=False
    )


class ShadowingExercise(CreatedAtMixin, Base):
    __tablename__ = "shadowing_exercises"

    content_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("learning_contents.id", ondelete="CASCADE"),
        primary_key=True,
    )
    reference_audio_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    reference_transcript_ja: Mapped[str | None] = mapped_column(Text, nullable=True)

    content: Mapped[LearningContent] = relationship(back_populates="shadowing")


class DictationExercise(CreatedAtMixin, Base):
    __tablename__ = "dictation_exercises"

    content_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("learning_contents.id", ondelete="CASCADE"),
        primary_key=True,
    )
    script: Mapped[str] = mapped_column(Text, nullable=False)

    content: Mapped[LearningContent] = relationship(back_populates="dictation")


class ReflexExercise(CreatedAtMixin, Base):
    __tablename__ = "reflex_exercises"

    content_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("learning_contents.id", ondelete="CASCADE"),
        primary_key=True,
    )
    prompt_ja: Mapped[str] = mapped_column(Text, nullable=False)
    scenario_ja: Mapped[str | None] = mapped_column(Text, nullable=True)
    response_start_limit_seconds: Mapped[int] = mapped_column(
        SmallInteger, nullable=False, default=3
    )

    content: Mapped[LearningContent] = relationship(back_populates="reflex")


class TranslationExercise(CreatedAtMixin, Base):
    __tablename__ = "translation_exercises"

    content_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("learning_contents.id", ondelete="CASCADE"),
        primary_key=True,
    )
    reference_translation_vi: Mapped[str | None] = mapped_column(Text, nullable=True)

    content: Mapped[LearningContent] = relationship(back_populates="translation")
