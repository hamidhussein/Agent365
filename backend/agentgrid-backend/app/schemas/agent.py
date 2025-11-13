from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict

from app.models.enums import AgentStatus


class AgentBase(BaseModel):
    name: str
    description: str = Field(max_length=512)
    long_description: str | None = None
    category: str
    tags: dict | None = None
    price_per_run: int
    config: dict = Field(default_factory=dict)


class AgentCreate(AgentBase):
    pass


class AgentRead(AgentBase):
    id: UUID
    creator_id: UUID
    rating: float
    total_runs: int
    status: AgentStatus
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
