from sqlalchemy import CheckConstraint, DateTime, Enum, Index, UniqueConstraint
from sqlalchemy.schema import ColumnDefault

from app.models import Base
from app.models.enums import JlptLevel


def test_all_expected_tables_registered() -> None:
    tables = set(Base.metadata.tables)
    expected = {
        "users",
        "user_progress",
        "auth_refresh_tokens",
        "achievements",
        "user_achievements",
        "xp_transactions",
        "weekly_leaderboard_entries",
        "learning_contents",
        "reflex_exercises",
        "translation_exercises",
        "exercise_attempts",
        "recordings",
        "ai_evaluations",
        "review_schedules",
        "tutor_sessions",
        "tutor_messages",
    }
    assert tables == expected


def test_unique_constraints_defined() -> None:
    constraints: dict[str, set[tuple[str, ...]]] = {}
    for name, table in Base.metadata.tables.items():
        constraints[name] = {
            tuple(sorted(c.columns.keys()))
            for c in table.constraints
            if isinstance(c, UniqueConstraint)
        }

    assert ("email",) in constraints["users"]
    assert ("token_hash",) in constraints["auth_refresh_tokens"]
    assert ("slug",) in constraints["learning_contents"]
    assert ("code",) in constraints["achievements"]
    assert ("storage_key",) in constraints["recordings"]
    assert ("attempt_id",) in constraints["xp_transactions"]
    assert ("attempt_number", "content_id", "user_id") in constraints["exercise_attempts"]
    assert ("client_message_id", "session_id") in constraints["tutor_messages"]
    assert ("sequence_number", "session_id") in constraints["tutor_messages"]
    assert ("rank", "week_start") in constraints["weekly_leaderboard_entries"]


def test_composite_primary_keys() -> None:
    pks: dict[str, set[str]] = {}
    for name, table in Base.metadata.tables.items():
        pks[name] = {col.name for col in table.primary_key.columns}

    assert pks["user_progress"] == {"user_id"}
    assert pks["user_achievements"] == {"user_id", "achievement_id"}
    assert pks["review_schedules"] == {"user_id", "content_id"}
    assert pks["weekly_leaderboard_entries"] == {"week_start", "user_id"}
    assert pks["reflex_exercises"] == {"content_id"}
    assert pks["translation_exercises"] == {"content_id"}


def test_required_indexes_present() -> None:
    indexes: dict[str, set[str]] = {}
    for name, table in Base.metadata.tables.items():
        indexes[name] = {str(idx.name) for idx in table.indexes}

    assert "ix_auth_refresh_tokens_user_id_expires_at_active" in indexes["auth_refresh_tokens"]
    assert "ix_exercise_attempts_user_id_completed_at" in indexes["exercise_attempts"]
    assert "ix_exercise_attempts_content_id_completed_at" in indexes["exercise_attempts"]
    assert "ix_recordings_user_id_created_at" in indexes["recordings"]
    assert "ix_ai_evaluations_attempt_id_created_at" in indexes["ai_evaluations"]
    assert "ix_review_schedules_user_id_due_at" in indexes["review_schedules"]
    assert "ix_xp_transactions_created_at_user_id" in indexes["xp_transactions"]
    assert "ix_tutor_sessions_user_id_started_at" in indexes["tutor_sessions"]
    assert "ix_learning_contents_published_catalog" in indexes["learning_contents"]


def _index_by_name(table_name: str, index_name: str) -> Index:
    return next(idx for idx in Base.metadata.tables[table_name].indexes if idx.name == index_name)


def test_covering_index_include_columns() -> None:
    covering = _index_by_name("exercise_attempts", "ix_exercise_attempts_user_id_completed_at")
    include = covering.dialect_options["postgresql"].get("include")
    assert include == ("content_id", "status", "score")


def test_partial_index_conditions() -> None:
    refresh_idx = _index_by_name(
        "auth_refresh_tokens", "ix_auth_refresh_tokens_user_id_expires_at_active"
    )
    assert "revoked_at IS NULL" in str(refresh_idx.dialect_options["postgresql"].get("where"))

    catalog_idx = _index_by_name("learning_contents", "ix_learning_contents_published_catalog")
    assert "status = 'PUBLISHED'" in str(catalog_idx.dialect_options["postgresql"].get("where"))


def test_database_check_constraints_present() -> None:
    expected = {
        "users": {"user_role"},
        "user_progress": {
            "user_progress_total_exp_nonnegative",
            "user_progress_current_level_positive",
            "user_progress_completed_count_nonnegative",
        },
        "learning_contents": {
            "content_type",
            "content_status",
            "jlpt_level",
            "learning_contents_audio_duration_nonnegative",
            "learning_contents_base_exp_positive",
        },
        "exercise_attempts": {
            "attempt_status",
            "exercise_attempts_number_positive",
            "exercise_attempts_score_range",
            "exercise_attempts_correct_count_nonnegative",
            "exercise_attempts_total_count_nonnegative",
            "exercise_attempts_correct_not_above_total",
        },
        "recordings": {"recording_kind", "recordings_duration_nonnegative"},
        "ai_evaluations": {
            "ai_evaluation_status",
            "ai_evaluations_similarity_score_range",
            "ai_evaluations_fluency_score_range",
        },
        "xp_transactions": {"xp_transactions_amount_positive"},
        "weekly_leaderboard_entries": {
            "weekly_leaderboard_exp_nonnegative",
            "weekly_leaderboard_rank_positive",
        },
        "tutor_sessions": {"tutor_session_jlpt_level", "tutor_session_status"},
        "tutor_messages": {
            "tutor_sender",
            "tutor_messages_client_message_id_by_sender",
            "tutor_messages_sequence_positive",
        },
    }
    for table_name, constraint_names in expected.items():
        actual = {
            constraint.name
            for constraint in Base.metadata.tables[table_name].constraints
            if isinstance(constraint, CheckConstraint)
        }
        assert constraint_names <= actual


def test_xp_attempt_foreign_key_preserves_ledger() -> None:
    attempt_id = Base.metadata.tables["xp_transactions"].columns["attempt_id"]
    foreign_key = next(iter(attempt_id.foreign_keys))

    assert foreign_key.ondelete == "SET NULL"


def test_columns_use_timezone_aware_datetime() -> None:
    for name, table in Base.metadata.tables.items():
        for column in table.columns:
            if isinstance(column.type, DateTime):
                assert column.type.timezone, f"{name}.{column.name} lacks timezone=True"


def test_audio_stored_as_reference_only() -> None:
    users = Base.metadata.tables["users"]
    assert "audio_url" not in users.columns

    learning = Base.metadata.tables["learning_contents"]
    assert learning.columns["audio_url"].type.__class__.__name__ == "Text"
    assert learning.columns["transcript_ja"].type.__class__.__name__ == "JSONB"

    recordings = Base.metadata.tables["recordings"]
    assert "storage_key" in recordings.columns
    assert "storage_key" in {c.name for c in recordings.columns if c.unique}


def test_learning_content_difficulty_uses_jlpt_level() -> None:
    learning_contents = Base.metadata.tables["learning_contents"]
    difficulty = learning_contents.columns["difficulty"]
    jlpt_constraint = next(
        constraint
        for constraint in learning_contents.constraints
        if isinstance(constraint, CheckConstraint) and constraint.name == "jlpt_level"
    )

    assert isinstance(difficulty.type, Enum)
    assert difficulty.type.enums == [level.value for level in JlptLevel]
    assert isinstance(difficulty.default, ColumnDefault)
    assert difficulty.default.arg == JlptLevel.N5
    assert str(jlpt_constraint.sqltext) == "difficulty IN ('N5', 'N4', 'N3', 'N2', 'N1')"


def test_tutor_difficulty_uses_jlpt_level() -> None:
    difficulty = Base.metadata.tables["tutor_sessions"].columns["difficulty"]

    assert isinstance(difficulty.type, Enum)
    assert difficulty.type.enums == [level.value for level in JlptLevel]


def test_tutor_session_stores_free_form_context_as_required_snapshots() -> None:
    session = Base.metadata.tables["tutor_sessions"]

    assert set(session.columns.keys()) == {
        "id",
        "user_id",
        "topic",
        "difficulty",
        "scenario",
        "status",
        "started_at",
        "ended_at",
    }
    assert not session.columns["topic"].nullable
    assert not session.columns["difficulty"].nullable
    assert session.columns["scenario"].nullable


def test_tutor_message_client_message_id_is_nullable() -> None:
    messages = Base.metadata.tables["tutor_messages"]

    assert messages.columns["client_message_id"].nullable
    assert messages.columns["client_message_id"].type.__class__.__name__ == "Uuid"
