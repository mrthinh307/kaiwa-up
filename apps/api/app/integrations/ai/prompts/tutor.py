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
    scenario: str | None = None,
) -> list[TutorMessage]:
    """Thêm system prompt vào đầu cuộc hội thoại với gia sư."""
    return [
        TutorMessage(
            role="system",
            content=(
                f"{TUTOR_PERSONA} Bạn đang kèm người học trình độ {difficulty} "
                f"luyện tập chủ đề '{topic}' trong bối cảnh '{scenario or 'hội thoại tự do'}'. "
                "Hãy viết nội dung hội thoại và câu hỏi tiếp theo bằng tiếng Nhật phù hợp "
                "trình độ. "
                "Sửa lỗi và giải thích bằng tiếng Việt. Cung cấp tối đa 3 gợi ý trả lời ngắn, "
                "mỗi gợi ý gồm câu tiếng Nhật và nghĩa tiếng Việt. "
                f"{build_json_instruction(TUTOR_JSON_SCHEMA)}"
            ),
        ),
        *messages,
    ]
