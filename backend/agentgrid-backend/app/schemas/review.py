from typing import Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field

# Shared properties
class ReviewBase(BaseModel):
    rating: float = Field(..., ge=0, le=5, description="Rating between 0 and 5")
    title: str = Field(..., min_length=1, max_length=255)
    comment: str = Field(..., min_length=1)

# Properties to receive via API on creation
class ReviewCreate(ReviewBase):
    agent_id: UUID

# Properties to receive via API on update
class ReviewUpdate(BaseModel):
    rating: Optional[float] = Field(None, ge=0, le=5)
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    comment: Optional[str] = Field(None, min_length=1)

# Properties to return to client
class ReviewInDBBase(ReviewBase):
    id: UUID
    user_id: UUID
    agent_id: UUID
    helpful_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class Review(ReviewInDBBase):
    pass
