"""Speech-to-text prompt builder."""

from app.integrations.ai.prompts.common import (
    TRANSCRIPTION_JSON_SCHEMA,
    build_json_instruction,
)


def build_stt_instruction(*, language: str, prompt_hint: str | None = None) -> str:
    """Build the transcription instruction for a given language."""
    instruction = (
        f"Transcribe the Japanese audio to text in language {language}. "
        f"{build_json_instruction(TRANSCRIPTION_JSON_SCHEMA)}"
    )
    if prompt_hint:
        instruction += f" Context hints: {prompt_hint}"
    return instruction
