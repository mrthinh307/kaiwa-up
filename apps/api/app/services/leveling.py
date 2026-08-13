"""Deterministic level progression without database reference rows."""

from math import isqrt


def minimum_exp_for_level(level: int) -> int:
    """Return cumulative EXP required for a one-based level."""
    if level < 1:
        raise ValueError("level must be at least 1")
    return 25 * level * (level - 1)


def level_for_total_exp(total_exp: int) -> int:
    """Return the highest level reached by a non-negative cumulative EXP value."""
    if total_exp < 0:
        raise ValueError("total_exp must be non-negative")

    # Invert 25 * level * (level - 1) <= total_exp using integer arithmetic.
    return (1 + isqrt(1 + 4 * (total_exp // 25))) // 2


def exp_to_reach_next_level(current_level: int) -> int:
    """Return the EXP cost from current_level to current_level + 1."""
    if current_level < 1:
        raise ValueError("current_level must be at least 1")
    return 50 * current_level
