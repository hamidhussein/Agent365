"""
Agent analytics and metrics API endpoints
"""
import uuid
from datetime import date, datetime, timedelta
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel

from app.core.deps import get_db, get_current_user
from app.models.agent import Agent
from app.models.agent_metrics import AgentMetrics, LLMUsage
from app.models.user import User

router = APIRouter()


class MetricsOut(BaseModel):
    date: str
    total_chats: int
    total_messages: int
    unique_users: int
    avg_response_time_ms: int
    error_rate: float
    web_search_calls: int
    code_execution_calls: int
    rag_queries: int
    avg_rag_confidence: float
    total_cost_usd: float


class AnalyticsSummary(BaseModel):
    usage: dict
    performance: dict
    quality: dict
    cost: dict
    trends: List[MetricsOut]


class CostBreakdown(BaseModel):
    provider: str
    model: str
    total_tokens: int
    total_cost_usd: float


@router.get("/agents/{agent_id}/analytics", response_model=AnalyticsSummary)
def get_analytics(
    agent_id: str,
    start_date: date = Query(default=None),
    end_date: date = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get comprehensive analytics for an agent."""
    agent = db.query(Agent).filter(
        Agent.id == uuid.UUID(agent_id),
        Agent.creator_id == current_user.id
    ).first()
    
    if not agent:
        raise HTTPException(404, "Agent not found")
    
    # Default to last 30 days
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=30)
    
    # Query metrics
    metrics = db.query(AgentMetrics).filter(
        AgentMetrics.agent_id == agent.id,
        AgentMetrics.date.between(start_date, end_date)
    ).order_by(AgentMetrics.date).all()
    
    if not metrics:
        return AnalyticsSummary(
            usage={},
            performance={},
            quality={},
            cost={},
            trends=[]
        )
    
    # Aggregate totals
    total_chats = sum(m.total_chats for m in metrics)
    total_messages = sum(m.total_messages for m in metrics)
    total_users = max(m.unique_users for m in metrics) if metrics else 0
    total_cost = sum(m.total_cost_usd for m in metrics)
    
    # Average performance
    avg_response_time = sum(m.avg_response_time_ms for m in metrics) // len(metrics) if metrics else 0
    avg_error_rate = sum(m.error_rate for m in metrics) / len(metrics) if metrics else 0
    
    # Capability usage
    total_web_search = sum(m.web_search_calls for m in metrics)
    total_code_exec = sum(m.code_execution_calls for m in metrics)
    total_rag = sum(m.rag_queries for m in metrics)
    
    # Quality metrics
    avg_confidence = sum(m.avg_rag_confidence for m in metrics) / len(metrics) if metrics else 0
    total_full = sum(m.context_coverage_full for m in metrics)
    total_partial = sum(m.context_coverage_partial for m in metrics)
    total_none = sum(m.context_coverage_none for m in metrics)
    
    return AnalyticsSummary(
        usage={
            "total_chats": total_chats,
            "total_messages": total_messages,
            "unique_users": total_users,
            "avg_messages_per_chat": total_messages / total_chats if total_chats > 0 else 0
        },
        performance={
            "avg_response_time_ms": avg_response_time,
            "error_rate": round(avg_error_rate, 4)
        },
        quality={
            "avg_rag_confidence": round(avg_confidence, 3),
            "context_coverage": {
                "full": total_full,
                "partial": total_partial,
                "none": total_none
            }
        },
        cost={
            "total_usd": round(total_cost, 4),
            "avg_per_message": round(total_cost / total_messages, 6) if total_messages > 0 else 0,
            "capability_breakdown": {
                "web_search": total_web_search,
                "code_execution": total_code_exec,
                "rag": total_rag
            }
        },
        trends=[
            MetricsOut(
                date=m.date.isoformat(),
                total_chats=m.total_chats,
                total_messages=m.total_messages,
                unique_users=m.unique_users,
                avg_response_time_ms=m.avg_response_time_ms,
                error_rate=m.error_rate,
                web_search_calls=m.web_search_calls,
                code_execution_calls=m.code_execution_calls,
                rag_queries=m.rag_queries,
                avg_rag_confidence=m.avg_rag_confidence,
                total_cost_usd=m.total_cost_usd
            )
            for m in metrics
        ]
    )


@router.get("/agents/{agent_id}/cost-breakdown", response_model=List[CostBreakdown])
def get_cost_breakdown(
    agent_id: str,
    start_date: date = Query(default=None),
    end_date: date = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get detailed cost breakdown by provider and model."""
    agent = db.query(Agent).filter(
        Agent.id == uuid.UUID(agent_id),
        Agent.creator_id == current_user.id
    ).first()
    
    if not agent:
        raise HTTPException(404, "Agent not found")
    
    # Default to last 30 days
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=30)
    
    # Query usage grouped by provider and model
    results = db.query(
        LLMUsage.provider,
        LLMUsage.model,
        func.sum(LLMUsage.prompt_tokens + LLMUsage.completion_tokens).label("total_tokens"),
        func.sum(LLMUsage.cost_usd).label("total_cost")
    ).filter(
        LLMUsage.agent_id == agent.id,
        func.date(LLMUsage.created_at).between(start_date, end_date)
    ).group_by(
        LLMUsage.provider,
        LLMUsage.model
    ).all()
    
    return [
        CostBreakdown(
            provider=r.provider,
            model=r.model,
            total_tokens=r.total_tokens,
            total_cost_usd=round(r.total_cost, 4)
        )
        for r in results
    ]


@router.get("/users/me/budget")
def get_user_budget(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get user's monthly budget and usage."""
    # Calculate current month usage
    month_start = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    monthly_cost = db.query(func.sum(LLMUsage.cost_usd)).filter(
        LLMUsage.user_id == current_user.id,
        LLMUsage.created_at >= month_start
    ).scalar() or 0.0
    
    # TODO: Add monthly_budget field to User model
    monthly_budget = 100.0  # Default $100/month
    
    return {
        "monthly_budget_usd": monthly_budget,
        "current_usage_usd": round(monthly_cost, 2),
        "remaining_usd": round(monthly_budget - monthly_cost, 2),
        "usage_percentage": round((monthly_cost / monthly_budget) * 100, 1) if monthly_budget > 0 else 0
    }
