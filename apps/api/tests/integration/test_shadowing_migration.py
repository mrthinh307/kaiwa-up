"""Upgrade/downgrade the additive Shadowing migration without changing shared test tables."""

import importlib.util
import uuid
from pathlib import Path

from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import text
from sqlalchemy.engine import Connection
from sqlalchemy.schema import CreateSchema, DropSchema

from tests.conftest import engine_test


async def test_shadowing_migration_preserves_legacy_results_and_reverts_cleanly() -> None:
    migration_path = (
        Path(__file__).resolve().parents[2]
        / "alembic/versions/c0350900f515_add_shadowing_review_jobs.py"
    )
    module_spec = importlib.util.spec_from_file_location("shadowing_migration", migration_path)
    assert module_spec is not None and module_spec.loader is not None
    migration = importlib.util.module_from_spec(module_spec)
    module_spec.loader.exec_module(migration)
    schema_name = f"shadowing_migration_test_{uuid.uuid4().hex}"
    attempt_id = uuid.uuid4()

    async with engine_test.begin() as connection:
        await connection.execute(CreateSchema(schema_name))
        # Transaction-local settings survive transaction poolers. All DDL below occurs
        # before the same transaction is committed, unlike connection-startup search_path.
        await connection.execute(
            text("SELECT set_config('search_path', :schema_name, true)"),
            {"schema_name": schema_name},
        )
        assert await connection.scalar(text("SELECT current_schema()")) == schema_name
        for table_name in ("exercise_attempts", "recordings", "ai_evaluations"):
            await connection.exec_driver_sql(
                f'CREATE TABLE "{table_name}" (LIKE public."{table_name}" INCLUDING ALL)'
            )
        # Reconstruct the pre-upgrade shape even when the shared TEST database is already
        # migrated. These copies live only in this test's transaction-local schema.
        for table_name, column_name in (
            ("exercise_attempts", "review_revision"),
            ("recordings", "client_recording_id"),
            ("recordings", "content_sha256"),
            ("recordings", "shadowing_segment_index"),
            ("ai_evaluations", "review_fingerprint"),
        ):
            await connection.exec_driver_sql(
                f'ALTER TABLE "{table_name}" DROP COLUMN IF EXISTS "{column_name}" CASCADE'
            )
        await connection.execute(
            text(
                "INSERT INTO exercise_attempts "
                "(id, user_id, content_id, attempt_number, status, score, "
                "correct_count, total_count) "
                "VALUES (:id, :user_id, :content_id, 1, 'COMPLETED', 50, 1, 2)"
            ),
            {"id": attempt_id, "user_id": uuid.uuid4(), "content_id": uuid.uuid4()},
        )

        def upgrade(sync_connection: Connection) -> None:
            with Operations.context(MigrationContext.configure(sync_connection)):
                migration.upgrade()

        def downgrade(sync_connection: Connection) -> None:
            with Operations.context(MigrationContext.configure(sync_connection)):
                migration.downgrade()

        await connection.run_sync(upgrade)
        result = (
            await connection.execute(
                text(
                    "SELECT score, correct_count, total_count, review_revision "
                    "FROM exercise_attempts"
                )
            )
        ).one()
        assert tuple(result) == (50, 1, 2, 0)
        assert await connection.scalar(text("SELECT count(*) FROM shadowing_jobs")) == 0
        assert await connection.scalar(text("SELECT count(*) FROM shadowing_attempt_segments")) == 0
        await connection.run_sync(downgrade)
        assert await connection.scalar(text("SELECT score FROM exercise_attempts")) == 50
        assert await connection.scalar(text("SELECT to_regclass('shadowing_jobs')")) is None
        await connection.run_sync(upgrade)
        assert await connection.scalar(text("SELECT score FROM exercise_attempts")) == 50
        await connection.execute(DropSchema(schema_name, cascade=True))
