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
    TutorAnswerHint,
    TutorReply,
)
from app.integrations.ai.providers.fake import FakeAiGateway
from app.integrations.ai.providers.openai import (
    OpenAiCompatibleAiGateway,
    OpenAiProviderConfig,
)

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

    async def evaluate_shadowing(
        self,
        *,
        reference_transcript: str,
        user_transcript: str,
    ) -> EvaluationResult:
        return await self._try_providers(
            lambda provider: provider.evaluate_shadowing(
                reference_transcript=reference_transcript,
                user_transcript=user_transcript,
            )
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
        scenario: str | None = None,
    ) -> TutorReply:
        return await self._try_providers(
            lambda provider: provider.generate_tutor_reply(
                messages=messages,
                topic=topic,
                difficulty=difficulty,
                scenario=scenario,
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


class RoutedAiGateway:
    """Routes each capability to the provider chain configured for its lane.

    Lanes: tutor (generate_tutor_reply), evaluate (reflex/shadowing/translation),
    stt (transcribe). Each lane owns its own fallback chain.
    """

    def __init__(
        self,
        *,
        tutor: AiGateway,
        evaluate: AiGateway,
        stt: AiGateway,
    ) -> None:
        self._tutor = tutor
        self._evaluate = evaluate
        self._stt = stt

    async def transcribe(
        self,
        *,
        audio: bytes,
        filename: str,
        language: str,
        prompt_hint: str | None = None,
    ) -> TranscriptionResult:
        return await self._stt.transcribe(
            audio=audio,
            filename=filename,
            language=language,
            prompt_hint=prompt_hint,
        )

    async def evaluate_reflex(self, *, question: str, transcript: str) -> EvaluationResult:
        return await self._evaluate.evaluate_reflex(question=question, transcript=transcript)

    async def evaluate_shadowing(
        self,
        *,
        reference_transcript: str,
        user_transcript: str,
    ) -> EvaluationResult:
        return await self._evaluate.evaluate_shadowing(
            reference_transcript=reference_transcript,
            user_transcript=user_transcript,
        )

    async def evaluate_translation(
        self,
        *,
        source_text: str,
        reference_translation: str,
        user_translation: str,
    ) -> EvaluationResult:
        return await self._evaluate.evaluate_translation(
            source_text=source_text,
            reference_translation=reference_translation,
            user_translation=user_translation,
        )

    async def generate_tutor_reply(
        self,
        *,
        messages: list[TutorMessage],
        topic: str,
        difficulty: str,
        scenario: str | None = None,
    ) -> TutorReply:
        return await self._tutor.generate_tutor_reply(
            messages=messages,
            topic=topic,
            difficulty=difficulty,
            scenario=scenario,
        )


def build_ai_gateway(settings: Settings) -> AiGateway:
    """Build the configured AI Gateway, routing each capability to its lane's chain."""
    registry = _provider_registry(settings)
    chains = {
        "tutor": _lane_chain(
            primary=settings.ai_tutor_provider,
            fallback_csv=settings.ai_tutor_fallback_providers,
            registry=registry,
        ),
        "evaluate": _lane_chain(
            primary=settings.ai_eval_provider,
            fallback_csv=settings.ai_eval_fallback_providers,
            registry=registry,
        ),
        "stt": _lane_chain(
            primary=settings.ai_stt_provider,
            fallback_csv=settings.ai_stt_fallback_providers,
            registry=registry,
        ),
    }
    if all(len(chain) == 1 and isinstance(chain[0], FakeAiGateway) for chain in chains.values()):
        return FakeAiGateway()
    single = _single_shared_provider(chains)
    if single is not None:
        return single
    return RoutedAiGateway(
        tutor=FallbackAiGateway(chains["tutor"]),
        evaluate=FallbackAiGateway(chains["evaluate"]),
        stt=FallbackAiGateway(chains["stt"]),
    )


def _provider_registry(settings: Settings) -> dict[str, AiGateway]:
    """Build the configured providers, keyed by name, using OpenAI-compatible dialect."""
    registry: dict[str, AiGateway] = {}
    for name in ("openai", "groq"):
        api_key = getattr(settings, f"ai_{name}_api_key")
        if not api_key:
            continue
        registry[name] = OpenAiCompatibleAiGateway(
            OpenAiProviderConfig(
                api_key=api_key.get_secret_value(),
                base_url=getattr(settings, f"ai_{name}_base_url"),
                llm_model=settings.ai_llm_model or getattr(settings, f"ai_{name}_llm_model"),
                stt_model=settings.ai_stt_model or getattr(settings, f"ai_{name}_stt_model"),
                timeout_seconds=settings.ai_timeout_seconds,
                max_retries=settings.ai_max_retries,
                retry_backoff_seconds=settings.ai_retry_backoff_seconds,
                max_retry_backoff_seconds=settings.ai_max_retry_backoff_seconds,
                temperature=settings.ai_temperature,
                top_p=settings.ai_top_p,
                max_output_tokens=settings.ai_max_output_tokens,
                capability_timeouts=_capability_timeouts(settings),
            )
        )
    return registry


def _lane_chain(
    *,
    primary: str,
    fallback_csv: str,
    registry: dict[str, AiGateway],
) -> list[AiGateway]:
    """Resolve a lane's provider chain (primary + fallbacks), defaulting to fake."""
    names = [name.strip() for name in (primary, *fallback_csv.split(",")) if name.strip()]
    chain: list[AiGateway] = []
    seen: set[str] = set()
    for name in names:
        if name == "fake":
            if "fake" not in seen:
                chain.append(FakeAiGateway())
                seen.add("fake")
        elif name in registry and name not in seen:
            chain.append(registry[name])
            seen.add(name)
    return chain or [FakeAiGateway()]


def _single_shared_provider(chains: dict[str, list[AiGateway]]) -> AiGateway | None:
    """Return the provider when every lane resolves to the same single provider."""
    if not all(len(chain) == 1 for chain in chains.values()):
        return None
    shared = chains["tutor"][0]
    if all(chain[0] is shared for chain in chains.values()):
        return shared
    return None


def _capability_timeouts(settings: Settings) -> dict[str, float]:
    timeouts: dict[str, float] = {}
    for capability, value in (
        ("stt", settings.ai_stt_timeout_seconds),
        ("reflex", settings.ai_reflex_timeout_seconds),
        ("shadowing", settings.ai_shadowing_timeout_seconds),
        ("translation", settings.ai_translation_timeout_seconds),
        ("tutor", settings.ai_tutor_timeout_seconds),
    ):
        if value is not None:
            timeouts[capability] = value
    return timeouts


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
    "OpenAiCompatibleAiGateway",
    "OpenAiProviderConfig",
    "RoutedAiGateway",
    "TranscriptionResult",
    "TranscriptionSegment",
    "TutorAnswerHint",
    "TutorMessage",
    "TutorReply",
    "build_ai_gateway",
]
