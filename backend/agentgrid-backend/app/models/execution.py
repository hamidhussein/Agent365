import uuid
from typing import Optional, TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, Text
from sqlalchemy.types import JSON, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.enum_types import LowercaseEnum
from app.models.enums import ExecutionStatus
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.agent import Agent
    from app.models.user import User


class AgentExecution(TimestampMixin, Base):
    __tablename__ = "agent_executions"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    agent_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("agents.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    status: Mapped[ExecutionStatus] = mapped_column(
        LowercaseEnum(ExecutionStatus, name="executionstatus"),
        default=ExecutionStatus.PENDING,
        nullable=False,
    )
    inputs: Mapped[dict] = mapped_column(JSON, default=dict)
    outputs: Mapped[Optional[dict]] = mapped_column(JSON, default=dict)
    error_message: Mapped[Optional[str]] = mapped_column(Text)
    credits_used: Mapped[int] = mapped_column(Integer, default=0)

    agent: Mapped["Agent"] = relationship(back_populates="executions")
    user: Mapped["User"] = relationship(back_populates="executions")
