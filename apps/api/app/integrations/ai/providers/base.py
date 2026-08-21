"""Abstract AI Gateway base sharing provider-agnostic LLM capability implementations."""

from abc import ABC, abstractmethod
from collections.abc import Awaitable, Callable
from typing import TypeVar

from app.exceptions.ai import AiInvalidResponseError
from app.integrations.ai.base import AiProviderConfig, TutorMessage
from app.integrations.ai.contracts import (
    EvaluationResult,
    TranscriptionResult,
    TutorReply,
    parse_evaluation_result,
    parse_tutor_reply,
    tutor_reply_ends_with_question,
)
from app.integrations.ai.prompts import (
    build_reflex_eval_prompt,
    build_shadowing_eval_prompt,
    build_translation_eval_prompt,
    build_tutor_messages,
)

T = TypeVar("T")


class BaseAiGateway(ABC):
    """Common implementation of every LLM capability on top of provider _chat/transcribe.

    Subclasses only supply the transport-specific pieces: how a chat prompt is sent and
    how audio is transcribed. All evaluation and tutor-reply logic is shared here.
    """

    _config: AiProviderConfig

    @abstractmethod
    async def transcribe(
        self,
        *,
        audio: bytes,
        filename: str,
        language: str,
        prompt_hint: str | None = None,
    ) -> TranscriptionResult:
        """Transcribe audio into normalized text through the provider STT endpoint."""

    @abstractmethod
    async def _chat(self, messages: list[TutorMessage]) -> str:
        """Send a chat prompt to the provider and return the assistant text."""

    async def evaluate_reflex(self, *, question: str, transcript: str) -> EvaluationResult:
        prompt = build_reflex_eval_prompt(question=question, transcript=transcript)
        return await self._evaluate("reflex", prompt)

    async def evaluate_shadowing(
        self,
        *,
        reference_transcript: str,
        user_transcript: str,
    ) -> EvaluationResult:
        prompt = build_shadowing_eval_prompt(
            reference_transcript=reference_transcript,
            learner_transcript=user_transcript,
        )
        return await self._evaluate("shadowing", prompt)

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
        return await self._evaluate("translation", prompt)

    async def generate_tutor_reply(
        self,
        *,
        messages: list[TutorMessage],
        topic: str,
        difficulty: str,
        scenario: str | None = None,
    ) -> TutorReply:
        prompt = build_tutor_messages(
            messages=messages,
            topic=topic,
            difficulty=difficulty,
            scenario=scenario,
        )
        content = await self._call("tutor", lambda: self._chat(prompt))
        reply = parse_tutor_reply(content)
        if not any(message.role == "user" for message in messages):
            return reply
        if tutor_reply_ends_with_question(reply.message):
            return reply

        repair_prompt = [
            *prompt,
            TutorMessage(
                role="user",
                content=(
                    "Response JSON vừa rồi không hợp lệ vì message không kết thúc bằng một câu "
                    "hỏi. "
                    "Giữ nguyên nội dung phù hợp, bổ sung đúng một câu hỏi tiếng Nhật mới ở cuối, "
                    "không lặp câu hỏi trong lịch sử và chỉ trả về JSON hợp lệ."
                ),
            ),
        ]
        repaired_content = await self._call("tutor", lambda: self._chat(repair_prompt))
        repaired_reply = parse_tutor_reply(repaired_content)
        if not tutor_reply_ends_with_question(repaired_reply.message):
            raise AiInvalidResponseError(
                "AI Tutor response did not end with a follow-up question after repair"
            )
        return repaired_reply

    async def _evaluate(self, capability: str, prompt: list[TutorMessage]) -> EvaluationResult:
        content = await self._call(capability, lambda: self._chat(prompt))
        return parse_evaluation_result(content)

    async def _call(self, capability: str, operation: Callable[[], Awaitable[T]]) -> T:
        policy = self._config.retry_policy(timeout_seconds=self._config.timeout_for(capability))
        return await policy.call(operation)
