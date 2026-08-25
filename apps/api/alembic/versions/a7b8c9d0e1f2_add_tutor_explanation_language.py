"""add Tutor explanation language to sessions

Revision ID: a7b8c9d0e1f2
Revises: f1a2b3c4d5e6
Create Date: 2026-08-21
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "a7b8c9d0e1f2"
down_revision: str | Sequence[str] | None = "f1a2b3c4d5e6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "tutor_sessions",
        sa.Column(
            "explanation_language",
            sa.String(length=8),
            nullable=False,
            server_default="vi",
        ),
    )
    op.create_check_constraint(
        "tutor_session_explanation_language",
        "tutor_sessions",
        "explanation_language IN ('vi', 'en', 'ja')",
    )


def downgrade() -> None:
    op.drop_constraint(
        "tutor_session_explanation_language",
        "tutor_sessions",
        type_="check",
    )
    op.drop_column("tutor_sessions", "explanation_language")
