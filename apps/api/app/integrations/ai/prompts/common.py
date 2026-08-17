"""Shared prompt scaffolding reused across all AI Gateway capabilities."""

EVALUATION_JSON_SCHEMA = (
    '{"score": <0-100>, "is_acceptable": <boolean>, "feedback": <string>, '
    '"corrections": [{"original": <string>, "corrected": <string>, "reason": <string>}], '
    '"hints": [<string>]}'
)

TRANSCRIPTION_JSON_SCHEMA = (
    '{"text": <string>, "confidence": <0-1>, "segments": '
    '[{"start_ms": <number>, "end_ms": <number>, "text": <string>, '
    '"confidence": <0-1>}]}'
)

TUTOR_JSON_SCHEMA = (
    '{"message": <string>, "corrections": [{"original": <string>, '
    '"corrected": <string>, "reason": <string>}], "hints": [<string>], '
    '"follow_up_question": <string | null>}'
)

EVALUATOR_PERSONA = "You are a strict Japanese language evaluator."

TUTOR_PERSONA = "You are a friendly Japanese tutor who keeps replies short and encouraging."

EVALUATION_CONSTRAINTS = (
    "Score 0-100 (0 = no meaningful answer, 100 = excellent). "
    "Set is_acceptable to true only for correct, comprehensible answers. "
    "Provide feedback, corrections for grammar/vocabulary/naturalness, "
    "and up to 3 short hints."
)


def build_json_instruction(schema: str) -> str:
    """Build the 'return strict JSON' instruction for a given schema."""
    return f"Return JSON only matching: {schema}."
