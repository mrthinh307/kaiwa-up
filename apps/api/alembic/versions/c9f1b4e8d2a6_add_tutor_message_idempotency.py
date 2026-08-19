"""add Tutor message idempotency key

Revision ID: c9f1b4e8d2a6
Revises: a4c8d2e6f1b3
Create Date: 2026-08-19
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "c9f1b4e8d2a6"
down_revision: str | Sequence[str] | None = "a4c8d2e6f1b3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("tutor_messages", sa.Column("client_message_id", sa.Uuid(), nullable=True))
    op.execute(
        sa.text(
            """
            UPDATE tutor_messages
            SET client_message_id = uuidv7()
            WHERE sender = 'USER' AND client_message_id IS NULL
            """
        )
    )
    op.create_unique_constraint(
        "uq_tutor_messages_client_message_id",
        "tutor_messages",
        ["session_id", "client_message_id"],
    )
    op.create_check_constraint(
        "tutor_messages_client_message_id_by_sender",
        "tutor_messages",
        "(sender = 'USER' AND client_message_id IS NOT NULL) "
        "OR (sender = 'AI' AND client_message_id IS NULL)",
    )


def downgrade() -> None:
    op.drop_constraint(
        "tutor_messages_client_message_id_by_sender",
        "tutor_messages",
        type_="check",
    )
    op.drop_constraint(
        "uq_tutor_messages_client_message_id",
        "tutor_messages",
        type_="unique",
    )
    op.drop_column("tutor_messages", "client_message_id")
