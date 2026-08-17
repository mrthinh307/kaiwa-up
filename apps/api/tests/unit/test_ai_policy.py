import asyncio
import time

import pytest

from app.exceptions.ai import (
    AiInvalidResponseError,
    AiProviderUnavailableError,
    AiRateLimitError,
    AiTimeoutError,
)
from app.integrations.ai.policy import call_with_retry


@pytest.mark.asyncio
async def test_call_with_retry_returns_result_on_first_attempt() -> None:
    result = await call_with_retry(
        _async_ok,
        timeout_seconds=1.0,
        max_retries=2,
        backoff_seconds=0.001,
        max_backoff_seconds=0.001,
    )

    assert result == "ok"


@pytest.mark.asyncio
async def test_call_with_retry_raises_timeout_when_operation_is_slow() -> None:
    with pytest.raises(AiTimeoutError):
        await call_with_retry(
            lambda: asyncio.sleep(5),
            timeout_seconds=0.01,
            max_retries=0,
            backoff_seconds=0.001,
            max_backoff_seconds=0.001,
        )


@pytest.mark.asyncio
async def test_call_with_retry_recovers_after_transient_failure() -> None:
    calls = 0

    async def fail_once() -> str:
        nonlocal calls
        calls += 1
        if calls == 1:
            raise AiProviderUnavailableError("down")
        return "ok"

    result = await call_with_retry(
        fail_once,
        timeout_seconds=1.0,
        max_retries=2,
        backoff_seconds=0.001,
        max_backoff_seconds=0.001,
    )

    assert result == "ok"
    assert calls == 2


@pytest.mark.asyncio
async def test_call_with_retry_reraises_transient_error_after_max_retries() -> None:
    calls = 0

    async def always_fail() -> None:
        nonlocal calls
        calls += 1
        raise AiRateLimitError("rate limited")

    with pytest.raises(AiRateLimitError):
        await call_with_retry(
            always_fail,
            timeout_seconds=1.0,
            max_retries=2,
            backoff_seconds=0.001,
            max_backoff_seconds=0.001,
        )

    assert calls == 3


@pytest.mark.asyncio
async def test_call_with_retry_does_not_retry_non_transient_errors() -> None:
    calls = 0

    async def always_invalid() -> None:
        nonlocal calls
        calls += 1
        raise AiInvalidResponseError("bad payload")

    with pytest.raises(AiInvalidResponseError):
        await call_with_retry(
            always_invalid,
            timeout_seconds=1.0,
            max_retries=2,
            backoff_seconds=0.001,
            max_backoff_seconds=0.001,
        )

    assert calls == 1


@pytest.mark.asyncio
async def test_call_with_retry_backoff_is_capped_by_max_backoff() -> None:
    calls = 0

    async def always_unavailable() -> None:
        nonlocal calls
        calls += 1
        raise AiProviderUnavailableError("down")

    start = time.perf_counter()
    with pytest.raises(AiProviderUnavailableError):
        await call_with_retry(
            always_unavailable,
            timeout_seconds=1.0,
            max_retries=3,
            backoff_seconds=100.0,
            max_backoff_seconds=0.02,
        )
    elapsed = time.perf_counter() - start

    assert calls == 4
    assert elapsed < 1.0


async def _async_ok() -> str:
    return "ok"
