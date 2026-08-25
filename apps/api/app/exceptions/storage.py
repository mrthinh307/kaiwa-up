from starlette import status

from app.exceptions.base import AppError


class StorageUnavailableError(AppError):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    code = "storage_unavailable"
    message = "Recording storage is temporarily unavailable"
