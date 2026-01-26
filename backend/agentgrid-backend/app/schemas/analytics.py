from datetime import datetime
from pydantic import BaseModel
from typing import List, Dict, Optional

class ReviewPerformanceMetrics(BaseModel):
    total_reviews: int
    completed_reviews: int
    pending_reviews: int
    avg_resolution_time_hours: float
    resolution_rate_percent: float
    avg_quality_score: float
    sla_compliance_rate: float

class AgentReviewStats(BaseModel):
    agent_id: str
    agent_name: str
    total_requests: int
    avg_score: float

class ReviewTrendPoint(BaseModel):
    date: str
    score: float
    count: int

class ExpertAnalytics(BaseModel):
    overview: ReviewPerformanceMetrics
    by_agent: List[AgentReviewStats]
    recent_performance_trend: List[ReviewTrendPoint] # [{date: '2026-01-01', score: 4.5, count: 12}, ...]
