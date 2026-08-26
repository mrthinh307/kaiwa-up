"""Abstract AI Gateway base sharing provider-agnostic LLM capability implementations."""

import re
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

_JAPANESE_SCRIPT = re.compile(r"[\u3040-\u30ff\u3400-\u9fff]")


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
        is_segment_mode: bool = False,
    ) -> EvaluationResult:
        prompt = build_shadowing_eval_prompt(
            reference_transcript=reference_transcript,
            learner_transcript=user_transcript,
            is_segment_mode=is_segment_mode,
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
        explanation_language: str = "vi",
    ) -> TutorReply:
        prompt = build_tutor_messages(
            messages=messages,
            topic=topic,
            difficulty=difficulty,
            scenario=scenario,
            explanation_language=explanation_language,
        )
        content = await self._call("tutor", lambda: self._chat(prompt))
        requires_follow_up = any(message.role == "user" for message in messages)
        try:
            reply = parse_tutor_reply(content)
        except AiInvalidResponseError as exc:
            return await self._repair_tutor_reply(
                prompt=prompt,
                reason=f"JSON không khớp TutorReply schema: {exc}",
                explanation_language=explanation_language,
                requires_follow_up=requires_follow_up,
            )

        reason = self._tutor_reply_validation_reason(
            reply,
            explanation_language=explanation_language,
            requires_follow_up=requires_follow_up,
        )
        if reason is None:
            return reply
        return await self._repair_tutor_reply(
            prompt=prompt,
            reason=reason,
            explanation_language=explanation_language,
            requires_follow_up=requires_follow_up,
        )

    async def _repair_tutor_reply(
        self,
        *,
        prompt: list[TutorMessage],
        reason: str,
        explanation_language: str,
        requires_follow_up: bool,
    ) -> TutorReply:
        repair_prompt = [
            *prompt,
            TutorMessage(
                role="user",
                content=(
                    "Response JSON vừa rồi không hợp lệ vì: "
                    f"{reason}. "
                    f"explanation_language bắt buộc là {explanation_language}. "
                    "Các field explanation phải dùng đúng ngôn ngữ đó; "
                    "giữ nguyên nội dung phù hợp, chỉ sửa các field sai, bổ sung đúng một câu hỏi "
                    "tiếng Nhật mới ở cuối nếu cần, "
                    "không lặp câu hỏi trong lịch sử và chỉ trả về JSON khớp chính xác schema."
                ),
            ),
        ]
        repaired_content = await self._call("tutor", lambda: self._chat(repair_prompt))
        try:
            repaired_reply = parse_tutor_reply(repaired_content)
        except AiInvalidResponseError as exc:
            raise AiInvalidResponseError(
                "AI Tutor response remained invalid after schema repair"
            ) from exc

        validation_reason = self._tutor_reply_validation_reason(
            repaired_reply,
            explanation_language=explanation_language,
            requires_follow_up=requires_follow_up,
        )
        if validation_reason is not None:
            raise AiInvalidResponseError(
                "AI Tutor response failed validation after repair: " + validation_reason
            )
        return repaired_reply

    @staticmethod
    def _tutor_reply_validation_reason(
        reply: TutorReply,
        *,
        explanation_language: str,
        requires_follow_up: bool,
    ) -> str | None:
        reasons: list[str] = []
        if reply.explanation_language != explanation_language:
            reasons.append("explanation_language không khớp với ngôn ngữ được yêu cầu")
        if reply.text_meaning.language != explanation_language:
            reasons.append("text_meaning.language không khớp với ngôn ngữ được yêu cầu")
        if any(hint.text_meaning.language != explanation_language for hint in reply.answer_hints):
            reasons.append(
                "answer_hints.text_meaning.language không khớp với ngôn ngữ được yêu cầu"
            )
        if _has_wrong_japanese_explanation(reply, explanation_language):
            reasons.append(
                "nội dung explanation đang dùng tiếng Nhật thay vì ngôn ngữ được yêu cầu"
            )
        if requires_follow_up and not tutor_reply_ends_with_question(reply.message):
            reasons.append("message không kết thúc bằng đúng một câu hỏi tiếng Nhật")
        return "; ".join(reasons) or None

    async def _evaluate(self, capability: str, prompt: list[TutorMessage]) -> EvaluationResult:
        content = await self._call(capability, lambda: self._chat(prompt))
        return parse_evaluation_result(content)

    async def _call(self, capability: str, operation: Callable[[], Awaitable[T]]) -> T:
        policy = self._config.retry_policy(timeout_seconds=self._config.timeout_for(capability))
        return await policy.call(operation)


def _has_wrong_japanese_explanation(reply: TutorReply, explanation_language: str) -> bool:
    """Detect localized content that is predominantly Japanese for another language.

    This is intentionally a conservative guardrail: Japanese examples may appear in a localized
    explanation, so a response is rejected only when Japanese characters make up a substantial part
    of the explanation. The provider repair prompt remains the source of the final wording.
    """
    explanations = [reply.text_meaning.text]
    explanations.extend(hint.text_meaning.text for hint in reply.answer_hints)
    explanations.extend(correction.explanation for correction in reply.corrections)
    if reply.natural_expression_tip is not None:
        explanations.append(reply.natural_expression_tip.explanation)

    for explanation in explanations:
        letters = [character for character in explanation if character.isalpha()]
        japanese_letters = [character for character in letters if _JAPANESE_SCRIPT.match(character)]
        if explanation_language == "ja":
            if len(japanese_letters) < 3:
                return True
        elif len(japanese_letters) >= 3 and len(japanese_letters) / len(letters) >= 0.25:
            return True
    return False
