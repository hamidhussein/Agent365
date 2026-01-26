"""
Workflow Service for Phase 2: Advanced Review Management
Handles priority calculation, SLA management, and review assignments.
"""
import datetime
import logging
from typing import Optional
from sqlalchemy.orm import Session
from app.models.execution import AgentExecution
from app.models.agent import Agent
from app.models.user import User

logger = logging.getLogger(__name__)

class WorkflowService:
    @staticmethod
    def calculate_priority(execution: AgentExecution, agent: Agent) -> str:
        """
        Calculate priority based on:
        1. Agent-defined priority (if any)
        2. User's role/tier (admin/creator vs standard)
        3. Review cost (higher cost => higher priority)
        """
        # 1. Base Priority by review cost
        cost = agent.review_cost or 0
        if cost >= 100:
            return "urgent"
        if cost >= 50:
            return "high"
        
        # 2. Priority by user role
        if execution.user and execution.user.role in ["admin", "creator"]:
            return "high"
            
        return "normal"

    @staticmethod
    def calculate_sla(priority: str) -> datetime.datetime:
        """
        Assign an SLA deadline based on priority.
        Urgent: 2 hours
        High: 8 hours
        Normal: 24 hours
        Low: 72 hours
        """
        now = datetime.datetime.utcnow()
        sla_hours = {
            "urgent": 2,
            "high": 8,
            "normal": 24,
            "low": 72
        }
        hours = sla_hours.get(priority, 24)
        return now + datetime.timedelta(hours=hours)

    @staticmethod
    async def process_review_request(db: Session, execution: AgentExecution, requested_priority: Optional[str] = None):
        """
        Enhance review request with advanced metadata.
        """
        agent = execution.agent
        
        # 1. Priority (explicit request overrides auto-calculation)
        priority = (requested_priority or "").strip().lower()
        if priority == "standard":
            priority = "normal"
        if priority in {"low", "normal", "high", "urgent"}:
            execution.priority = priority
        else:
            execution.priority = WorkflowService.calculate_priority(execution, agent)
        
        # 2. SLA Assignment
        execution.sla_deadline = WorkflowService.calculate_sla(execution.priority)
        
        # 3. Auto-Assignment (Optional: Assign to agent creator by default)
        execution.assigned_to = agent.creator_id
        
        logger.info(f"Review request processed: {execution.id} | Priority: {execution.priority} | SLA: {execution.sla_deadline}")
        
        db.commit()
        db.refresh(execution)

workflow_service = WorkflowService()
