"""soft delete Tutor sessions

Revision ID: f7a8b9c0d1e2
Revises: e6f7a8b9c0d1
Create Date: 2026-08-21
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "f7a8b9c0d1e2"
down_revision: str | Sequence[str] | None = "e6f7a8b9c0d1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "tutor_sessions",
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.drop_constraint(
        "uq_tutor_sessions_client_conversation_id",
        "tutor_sessions",
        type_="unique",
    )
    op.drop_index("ix_tutor_sessions_user_id_started_at", table_name="tutor_sessions")
    op.create_index(
        "uq_tutor_sessions_active_client_conversation_id",
        "tutor_sessions",
        ["user_id", "client_conversation_id"],
        unique=True,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )
    op.create_index(
        "ix_tutor_sessions_user_id_started_at",
        "tutor_sessions",
        ["user_id", sa.literal_column("started_at DESC")],
        unique=False,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )


def downgrade() -> None:
    op.execute(
        sa.text(
            "UPDATE tutor_sessions SET client_conversation_id = NULL WHERE deleted_at IS NOT NULL"
        )
    )
    op.drop_index(
        "uq_tutor_sessions_active_client_conversation_id",
        table_name="tutor_sessions",
    )
    op.drop_index("ix_tutor_sessions_user_id_started_at", table_name="tutor_sessions")
    op.drop_column("tutor_sessions", "deleted_at")
    op.create_unique_constraint(
        "uq_tutor_sessions_client_conversation_id",
        "tutor_sessions",
        ["user_id", "client_conversation_id"],
    )
    op.create_index(
        "ix_tutor_sessions_user_id_started_at",
        "tutor_sessions",
        ["user_id", sa.literal_column("started_at DESC")],
        unique=False,
    )
