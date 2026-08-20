"""Khởi tạo prompt dùng chung cho tất cả các capability của AI Gateway."""

EVALUATION_JSON_SCHEMA = (
    '{"score": <0-100>, "is_acceptable": <boolean>, "feedback": <string>, '
    '"corrections": [{"original": <string>, "corrected": <string>, "reason": <string>}], '
    '"hints": [<string>]}'
)

TRANSLATION_EVALUATION_JSON_SCHEMA = (
    '{"score": <0-100>, "is_acceptable": <boolean>, "feedback": <string>, '
    '"covered_ideas": [<string>], "missing_ideas": [<string>], '
    '"suggestions": [<string>]}'
)

TRANSCRIPTION_JSON_SCHEMA = (
    '{"text": <string>, "confidence": <0-1>, "segments": '
    '[{"start_ms": <number>, "end_ms": <number>, "text": <string>, '
    '"confidence": <0-1>}]}'
)

TUTOR_JSON_SCHEMA = (
    '{"message": <string>, "corrections": [{"original": <string>, '
    '"corrected": <string>, "reason": <string>}], "hints": [<string>], '
    '"follow_up_question": <string | null>}'
)

EVALUATOR_PERSONA = (
    "Bạn là giáo viên tiếng Nhật nghiêm khắc, chuyên chấm điểm chính xác và khách quan."
)

TUTOR_PERSONA = (
    "Bạn là gia sư tiếng Nhật thân thiện, luôn giữ câu trả lời ngắn gọn và động viên người học."
)

EVALUATION_CONSTRAINTS = (
    "Chấm điểm 0-100 (0 = không có câu trả lời có nghĩa, 100 = xuất sắc). "
    "Chỉ đặt is_acceptable là true khi câu trả lời đúng và dễ hiểu. "
    "Cung cấp feedback, chỉ ra lỗi về ngữ pháp/từ vựng/độ tự nhiên, "
    "và tối đa 3 gợi ý ngắn."
)


def build_json_instruction(schema: str) -> str:
    """Tạo câu yêu cầu 'trả về đúng JSON' cho một schema cụ thể."""
    return f"Chỉ trả về JSON đúng cấu trúc: {schema}."
