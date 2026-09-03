from starlette import status

from app.exceptions.base import AppError


class AvatarTooLargeError(AppError):
    status_code = status.HTTP_413_CONTENT_TOO_LARGE
    code = "avatar_too_large"
    message = "Avatar image exceeds the 2 MB limit"


class AvatarUnsupportedTypeError(AppError):
    status_code = status.HTTP_415_UNSUPPORTED_MEDIA_TYPE
    code = "avatar_unsupported_type"
    message = "Avatar must be a JPG, PNG, or WebP image"


class AvatarInvalidError(AppError):
    status_code = status.HTTP_422_UNPROCESSABLE_CONTENT
    code = "avatar_invalid"
    message = "Avatar image is invalid or must be a 512 by 512 square"


class AvatarRateLimitError(AppError):
    status_code = status.HTTP_429_TOO_MANY_REQUESTS
    code = "avatar_rate_limited"
    message = "Too many avatar changes. Please try again later."
