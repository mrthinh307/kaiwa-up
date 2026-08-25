"""Request and response schemas for authentication APIs."""

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
)

from app.schemas.user import UserResponse


class RegisterRequest(BaseModel):
    """Payload for registering a new user."""

    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    password: str = Field(
        min_length=8,
        max_length=128,
    )
    name: str = Field(
        min_length=1,
        max_length=255,
    )

    @field_validator("email")
    @classmethod
    def normalize_email(
        cls,
        value: EmailStr,
    ) -> str:
        return str(value).strip().lower()

    @field_validator("name")
    @classmethod
    def normalize_name(
        cls,
        value: str,
    ) -> str:
        normalized = value.strip()

        if not normalized:
            raise ValueError("Name must not be empty")

        return normalized


class LoginRequest(BaseModel):
    """Payload for email/password login."""

    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    password: str = Field(
        min_length=1,
        max_length=128,
    )

    @field_validator("email")
    @classmethod
    def normalize_email(
        cls,
        value: EmailStr,
    ) -> str:
        return str(value).strip().lower()


class AccessTokenResponse(BaseModel):
    """Access token response returned by login and refresh."""

    access_token: str
    token_type: str = "bearer"
    expires_in: int


class RefreshSessionResponse(AccessTokenResponse):
    """Refreshed access token and current public user profile."""

    user: UserResponse
