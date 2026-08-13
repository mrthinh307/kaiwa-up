"""Schemas for user profile APIs."""

import uuid
from datetime import datetime

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
)

from app.models.enums import UserRole


class UserResponse(BaseModel):
    """Public representation of a user."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    display_name: str | None
    avatar_url: str | None
    role: UserRole
    is_active: bool
    created_at: datetime


class UserUpdateRequest(BaseModel):
    """Allowed fields for updating the current user's profile."""

    model_config = ConfigDict(extra="forbid")

    display_name: str = Field(
        min_length=1,
        max_length=255,
    )

    @field_validator("display_name")
    @classmethod
    def normalize_display_name(
        cls,
        value: str,
    ) -> str:
        normalized = value.strip()

        if not normalized:
            raise ValueError("Display name must not be empty")

        return normalized
