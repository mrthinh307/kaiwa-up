from datetime import date

import pytest

from app.utils.datetime_utils import week_start_for


@pytest.mark.parametrize(
    ("day", "expected"),
    [
        (date(2026, 8, 10), date(2026, 8, 10)),  # Monday
        (date(2026, 8, 12), date(2026, 8, 10)),  # Wednesday
        (date(2026, 8, 16), date(2026, 8, 10)),  # Sunday
        (date(2026, 8, 17), date(2026, 8, 17)),  # Next Monday
        (date(2026, 1, 1), date(2025, 12, 29)),  # Across year boundary
    ],
)
def test_week_start_for(day: date, expected: date) -> None:
    assert week_start_for(day) == expected
