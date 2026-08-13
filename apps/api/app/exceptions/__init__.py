"""Exceptions package."""

from app.exceptions.auth import (
    EmailAlreadyExistsException,
    ForbiddenException,
    InvalidCredentialsException,
    UnauthorizedException,
)
from app.exceptions.base import AppError, ForbiddenError, NotFoundError, UnauthorizedError
from app.exceptions.dictation import DictationContentUnavailableError
from app.exceptions.handlers import register_exception_handlers

__all__ = [
    "AppError",
    "DictationContentUnavailableError",
    "EmailAlreadyExistsException",
    "ForbiddenError",
    "ForbiddenException",
    "InvalidCredentialsException",
    "NotFoundError",
    "UnauthorizedError",
    "UnauthorizedException",
    "register_exception_handlers",
]
