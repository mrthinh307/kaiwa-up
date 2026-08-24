import pytest

from app.core import settings
from app.core.scheduler import configure_scheduler


def test_configure_scheduler_skips_job_when_disabled(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "leaderboard_rebuild_enabled", False)

    assert configure_scheduler() is False
