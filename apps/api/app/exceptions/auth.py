"""Authentication-related application exceptions."""

from typing import Any

from starlette import status

from app.exceptions.base import AppError


class UnauthorizedException(AppError):
    """Raised when authentication fails (trống token, sai credentials, token hết hạn...)."""

    status_code = status.HTTP_401_UNAUTHORIZED
    code = "unauthorized"

    def __init__(
        self,
        message: str = "Unauthorized",
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message=message, details=details)


class EmailAlreadyExistsException(AppError):
    """Raised when registering an existing email."""

    status_code = status.HTTP_409_CONFLICT
    code = "conflict"

    def __init__(
        self,
        message: str = "Email already exists",
    ) -> None:
        super().__init__(message=message)


class ForbiddenException(AppError):
    """Raised when user doesn't have permission to access resource."""

    status_code = status.HTTP_403_FORBIDDEN
    code = "forbidden"

    def __init__(
        self,
        message: str = "Permission denied",
    ) -> None:
        super().__init__(message=message)


class InvalidCredentialsException(AppError):
    """Raised when email/password login is incorrect.

    Lưu ý: Thường vẫn trả về 401 Unauthorized theo quy chuẩn Auth.
    """

    status_code = status.HTTP_401_UNAUTHORIZED
    code = "invalid_credentials"

    def __init__(
        self,
        message: str = "Invalid email or password",
    ) -> None:
        super().__init__(message=message)
