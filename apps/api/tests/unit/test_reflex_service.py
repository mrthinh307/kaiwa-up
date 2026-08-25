from app.services.reflex import review_interval_days


def test_review_interval_days_uses_mvp_score_bands() -> None:
    assert review_interval_days(0) == 1
    assert review_interval_days(49) == 1
    assert review_interval_days(50) == 3
    assert review_interval_days(69) == 3
    assert review_interval_days(70) == 5
    assert review_interval_days(84) == 5
    assert review_interval_days(85) == 7
    assert review_interval_days(100) == 7
