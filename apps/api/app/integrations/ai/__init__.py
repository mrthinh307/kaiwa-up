"""AI Gateway: provider-agnostic access to AI and speech-to-text capabilities."""

from collections.abc import Awaitable, Callable
from typing import TypeVar

from app.core.config import Settings
from app.exceptions.ai import (
    AiInvalidResponseError,
    AiProviderAuthError,
    AiProviderError,
    AiProviderUnavailableError,
    AiRateLimitError,
    AiTimeoutError,
)
from app.integrations.ai.base import AiGateway, AiProviderConfig, TutorMessage
from app.integrations.ai.contracts import (
    Correction,
    EvaluationResult,
    TranscriptionResult,
    TranscriptionSegment,
    TutorReply,
)
from app.integrations.ai.providers.fake import FakeAiGateway
from app.integrations.ai.providers.gemini import GeminiAiGateway, GeminiProviderConfig
from app.integrations.ai.providers.openai import OpenAiAiGateway, OpenAiProviderConfig

T = TypeVar("T")


class FallbackAiGateway:
    """Tries providers in order, falling back on transient or auth errors."""

    def __init__(self, providers: list[AiGateway]) -> None:
        self._providers = providers

    async def transcribe(
        self,
        *,
        audio: bytes,
        filename: str,
        language: str,
        prompt_hint: str | None = None,
    ) -> TranscriptionResult:
        return await self._try_providers(
            lambda provider: provider.transcribe(
                audio=audio,
                filename=filename,
                language=language,
                prompt_hint=prompt_hint,
            )
        )

    async def evaluate_reflex(self, *, question: str, transcript: str) -> EvaluationResult:
        return await self._try_providers(
            lambda provider: provider.evaluate_reflex(question=question, transcript=transcript)
        )

    async def evaluate_translation(
        self,
        *,
        source_text: str,
        reference_translation: str,
        user_translation: str,
    ) -> EvaluationResult:
        return await self._try_providers(
            lambda provider: provider.evaluate_translation(
                source_text=source_text,
                reference_translation=reference_translation,
                user_translation=user_translation,
            )
        )

    async def generate_tutor_reply(
        self,
        *,
        messages: list[TutorMessage],
        topic: str,
        difficulty: str,
    ) -> TutorReply:
        return await self._try_providers(
            lambda provider: provider.generate_tutor_reply(
                messages=messages,
                topic=topic,
                difficulty=difficulty,
            )
        )

    async def _try_providers(self, operation: Callable[[AiGateway], Awaitable[T]]) -> T:
        last_error: AiProviderError | None = None
        for provider in self._providers:
            try:
                return await operation(provider)
            except (
                AiTimeoutError,
                AiProviderUnavailableError,
                AiRateLimitError,
                AiProviderAuthError,
            ) as exc:
                last_error = exc
        raise AiProviderUnavailableError("All AI providers failed") from last_error


def build_ai_gateway(settings: Settings) -> AiGateway:
    """Build the configured AI Gateway, falling back to fake when unconfigured."""
    capability_timeouts = _capability_timeouts(settings)
    available: dict[str, AiGateway] = {}
    openai_api_key = (
        settings.ai_openai_api_key.get_secret_value() if settings.ai_openai_api_key else None
    )
    if openai_api_key:
        available["openai"] = OpenAiAiGateway(
            OpenAiProviderConfig(
                api_key=openai_api_key,
                base_url=settings.ai_openai_base_url,
                llm_model=settings.ai_llm_model or settings.ai_openai_llm_model,
                stt_model=settings.ai_stt_model or settings.ai_openai_stt_model,
                timeout_seconds=settings.ai_timeout_seconds,
                max_retries=settings.ai_max_retries,
                retry_backoff_seconds=settings.ai_retry_backoff_seconds,
                max_retry_backoff_seconds=settings.ai_max_retry_backoff_seconds,
                temperature=settings.ai_temperature,
                top_p=settings.ai_top_p,
                max_output_tokens=settings.ai_max_output_tokens,
                capability_timeouts=capability_timeouts,
            )
        )
    gemini_api_key = (
        settings.ai_gemini_api_key.get_secret_value() if settings.ai_gemini_api_key else None
    )
    if gemini_api_key:
        available["gemini"] = GeminiAiGateway(
            GeminiProviderConfig(
                api_key=gemini_api_key,
                base_url=settings.ai_gemini_base_url,
                llm_model=settings.ai_llm_model or settings.ai_gemini_llm_model,
                stt_model=settings.ai_stt_model or settings.ai_gemini_stt_model,
                timeout_seconds=settings.ai_timeout_seconds,
                max_retries=settings.ai_max_retries,
                retry_backoff_seconds=settings.ai_retry_backoff_seconds,
                max_retry_backoff_seconds=settings.ai_max_retry_backoff_seconds,
                temperature=settings.ai_temperature,
                top_p=settings.ai_top_p,
                max_output_tokens=settings.ai_max_output_tokens,
                capability_timeouts=capability_timeouts,
            )
        )

    if settings.ai_provider == "fake":
        return FakeAiGateway()

    providers = [
        available[name]
        for name in _ordered_providers(
            primary=settings.ai_provider,
            fallback=settings.ai_fallback_provider,
            available=list(available),
        )
        if name in available
    ]
    if not providers:
        return FakeAiGateway()
    if len(providers) == 1:
        return providers[0]
    return FallbackAiGateway(providers)


def _capability_timeouts(settings: Settings) -> dict[str, float]:
    timeouts: dict[str, float] = {}
    for capability, value in (
        ("stt", settings.ai_stt_timeout_seconds),
        ("reflex", settings.ai_reflex_timeout_seconds),
        ("translation", settings.ai_translation_timeout_seconds),
        ("tutor", settings.ai_tutor_timeout_seconds),
    ):
        if value is not None:
            timeouts[capability] = value
    return timeouts


def _ordered_providers(*, primary: str, fallback: str | None, available: list[str]) -> list[str]:
    order: list[str] = []
    for name in (primary, fallback):
        if name and name in available and name not in order:
            order.append(name)
    order.extend(name for name in available if name not in order)
    return order


__all__ = [
    "AiGateway",
    "AiInvalidResponseError",
    "AiProviderAuthError",
    "AiProviderConfig",
    "AiProviderError",
    "AiProviderUnavailableError",
    "AiRateLimitError",
    "AiTimeoutError",
    "Correction",
    "EvaluationResult",
    "FakeAiGateway",
    "FallbackAiGateway",
    "GeminiAiGateway",
    "GeminiProviderConfig",
    "OpenAiAiGateway",
    "OpenAiProviderConfig",
    "TranscriptionResult",
    "TranscriptionSegment",
    "TutorMessage",
    "TutorReply",
    "build_ai_gateway",
]
