from decimal import Decimal

from app.services.shadowing import calculate_shadowing_exp, calculate_shadowing_score


def test_calculate_shadowing_score_cases():
    assert calculate_shadowing_score(completed_count=0, total_count=5) == Decimal("0.00")
    assert calculate_shadowing_score(completed_count=1, total_count=3) == Decimal("33.33")
    assert calculate_shadowing_score(completed_count=2, total_count=3) == Decimal("66.67")
    assert calculate_shadowing_score(completed_count=3, total_count=3) == Decimal("100.00")
    assert calculate_shadowing_score(completed_count=5, total_count=0) == Decimal("0.00")


def test_calculate_shadowing_exp_base_50_tiers():
    base_exp = 50
    total = 100

    # 0%: 0 EXP
    assert calculate_shadowing_exp(base_exp=base_exp, completed_count=0, total_count=total) == 0

    # > 0% and < 5%: 5 EXP
    assert calculate_shadowing_exp(base_exp=base_exp, completed_count=1, total_count=total) == 5
    assert calculate_shadowing_exp(base_exp=base_exp, completed_count=4, total_count=total) == 5

    # >= 5% and < 25%: 15 EXP
    assert calculate_shadowing_exp(base_exp=base_exp, completed_count=5, total_count=total) == 15
    assert calculate_shadowing_exp(base_exp=base_exp, completed_count=24, total_count=total) == 15

    # >= 25% and < 50%: 25 EXP
    assert calculate_shadowing_exp(base_exp=base_exp, completed_count=25, total_count=total) == 25
    assert calculate_shadowing_exp(base_exp=base_exp, completed_count=49, total_count=total) == 25

    # >= 50% and < 75%: 40 EXP
    assert calculate_shadowing_exp(base_exp=base_exp, completed_count=50, total_count=total) == 40
    assert calculate_shadowing_exp(base_exp=base_exp, completed_count=74, total_count=total) == 40

    # >= 75%: 50 EXP
    assert calculate_shadowing_exp(base_exp=base_exp, completed_count=75, total_count=total) == 50
    assert calculate_shadowing_exp(base_exp=base_exp, completed_count=100, total_count=total) == 50


def test_calculate_shadowing_exp_scaled_base_exp():
    base_exp = 70
    total = 100

    assert calculate_shadowing_exp(base_exp=base_exp, completed_count=0, total_count=total) == 0
    assert calculate_shadowing_exp(base_exp=base_exp, completed_count=3, total_count=total) == 7
    assert calculate_shadowing_exp(base_exp=base_exp, completed_count=10, total_count=total) == 21
    assert calculate_shadowing_exp(base_exp=base_exp, completed_count=30, total_count=total) == 35
    assert calculate_shadowing_exp(base_exp=base_exp, completed_count=60, total_count=total) == 56
    assert calculate_shadowing_exp(base_exp=base_exp, completed_count=80, total_count=total) == 70


def test_strip_punctuation():
    from app.services.shadowing import strip_punctuation

    assert strip_punctuation("") == ""
    assert strip_punctuation("こんにちは、元気ですか？") == "こんにちは元気ですか"
    assert strip_punctuation("「はい、わかりました！」……〜（テスト）") == "はいわかりましたテスト"
    assert strip_punctuation("Hello, world! How are you?") == "HelloworldHowareyou"


def test_tokenize_japanese_text():
    from app.services.shadowing import tokenize_japanese_text

    tokens = tokenize_japanese_text("こんにちは、今日はいい天気ですね。")
    assert len(tokens) > 0
    assert all("orig" in t and "hira" in t for t in tokens)
    orig_words = [t["orig"] for t in tokens]
    assert "こんにちは" in orig_words
    assert "天気" in orig_words or "いい天気ですね" in orig_words


def test_compute_word_diffs_greeting_segment_exact_match():
    from app.schemas.shadowing import ShadowingWordStatus
    from app.services.shadowing import compute_word_diffs

    ref = "こんにちは。"
    user = "こんにちは"
    diffs = compute_word_diffs(ref, user)
    assert len(diffs) >= 1
    assert all(w.status == ShadowingWordStatus.CORRECT for w in diffs)


def test_compute_word_diffs_ignores_punctuation():
    from app.schemas.shadowing import ShadowingWordStatus
    from app.services.shadowing import compute_word_diffs

    ref = "「はい、わかりました！」"
    user = "はいわかりました"
    diffs = compute_word_diffs(ref, user)
    assert len(diffs) >= 1
    assert all(w.status == ShadowingWordStatus.CORRECT for w in diffs)


def test_compute_word_diffs_missing_word():
    from app.schemas.shadowing import ShadowingWordStatus
    from app.services.shadowing import compute_word_diffs

    ref = "明日は天気がいいです"
    user = "明日はいいです"
    diffs = compute_word_diffs(ref, user)
    assert any(w.status == ShadowingWordStatus.MISSING for w in diffs)
    assert any(w.status == ShadowingWordStatus.CORRECT for w in diffs)


def test_compute_word_diffs_incorrect_word():
    from app.schemas.shadowing import ShadowingWordStatus
    from app.services.shadowing import compute_word_diffs

    ref = "明日は天気がいいです"
    user = "明日は雨がいいです"
    diffs = compute_word_diffs(ref, user)
    assert any(w.status == ShadowingWordStatus.INCORRECT for w in diffs)
    assert any(w.status == ShadowingWordStatus.CORRECT for w in diffs)


def test_compute_word_diffs_empty_speech():
    from app.schemas.shadowing import ShadowingWordStatus
    from app.services.shadowing import compute_word_diffs

    ref = "こんにちは、元気ですか。"
    user = ""
    diffs = compute_word_diffs(ref, user)
    assert len(diffs) > 0
    assert all(w.status == ShadowingWordStatus.MISSING for w in diffs)
