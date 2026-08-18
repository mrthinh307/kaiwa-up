"""add tutor scenario catalog

Revision ID: a4c8d2e6f1b3
Revises: 6d4f92a1c8e7
Create Date: 2026-08-17
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "a4c8d2e6f1b3"
down_revision: str | Sequence[str] | None = "6d4f92a1c8e7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
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


def downgrade() -> None:
    op.drop_index("ix_tutor_sessions_scenario_id", table_name="tutor_sessions")
    op.drop_constraint(
        "tutor_sessions_scenario_id_fkey",
        "tutor_sessions",
        type_="foreignkey",
    )
    op.drop_column("tutor_sessions", "scenario_id")
    op.drop_index("ix_tutor_scenarios_active_order", table_name="tutor_scenarios")
    op.drop_table("tutor_scenarios")
