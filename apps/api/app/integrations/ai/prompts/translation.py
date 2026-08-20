"""Builder prompt đánh giá bài dịch."""

from app.integrations.ai.base import TutorMessage
from app.integrations.ai.prompts.common import (
    EVALUATOR_PERSONA,
    TRANSLATION_EVALUATION_JSON_SCHEMA,
    build_json_instruction,
)


def build_translation_eval_prompt(
    *,
    source_text: str,
    reference_translation: str,
    user_translation: str,
) -> list[TutorMessage]:
    """Xây dựng prompt đánh giá bài dịch của người học."""
    return [
        TutorMessage(
            role="system",
            content=(
                f"{EVALUATOR_PERSONA} {build_json_instruction(TRANSLATION_EVALUATION_JSON_SCHEMA)}"
            ),
        ),
        TutorMessage(
            role="user",
            content=(
                f"Văn bản gốc (tiếng Nhật): {source_text}\n"
                f"Bản dịch tham khảo: {reference_translation}\n"
                f"Bản dịch của người học: {user_translation}\n"
                "Chấm điểm 0-100 theo phần trăm tương đương nghĩa giữa bản dịch của "
                "người học và bản tham khảo. Đặt is_acceptable là true khi bản dịch giữ "
                "được ý nghĩa gốc. Không yêu cầu khớp từng từ. Giải thích bằng tiếng Việt, "
                "liệt kê các ý đã truyền tải đúng, các ý còn thiếu hoặc sai, và tối đa 3 "
                "gợi ý cải thiện cụ thể."
            ),
        ),
    ]
