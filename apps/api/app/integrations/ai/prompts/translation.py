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
                "Mục tiêu của bài tập là kiểm tra người học có hiểu ý chính của bài nói, "
                "không phải dịch sát nghĩa hay đầy đủ từng câu. Trước tiên, xác định các ý "
                "cốt lõi cần thiết để hiểu thông điệp chính từ văn bản gốc; chỉ dùng bản dịch "
                "tham khảo như một cách diễn đạt tham khảo, không coi đó là đáp án duy nhất. "
                "Chấm điểm 0-100 chủ yếu theo mức độ người học truyền tải đúng các ý cốt lõi. "
                "Đặt is_acceptable là true khi bản dịch thể hiện đúng toàn bộ hoặc phần lớn ý "
                "chính và không có lỗi làm thay đổi thông điệp chính. Cho phép diễn đạt lại, "
                "tóm tắt, dùng từ khác và bỏ các chi tiết phụ như ví dụ, từ đệm hoặc sắc thái "
                "không ảnh hưởng đến ý chính; không trừ điểm đáng kể và không đánh trượt chỉ "
                "vì các khác biệt này. Chỉ đặt is_acceptable là false khi thiếu, hiểu sai hoặc "
                "mâu thuẫn với một ý cốt lõi. Giải thích bằng tiếng Việt, liệt kê các ý chính "
                "đã truyền tải đúng trong covered_ideas, chỉ đưa ý cốt lõi còn thiếu hoặc sai "
                "vào missing_ideas, và đưa ra tối đa 3 gợi ý cải thiện cụ thể."
            ),
        ),
    ]
