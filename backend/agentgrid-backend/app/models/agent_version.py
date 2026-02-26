"""
Agent versioning for rollback and A/B testing
"""
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.types import JSON, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.agent import Agent
    from app.models.user import User


class AgentVersion(TimestampMixin, Base):
    """
    Stores historical versions of agent configurations.
    
    Enables:
    - Version history tracking
    - Rollback to previous configurations
    - A/B testing different versions
    - Change auditing
    """
    __tablename__ = "agent_versions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    agent_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("agents.id", ondelete="CASCADE"), nullable=False
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    config: Mapped[dict] = mapped_column(JSON, nullable=False)
    instruction: Mapped[str] = mapped_column(Text, nullable=False)
    created_by: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id"), nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)
    change_summary: Mapped[str] = mapped_column(String(512), nullable=True)
    
    # Relationships
    agent: Mapped["Agent"] = relationship(back_populates="versions")
    creator: Mapped["User"] = relationship()


class AgentExperiment(TimestampMixin, Base):
    """
    A/B testing experiments for agents.
    
    Allows testing multiple instruction/config variations
    to optimize agent performance.
    """
    __tablename__ = "agent_experiments"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    agent_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("agents.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(
        String(32), default="draft"
    )  # draft | running | completed | cancelled
    
    # Control (baseline) configuration
    control_config: Mapped[dict] = mapped_column(JSON, nullable=False)
    
    # Variants: [{name, config, weight}]
    variant_configs: Mapped[list] = mapped_column(JSON, default=list)
    
    # Metrics to track
    primary_metric: Mapped[str] = mapped_column(
        String(64), nullable=False
    )  # response_time | rag_confidence | user_rating
    
    # Results: {variant_name: {metric_value, sample_count, ...}}
    results: Mapped[dict] = mapped_column(JSON, default=dict)
    
    # Relationships
    agent: Mapped["Agent"] = relationship()
