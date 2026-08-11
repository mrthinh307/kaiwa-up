"""Authentication-related application exceptions."""

from app.exceptions.base import AppError


class UnauthorizedException(AppError):
    """Raised when authentication fails."""

    status_code = 401
    code = "unauthorized"

    def __init__(
        self,
        message: str = "Unauthorized",
    ) -> None:
        super().__init__(message=message)


class EmailAlreadyExistsException(AppError):
    """Raised when registering an existing email."""

    status_code = 409
    code = "conflict"

    def __init__(self) -> None:
        super().__init__(message="Email already exists")
