import runpy
from pathlib import Path
from unittest.mock import MagicMock, patch

from sqlalchemy import Text


def test_merge_listening_content_downgrade_converts_transcript_without_using_subquery() -> None:
    migration_path = (
        Path(__file__).resolve().parents[2]
        / "alembic"
        / "versions"
        / "8a7d3e2c4b19_merge_listening_content.py"
    )
    migration = runpy.run_path(str(migration_path))
    operations = MagicMock()
    downgrade = migration["downgrade"]

    with patch.dict(downgrade.__globals__, {"op": operations}):
        downgrade()

    temporary_column = operations.add_column.call_args_list[-1].args[1]
    assert temporary_column.name == "transcript_ja_text"
    assert any(
        "SET transcript_ja_text = (" in call.args[0] for call in operations.execute.call_args_list
    )
    operations.drop_column.assert_called_once_with("learning_contents", "transcript_ja")
    alter_args = operations.alter_column.call_args
    assert alter_args.args == ("learning_contents", "transcript_ja_text")
    assert alter_args.kwargs["new_column_name"] == "transcript_ja"
    assert isinstance(alter_args.kwargs["existing_type"], Text)
    assert alter_args.kwargs["existing_nullable"] is True
    assert "postgresql_using" not in alter_args.kwargs


def test_tutor_message_idempotency_migration_backfills_and_constrains_messages() -> None:
    migration_path = (
        Path(__file__).resolve().parents[2]
        / "alembic"
        / "versions"
        / "c9f1b4e8d2a6_add_tutor_message_idempotency.py"
    )
    migration = runpy.run_path(str(migration_path))
    operations = MagicMock()

    with patch.dict(migration["upgrade"].__globals__, {"op": operations}):
        migration["upgrade"]()

    added_column = operations.add_column.call_args.args[1]
    assert added_column.name == "client_message_id"
    assert added_column.nullable is True
    assert any(
        "SET client_message_id = uuidv7()" in call.args[0].text
        for call in operations.execute.call_args_list
    )
    operations.create_unique_constraint.assert_called_once_with(
        "uq_tutor_messages_client_message_id",
        "tutor_messages",
        ["session_id", "client_message_id"],
    )
    operations.create_check_constraint.assert_called_once_with(
        "tutor_messages_client_message_id_by_sender",
        "tutor_messages",
        "(sender = 'USER' AND client_message_id IS NOT NULL) "
        "OR (sender = 'AI' AND client_message_id IS NULL)",
    )


def test_tutor_catalog_removal_migration_requires_context_snapshots() -> None:
    migration_path = (
        Path(__file__).resolve().parents[2]
        / "alembic"
        / "versions"
        / "d7e5f3a1b9c2_remove_tutor_scenario_catalog.py"
    )
    migration = runpy.run_path(str(migration_path))
    operations = MagicMock()

    with patch.dict(migration["upgrade"].__globals__, {"op": operations}):
        migration["upgrade"]()

    preflight_sql = operations.execute.call_args.args[0].text
    assert "missing topic snapshots exist" in preflight_sql
    assert "missing difficulty values exist" in preflight_sql
    assert operations.alter_column.call_args_list[0].args[:2] == ("tutor_sessions", "topic")
    assert operations.alter_column.call_args_list[0].kwargs["nullable"] is False
    assert operations.alter_column.call_args_list[1].args[:2] == ("tutor_sessions", "difficulty")
    assert operations.alter_column.call_args_list[1].kwargs["nullable"] is False
    operations.drop_column.assert_called_once_with("tutor_sessions", "scenario_id")
    operations.drop_table.assert_called_once_with("tutor_scenarios")


def test_tutor_feedback_migration_removes_deprecated_next_question() -> None:
    migration_path = (
        Path(__file__).resolve().parents[2]
        / "alembic"
        / "versions"
        / "e4f6a8c2d1b3_remove_next_question_feedback.py"
    )
    migration = runpy.run_path(str(migration_path))
    operations = MagicMock()

    with patch.dict(migration["upgrade"].__globals__, {"op": operations}):
        migration["upgrade"]()

    statement = operations.execute.call_args.args[0].text
    assert "feedback = feedback - 'next_question'" in statement
    assert "feedback ? 'next_question'" in statement


def test_tutor_message_translation_migration_adds_nullable_text_vi() -> None:
    migration_path = (
        Path(__file__).resolve().parents[2]
        / "alembic"
        / "versions"
        / "f1a2b3c4d5e6_add_tutor_message_text_vi.py"
    )
    migration = runpy.run_path(str(migration_path))
    operations = MagicMock()

    with patch.dict(migration["upgrade"].__globals__, {"op": operations}):
        migration["upgrade"]()

    column = operations.add_column.call_args.args[1]
    assert column.name == "text_vi"
    assert column.nullable is True
