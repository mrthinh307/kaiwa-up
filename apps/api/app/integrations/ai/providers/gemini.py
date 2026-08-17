"""Google Gemini provider adapter for the AI Gateway."""

import base64
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import TypeVar

import httpx

from app.exceptions.ai import AiInvalidResponseError
from app.integrations.ai.base import (
    AiProviderConfig,
    TutorMessage,
    raise_for_provider_error,
    raise_for_request_error,
    response_json_mapping,
)
from app.integrations.ai.contracts import (
    EvaluationResult,
    TranscriptionResult,
    TutorReply,
    parse_evaluation_result,
    parse_json_content,
    parse_transcription_result,
    parse_tutor_reply,
)
from app.integrations.ai.prompts import (
    build_reflex_eval_prompt,
    build_stt_instruction,
    build_translation_eval_prompt,
    build_tutor_messages,
)

T = TypeVar("T")


@dataclass(frozen=True)
class GeminiProviderConfig(AiProviderConfig):
    """Gemini-specific settings layered on the shared AI provider config."""

    response_mime_type: str = "application/json"


class GeminiAiGateway:
    """Adapter that talks to the Gemini API over HTTP."""

    def __init__(
        self, config: GeminiProviderConfig, client: httpx.AsyncClient | None = None
    ) -> None:
        self._config = config
        self._client = client or httpx.AsyncClient(
            base_url=config.base_url,
            headers={"x-goog-api-key": config.api_key},
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
        audio_data = base64.b64encode(audio).decode("ascii")
        payload: dict[str, object] = {
            "contents": [
                {
                    "parts": [
                        {"inlineData": {"mimeType": "audio/mpeg", "data": audio_data}},
                        {
                            "text": build_stt_instruction(
                                language=language,
                                prompt_hint=prompt_hint,
                            )
                        },
                    ]
                }
            ],
            "generationConfig": {"responseMimeType": "application/json"},
        }
        content = await self._call("stt", lambda: self._generate(payload))
        return parse_transcription_result(
            parse_json_content(content),
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
        system_messages = [message for message in messages if message.role == "system"]
        conversation = [message for message in messages if message.role != "system"]
        payload: dict[str, object] = {
            "contents": [
                {
                    "role": "model" if message.role == "assistant" else "user",
                    "parts": [{"text": message.content}],
                }
                for message in conversation
            ],
            "generationConfig": {
                "responseMimeType": self._config.response_mime_type,
                "temperature": self._config.temperature,
                "topP": self._config.top_p,
                "maxOutputTokens": self._config.max_output_tokens,
            },
        }
        if system_messages:
            payload["systemInstruction"] = {
                "parts": [{"text": message.content} for message in system_messages]
            }
        return await self._generate(payload)

    async def _generate(self, payload: dict[str, object]) -> str:
        model = self._config.llm_model
        try:
            response = await self._client.post(
                f"/v1beta/models/{model}:generateContent",
                json=payload,
            )
        except httpx.RequestError as exc:
            raise_for_request_error(exc)
        raise_for_provider_error(response)
        return _extract_text(response_json_mapping(response))

    async def _call(self, capability: str, operation: Callable[[], Awaitable[T]]) -> T:
        policy = self._config.retry_policy(timeout_seconds=self._config.timeout_for(capability))
        return await policy.call(operation)


def _extract_text(data: dict[str, object]) -> str:
    candidates = data.get("candidates")
    if not isinstance(candidates, list) or not candidates:
        raise AiInvalidResponseError("AI provider response has no candidates")
    candidate = candidates[0]
    if not isinstance(candidate, dict):
        raise AiInvalidResponseError("AI provider response has an invalid candidate")
    content = candidate.get("content")
    if not isinstance(content, dict):
        raise AiInvalidResponseError("AI provider response has no content")
    parts = content.get("parts")
    if not isinstance(parts, list):
        raise AiInvalidResponseError("AI provider response has no parts")
    text = "".join(
        part["text"]
        for part in parts
        if isinstance(part, dict) and isinstance(part.get("text"), str)
    )
    if not text:
        raise AiInvalidResponseError("AI provider response has no text")
    return text
