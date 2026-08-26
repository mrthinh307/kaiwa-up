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
    is_segment_mode: bool = False,
) -> list[TutorMessage]:
    """Xây dựng prompt đánh giá bài shadowing dựa trên bản ghi của người học."""
    mode_context = (
        (
            "Bản ghi này tương ứng 1-1 với phân đoạn cụ thể đang luyện tập. "
            "Hãy đối chiếu 1-1 chính xác theo phân đoạn này, không đánh giá dựa trên "
            "các phần ngoài phân đoạn."
        )
        if is_segment_mode
        else "Bản ghi này tương ứng với toàn bộ bài luyện nói liên tục (Continuous Mode)."
    )
    return [
        TutorMessage(
            role="system",
            content=f"{EVALUATOR_PERSONA} {build_json_instruction(EVALUATION_JSON_SCHEMA)}",
        ),
        TutorMessage(
            role="user",
            content=(
                f"{mode_context}\n"
                f"Bản ghi chuẩn (tham chiếu): {reference_transcript}\n"
                f"Bản ghi của người học: {learner_transcript}\n"
                "Quy tắc chấm điểm và nhận xét:\n"
                "1. Bỏ qua hoàn toàn các dấu câu (dấu chấm, dấu phẩy, dấu hỏi, dấu than, "
                "dấu ngoặc,...) khi so sánh và đánh giá. Tuyệt đối không coi việc thiếu "
                "hoặc khác biệt dấu câu là lỗi và không đưa dấu câu vào feedback hoặc "
                "corrections.\n"
                "2. Chấm điểm 0-100 theo mức độ tương đồng từ ngữ và ngữ âm giữa bản ghi "
                "của người học và bản chuẩn.\n"
                "3. Đặt is_acceptable là true khi người học nói gần giống bản chuẩn.\n"
                "4. Trong feedback: nhận xét tổng quan về phát âm/từ ngữ/chuyển lời "
                "(âm điệu, ngắt nghỉ, tốc độ) và đưa tối đa 3 gợi ý cải thiện súc tích."
            ),
        ),
    ]
