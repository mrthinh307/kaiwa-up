import json
from collections.abc import Callable

import httpx
import pytest
import pytest_asyncio

from app.core.config import Settings
from app.exceptions.ai import (
    AiInvalidResponseError,
    AiProviderAuthError,
    AiProviderError,
    AiProviderUnavailableError,
    AiRateLimitError,
    AiTimeoutError,
)
from app.integrations.ai import (
    AiGateway,
    FakeAiGateway,
    FallbackAiGateway,
    GeminiAiGateway,
    GeminiProviderConfig,
    OpenAiAiGateway,
    OpenAiProviderConfig,
    _ordered_providers,
    build_ai_gateway,
)
from app.integrations.ai.contracts import EvaluationResult

EVALUATION_JSON = json.dumps(
    {
        "score": 85,
        "is_acceptable": True,
        "feedback": "Good attempt.",
        "hints": ["Try again"],
        "corrections": [{"original": "hello", "corrected": "konnichiwa", "reason": "use Japanese"}],
    }
)

TUTOR_JSON = json.dumps(
    {
        "message": "Nice! Let's continue.",
        "hints": ["Keep going"],
        "follow_up_question": "Want to try another?",
    }
)

TRANSCRIPTION_JSON = {
    "text": "こんにちは、元気です。",
    "confidence": 0.95,
    "segments": [{"start": 0.0, "end": 1.2, "text": "こんにちは、元気です。", "confidence": 0.95}],
}

_GatewayFactory = Callable[[Callable[[httpx.Request], httpx.Response]], AiGateway]


class _FailingGateway(FakeAiGateway):
    """A gateway that raises a fixed error on every reflex evaluation."""

    def __init__(self, exc: AiProviderError) -> None:
        self._exc = exc

    async def evaluate_reflex(self, *, question: str, transcript: str) -> EvaluationResult:
        raise self._exc


class _RecordingGateway(FakeAiGateway):
    """A gateway that records how many reflex evaluations were attempted."""

    def __init__(self) -> None:
        self.reflex_calls = 0

    async def evaluate_reflex(self, *, question: str, transcript: str) -> EvaluationResult:
        self.reflex_calls += 1
        return await super().evaluate_reflex(question=question, transcript=transcript)


@pytest.mark.asyncio
async def test_fake_ai_gateway_succeeds_for_all_capabilities() -> None:
    gateway = FakeAiGateway()

    transcription = await gateway.transcribe(audio=b"audio", filename="clip.mp3", language="ja")
    assert transcription.text == "こんにちは、元気です。"
    assert transcription.language == "ja"
    assert transcription.confidence == 1.0

    reflex = await gateway.evaluate_reflex(question="What?", transcript="こんにちは")
    assert reflex.score == 100
    assert reflex.is_acceptable is True

    translation = await gateway.evaluate_translation(
        source_text="hello",
        reference_translation="こんにちは",
        user_translation="こんにちは",
    )
    assert translation.score == 100

    tutor = await gateway.generate_tutor_reply(
        messages=[], topic="greetings", difficulty="beginner"
    )
    assert tutor.message == "こんにちは！次は何を練習しましょうか？"


def test_ai_gateway_is_a_runtime_checkable_protocol() -> None:
    assert isinstance(FakeAiGateway(), AiGateway)
    assert isinstance(OpenAiAiGateway(_openai_config()), AiGateway)
    assert isinstance(GeminiAiGateway(_gemini_config()), AiGateway)
    assert isinstance(FallbackAiGateway([FakeAiGateway()]), AiGateway)


def test_build_ai_gateway_uses_fake_when_unconfigured() -> None:
    gateway = build_ai_gateway(Settings(_env_file=None))

    assert isinstance(gateway, FakeAiGateway)


def test_build_ai_gateway_uses_fake_when_configured_fake_with_keys() -> None:
    gateway = build_ai_gateway(
        Settings(ai_provider="fake", ai_openai_api_key="k", ai_gemini_api_key="g", _env_file=None)
    )

    assert isinstance(gateway, FakeAiGateway)


def test_build_ai_gateway_returns_single_adapter_when_only_one_keyed() -> None:
    gateway = build_ai_gateway(
        Settings(ai_provider="openai", ai_openai_api_key="k", _env_file=None)
    )

    assert isinstance(gateway, OpenAiAiGateway)


def test_build_ai_gateway_wraps_in_fallback_when_both_keyed() -> None:
    gateway = build_ai_gateway(
        Settings(
            ai_provider="openai",
            ai_openai_api_key="k",
            ai_fallback_provider="gemini",
            ai_gemini_api_key="g",
            _env_file=None,
        )
    )

    assert isinstance(gateway, FallbackAiGateway)


def test_ordered_providers_puts_primary_and_fallback_first() -> None:
    assert _ordered_providers(
        primary="openai", fallback="gemini", available=["gemini", "openai"]
    ) == ["openai", "gemini"]


@pytest.mark.asyncio
async def test_fallback_gateway_switches_provider_on_transient_error() -> None:
    fallback = FallbackAiGateway(
        [_FailingGateway(AiProviderAuthError("bad key")), _RecordingGateway()]
    )

    result = await fallback.evaluate_reflex(question="What?", transcript="こんにちは")

    assert result.score == 100


@pytest.mark.asyncio
async def test_fallback_gateway_raises_when_all_providers_fail() -> None:
    fallback = FallbackAiGateway(
        [
            _FailingGateway(AiProviderAuthError("bad key")),
            _FailingGateway(AiProviderAuthError("bad")),
        ]
    )

    with pytest.raises(AiProviderUnavailableError, match="All AI providers failed"):
        await fallback.evaluate_reflex(question="What?", transcript="こんにちは")


@pytest.mark.asyncio
async def test_fallback_gateway_does_not_fall_back_on_invalid_response() -> None:
    recording = _RecordingGateway()
    fallback = FallbackAiGateway([_FailingGateway(AiInvalidResponseError("bad JSON")), recording])

    with pytest.raises(AiInvalidResponseError):
        await fallback.evaluate_reflex(question="What?", transcript="こんにちは")

    assert recording.reflex_calls == 0


@pytest.mark.asyncio
async def test_openai_evaluate_reflex_success(openai_gateway: _GatewayFactory) -> None:
    gateway = openai_gateway(lambda _: _openai_chat_response(EVALUATION_JSON))

    result = await gateway.evaluate_reflex(question="What?", transcript="こんにちは")

    assert result.score == 85
    assert result.is_acceptable is True
    assert result.corrections[0].corrected == "konnichiwa"


@pytest.mark.asyncio
async def test_openai_transcribe_success(openai_gateway: _GatewayFactory) -> None:
    gateway = openai_gateway(lambda _: httpx.Response(200, json=TRANSCRIPTION_JSON))

    result = await gateway.transcribe(audio=b"audio", filename="clip.mp3", language="ja")

    assert result.text == "こんにちは、元気です。"
    assert result.confidence == 0.95
    assert result.segments[0].end_ms == 1200


@pytest.mark.asyncio
async def test_openai_generate_tutor_reply_success(openai_gateway: _GatewayFactory) -> None:
    gateway = openai_gateway(lambda _: _openai_chat_response(TUTOR_JSON))

    result = await gateway.generate_tutor_reply(
        messages=[], topic="greetings", difficulty="beginner"
    )

    assert result.message == "Nice! Let's continue."
    assert result.follow_up_question == "Want to try another?"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("status", "expected"),
    [
        (401, AiProviderAuthError),
        (403, AiProviderAuthError),
        (429, AiRateLimitError),
        (500, AiProviderUnavailableError),
        (400, AiInvalidResponseError),
    ],
)
async def test_openai_maps_provider_http_errors(
    status: int, expected: type[AiProviderError], openai_gateway: _GatewayFactory
) -> None:
    gateway = openai_gateway(lambda _: httpx.Response(status, json={}))

    with pytest.raises(expected):
        await gateway.evaluate_reflex(question="What?", transcript="こんにちは")


@pytest.mark.asyncio
async def test_openai_raises_invalid_response_for_non_json_body(
    openai_gateway: _GatewayFactory,
) -> None:
    gateway = openai_gateway(lambda _: httpx.Response(200, text="not json"))

    with pytest.raises(AiInvalidResponseError):
        await gateway.evaluate_reflex(question="What?", transcript="こんにちは")


@pytest.mark.asyncio
async def test_openai_raises_invalid_response_for_missing_choices(
    openai_gateway: _GatewayFactory,
) -> None:
    gateway = openai_gateway(lambda _: httpx.Response(200, json={"unexpected": 1}))

    with pytest.raises(AiInvalidResponseError):
        await gateway.evaluate_reflex(question="What?", transcript="こんにちは")


@pytest.mark.asyncio
async def test_openai_raises_invalid_response_for_invalid_evaluation_json(
    openai_gateway: _GatewayFactory,
) -> None:
    gateway = openai_gateway(lambda _: _openai_chat_response("not json"))

    with pytest.raises(AiInvalidResponseError):
        await gateway.evaluate_reflex(question="What?", transcript="こんにちは")


@pytest.mark.asyncio
async def test_openai_raises_unavailable_when_provider_unreachable(
    openai_gateway: _GatewayFactory,
) -> None:
    def unreachable(_: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("unreachable")

    gateway = openai_gateway(unreachable)

    with pytest.raises(AiProviderUnavailableError):
        await gateway.evaluate_reflex(question="What?", transcript="こんにちは")


@pytest.mark.asyncio
async def test_openai_raises_timeout_when_provider_is_slow(
    openai_gateway: _GatewayFactory,
) -> None:
    def slow(_: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("slow")

    gateway = openai_gateway(slow)

    with pytest.raises(AiTimeoutError):
        await gateway.evaluate_reflex(question="What?", transcript="こんにちは")


@pytest.mark.asyncio
async def test_gemini_transcribe_success(gemini_gateway: _GatewayFactory) -> None:
    gateway = gemini_gateway(
        lambda _: _gemini_content(json.dumps({"text": "こんにちは、元気です。"}))
    )

    result = await gateway.transcribe(audio=b"audio", filename="clip.mp3", language="ja")

    assert result.text == "こんにちは、元気です。"
    assert result.language == "ja"


@pytest.mark.asyncio
async def test_gemini_evaluate_reflex_success(gemini_gateway: _GatewayFactory) -> None:
    gateway = gemini_gateway(lambda _: _gemini_content(EVALUATION_JSON))

    result = await gateway.evaluate_reflex(question="What?", transcript="こんにちは")

    assert result.score == 85


@pytest.mark.asyncio
async def test_gemini_raises_invalid_response_when_no_candidates(
    gemini_gateway: _GatewayFactory,
) -> None:
    gateway = gemini_gateway(lambda _: httpx.Response(200, json={"other": 1}))

    with pytest.raises(AiInvalidResponseError):
        await gateway.evaluate_reflex(question="What?", transcript="こんにちは")


@pytest.mark.asyncio
async def test_gemini_raises_invalid_response_when_no_text(
    gemini_gateway: _GatewayFactory,
) -> None:
    gateway = gemini_gateway(lambda _: httpx.Response(200, json={"candidates": []}))

    with pytest.raises(AiInvalidResponseError):
        await gateway.evaluate_reflex(question="What?", transcript="こんにちは")


def _openai_config() -> OpenAiProviderConfig:
    return OpenAiProviderConfig(
        api_key="test-key",
        base_url="https://api.test/v1",
        llm_model="model-a",
        stt_model="model-b",
        max_retries=0,
    )


def _gemini_config() -> GeminiProviderConfig:
    return GeminiProviderConfig(
        api_key="test-key",
        base_url="https://api.test",
        llm_model="model-c",
        stt_model="model-c",
        max_retries=0,
    )


@pytest_asyncio.fixture
async def openai_gateway() -> Callable[
    [Callable[[httpx.Request], httpx.Response]], OpenAiAiGateway
]:
    clients: list[httpx.AsyncClient] = []

    def _build(handler: Callable[[httpx.Request], httpx.Response]) -> OpenAiAiGateway:
        client = httpx.AsyncClient(
            base_url="https://api.test/v1",
            transport=httpx.MockTransport(handler),
        )
        clients.append(client)
        return OpenAiAiGateway(_openai_config(), client=client)

    yield _build
    for client in clients:
        await client.aclose()


@pytest_asyncio.fixture
async def gemini_gateway() -> Callable[
    [Callable[[httpx.Request], httpx.Response]], GeminiAiGateway
]:
    clients: list[httpx.AsyncClient] = []

    def _build(handler: Callable[[httpx.Request], httpx.Response]) -> GeminiAiGateway:
        client = httpx.AsyncClient(
            base_url="https://api.test",
            transport=httpx.MockTransport(handler),
        )
        clients.append(client)
        return GeminiAiGateway(_gemini_config(), client=client)

    yield _build
    for client in clients:
        await client.aclose()


def _openai_chat_response(content: str) -> httpx.Response:
    return httpx.Response(200, json={"choices": [{"message": {"content": content}}]})


def _gemini_content(text: str) -> httpx.Response:
    return httpx.Response(200, json={"candidates": [{"content": {"parts": [{"text": text}]}}]})
