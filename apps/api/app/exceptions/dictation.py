from starlette import status

from app.exceptions.base import AppError


class DictationContentUnavailableError(AppError):
    status_code = status.HTTP_409_CONFLICT
    code = "dictation_content_unavailable"
    message = "Dictation content is not ready for practice"
