import uuid
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, Float, ForeignKey, Integer, String, Text
from sqlalchemy.types import JSON, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.enum_types import LowercaseEnum
from app.models.enums import AgentStatus
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.execution import AgentExecution
    from app.models.review import Review


class Agent(TimestampMixin, Base):
    __tablename__ = "agents"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(String(512), nullable=False)
    long_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(64), nullable=False)
    tags: Mapped[List[str]] = mapped_column(JSON, default=list)
    price_per_run: Mapped[float] = mapped_column(Float, nullable=False)
    rating: Mapped[float] = mapped_column(Float, default=0.0)
    total_runs: Mapped[int] = mapped_column(Integer, default=0)
    total_reviews: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[AgentStatus] = mapped_column(
        LowercaseEnum(AgentStatus, name="agentstatus"),
        default=AgentStatus.PENDING_REVIEW,
        nullable=False,
    )
    config: Mapped[dict] = mapped_column(JSON, default=dict)
    capabilities: Mapped[List[str]] = mapped_column(JSON, default=list)
    limitations: Mapped[List[str]] = mapped_column(JSON, default=list)
    demo_available: Mapped[bool] = mapped_column(Boolean, default=False)
    version: Mapped[str] = mapped_column(String(32), default="1.0.0")
    thumbnail_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)

    creator_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    creator: Mapped["User"] = relationship(back_populates="agents")
    executions: Mapped[List["AgentExecution"]] = relationship(
        back_populates="agent", cascade="all, delete"
    )
    reviews: Mapped[List["Review"]] = relationship(
        back_populates="agent", cascade="all, delete"
    )

    favorited_by_users: Mapped[List["User"]] = relationship(
        secondary="user_favorites",
        back_populates="favorite_agents",
        lazy="selectin"
    )
