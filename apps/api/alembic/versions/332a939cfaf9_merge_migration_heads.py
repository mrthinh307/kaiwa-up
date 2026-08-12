"""merge migration heads

Revision ID: 332a939cfaf9
Revises: 8a7d3e2c4b19, c8204c73c808
Create Date: 2026-08-12 19:06:26.888035
"""

from collections.abc import Sequence

revision: str = "332a939cfaf9"
down_revision: str | Sequence[str] | None = ("8a7d3e2c4b19", "c8204c73c808")
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
