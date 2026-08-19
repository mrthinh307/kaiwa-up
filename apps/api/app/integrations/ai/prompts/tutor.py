"""Builder prompt gia sư AI."""

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
    """Thêm system prompt vào đầu cuộc hội thoại với gia sư."""
    return [
        TutorMessage(
            role="system",
            content=(
                f"{TUTOR_PERSONA} Bạn đang kèm người học trình độ {difficulty} "
                f"luyện tập chủ đề '{topic}'. Trả lời bằng tiếng Việt, nhắc lại nhiều "
                f"lần những điểm khó, và kết thúc bằng một câu hỏi tiếp theo để người học "
                f"luyện tiếp. {build_json_instruction(TUTOR_JSON_SCHEMA)}"
            ),
        ),
        *messages,
    ]
