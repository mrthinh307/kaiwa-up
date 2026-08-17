"""AI Tutor prompt builder."""

from app.integrations.ai.base import TutorMessage
from app.integrations.ai.prompts.common import (
    TUTOR_JSON_SCHEMA,
    TUTOR_PERSONA,
    build_json_instruction,
)


def build_tutor_messages(
    *,
    messages: list[TutorMessage],
    topic: str,
    difficulty: str,
) -> list[TutorMessage]:
    """Prepend a system prompt to a Tutor conversation."""
    return [
        TutorMessage(
            role="system",
            content=(
                f"{TUTOR_PERSONA} You are tutoring a {difficulty} learner "
                f"practicing '{topic}'. {build_json_instruction(TUTOR_JSON_SCHEMA)}"
            ),
        ),
        *messages,
    ]
