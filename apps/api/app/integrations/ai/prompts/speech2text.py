"""Builder prompt chuyển giọng nói thành văn bản (STT)."""

from app.integrations.ai.prompts.common import (
    TRANSCRIPTION_JSON_SCHEMA,
    build_json_instruction,
)


def build_stt_instruction(*, language: str, prompt_hint: str | None = None) -> str:
    """Xây dựng hướng dẫn phiên âm audio tiếng Nhật sang văn bản."""
    instruction = (
        f"Chuyển âm thanh tiếng Nhật sang văn bản bằng ngôn ngữ {language}. "
        f"{build_json_instruction(TRANSCRIPTION_JSON_SCHEMA)}"
    )
    if prompt_hint:
        instruction += f" Gợi ý ngữ cảnh: {prompt_hint}"
    return instruction
