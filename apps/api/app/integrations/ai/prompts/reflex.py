"""Builder prompt đánh giá Reflex."""

from app.integrations.ai.base import TutorMessage
from app.integrations.ai.prompts.common import (
    EVALUATION_JSON_SCHEMA,
    EVALUATOR_PERSONA,
    build_json_instruction,
)


def build_reflex_eval_prompt(*, question: str, transcript: str) -> list[TutorMessage]:
    """Xây dựng prompt đánh giá phản xạ nói của người học."""
    return [
        TutorMessage(
            role="system",
            content=f"{EVALUATOR_PERSONA} {build_json_instruction(EVALUATION_JSON_SCHEMA)}",
        ),
        TutorMessage(
            role="user",
            content=(
                f"Câu hỏi: {question}\n"
                f"Bản ghi câu trả lời của người học: {transcript}\n"
                "Chấm điểm 0-100 dựa trên mức độ phù hợp với câu hỏi/tình huống và "
                "tính tự nhiên của câu trả lời. Đặt is_acceptable là true khi câu trả lời "
                "đúng trọng tâm và dễ hiểu. Cung cấp feedback, chỉ ra lỗi từ vựng hoặc "
                "ngữ pháp, và tối đa 3 gợi ý ngắn."
            ),
        ),
    ]
