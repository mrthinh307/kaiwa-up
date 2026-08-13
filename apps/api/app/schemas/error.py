"""Public API error response schemas."""

from typing import Any

from pydantic import BaseModel


class ValidationErrorDetail(BaseModel):
    """Field-level validation failure returned in an error envelope."""

    field: str
    message: str
    type: str


class ErrorDetail(BaseModel):
    """Application error payload."""

    status: int
    code: str
    message: str
    details: list[ValidationErrorDetail] | dict[str, Any] | str | None = None


class ErrorResponse(BaseModel):
    """Stable envelope for expected and unexpected API errors."""

    error: ErrorDetail
