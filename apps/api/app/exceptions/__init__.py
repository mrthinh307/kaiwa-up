"""Exceptions package."""

from app.exceptions.ai import (
    AiInvalidResponseError,
    AiProviderAuthError,
    AiProviderError,
    AiProviderUnavailableError,
    AiRateLimitError,
    AiTimeoutError,
)
from app.exceptions.attempt import AttemptAlreadyInProgressError
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
from app.exceptions.storage import StorageUnavailableError
from app.exceptions.translation import (
    TranslationContentUnavailableError,
    TranslationEvaluationInProgressError,
)
from app.exceptions.tutor import (
    TutorAiUnavailableError,
    TutorConversationCompletedError,
    TutorConversationForbiddenError,
    TutorConversationNotFoundError,
    TutorMessageIdempotencyConflictError,
    TutorResponsePendingError,
)

__all__ = [
    "AiInvalidResponseError",
    "AiProviderAuthError",
    "AiProviderError",
    "AiProviderUnavailableError",
    "AiRateLimitError",
    "AiTimeoutError",
    "AppError",
    "AttemptAlreadyInProgressError",
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
    "StorageUnavailableError",
    "TranscriptNotFoundError",
    "TranscriptProviderError",
    "TranslationContentUnavailableError",
    "TranslationEvaluationInProgressError",
    "TutorAiUnavailableError",
    "TutorConversationCompletedError",
    "TutorConversationForbiddenError",
    "TutorConversationNotFoundError",
    "TutorMessageIdempotencyConflictError",
    "TutorResponsePendingError",
    "UnauthorizedException",
    "register_exception_handlers",
]
