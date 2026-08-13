"""Exceptions package."""

from app.exceptions.auth import (
    EmailAlreadyExistsException,
    ForbiddenException,
    InvalidCredentialsException,
    UnauthorizedException,
)
from app.exceptions.base import AppError
from app.exceptions.dictation import (
    DictationAttemptNotInProgressError,
    DictationContentUnavailableError,
    DictationInvalidSegmentIndexError,
)
from app.exceptions.handlers import register_exception_handlers

__all__ = [
    "AppError",
    "DictationAttemptNotInProgressError",
    "DictationContentUnavailableError",
    "DictationInvalidSegmentIndexError",
    "EmailAlreadyExistsException",
    "ForbiddenException",
    "InvalidCredentialsException",
    "UnauthorizedException",
    "register_exception_handlers",
]
