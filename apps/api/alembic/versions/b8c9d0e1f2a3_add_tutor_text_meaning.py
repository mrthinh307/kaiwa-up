"""replace fixed Vietnamese Tutor translations with localized text meanings

Revision ID: b8c9d0e1f2a3
Revises: a7b8c9d0e1f2
Create Date: 2026-08-21
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "b8c9d0e1f2a3"
down_revision: str | Sequence[str] | None = "a7b8c9d0e1f2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "tutor_messages",
        sa.Column("text_meaning", postgresql.JSONB(), nullable=True),
    )
    op.execute(
        sa.text(
            """
            UPDATE tutor_messages
            SET text_meaning = jsonb_build_object('language', 'vi', 'text', text_vi)
            WHERE text_vi IS NOT NULL
            """
        )
    )
    op.drop_column("tutor_messages", "text_vi")


def downgrade() -> None:
    op.add_column("tutor_messages", sa.Column("text_vi", sa.Text(), nullable=True))
    op.execute(
        sa.text(
            """
            UPDATE tutor_messages
            SET text_vi = text_meaning ->> 'text'
            WHERE text_meaning IS NOT NULL
              AND text_meaning ->> 'language' = 'vi'
            """
        )
    )
    op.drop_column("tutor_messages", "text_meaning")
