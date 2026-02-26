"""
Agent analytics and performance metrics
"""
import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Date, Float, ForeignKey, Integer, String
from sqlalchemy.types import Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.agent import Agent


class AgentMetrics(TimestampMixin, Base):
    """
    Daily aggregated metrics for agent performance and usage.
    
    Enables:
    - Usage analytics dashboard
    - Performance monitoring
    - Cost tracking
    - Quality metrics
    """
    __tablename__ = "agent_metrics"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    agent_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("agents.id", ondelete="CASCADE"), nullable=False, index=True
    )
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    
    # Usage metrics
    total_chats: Mapped[int] = mapped_column(Integer, default=0)
    total_messages: Mapped[int] = mapped_column(Integer, default=0)
    unique_users: Mapped[int] = mapped_column(Integer, default=0)
    
    # Performance metrics
    avg_response_time_ms: Mapped[int] = mapped_column(Integer, default=0)
    p95_response_time_ms: Mapped[int] = mapped_column(Integer, default=0)
    error_rate: Mapped[float] = mapped_column(Float, default=0.0)
    
    # Capability usage
    web_search_calls: Mapped[int] = mapped_column(Integer, default=0)
    code_execution_calls: Mapped[int] = mapped_column(Integer, default=0)
    rag_queries: Mapped[int] = mapped_column(Integer, default=0)
    
    # Quality metrics
    avg_rag_confidence: Mapped[float] = mapped_column(Float, default=0.0)
    context_coverage_full: Mapped[int] = mapped_column(Integer, default=0)
    context_coverage_partial: Mapped[int] = mapped_column(Integer, default=0)
    context_coverage_none: Mapped[int] = mapped_column(Integer, default=0)
    
    # Cost metrics
    total_cost_usd: Mapped[float] = mapped_column(Float, default=0.0)
    
    # Relationships
    agent: Mapped["Agent"] = relationship()


class LLMUsage(TimestampMixin, Base):
    """
    Detailed LLM API usage tracking for cost control.
    """
    __tablename__ = "llm_usage"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    agent_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("agents.id", ondelete="CASCADE"), nullable=True, index=True
    )
    provider: Mapped[str] = mapped_column(String(32), nullable=False)
    model: Mapped[str] = mapped_column(String(64), nullable=False)
    prompt_tokens: Mapped[int] = mapped_column(Integer, nullable=False)
    completion_tokens: Mapped[int] = mapped_column(Integer, nullable=False)
    cost_usd: Mapped[float] = mapped_column(Float, nullable=False)
    
    # Relationships
    user: Mapped["User"] = relationship()
    agent: Mapped["Agent"] = relationship()
