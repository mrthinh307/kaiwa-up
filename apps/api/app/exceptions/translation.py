"""Listening & Translation domain exceptions."""

from starlette import status

from app.exceptions.base import AppError


class TranslationContentUnavailableError(AppError):
    status_code = status.HTTP_422_UNPROCESSABLE_CONTENT
    code = "translation_content_unavailable"
    message = "Listening Translation content is incomplete"


class TranslationEvaluationInProgressError(AppError):
    status_code = status.HTTP_409_CONFLICT
    code = "translation_evaluation_in_progress"
    message = "This translation is already being evaluated"
