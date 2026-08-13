from collections.abc import Callable

import pytest

from app.services.leveling import (
    exp_to_reach_next_level,
    level_for_total_exp,
    minimum_exp_for_level,
)


@pytest.mark.parametrize(
    ("level", "minimum_exp"),
    [(1, 0), (2, 50), (3, 150), (4, 300), (10, 2250), (11, 2750)],
)
def test_minimum_exp_for_level(level: int, minimum_exp: int) -> None:
    assert minimum_exp_for_level(level) == minimum_exp


@pytest.mark.parametrize(
    ("total_exp", "level"),
    [(0, 1), (49, 1), (50, 2), (149, 2), (150, 3), (2249, 9), (2250, 10), (2750, 11)],
)
def test_level_for_total_exp_at_boundaries(total_exp: int, level: int) -> None:
    assert level_for_total_exp(total_exp) == level


def test_level_progression_has_no_defined_maximum() -> None:
    level = 1000

    assert level_for_total_exp(minimum_exp_for_level(level)) == level
    assert exp_to_reach_next_level(level) == 50 * level


@pytest.mark.parametrize(
    ("function", "value"),
    [(minimum_exp_for_level, 0), (level_for_total_exp, -1), (exp_to_reach_next_level, 0)],
)
def test_level_functions_reject_invalid_values(function: Callable[[int], int], value: int) -> None:
    with pytest.raises(ValueError):
        function(value)
