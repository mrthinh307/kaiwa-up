from starlette import status

from app.exceptions.base import AppError


class InvalidYouTubeUrlError(AppError):
    status_code = status.HTTP_422_UNPROCESSABLE_CONTENT
    code = "invalid_youtube_url"
    message = "A valid YouTube video URL is required"


class TranscriptNotFoundError(AppError):
    status_code = status.HTTP_422_UNPROCESSABLE_CONTENT
    code = "transcript_not_found"
    message = "No Japanese transcript is available for this video"


class TranscriptProviderError(AppError):
    status_code = status.HTTP_502_BAD_GATEWAY
    code = "transcript_provider_error"
    message = "Could not retrieve the YouTube transcript"


class LearningContentAlreadyExistsError(AppError):
    status_code = status.HTTP_409_CONFLICT
    code = "learning_content_already_exists"
    message = "Learning content for this YouTube video already exists"


class LearningContentAlreadyPublishedError(AppError):
    status_code = status.HTTP_409_CONFLICT
    code = "learning_content_already_published"
    message = "Learning content is already published"


class LearningContentNotReadyError(AppError):
    status_code = status.HTTP_422_UNPROCESSABLE_CONTENT
    code = "learning_content_not_ready"
    message = "Learning content is not ready to publish"
