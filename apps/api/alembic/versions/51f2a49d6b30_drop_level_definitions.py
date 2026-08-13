"""drop level definitions

Revision ID: 51f2a49d6b30
Revises: bbea12cc1d7b
Create Date: 2026-08-13
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "51f2a49d6b30"
down_revision: str | Sequence[str] | None = "bbea12cc1d7b"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_LEVEL_DEFINITIONS: tuple[tuple[int, int, str], ...] = (
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
)


def upgrade() -> None:
    op.drop_table("level_definitions")
    op.execute(
        sa.text(
            """
            UPDATE user_progress
            SET current_level = FLOOR(
                (1 + SQRT(1 + 4 * FLOOR(total_exp::numeric / 25))) / 2
            )::smallint
            """
        )
    )


def downgrade() -> None:
    level_definitions = op.create_table(
        "level_definitions",
        sa.Column("level", sa.SmallInteger(), nullable=False),
        sa.Column("required_total_exp", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=100), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("level"),
        sa.UniqueConstraint("required_total_exp"),
    )
    op.bulk_insert(
        level_definitions,
        [
            {"level": level, "required_total_exp": required_exp, "title": title}
            for level, required_exp, title in _LEVEL_DEFINITIONS
        ],
    )
