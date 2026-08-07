"""SQLAlchemy model registry used by the application and Alembic."""

from app.models.base import Base, TimestampMixin

__all__ = ["Base", "TimestampMixin"]
