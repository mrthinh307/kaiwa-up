"""Exceptions package."""

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
from app.exceptions.learning_content import (
    InvalidYouTubeUrlError,
    LearningContentAlreadyExistsError,
    LearningContentAlreadyPublishedError,
    LearningContentNotReadyError,
    TranscriptNotFoundError,
    TranscriptProviderError,
)

__all__ = [
    "AppError",
    "DictationAttemptNotInProgressError",
    "DictationContentUnavailableError",
    "DictationInvalidSegmentIndexError",
    "EmailAlreadyExistsException",
    "ForbiddenError",
    "ForbiddenException",
    "InvalidCredentialsException",
    "InvalidYouTubeUrlError",
    "LearningContentAlreadyExistsError",
    "LearningContentAlreadyPublishedError",
    "LearningContentNotReadyError",
    "NotFoundError",
    "TranscriptNotFoundError",
    "TranscriptProviderError",
    "UnauthorizedError",
    "UnauthorizedException",
    "register_exception_handlers",
]
