"""Merge Shadowing and Dictation content and use timestamped transcripts.

Revision ID: 8a7d3e2c4b19
Revises: 16d3c06d08d6
Create Date: 2026-08-12
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "8a7d3e2c4b19"
down_revision: str | Sequence[str] | None = "16d3c06d08d6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE learning_contents AS content
        SET transcript_ja = COALESCE(
            content.transcript_ja,
            dictation.script,
            shadowing.reference_transcript_ja
        )
        FROM dictation_exercises AS dictation
        FULL JOIN shadowing_exercises AS shadowing
            ON shadowing.content_id = dictation.content_id
        WHERE content.id = COALESCE(dictation.content_id, shadowing.content_id)
        """
    )
    op.alter_column(
        "learning_contents",
        "transcript_ja",
        existing_type=sa.Text(),
        type_=postgresql.JSONB(astext_type=sa.Text()),
        postgresql_using="""
            CASE
                WHEN transcript_ja IS NULL THEN NULL
                ELSE jsonb_build_array(
                    jsonb_build_object(
                        'start_time_ms', 0,
                        'end_time_ms', audio_duration_ms,
                        'script', transcript_ja
                    )
                )
            END
        """,
        existing_nullable=True,
    )
    op.execute(
        """
        UPDATE learning_contents
        SET content_type = 'SHADOWING_DICTATION'
        WHERE content_type IN ('SHADOWING', 'DICTATION')
        """
    )
    op.drop_table("shadowing_exercises")
    op.drop_table("dictation_exercises")


def downgrade() -> None:
    op.create_table(
        "dictation_exercises",
        sa.Column("content_id", sa.Uuid(), nullable=False),
        sa.Column("script", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["content_id"], ["learning_contents.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("content_id"),
    )
    op.create_table(
        "shadowing_exercises",
        sa.Column("content_id", sa.Uuid(), nullable=False),
        sa.Column("reference_audio_url", sa.Text(), nullable=True),
        sa.Column("reference_transcript_ja", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["content_id"], ["learning_contents.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("content_id"),
    )
    op.execute(
        """
        INSERT INTO shadowing_exercises (
            content_id, reference_audio_url, reference_transcript_ja
        )
        SELECT
            id,
            audio_url,
            (SELECT string_agg(segment->>'script', '' ORDER BY ordinal)
             FROM jsonb_array_elements(transcript_ja) WITH ORDINALITY AS item(segment, ordinal))
        FROM learning_contents
        WHERE content_type = 'SHADOWING_DICTATION'
        """
    )
    op.alter_column(
        "learning_contents",
        "transcript_ja",
        existing_type=postgresql.JSONB(astext_type=sa.Text()),
        type_=sa.Text(),
        postgresql_using="""
            (SELECT string_agg(segment->>'script', '' ORDER BY ordinal)
             FROM jsonb_array_elements(transcript_ja) WITH ORDINALITY AS item(segment, ordinal))
        """,
        existing_nullable=True,
    )
    op.execute(
        """
        UPDATE learning_contents
        SET content_type = 'SHADOWING'
        WHERE content_type = 'SHADOWING_DICTATION'
        """
    )
