"""Reflex evaluation prompt builder."""

from app.integrations.ai.base import TutorMessage
from app.integrations.ai.prompts.common import (
    EVALUATION_CONSTRAINTS,
    EVALUATION_JSON_SCHEMA,
    EVALUATOR_PERSONA,
    build_json_instruction,
)


def build_reflex_eval_prompt(*, question: str, transcript: str) -> list[TutorMessage]:
    """Build the evaluation prompt for a Reflex speaking response."""
    return [
        TutorMessage(
            role="system",
            content=f"{EVALUATOR_PERSONA} {build_json_instruction(EVALUATION_JSON_SCHEMA)}",
        ),
        TutorMessage(
            role="user",
            content=(
                f"Question: {question}\n"
                f"Learner response transcript: {transcript}\n"
                f"{EVALUATION_CONSTRAINTS}"
            ),
        ),
    ]
