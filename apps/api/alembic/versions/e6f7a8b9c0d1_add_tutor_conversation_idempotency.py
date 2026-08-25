"""add Tutor conversation idempotency key

Revision ID: e6f7a8b9c0d1
Revises: b8c9d0e1f2a3
Create Date: 2026-08-21
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "e6f7a8b9c0d1"
down_revision: str | Sequence[str] | None = "b8c9d0e1f2a3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "tutor_sessions",
        sa.Column("client_conversation_id", sa.Uuid(), nullable=True),
    )
    op.create_unique_constraint(
        "uq_tutor_sessions_client_conversation_id",
        "tutor_sessions",
        ["user_id", "client_conversation_id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_tutor_sessions_client_conversation_id",
        "tutor_sessions",
        type_="unique",
    )
    op.drop_column("tutor_sessions", "client_conversation_id")
