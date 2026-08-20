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
from app.exceptions.base import AppError, ForbiddenError, NotFoundError
from app.exceptions.dictation import (
    DictationAttemptNotInProgressError,
    DictationContentUnavailableError,
    DictationExperienceAlreadyAwardedError,
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
from app.exceptions.translation import (
    TranslationContentUnavailableError,
    TranslationEvaluationInProgressError,
)

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
    "DictationExperienceAlreadyAwardedError",
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
    "TranslationContentUnavailableError",
    "TranslationEvaluationInProgressError",
    "UnauthorizedException",
    "register_exception_handlers",
]
