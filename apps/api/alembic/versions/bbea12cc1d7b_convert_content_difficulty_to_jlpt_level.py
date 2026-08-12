"""convert content difficulty to jlpt level

Revision ID: bbea12cc1d7b
Revises: 332a939cfaf9
Create Date: 2026-08-12 19:16:50.695574
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "bbea12cc1d7b"
down_revision: str | Sequence[str] | None = "332a939cfaf9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        sa.text(
            """
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM learning_contents
                    WHERE difficulty NOT BETWEEN 1 AND 5
                ) THEN
                    RAISE EXCEPTION 'learning_contents.difficulty contains values outside 1-5';
                END IF;
            END
            $$
            """
        )
    )
    op.alter_column(
        "learning_contents",
        "difficulty",
        existing_type=sa.SmallInteger(),
        type_=sa.Enum(
            "N5",
            "N4",
            "N3",
            "N2",
            "N1",
            name="jlpt_level",
            native_enum=False,
        ),
        existing_nullable=False,
        postgresql_using="""
            CASE difficulty
                WHEN 1 THEN 'N5'
                WHEN 2 THEN 'N4'
                WHEN 3 THEN 'N3'
                WHEN 4 THEN 'N2'
                WHEN 5 THEN 'N1'
            END
        """,
    )
    op.create_check_constraint(
        "jlpt_level",
        "learning_contents",
        "difficulty IN ('N5', 'N4', 'N3', 'N2', 'N1')",
    )


def downgrade() -> None:
    op.drop_constraint("jlpt_level", "learning_contents", type_="check")
    op.alter_column(
        "learning_contents",
        "difficulty",
        existing_type=sa.Enum(
            "N5",
            "N4",
            "N3",
            "N2",
            "N1",
            name="jlpt_level",
            native_enum=False,
        ),
        type_=sa.SmallInteger(),
        existing_nullable=False,
        postgresql_using="""
            CASE difficulty
                WHEN 'N5' THEN 1
                WHEN 'N4' THEN 2
                WHEN 'N3' THEN 3
                WHEN 'N2' THEN 4
                WHEN 'N1' THEN 5
            END
        """,
    )
