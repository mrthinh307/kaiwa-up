"""seed_level_definitions_and_exp_history_index

Revision ID: c8204c73c808
Revises: 16d3c06d08d6
Create Date: 2026-08-12 10:18:11.145546
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "c8204c73c808"
down_revision: str | Sequence[str] | None = "16d3c06d08d6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_LEVEL_DEFINITIONS: list[tuple[int, int, str]] = [
    (1, 0, "Beginner I"),
    (2, 100, "Beginner II"),
    (3, 250, "Beginner III"),
    (4, 450, "Intermediate I"),
    (5, 700, "Intermediate II"),
    (6, 1000, "Intermediate III"),
    (7, 1400, "Advanced I"),
    (8, 1900, "Advanced II"),
    (9, 2500, "Advanced III"),
    (10, 3200, "Master"),
]


def upgrade() -> None:
    level_definitions = sa.table(
        "level_definitions",
        sa.column("level", sa.SmallInteger),
        sa.column("required_total_exp", sa.Integer),
        sa.column("title", sa.String(100)),
    )
    op.bulk_insert(
        level_definitions,
        [
            {"level": level, "required_total_exp": required_total_exp, "title": title}
            for level, required_total_exp, title in _LEVEL_DEFINITIONS
        ],
    )
    op.create_index(
        "ix_xp_transactions_user_id_created_at",
        "xp_transactions",
        ["user_id", sa.literal_column("created_at DESC")],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_xp_transactions_user_id_created_at", table_name="xp_transactions")
    op.execute(sa.text("DELETE FROM level_definitions WHERE level BETWEEN 1 AND 10"))
