"""Exceptions package."""

from app.exceptions.ai import (
    AiInvalidResponseError,
    AiProviderAuthError,
    AiProviderError,
    AiProviderUnavailableError,
    AiRateLimitError,
    AiTimeoutError,
)
from app.exceptions.auth import (
    EmailAlreadyExistsException,
    ForbiddenException,
    InvalidCredentialsException,
    UnauthorizedException,
)
from app.exceptions.base import AppError, ForbiddenError, NotFoundError, UnauthorizedError
from app.exceptions.dictation import (
    DictationAttemptNotInProgressError,
    DictationContentUnavailableError,
    DictationInvalidSegmentIndexError,
)
from app.exceptions.handlers import register_exception_handlers

__all__ = [
    "AiInvalidResponseError",
    "AiProviderAuthError",
    "AiProviderError",
    "AiProviderUnavailableError",
    "AiRateLimitError",
    "AiTimeoutError",
    "AppError",
    "DictationAttemptNotInProgressError",
    "DictationContentUnavailableError",
    "DictationInvalidSegmentIndexError",
    "EmailAlreadyExistsException",
    "ForbiddenError",
    "ForbiddenException",
    "InvalidCredentialsException",
    "NotFoundError",
    "UnauthorizedError",
    "UnauthorizedException",
    "register_exception_handlers",
]
