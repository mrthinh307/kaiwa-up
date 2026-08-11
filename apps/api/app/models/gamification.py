"""Persistence models for levels, achievements, XP, and leaderboards."""

import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, CreatedAtMixin, PrimaryKeyUuidMixin

if TYPE_CHECKING:
    from app.models.attempt import ExerciseAttempt


class LevelDefinition(Base):
    __tablename__ = "level_definitions"

    level: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    required_total_exp: Mapped[int] = mapped_column(Integer, nullable=False, unique=True)
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class Achievement(PrimaryKeyUuidMixin, CreatedAtMixin, Base):
    __tablename__ = "achievements"

    code: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    icon_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    criteria: Mapped[dict[str, object]] = mapped_column(JSONB, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class UserAchievement(Base):
    __tablename__ = "user_achievements"

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    achievement_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("achievements.id", ondelete="CASCADE"), primary_key=True
    )
    awarded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class XpTransaction(PrimaryKeyUuidMixin, Base):
    __tablename__ = "xp_transactions"
    __table_args__ = (
        Index("ix_xp_transactions_created_at_user_id", "created_at", "user_id"),
        UniqueConstraint("attempt_id", name="uq_xp_transactions_attempt_id"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    attempt_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid,
        ForeignKey("exercise_attempts.id", ondelete="CASCADE"),
        nullable=True,
    )
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    reason: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    attempt: Mapped["ExerciseAttempt | None"] = relationship(back_populates="xp_transaction")


class WeeklyLeaderboardEntry(Base):
    __tablename__ = "weekly_leaderboard_entries"
    __table_args__ = (UniqueConstraint("week_start", "rank", name="uq_weekly_leaderboard_rank"),)

    week_start: Mapped[date] = mapped_column(Date, primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    weekly_exp: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    rank: Mapped[int] = mapped_column(Integer, nullable=False)
    calculated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
