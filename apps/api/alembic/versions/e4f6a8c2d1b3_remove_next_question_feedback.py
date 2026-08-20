"""remove deprecated next_question from Tutor feedback

Revision ID: e4f6a8c2d1b3
Revises: d7e5f3a1b9c2
Create Date: 2026-08-19
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "e4f6a8c2d1b3"
down_revision: str | Sequence[str] | None = "d7e5f3a1b9c2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        sa.text(
            """
            UPDATE tutor_messages
            SET feedback = feedback - 'next_question'
            WHERE feedback IS NOT NULL AND feedback ? 'next_question'
            """
        )
    )


def downgrade() -> None:
    """The removed feedback field cannot be restored without its original values."""
