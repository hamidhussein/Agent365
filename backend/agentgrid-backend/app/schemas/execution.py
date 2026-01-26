from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.enums import ExecutionStatus


class ExecutionAgentRead(BaseModel):
    name: str

    model_config = ConfigDict(from_attributes=True)


class AgentExecutionRead(BaseModel):
    id: UUID
    agent_id: UUID
    user_id: UUID | None = None
    status: ExecutionStatus
    inputs: dict
    outputs: dict | None = None
    refined_outputs: dict | None = None
    error_message: str | None = None
    credits_used: int
    created_at: datetime
    updated_at: datetime
    review_status: str | None = None
    review_request_note: str | None = None
    review_response_note: str | None = None
    reviewed_at: datetime | None = None
    # Phase 2: Advanced Workflow Fields
    priority: str | None = None
    assigned_to: UUID | None = None
    sla_deadline: datetime | None = None
    internal_notes: str | None = None
    quality_score: int | None = None
    
    user_username: str | None = None
    agent: ExecutionAgentRead | None = None

    model_config = ConfigDict(from_attributes=True)


class ReviewRequest(BaseModel):
    note: str
    priority: str | None = None


class ReviewResponse(BaseModel):
    response_note: str
    refined_outputs: dict | None = None
    quality_score: int | None = None
    internal_notes: str | None = None
