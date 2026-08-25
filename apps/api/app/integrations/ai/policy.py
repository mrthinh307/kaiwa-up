"""Timeout, retry and backoff policy for AI provider calls."""

import asyncio
import random
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import TypeVar

from app.exceptions.ai import (
    AiProviderUnavailableError,
    AiRateLimitError,
    AiTimeoutError,
)

T = TypeVar("T")


async def call_with_retry[T](
    operation: Callable[[], Awaitable[T]],
    *,
    timeout_seconds: float,
    max_retries: int,
    backoff_seconds: float,
    max_backoff_seconds: float,
) -> T:
    """Run an operation with a timeout, retrying transient failures with backoff."""
    attempt = 0
    while True:
        try:
            return await _run_with_timeout(operation, timeout_seconds=timeout_seconds)
        except (AiTimeoutError, AiProviderUnavailableError, AiRateLimitError):
            if attempt >= max_retries:
                raise
            attempt += 1
            delay = min(max_backoff_seconds, backoff_seconds * (2 ** (attempt - 1)))
            await asyncio.sleep(delay + random.uniform(0.0, delay * 0.1))


@dataclass(frozen=True)
class RetryPolicy:
    """Immutable retry configuration applied to provider calls."""

    timeout_seconds: float
    max_retries: int
    retry_backoff_seconds: float
    max_retry_backoff_seconds: float

    async def call(self, operation: Callable[[], Awaitable[T]]) -> T:
        """Run an operation under this policy's timeout and retry rules."""
        return await call_with_retry(
            operation,
            timeout_seconds=self.timeout_seconds,
            max_retries=self.max_retries,
            backoff_seconds=self.retry_backoff_seconds,
            max_backoff_seconds=self.max_retry_backoff_seconds,
        )


async def _run_with_timeout[T](
    operation: Callable[[], Awaitable[T]],
    *,
    timeout_seconds: float,
) -> T:
    try:
        return await asyncio.wait_for(operation(), timeout=timeout_seconds)
    except TimeoutError as exc:
        raise AiTimeoutError("AI provider request timed out") from exc
