"""Deterministic fake AI Gateway for local development and tests."""

from app.integrations.ai.base import TutorMessage
from app.integrations.ai.contracts import (
    EvaluationResult,
    TranscriptionResult,
    TranscriptionSegment,
    TutorReply,
)


class FakeAiGateway:
    """In-memory adapter that always succeeds with canned results."""

    async def transcribe(
        self,
        *,
        audio: bytes,
        filename: str,
        language: str,
        prompt_hint: str | None = None,
    ) -> TranscriptionResult:
        return TranscriptionResult(
            text="こんにちは、元気です。",
            language=language,
            confidence=1.0,
            segments=[
                TranscriptionSegment(
                    start_ms=0,
                    end_ms=1200,
                    text="こんにちは、元気です。",
                    confidence=1.0,
                )
            ],
        )

    async def evaluate_reflex(self, *, question: str, transcript: str) -> EvaluationResult:
        return EvaluationResult(
            score=100,
            is_acceptable=True,
            feedback="Perfect response.",
            hints=[],
        )

    async def evaluate_translation(
        self,
        *,
        source_text: str,
        reference_translation: str,
        user_translation: str,
    ) -> EvaluationResult:
        return EvaluationResult(
            score=100,
            is_acceptable=True,
            feedback="Perfect translation.",
            hints=[],
        )

    async def generate_tutor_reply(
        self,
        *,
        messages: list[TutorMessage],
        topic: str,
        difficulty: str,
    ) -> TutorReply:
        return TutorReply(
            message="こんにちは！次は何を練習しましょうか？",
            corrections=[],
            hints=[],
            follow_up_question="Bạn muốn luyện phần nào tiếp theo?",
        )
