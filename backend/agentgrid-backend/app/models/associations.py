from sqlalchemy import Column, ForeignKey, Table
from sqlalchemy.types import Uuid

from app.db.base import Base

user_favorites = Table(
    "user_favorites",
    Base.metadata,
    Column("user_id", Uuid, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("agent_id", Uuid, ForeignKey("agents.id", ondelete="CASCADE"), primary_key=True),
)
