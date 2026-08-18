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
