"""remove the Tutor scenario catalog

Revision ID: d7e5f3a1b9c2
Revises: c9f1b4e8d2a6
Create Date: 2026-08-19
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "d7e5f3a1b9c2"
down_revision: str | Sequence[str] | None = "c9f1b4e8d2a6"
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
                    FROM tutor_sessions
                    WHERE topic IS NULL OR btrim(topic) = ''
                ) THEN
                    RAISE EXCEPTION
                        'Cannot make tutor_sessions.topic NOT NULL: missing topic snapshots exist';
                END IF;

                IF EXISTS (
                    SELECT 1
                    FROM tutor_sessions
                    WHERE difficulty IS NULL
                ) THEN
                    RAISE EXCEPTION
                        'Cannot make tutor_sessions.difficulty NOT NULL: '
                        'missing difficulty values exist';
                END IF;
            END
            $$
            """
        )
    )
    op.alter_column(
        "tutor_sessions",
        "topic",
        existing_type=sa.String(length=255),
        existing_nullable=True,
        nullable=False,
    )
    op.alter_column(
        "tutor_sessions",
        "difficulty",
        existing_type=sa.Enum(
            "N5", "N4", "N3", "N2", "N1", name="tutor_jlpt_level", native_enum=False
        ),
        existing_nullable=True,
        nullable=False,
    )
    op.drop_constraint("tutor_session_jlpt_level", "tutor_sessions", type_="check")
    op.create_check_constraint(
        "tutor_session_jlpt_level",
        "tutor_sessions",
        "difficulty IN ('N5', 'N4', 'N3', 'N2', 'N1')",
    )
    op.drop_index("ix_tutor_sessions_scenario_id", table_name="tutor_sessions")
    op.drop_constraint(
        "tutor_sessions_scenario_id_fkey",
        "tutor_sessions",
        type_="foreignkey",
    )
    op.drop_column("tutor_sessions", "scenario_id")
    op.drop_index("ix_tutor_scenarios_active_order", table_name="tutor_scenarios")
    op.drop_table("tutor_scenarios")


def downgrade() -> None:
    op.create_table(
        "tutor_scenarios",
        sa.Column("id", sa.Uuid(), server_default=sa.text("uuidv7()"), nullable=False),
        sa.Column("slug", sa.String(length=255), nullable=False),
        sa.Column("topic", sa.String(length=255), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("scenario", sa.Text(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("display_order", sa.Integer(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint(
            "display_order >= 0",
            name="tutor_scenarios_display_order_nonnegative",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug", name="uq_tutor_scenarios_slug"),
    )
    op.create_index(
        "ix_tutor_scenarios_active_order",
        "tutor_scenarios",
        ["is_active", "display_order", "topic"],
        unique=False,
    )
    op.alter_column(
        "tutor_sessions",
        "topic",
        existing_type=sa.String(length=255),
        existing_nullable=False,
        nullable=True,
    )
    op.alter_column(
        "tutor_sessions",
        "difficulty",
        existing_type=sa.Enum(
            "N5", "N4", "N3", "N2", "N1", name="tutor_jlpt_level", native_enum=False
        ),
        existing_nullable=False,
        nullable=True,
    )
    op.drop_constraint("tutor_session_jlpt_level", "tutor_sessions", type_="check")
    op.create_check_constraint(
        "tutor_session_jlpt_level",
        "tutor_sessions",
        "difficulty IS NULL OR difficulty IN ('N5', 'N4', 'N3', 'N2', 'N1')",
    )
    op.add_column("tutor_sessions", sa.Column("scenario_id", sa.Uuid(), nullable=True))
    op.create_foreign_key(
        "tutor_sessions_scenario_id_fkey",
        "tutor_sessions",
        "tutor_scenarios",
        ["scenario_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_tutor_sessions_scenario_id",
        "tutor_sessions",
        ["scenario_id"],
        unique=False,
    )
