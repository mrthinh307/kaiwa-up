"""harden database integrity

Revision ID: 6d4f92a1c8e7
Revises: 51f2a49d6b30
Create Date: 2026-08-13
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "6d4f92a1c8e7"
down_revision: str | Sequence[str] | None = "51f2a49d6b30"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        sa.text("UPDATE exercise_attempts SET status = 'COMPLETED' WHERE status = 'SUBMITTED'")
    )
    op.execute(
        sa.text(
            """
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM tutor_sessions
                    WHERE difficulty IS NOT NULL AND difficulty NOT BETWEEN 1 AND 5
                ) THEN
                    RAISE EXCEPTION 'tutor_sessions.difficulty contains values outside 1-5';
                END IF;
            END
            $$
            """
        )
    )
    op.alter_column(
        "tutor_sessions",
        "difficulty",
        existing_type=sa.SmallInteger(),
        type_=sa.Enum("N5", "N4", "N3", "N2", "N1", name="tutor_jlpt_level", native_enum=False),
        existing_nullable=True,
        postgresql_using="""
            CASE difficulty
                WHEN 1 THEN 'N5'
                WHEN 2 THEN 'N4'
                WHEN 3 THEN 'N3'
                WHEN 4 THEN 'N2'
                WHEN 5 THEN 'N1'
            END
        """,
    )

    op.drop_constraint("xp_transactions_attempt_id_fkey", "xp_transactions", type_="foreignkey")
    op.create_foreign_key(
        "xp_transactions_attempt_id_fkey",
        "xp_transactions",
        "exercise_attempts",
        ["attempt_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.drop_index("ix_learning_contents_published_catalog", table_name="learning_contents")
    op.create_index(
        "ix_learning_contents_published_catalog",
        "learning_contents",
        ["content_type", "difficulty", sa.literal_column("published_at DESC")],
        unique=False,
        postgresql_where=sa.text("status = 'PUBLISHED'"),
    )

    constraints = (
        ("users", "user_role", "role IN ('USER', 'ADMIN')"),
        ("user_progress", "user_progress_total_exp_nonnegative", "total_exp >= 0"),
        ("user_progress", "user_progress_current_level_positive", "current_level >= 1"),
        (
            "user_progress",
            "user_progress_completed_count_nonnegative",
            "completed_content_count >= 0",
        ),
        (
            "learning_contents",
            "content_type",
            "content_type IN ('SHADOWING_DICTATION', 'REFLEX', 'LISTENING_TRANSLATION')",
        ),
        ("learning_contents", "content_status", "status IN ('DRAFT', 'PUBLISHED')"),
        (
            "learning_contents",
            "learning_contents_audio_duration_nonnegative",
            "audio_duration_ms IS NULL OR audio_duration_ms >= 0",
        ),
        ("learning_contents", "learning_contents_base_exp_positive", "base_exp > 0"),
        (
            "reflex_exercises",
            "reflex_exercises_response_limit_positive",
            "response_start_limit_seconds > 0",
        ),
        ("exercise_attempts", "exercise_attempts_number_positive", "attempt_number >= 1"),
        (
            "exercise_attempts",
            "attempt_status",
            "status IN ('IN_PROGRESS', 'COMPLETED')",
        ),
        (
            "exercise_attempts",
            "exercise_attempts_score_range",
            "score IS NULL OR score BETWEEN 0 AND 100",
        ),
        (
            "exercise_attempts",
            "exercise_attempts_correct_count_nonnegative",
            "correct_count IS NULL OR correct_count >= 0",
        ),
        (
            "exercise_attempts",
            "exercise_attempts_total_count_nonnegative",
            "total_count IS NULL OR total_count >= 0",
        ),
        (
            "exercise_attempts",
            "exercise_attempts_correct_not_above_total",
            "correct_count IS NULL OR total_count IS NULL OR correct_count <= total_count",
        ),
        (
            "recordings",
            "recording_kind",
            "kind IN ('SHADOWING', 'REFLEX', 'TUTOR_VOICE')",
        ),
        (
            "recordings",
            "recordings_duration_nonnegative",
            "duration_ms IS NULL OR duration_ms >= 0",
        ),
        (
            "ai_evaluations",
            "ai_evaluation_status",
            "status IN ('PENDING', 'COMPLETED', 'FAILED')",
        ),
        (
            "ai_evaluations",
            "ai_evaluations_similarity_score_range",
            "similarity_score IS NULL OR similarity_score BETWEEN 0 AND 100",
        ),
        (
            "ai_evaluations",
            "ai_evaluations_fluency_score_range",
            "fluency_score IS NULL OR fluency_score BETWEEN 0 AND 100",
        ),
        (
            "review_schedules",
            "review_schedules_interval_nonnegative",
            "interval_days >= 0",
        ),
        (
            "review_schedules",
            "review_schedules_ease_factor_positive",
            "ease_factor > 0",
        ),
        (
            "review_schedules",
            "review_schedules_repetitions_nonnegative",
            "repetitions >= 0",
        ),
        ("xp_transactions", "xp_transactions_amount_positive", "amount > 0"),
        (
            "weekly_leaderboard_entries",
            "weekly_leaderboard_exp_nonnegative",
            "weekly_exp >= 0",
        ),
        (
            "weekly_leaderboard_entries",
            "weekly_leaderboard_rank_positive",
            "rank >= 1",
        ),
        (
            "tutor_sessions",
            "tutor_session_jlpt_level",
            "difficulty IS NULL OR difficulty IN ('N5', 'N4', 'N3', 'N2', 'N1')",
        ),
        (
            "tutor_sessions",
            "tutor_session_status",
            "status IN ('active', 'completed')",
        ),
        ("tutor_messages", "tutor_sender", "sender IN ('USER', 'AI')"),
        (
            "tutor_messages",
            "tutor_messages_sequence_positive",
            "sequence_number >= 1",
        ),
    )
    for table_name, constraint_name, condition in constraints:
        op.create_check_constraint(constraint_name, table_name, condition)


def downgrade() -> None:
    constraints = (
        ("tutor_messages", "tutor_messages_sequence_positive"),
        ("tutor_messages", "tutor_sender"),
        ("tutor_sessions", "tutor_session_status"),
        ("tutor_sessions", "tutor_session_jlpt_level"),
        ("weekly_leaderboard_entries", "weekly_leaderboard_rank_positive"),
        ("weekly_leaderboard_entries", "weekly_leaderboard_exp_nonnegative"),
        ("xp_transactions", "xp_transactions_amount_positive"),
        ("review_schedules", "review_schedules_repetitions_nonnegative"),
        ("review_schedules", "review_schedules_ease_factor_positive"),
        ("review_schedules", "review_schedules_interval_nonnegative"),
        ("ai_evaluations", "ai_evaluations_fluency_score_range"),
        ("ai_evaluations", "ai_evaluations_similarity_score_range"),
        ("ai_evaluations", "ai_evaluation_status"),
        ("recordings", "recordings_duration_nonnegative"),
        ("recordings", "recording_kind"),
        ("exercise_attempts", "exercise_attempts_correct_not_above_total"),
        ("exercise_attempts", "exercise_attempts_total_count_nonnegative"),
        ("exercise_attempts", "exercise_attempts_correct_count_nonnegative"),
        ("exercise_attempts", "exercise_attempts_score_range"),
        ("exercise_attempts", "attempt_status"),
        ("exercise_attempts", "exercise_attempts_number_positive"),
        ("reflex_exercises", "reflex_exercises_response_limit_positive"),
        ("learning_contents", "learning_contents_base_exp_positive"),
        ("learning_contents", "learning_contents_audio_duration_nonnegative"),
        ("learning_contents", "content_status"),
        ("learning_contents", "content_type"),
        ("user_progress", "user_progress_completed_count_nonnegative"),
        ("user_progress", "user_progress_current_level_positive"),
        ("user_progress", "user_progress_total_exp_nonnegative"),
        ("users", "user_role"),
    )
    for table_name, constraint_name in constraints:
        op.drop_constraint(constraint_name, table_name, type_="check")

    op.drop_index("ix_learning_contents_published_catalog", table_name="learning_contents")
    op.create_index(
        "ix_learning_contents_published_catalog",
        "learning_contents",
        ["content_type", "difficulty", sa.literal_column("published_at DESC")],
        unique=False,
        postgresql_where=sa.text("status = 'published'"),
    )

    op.drop_constraint("xp_transactions_attempt_id_fkey", "xp_transactions", type_="foreignkey")
    op.create_foreign_key(
        "xp_transactions_attempt_id_fkey",
        "xp_transactions",
        "exercise_attempts",
        ["attempt_id"],
        ["id"],
        ondelete="CASCADE",
    )

    op.alter_column(
        "tutor_sessions",
        "difficulty",
        existing_type=sa.Enum(
            "N5", "N4", "N3", "N2", "N1", name="tutor_jlpt_level", native_enum=False
        ),
        type_=sa.SmallInteger(),
        existing_nullable=True,
        postgresql_using="""
            CASE difficulty
                WHEN 'N5' THEN 1
                WHEN 'N4' THEN 2
                WHEN 'N3' THEN 3
                WHEN 'N2' THEN 4
                WHEN 'N1' THEN 5
            END
        """,
    )
