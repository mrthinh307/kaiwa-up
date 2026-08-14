"""Gamification-related application exceptions."""

from starlette import status

from app.exceptions.base import AppError


class AttemptNotFoundError(AppError):
    """Raised when the attempt to award experience does not exist."""

    status_code = status.HTTP_404_NOT_FOUND
    code = "not_found"
    message = "Attempt not found"


class AttemptForbiddenError(AppError):
    """Raised when the attempt does not belong to the requesting user."""

    status_code = status.HTTP_403_FORBIDDEN
    code = "forbidden"
    message = "You do not have permission to access this attempt"
