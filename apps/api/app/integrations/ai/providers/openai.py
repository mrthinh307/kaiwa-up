"""OpenAI-compatible provider adapter for the AI Gateway.

Serves any API that follows the OpenAI-compatible REST shape (OpenAI, Groq, ...);
a provider is just a base_url + api_key + models configured in settings.
"""

from dataclasses import dataclass, field

import httpx

from app.integrations.ai.base import (
    AiProviderConfig,
    TutorMessage,
    chat_content,
    raise_for_provider_error,
    raise_for_request_error,
    response_json_mapping,
)
from app.integrations.ai.contracts import (
    TranscriptionResult,
    parse_transcription_result,
)
from app.integrations.ai.providers.base import BaseAiGateway


@dataclass(frozen=True)
class OpenAiProviderConfig(AiProviderConfig):
    """OpenAI-compatible settings layered on the shared AI provider config."""

    response_format: dict[str, object] = field(default_factory=lambda: {"type": "json_object"})


class OpenAiCompatibleAiGateway(BaseAiGateway):
    """Adapter that talks to any OpenAI-compatible chat/transcription API over HTTP."""

    _config: OpenAiProviderConfig

    def __init__(
        self, config: OpenAiProviderConfig, client: httpx.AsyncClient | None = None
    ) -> None:
        self._config = config
        self._client = client or httpx.AsyncClient(
            base_url=config.base_url,
            headers={"Authorization": f"Bearer {config.api_key}"},
            timeout=None,
        )

    async def transcribe(
        self,
        *,
        audio: bytes,
        filename: str,
        language: str,
        prompt_hint: str | None = None,
    ) -> TranscriptionResult:
        return await self._call(
            "stt",
            lambda: self._transcribe(
                audio=audio,
                filename=filename,
                language=language,
                prompt_hint=prompt_hint,
            ),
        )

    async def _transcribe(
        self,
        *,
        audio: bytes,
        filename: str,
        language: str,
        prompt_hint: str | None,
    ) -> TranscriptionResult:
        payload: dict[str, str] = {
            "model": self._config.stt_model,
            "language": language,
            "response_format": "verbose_json",
        }
        if prompt_hint:
            payload["prompt"] = prompt_hint
        try:
            response = await self._client.post(
                "/audio/transcriptions",
                data=payload,
                files={"file": (filename, audio, "application/octet-stream")},
            )
        except httpx.RequestError as exc:
            raise_for_request_error(exc)
        raise_for_provider_error(response)
        return parse_transcription_result(
            response_json_mapping(response),
            language=language,
        )

    async def _chat(self, messages: list[TutorMessage]) -> str:
        payload: dict[str, object] = {
            "model": self._config.llm_model,
            "messages": [
                {"role": message.role, "content": message.content} for message in messages
            ],
            "temperature": self._config.temperature,
            "top_p": self._config.top_p,
            "max_tokens": self._config.max_output_tokens,
            "response_format": self._config.response_format,
        }
        try:
            response = await self._client.post("/chat/completions", json=payload)
        except httpx.RequestError as exc:
            raise_for_request_error(exc)
        raise_for_provider_error(response)
        return chat_content(response_json_mapping(response))
