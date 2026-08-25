"""AI Tutor business exceptions."""

from starlette import status

from app.exceptions.base import AppError


class TutorConversationNotFoundError(AppError):
    status_code = status.HTTP_404_NOT_FOUND
    code = "not_found"
    message = "Tutor conversation not found"


class TutorConversationForbiddenError(AppError):
    status_code = status.HTTP_403_FORBIDDEN
    code = "forbidden"
    message = "You do not have permission to access this Tutor conversation"


class TutorConversationCompletedError(AppError):
    status_code = status.HTTP_409_CONFLICT
    code = "tutor_conversation_completed"
    message = "Tutor conversation is already completed"


class TutorConversationIdempotencyConflictError(AppError):
    status_code = status.HTTP_409_CONFLICT
    code = "tutor_conversation_idempotency_conflict"
    message = "The client_conversation_id was already used for different conversation data"


class TutorResponsePendingError(AppError):
    status_code = status.HTTP_409_CONFLICT
    code = "tutor_response_pending"
    message = "The previous Tutor response is still pending"


class TutorMessageIdempotencyConflictError(AppError):
    status_code = status.HTTP_409_CONFLICT
    code = "tutor_message_idempotency_conflict"
    message = "The client_message_id was already used for different text"


class TutorAiUnavailableError(AppError):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    code = "service_unavailable"
    message = "AI Tutor is not available"
