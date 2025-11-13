import uuid
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import AgentStatus
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.execution import AgentExecution


class Agent(TimestampMixin, Base):
    __tablename__ = "agents"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(String(512), nullable=False)
    long_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(64), nullable=False)
    tags: Mapped[Optional[dict]] = mapped_column(JSONB, default=dict)
    price_per_run: Mapped[int] = mapped_column(Integer, nullable=False)
    rating: Mapped[float] = mapped_column(Float, default=0.0)
    total_runs: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[AgentStatus] = mapped_column(
        Enum(AgentStatus), default=AgentStatus.PENDING, nullable=False
    )
    config: Mapped[dict] = mapped_column(JSONB, default=dict)

    creator_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    creator: Mapped["User"] = relationship(back_populates="agents")
    executions: Mapped[List["AgentExecution"]] = relationship(
        back_populates="agent", cascade="all, delete"
    )
