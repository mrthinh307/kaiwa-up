from datetime import timedelta

import pytest

from app.core import settings
from app.core.scheduler import configure_scheduler, scheduler


def test_configure_scheduler_skips_job_when_disabled(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "leaderboard_rebuild_enabled", False)

    assert configure_scheduler() is False


def test_configure_scheduler_uses_configured_minute_interval(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "leaderboard_rebuild_enabled", True)
    monkeypatch.setattr(settings, "leaderboard_rebuild_interval_minutes", 10)

    try:
        assert configure_scheduler() is True

        job = scheduler.get_job("rebuild_weekly_leaderboard")
        assert job is not None
        assert job.trigger.interval == timedelta(minutes=10)
    finally:
        scheduler.remove_job("rebuild_weekly_leaderboard")
