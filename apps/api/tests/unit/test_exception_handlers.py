import pytest
from starlette.requests import Request

from app.exceptions.ai import AiRateLimitError
from app.exceptions.handlers import app_error_handler
from app.exceptions.shadowing import ShadowingReviewRateLimitError


@pytest.mark.asyncio
async def test_ai_rate_limit_exposes_retry_after_header() -> None:
    response = await app_error_handler(
        Request({"type": "http", "method": "GET", "path": "/"}),
        AiRateLimitError("rate limited", details={"retry_after_seconds": 7}),
    )

    assert response.headers["Retry-After"] == "7"


@pytest.mark.asyncio
async def test_shadowing_rate_limit_exposes_retry_after_header() -> None:
    response = await app_error_handler(
        Request({"type": "http", "method": "POST", "path": "/shadowing"}),
        ShadowingReviewRateLimitError(),
    )

    assert response.headers["Retry-After"] == "60"
