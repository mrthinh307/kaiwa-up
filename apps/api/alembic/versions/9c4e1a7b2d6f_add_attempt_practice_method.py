"""add attempt practice method

Revision ID: 9c4e1a7b2d6f
Revises: f7a8b9c0d1e2
Create Date: 2026-08-24
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "9c4e1a7b2d6f"
down_revision: str | Sequence[str] | None = "f7a8b9c0d1e2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


BACKFILL_SQL = sa.text(
    """
    WITH signals AS (
        SELECT
            attempt.id,
            attempt.user_id,
            attempt.content_id,
            attempt.attempt_number,
            attempt.started_at,
            attempt.status,
            content.content_type,
            (
                EXISTS (
                    SELECT 1
                    FROM recordings AS recording
                    WHERE recording.attempt_id = attempt.id
                      AND recording.kind = 'SHADOWING'
                )
                OR COALESCE(attempt.answer_payload, '{}'::jsonb) ? 'mode'
                OR COALESCE(attempt.answer_payload, '{}'::jsonb) ? 'continuous_recording'
                OR EXISTS (
                    SELECT 1
                    FROM jsonb_array_elements(
                        CASE
                            WHEN jsonb_typeof(attempt.answer_payload->'segments') = 'array'
                            THEN attempt.answer_payload->'segments'
                            ELSE '[]'::jsonb
                        END
                    ) AS segment
                    WHERE segment ? 'segment_id' OR segment ? 'recording_id'
                )
            ) AS has_shadowing_signal,
            EXISTS (
                SELECT 1
                FROM jsonb_array_elements(
                    CASE
                        WHEN jsonb_typeof(attempt.answer_payload->'segments') = 'array'
                        THEN attempt.answer_payload->'segments'
                        ELSE '[]'::jsonb
                    END
                ) AS segment
                WHERE segment ? 'segment_index'
                   OR segment ? 'user_answer'
                   OR segment ? 'correct_script'
                   OR segment ? 'is_correct'
            ) AS has_dictation_signal
        FROM exercise_attempts AS attempt
        JOIN learning_contents AS content ON content.id = attempt.content_id
    ),
    candidates AS (
        SELECT
            *,
            CASE
                WHEN content_type = 'REFLEX' THEN 'REFLEX'
                WHEN content_type = 'LISTENING_TRANSLATION' THEN 'LISTENING_TRANSLATION'
                WHEN content_type = 'SHADOWING_DICTATION'
                     AND has_shadowing_signal
                     AND NOT has_dictation_signal THEN 'SHADOWING'
                WHEN content_type = 'SHADOWING_DICTATION'
                     AND has_dictation_signal
                     AND NOT has_shadowing_signal THEN 'DICTATION'
                ELSE NULL
            END AS inferred_method
        FROM signals
    ),
    ranked AS (
        SELECT
            *,
            CASE
                WHEN status = 'IN_PROGRESS' AND inferred_method IS NOT NULL
                THEN row_number() OVER (
                    PARTITION BY user_id, content_id, inferred_method
                    ORDER BY attempt_number DESC, started_at DESC, id DESC
                )
                ELSE 1
            END AS active_rank
        FROM candidates
    )
    UPDATE exercise_attempts AS attempt
    SET practice_method = ranked.inferred_method
    FROM ranked
    WHERE attempt.id = ranked.id
      AND ranked.inferred_method IS NOT NULL
      AND (ranked.status <> 'IN_PROGRESS' OR ranked.active_rank = 1)
    """
)


def upgrade() -> None:
    op.add_column(
        "exercise_attempts",
        sa.Column("practice_method", sa.String(length=32), nullable=True),
    )
    op.create_check_constraint(
        "exercise_attempts_practice_method",
        "exercise_attempts",
        "practice_method IS NULL OR practice_method IN "
        "('SHADOWING', 'DICTATION', 'REFLEX', 'LISTENING_TRANSLATION')",
    )
    op.execute(BACKFILL_SQL)
    op.create_index(
        "uq_exercise_attempts_in_progress_practice_method",
        "exercise_attempts",
        ["user_id", "content_id", "practice_method"],
        unique=True,
        postgresql_where=sa.text("status = 'IN_PROGRESS' AND practice_method IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index(
        "uq_exercise_attempts_in_progress_practice_method",
        table_name="exercise_attempts",
    )
    op.drop_constraint(
        "exercise_attempts_practice_method",
        "exercise_attempts",
        type_="check",
    )
    op.drop_column("exercise_attempts", "practice_method")
