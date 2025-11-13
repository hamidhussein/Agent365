from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


# Import models so Alembic can discover metadata
from app.models import agent, execution, transaction, user  # noqa: F401
