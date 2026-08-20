from app.integrations.ai.prompts.translation import build_translation_eval_prompt


def test_translation_prompt_requests_semantic_feedback_contract() -> None:
    messages = build_translation_eval_prompt(
        source_text="東京駅まで行きたいです。",
        reference_translation="Tôi muốn đến ga Tokyo.",
        user_translation="Tôi đang tìm đường tới ga Tokyo.",
    )

    assert "covered_ideas" in messages[0].content
    assert "missing_ideas" in messages[0].content
    assert "suggestions" in messages[0].content
    assert "Không yêu cầu khớp từng từ" in messages[1].content
