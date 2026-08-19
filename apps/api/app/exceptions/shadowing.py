from starlette import status

from app.exceptions.base import AppError


class ShadowingContentNotFoundError(AppError):
    status_code = status.HTTP_404_NOT_FOUND
    code = "shadowing_content_not_found"
    message = "Shadowing content not found or not published"


class ShadowingInvalidSegmentError(AppError):
    status_code = status.HTTP_400_BAD_REQUEST
    code = "shadowing_invalid_segment"
    message = "Segment ID does not exist in content transcript"


class ShadowingAudioTooLargeError(AppError):
    status_code = status.HTTP_400_BAD_REQUEST
    code = "shadowing_audio_too_large"
    message = "Audio file size exceeds maximum allowed limit (10MB)"


class ShadowingInvalidAudioError(AppError):
    status_code = status.HTTP_400_BAD_REQUEST
    code = "shadowing_invalid_audio"
    message = "Invalid or empty audio file provided"


class ShadowingAttemptNotFoundError(AppError):
    status_code = status.HTTP_404_NOT_FOUND
    code = "shadowing_attempt_not_found"
    message = "Shadowing attempt not found"


class ShadowingAttemptNotInProgressError(AppError):
    status_code = status.HTTP_400_BAD_REQUEST
    code = "shadowing_attempt_not_in_progress"
    message = "Shadowing attempt is not in progress"
