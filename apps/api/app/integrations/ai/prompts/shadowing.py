"""Builder prompt đánh giá bài shadowing."""

from app.integrations.ai.base import TutorMessage
from app.integrations.ai.prompts.common import (
    EVALUATION_JSON_SCHEMA,
    EVALUATOR_PERSONA,
    build_json_instruction,
)


def build_shadowing_eval_prompt(
    *,
    reference_transcript: str,
    learner_transcript: str,
) -> list[TutorMessage]:
    """Xây dựng prompt đánh giá bài shadowing dựa trên bản ghi của người học."""
    return [
        TutorMessage(
            role="system",
            content=f"{EVALUATOR_PERSONA} {build_json_instruction(EVALUATION_JSON_SCHEMA)}",
        ),
        TutorMessage(
            role="user",
            content=(
                f"Bản ghi chuẩn (tham chiếu): {reference_transcript}\n"
                f"Bản ghi của người học: {learner_transcript}\n"
                "Chấm điểm 0-100 theo mức độ tương đồng giữa bản ghi của người học và bản chuẩn. "
                "Đặt is_acceptable là true khi người học nói gần giống bản chuẩn. "
                "Trong feedback: nhận xét tổng quan về phát âm/chuyển lời (âm điệu, ngắt nghỉ, "
                "tốc độ) và đưa tối đa 3 gợi ý cải thiện."
            ),
        ),
    ]
