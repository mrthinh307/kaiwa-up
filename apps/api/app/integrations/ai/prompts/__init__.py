"""Mẫu prompt cho AI Gateway, tách theo từng chức năng."""

from app.integrations.ai.prompts.common import (
    EVALUATION_CONSTRAINTS,
    EVALUATION_JSON_SCHEMA,
    EVALUATOR_PERSONA,
    TRANSCRIPTION_JSON_SCHEMA,
    TUTOR_JSON_SCHEMA,
    TUTOR_PERSONA,
    build_json_instruction,
)
from app.integrations.ai.prompts.reflex import build_reflex_eval_prompt
from app.integrations.ai.prompts.shadowing import build_shadowing_eval_prompt
from app.integrations.ai.prompts.speech2text import build_stt_instruction
from app.integrations.ai.prompts.translation import build_translation_eval_prompt
from app.integrations.ai.prompts.tutor import build_tutor_messages

__all__ = [
    "EVALUATION_CONSTRAINTS",
    "EVALUATION_JSON_SCHEMA",
    "EVALUATOR_PERSONA",
    "TRANSCRIPTION_JSON_SCHEMA",
    "TUTOR_JSON_SCHEMA",
    "TUTOR_PERSONA",
    "build_json_instruction",
    "build_reflex_eval_prompt",
    "build_shadowing_eval_prompt",
    "build_stt_instruction",
    "build_translation_eval_prompt",
    "build_tutor_messages",
]
