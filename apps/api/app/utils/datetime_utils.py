from datetime import UTC, date, datetime, timedelta


def utc_now() -> datetime:
    return datetime.now(UTC)


def week_start_for(day: date) -> date:
    """Trả về ngày Thứ Hai của tuần chứa `day`."""
    return day - timedelta(days=day.weekday())
