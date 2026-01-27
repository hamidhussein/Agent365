"""
Analytics Service for Phase 3: Expert Performance & Quality Insights
Aggregates review data into actionable metrics.
"""
from datetime import datetime, timedelta
from typing import List, Dict, Any
from sqlalchemy import func, and_
from sqlalchemy.orm import Session
from app.models.execution import AgentExecution
from app.models.agent import Agent
from app.models.enums import ReviewStatus
from app.schemas.analytics import ExpertAnalytics, ReviewPerformanceMetrics, AgentReviewStats

class AnalyticsService:
    @staticmethod
    def get_expert_analytics(db: Session, creator_id: str) -> ExpertAnalytics:
        """
        Calculate metrics for the expert verification dashboard.
        """
        # 1. Base query for all executions of agents owned by this creator that have reviews
        base_query = db.query(AgentExecution).join(Agent).filter(
            Agent.creator_id == creator_id,
            AgentExecution.review_status != ReviewStatus.NONE
        )

        reviews = base_query.all()
        total = len(reviews)
        
        if total == 0:
            return ExpertAnalytics(
                overview=ReviewPerformanceMetrics(
                    total_reviews=0, completed_reviews=0, pending_reviews=0,
                    avg_resolution_time_hours=0, resolution_rate_percent=0,
                    avg_quality_score=0, sla_compliance_rate=0
                ),
                by_agent=[],
                recent_performance_trend=[]
            )

        completed = [r for r in reviews if r.review_status == ReviewStatus.COMPLETED]
        pending = [r for r in reviews if r.review_status == ReviewStatus.PENDING]
        
        # Calculate Avg Resolution Time
        res_times = []
        sla_met = 0
        scores = []
        
        for r in completed:
            if r.reviewed_at and r.created_at:
                diff = r.reviewed_at - r.created_at
                res_times.append(diff.total_seconds() / 3600)
                
                # SLA Check
                if r.sla_deadline and r.reviewed_at <= r.sla_deadline:
                    sla_met += 1
            
            if r.quality_score:
                scores.append(r.quality_score)

        avg_res_time = sum(res_times) / len(res_times) if res_times else 0
        resolution_rate = (len(completed) / total) * 100
        avg_score = sum(scores) / len(scores) if scores else 0
        sla_rate = (sla_met / len(completed)) * 100 if completed else 0

        # 2. Group by Agent
        agent_stats = []
        agents = db.query(Agent).filter(Agent.creator_id == creator_id).all()
        for agent in agents:
            agent_reviews = [r for r in reviews if str(r.agent_id) == str(agent.id)]
            if not agent_reviews: continue
            
            a_scores = [r.quality_score for r in agent_reviews if r.quality_score]
            agent_stats.append(AgentReviewStats(
                agent_id=str(agent.id),
                agent_name=agent.name,
                total_requests=len(agent_reviews),
                avg_score=sum(a_scores) / len(a_scores) if a_scores else 0
            ))

        # 3. Trend (Last 7 days)
        trend = []
        for i in range(6, -1, -1):
            date = (datetime.utcnow() - timedelta(days=i)).date()
            day_reviews = [r for r in completed if r.reviewed_at and r.reviewed_at.date() == date]
            day_scores = [r.quality_score for r in day_reviews if r.quality_score]
            trend.append({
                "date": date.isoformat(),
                "score": sum(day_scores) / len(day_scores) if day_scores else 0,
                "count": len(day_reviews)
            })

        return ExpertAnalytics(
            overview=ReviewPerformanceMetrics(
                total_reviews=total,
                completed_reviews=len(completed),
                pending_reviews=len(pending),
                avg_resolution_time_hours=round(avg_res_time, 2),
                resolution_rate_percent=round(resolution_rate, 1),
                avg_quality_score=round(avg_score, 2),
                sla_compliance_rate=round(sla_rate, 1)
            ),
            by_agent=agent_stats,
            recent_performance_trend=trend
        )

analytics_service = AnalyticsService()
