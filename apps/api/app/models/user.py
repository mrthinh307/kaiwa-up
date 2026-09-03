"""Persistence models for accounts, profiles, and refresh tokens."""

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
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
from sqlalchemy.dialects.postgresql import CITEXT
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, CreatedAtMixin, PrimaryKeyUuidMixin, TimestampMixin
from app.models.enums import UserRole


class User(PrimaryKeyUuidMixin, TimestampMixin, Base):
    __tablename__ = "users"
    __table_args__ = (CheckConstraint("role IN ('USER', 'ADMIN')", name="user_role"),)

    email: Mapped[str] = mapped_column(CITEXT, nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    display_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    avatar_storage_provider: Mapped[str | None] = mapped_column(String(32), nullable=True)
    avatar_storage_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role", native_enum=False, length=32),
        nullable=False,
        default=UserRole.USER,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    progress: Mapped["UserProgress"] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        uselist=False,
    )
    refresh_tokens: Mapped[list["AuthRefreshToken"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )


class AvatarMutationWindow(Base):
    """Persistent per-user rate-limit window for avatar mutations."""

    __tablename__ = "avatar_mutation_windows"

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    window_started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    request_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class UserProgress(Base):
    __tablename__ = "user_progress"
    __table_args__ = (
        CheckConstraint("total_exp >= 0", name="user_progress_total_exp_nonnegative"),
        CheckConstraint("current_level >= 1", name="user_progress_current_level_positive"),
        CheckConstraint(
            "completed_content_count >= 0",
            name="user_progress_completed_count_nonnegative",
        ),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    total_exp: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    current_level: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=1)
    completed_content_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user: Mapped[User] = relationship(back_populates="progress")


class AuthRefreshToken(PrimaryKeyUuidMixin, CreatedAtMixin, Base):
    __tablename__ = "auth_refresh_tokens"
    __table_args__ = (
        Index(
            "ix_auth_refresh_tokens_user_id_expires_at_active",
            "user_id",
            "expires_at",
            postgresql_where=text("revoked_at IS NULL"),
        ),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    token_hash: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped[User] = relationship(back_populates="refresh_tokens")
