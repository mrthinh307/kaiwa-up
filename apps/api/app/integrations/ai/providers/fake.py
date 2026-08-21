"""Deterministic fake AI Gateway for local development and tests."""

import json
from collections.abc import Awaitable, Callable
from typing import TypeVar

from app.integrations.ai.base import TutorMessage
from app.integrations.ai.contracts import (
    TranscriptionResult,
    TranscriptionSegment,
    TutorAnswerHint,
    TutorNaturalExpressionTip,
    TutorReply,
    TutorTextMeaning,
)
from app.integrations.ai.providers.base import BaseAiGateway

T = TypeVar("T")


class FakeAiGateway(BaseAiGateway):
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

    async def _chat(self, messages: list[TutorMessage]) -> str:
        return json.dumps(
            {
                "score": 100,
                "is_acceptable": True,
                "feedback": "Perfect response.",
                "hints": [],
            }
        )

    async def generate_tutor_reply(
        self,
        *,
        messages: list[TutorMessage],
        topic: str,
        difficulty: str,
        scenario: str | None = None,
        explanation_language: str = "vi",
    ) -> TutorReply:
        localized_text = {
            "vi": "Xin chào! Tiếp theo chúng ta muốn luyện tập điều gì?",
            "en": "Hello! What would you like to practice next?",
            "ja": "こんにちは！次は何を練習しましょうか？",
        }.get(explanation_language, "")
        localized_hint = {
            "vi": "Tôi muốn nói về du lịch.",
            "en": "I would like to talk about travel.",
            "ja": "旅行について話したいです。",
        }.get(explanation_language, "")
        return TutorReply(
            message="こんにちは！次は何を練習しましょうか？",
            text_meaning=TutorTextMeaning(
                language=explanation_language,
                text=localized_text,
            ),
            explanation_language=explanation_language,
            corrections=[],
            natural_expression_tip=TutorNaturalExpressionTip(
                explanation={
                    "vi": "Cách hỏi tự nhiên hơn để hỏi người học muốn luyện chủ đề nào tiếp theo.",
                    "en": (
                        "A natural way to ask what topic the learner would like to practice next."
                    ),
                    "ja": "次にどの話題を練習したいかを自然に尋ねる表現です。",
                }.get(explanation_language, ""),
                example_ja="次は何を練習しましょうか？",
            ),
            answer_hints=[
                TutorAnswerHint(
                    text="旅行について話したいです。",
                    text_meaning=TutorTextMeaning(
                        language=explanation_language,
                        text=localized_hint,
                    ),
                )
            ],
        )

    async def _call(self, capability: str, operation: Callable[[], Awaitable[T]]) -> T:
        return await operation()
