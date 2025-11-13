from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.enums import ExecutionStatus


class AgentExecutionRead(BaseModel):
    id: UUID
    agent_id: UUID
    user_id: UUID
    status: ExecutionStatus
    inputs: dict
    outputs: dict | None = None
    error_message: str | None = None
    credits_used: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
