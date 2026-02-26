from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import get_settings

settings = get_settings()


class Base(DeclarativeBase):
    pass


engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
)


# Import models so Alembic can discover metadata
from app.models import agent, execution, user, creator_studio, code_execution_log  # noqa: F401
