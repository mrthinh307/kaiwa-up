from app.integrations.ai.prompts.translation import build_translation_eval_prompt


def test_translation_prompt_evaluates_main_ideas_instead_of_literal_accuracy() -> None:
    messages = build_translation_eval_prompt(
        source_text="東京駅まで行きたいです。",
        reference_translation="Tôi muốn đến ga Tokyo.",
        user_translation="Tôi đang tìm đường tới ga Tokyo.",
    )

    assert "covered_ideas" in messages[0].content
    assert "missing_ideas" in messages[0].content
    assert "suggestions" in messages[0].content
    assert "hiểu ý chính của bài nói" in messages[1].content
    assert "không phải dịch sát nghĩa hay đầy đủ từng câu" in messages[1].content
    assert "bỏ các chi tiết phụ" in messages[1].content
    assert "không đánh trượt" in messages[1].content
    assert "Chỉ đặt is_acceptable là false" in messages[1].content
