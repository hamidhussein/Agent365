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
    from app.models.creator_studio import CreatorStudioKnowledgeFile, CreatorStudioKnowledgeChunk
    from app.models.agent_version import AgentVersion
    from app.models.agent_metrics import AgentMetrics
    from app.models.agent_share import AgentShareLink
    from app.models.agent_invitation import AgentInvitation


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
    is_public: Mapped[bool] = mapped_column(Boolean, default=False)
    source: Mapped[str] = mapped_column(String(32), default="manual")  # "manual" or "creator_studio"
    welcome_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    starter_questions: Mapped[List[str]] = mapped_column(JSON, default=list)

    creator_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    creator: Mapped["User"] = relationship(back_populates="agents")
    executions: Mapped[List["AgentExecution"]] = relationship(
        back_populates="agent", cascade="all, delete"
    )

    creator_studio_files: Mapped[List["CreatorStudioKnowledgeFile"]] = relationship(
        back_populates="agent", cascade="all, delete"
    )
    creator_studio_chunks: Mapped[List["CreatorStudioKnowledgeChunk"]] = relationship(
        back_populates="agent", cascade="all, delete"
    )
    
    # New relationships for improvements
    versions: Mapped[List["AgentVersion"]] = relationship(
        back_populates="agent", cascade="all, delete"
    )
    metrics: Mapped[List["AgentMetrics"]] = relationship(
        back_populates="agent", cascade="all, delete"
    )
    share_links: Mapped[List["AgentShareLink"]] = relationship(
        back_populates="agent", cascade="all, delete"
    )
    invitations: Mapped[List["AgentInvitation"]] = relationship(
        back_populates="agent", cascade="all, delete"
    )

