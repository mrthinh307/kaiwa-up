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
