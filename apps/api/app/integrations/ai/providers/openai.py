"""OpenAI provider adapter for the AI Gateway."""

from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from typing import TypeVar

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
    EvaluationResult,
    TranscriptionResult,
    TutorReply,
    parse_evaluation_result,
    parse_transcription_result,
    parse_tutor_reply,
)
from app.integrations.ai.prompts import (
    build_reflex_eval_prompt,
    build_translation_eval_prompt,
    build_tutor_messages,
)

T = TypeVar("T")


@dataclass(frozen=True)
class OpenAiProviderConfig(AiProviderConfig):
    """OpenAI-specific settings layered on the shared AI provider config."""

    response_format: dict[str, object] = field(default_factory=lambda: {"type": "json_object"})


class OpenAiAiGateway:
    """Adapter that talks to the OpenAI API over HTTP."""

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

    async def evaluate_reflex(self, *, question: str, transcript: str) -> EvaluationResult:
        prompt = build_reflex_eval_prompt(question=question, transcript=transcript)
        content = await self._call("reflex", lambda: self._chat(prompt))
        return parse_evaluation_result(content)

    async def evaluate_translation(
        self,
        *,
        source_text: str,
        reference_translation: str,
        user_translation: str,
    ) -> EvaluationResult:
        prompt = build_translation_eval_prompt(
            source_text=source_text,
            reference_translation=reference_translation,
            user_translation=user_translation,
        )
        content = await self._call("translation", lambda: self._chat(prompt))
        return parse_evaluation_result(content)

    async def generate_tutor_reply(
        self,
        *,
        messages: list[TutorMessage],
        topic: str,
        difficulty: str,
    ) -> TutorReply:
        prompt = build_tutor_messages(messages=messages, topic=topic, difficulty=difficulty)
        content = await self._call("tutor", lambda: self._chat(prompt))
        return parse_tutor_reply(content)

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

    async def _call(self, capability: str, operation: Callable[[], Awaitable[T]]) -> T:
        policy = self._config.retry_policy(timeout_seconds=self._config.timeout_for(capability))
        return await policy.call(operation)
