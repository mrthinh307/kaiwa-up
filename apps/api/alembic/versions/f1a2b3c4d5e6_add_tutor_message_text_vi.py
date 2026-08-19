"""add Vietnamese Tutor message translation

Revision ID: f1a2b3c4d5e6
Revises: e4f6a8c2d1b3
Create Date: 2026-08-19
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "f1a2b3c4d5e6"
down_revision: str | Sequence[str] | None = "e4f6a8c2d1b3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("tutor_messages", sa.Column("text_vi", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("tutor_messages", "text_vi")
