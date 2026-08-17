from dataclasses import dataclass, field
from typing import Any, NoReturn, Protocol, runtime_checkable

import httpx

from app.exceptions.ai import (
    AiInvalidResponseError,
    AiProviderAuthError,
    AiProviderUnavailableError,
    AiRateLimitError,
    AiTimeoutError,
)
from app.integrations.ai.contracts import (
    EvaluationResult,
    TranscriptionResult,
    TutorReply,
)
from app.integrations.ai.policy import RetryPolicy


@dataclass(frozen=True)
class TutorMessage:
    """A single message in a Tutor conversation."""

    role: str
    content: str


@dataclass(frozen=True)
class AiProviderConfig:
    """Shared connection, retry and generation settings for a provider adapter.

    Subclass this to add provider-specific settings when integrating a new AI.
    """

    api_key: str
    base_url: str
    llm_model: str
    stt_model: str
    timeout_seconds: float = 30.0
    max_retries: int = 2
    retry_backoff_seconds: float = 0.5
    max_retry_backoff_seconds: float = 8.0
    temperature: float = 0.2
    top_p: float = 1.0
    max_output_tokens: int = 1000
    capability_timeouts: dict[str, float] = field(default_factory=dict)

    def timeout_for(self, capability: str) -> float:
        """Resolve the timeout for a capability, falling back to the global one."""
        return self.capability_timeouts.get(capability, self.timeout_seconds)

    def retry_policy(self, *, timeout_seconds: float | None = None) -> RetryPolicy:
        """Build a retry policy from this config with an optional timeout override."""
        return RetryPolicy(
            timeout_seconds=timeout_seconds or self.timeout_seconds,
            max_retries=self.max_retries,
            retry_backoff_seconds=self.retry_backoff_seconds,
            max_retry_backoff_seconds=self.max_retry_backoff_seconds,
        )


@runtime_checkable
class AiGateway(Protocol):
    """Port that business modules use for AI and speech-to-text capabilities."""

    async def transcribe(
        self,
        *,
        audio: bytes,
        filename: str,
        language: str,
        prompt_hint: str | None = None,
    ) -> TranscriptionResult: ...

    async def evaluate_reflex(
        self,
        *,
        question: str,
        transcript: str,
    ) -> EvaluationResult: ...

    async def evaluate_translation(
        self,
        *,
        source_text: str,
        reference_translation: str,
        user_translation: str,
    ) -> EvaluationResult: ...

    async def generate_tutor_reply(
        self,
        *,
        messages: list[TutorMessage],
        topic: str,
        difficulty: str,
    ) -> TutorReply: ...


def raise_for_provider_error(response: httpx.Response) -> None:
    """Translate a provider HTTP status into an AiProviderError subclass."""
    status = response.status_code
    if status in (401, 403):
        raise AiProviderAuthError(f"AI provider rejected the API key (HTTP {status})")
    if status == 429:
        raise AiRateLimitError(f"AI provider rate limit exceeded (HTTP {status})")
    if status >= 500:
        raise AiProviderUnavailableError(f"AI provider is unavailable (HTTP {status})")
    if status >= 400:
        raise AiInvalidResponseError(f"AI provider rejected the request (HTTP {status})")


def raise_for_request_error(exc: httpx.RequestError) -> NoReturn:
    """Translate a transport-level httpx error into an AiProviderError subclass."""
    if isinstance(exc, httpx.TimeoutException):
        raise AiTimeoutError("AI provider request timed out") from exc
    raise AiProviderUnavailableError("AI provider is unreachable") from exc


def response_json_mapping(response: httpx.Response) -> dict[str, Any]:
    """Parse a provider JSON response into a mapping or raise AiInvalidResponseError."""
    try:
        data = response.json()
    except ValueError as exc:
        raise AiInvalidResponseError("AI provider returned a non-JSON response") from exc
    if not isinstance(data, dict):
        raise AiInvalidResponseError("AI provider returned a non-object response")
    return data


def chat_content(data: dict[str, Any]) -> str:
    """Extract the assistant text from an OpenAI-style chat response."""
    choices = data.get("choices")
    if not isinstance(choices, list) or not choices:
        raise AiInvalidResponseError("AI provider response has no choices")
    choice = choices[0]
    if not isinstance(choice, dict):
        raise AiInvalidResponseError("AI provider response has an invalid choice")
    message = choice.get("message")
    if not isinstance(message, dict):
        raise AiInvalidResponseError("AI provider response has no message")
    content = message.get("content")
    if not isinstance(content, str) or not content:
        raise AiInvalidResponseError("AI provider response has no content")
    return content
