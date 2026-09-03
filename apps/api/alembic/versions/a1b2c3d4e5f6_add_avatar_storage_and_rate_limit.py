"""add avatar storage metadata and mutation rate limit

Revision ID: a1b2c3d4e5f6
Revises: 9c4e1a7b2d6f
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "a1b2c3d4e5f6"
down_revision: str | Sequence[str] | None = "9c4e1a7b2d6f"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("avatar_storage_provider", sa.String(length=32), nullable=True),
    )
    op.add_column("users", sa.Column("avatar_storage_key", sa.Text(), nullable=True))
    op.create_table(
        "avatar_mutation_windows",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("window_started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("request_count", sa.Integer(), nullable=False, server_default="0"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id"),
    )


def downgrade() -> None:
    op.drop_table("avatar_mutation_windows")
    op.drop_column("users", "avatar_storage_key")
    op.drop_column("users", "avatar_storage_provider")
