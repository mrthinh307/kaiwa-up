from starlette import status

from app.exceptions.base import AppError


class ReflexInvalidAudioError(AppError):
    status_code = status.HTTP_400_BAD_REQUEST
    code = "invalid_audio"
    message = "Audio file is empty or has an unsupported MIME type"


class ReflexAudioTooLargeError(AppError):
    status_code = status.HTTP_413_CONTENT_TOO_LARGE
    code = "audio_too_large"
    message = "Audio file exceeds the 10 MB limit"
