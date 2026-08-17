"""Translation evaluation prompt builder."""

from app.integrations.ai.base import TutorMessage
from app.integrations.ai.prompts.common import (
    EVALUATION_JSON_SCHEMA,
    EVALUATOR_PERSONA,
    build_json_instruction,
)


def build_translation_eval_prompt(
    *,
    source_text: str,
    reference_translation: str,
    user_translation: str,
) -> list[TutorMessage]:
    """Build the evaluation prompt for a translation exercise."""
    return [
        TutorMessage(
            role="system",
            content=f"{EVALUATOR_PERSONA} {build_json_instruction(EVALUATION_JSON_SCHEMA)}",
        ),
        TutorMessage(
            role="user",
            content=(
                f"Source text (Japanese): {source_text}\n"
                f"Reference translation: {reference_translation}\n"
                f"Learner translation: {user_translation}\n"
                "Score how close the learner translation is to the reference meaning "
                "(0-100). Set is_acceptable for translations that preserve the meaning. "
                "Provide feedback, corrections and up to 3 hints."
            ),
        ),
    ]
