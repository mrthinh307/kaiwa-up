import logging
from collections.abc import Mapping
from http import HTTPStatus
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette import status
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.exceptions.base import AppError

logger = logging.getLogger(__name__)

HTTP_ERROR_CODES = {
    status.HTTP_400_BAD_REQUEST: "bad_request",
    status.HTTP_401_UNAUTHORIZED: "unauthorized",
    status.HTTP_403_FORBIDDEN: "forbidden",
    status.HTTP_404_NOT_FOUND: "not_found",
    status.HTTP_405_METHOD_NOT_ALLOWED: "method_not_allowed",
    status.HTTP_413_CONTENT_TOO_LARGE: "content_too_large",
    status.HTTP_409_CONFLICT: "conflict",
    status.HTTP_415_UNSUPPORTED_MEDIA_TYPE: "unsupported_media_type",
    status.HTTP_429_TOO_MANY_REQUESTS: "too_many_requests",
    status.HTTP_503_SERVICE_UNAVAILABLE: "service_unavailable",
}


def error_response(
    *,
    status_code: int,
    code: str,
    message: str,
    details: Any = None,
    headers: Mapping[str, str] | None = None,
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "error": {
                "status": status_code,
                "code": code,
                "message": message,
                "details": details,
            }
        },
        headers=headers,
    )


async def app_error_handler(_: Request, exc: AppError) -> JSONResponse:
    headers = None
    if exc.code == "avatar_rate_limited":
        retry_after = (
            exc.details.get("retry_after_seconds", 600) if isinstance(exc.details, Mapping) else 600
        )
        headers = {"Retry-After": str(retry_after)}
    return error_response(
        status_code=exc.status_code,
        code=exc.code,
        message=exc.message,
        details=exc.details,
        headers=headers,
    )


async def validation_error_handler(
    _: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    details = [
        {
            "field": ".".join(str(part) for part in error["loc"]),
            "message": error["msg"],
            "type": error["type"],
        }
        for error in exc.errors()
    ]
    return error_response(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        code="validation_error",
        message="Request validation failed",
        details=details,
    )


async def http_exception_handler(
    _: Request,
    exc: StarletteHTTPException,
) -> JSONResponse:
    if isinstance(exc.detail, str):
        message = exc.detail
        details = None
    else:
        try:
            message = HTTPStatus(exc.status_code).phrase
        except ValueError:
            message = "HTTP error"
        details = exc.detail

    return error_response(
        status_code=exc.status_code,
        code=HTTP_ERROR_CODES.get(exc.status_code, "http_error"),
        message=message,
        details=details,
        headers=exc.headers,
    )


async def unhandled_exception_handler(
    request: Request,
    exc: Exception,
) -> JSONResponse:
    request_id = getattr(request.state, "request_id", None)
    logger.error(
        "Unhandled exception",
        exc_info=exc,
        extra={"request_id": request_id},
    )

    headers = {"X-Request-ID": request_id} if request_id else None
    return error_response(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        code="internal_error",
        message="An unexpected error occurred",
        headers=headers,
    )


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, app_error_handler)  # type: ignore[arg-type]
    app.add_exception_handler(
        RequestValidationError,
        validation_error_handler,  # type: ignore[arg-type]
    )
    app.add_exception_handler(
        StarletteHTTPException,
        http_exception_handler,  # type: ignore[arg-type]
    )
    app.add_exception_handler(Exception, unhandled_exception_handler)
