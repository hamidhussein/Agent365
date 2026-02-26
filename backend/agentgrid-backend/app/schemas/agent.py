from datetime import datetime
from uuid import UUID
from typing import List, Optional, TYPE_CHECKING

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import AgentCategory, AgentStatus
if TYPE_CHECKING:
    from app.schemas.user import UserRead
from app.schemas.user import UserRead
from app.schemas.creator_studio import AgentActionResponse


class AgentConfig(BaseModel):
    model: str
    temperature: float = Field(ge=0, le=2)
    max_tokens: int = Field(ge=100, le=32000)
    timeout_seconds: int = Field(ge=10, le=300)
    required_inputs: List[dict] = Field(default_factory=list)
    output_schema: dict = Field(default_factory=dict)


class AgentBase(BaseModel):
    name: str = Field(..., min_length=3, max_length=100)
    description: str = Field(..., min_length=10, max_length=500)
    long_description: Optional[str] = Field(None, max_length=5000)
    category: AgentCategory
    tags: List[str] = Field(default_factory=list, max_length=10)
    price_per_run: float = Field(..., ge=1, le=10000)
    config: AgentConfig
    capabilities: List[str] = Field(default_factory=list)
    limitations: Optional[List[str]] = None
    demo_available: bool = False
    allow_reviews: bool = False
    review_cost: int = Field(default=5, ge=0)
    is_public: bool = False
    welcome_message: Optional[str] = None
    starter_questions: List[str] = Field(default_factory=list)

    @field_validator("tags", mode="after")
    @classmethod
    def validate_tags(cls, value: List[str]) -> List[str]:
        cleaned = [tag.strip() for tag in value if tag.strip()]
        if len(cleaned) > 10:
            raise ValueError("A maximum of 10 tags are allowed")
        return list(dict.fromkeys(cleaned))

    @field_validator("capabilities", mode="after")
    @classmethod
    def validate_capabilities(cls, value: List[str]) -> List[str]:
        cleaned = [item.strip() for item in value if item.strip()]
        return cleaned


class AgentCreate(AgentBase):
    pass


class AgentUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=3, max_length=100)
    description: Optional[str] = Field(None, min_length=10, max_length=500)
    long_description: Optional[str] = Field(None, max_length=5000)
    category: Optional[AgentCategory] = None
    tags: Optional[List[str]] = Field(None, min_length=1, max_length=10)
    price_per_run: Optional[float] = Field(None, ge=1, le=10000)
    config: Optional[AgentConfig] = None
    capabilities: Optional[List[str]] = Field(None, min_length=1)
    limitations: Optional[List[str]] = None
    demo_available: Optional[bool] = None
    status: Optional[AgentStatus] = None
    thumbnail_url: Optional[str] = Field(None, max_length=512)
    allow_reviews: Optional[bool] = None
    review_cost: Optional[int] = Field(None, ge=0)
    is_public: Optional[bool] = None
    welcome_message: Optional[str] = None
    starter_questions: Optional[List[str]] = None

    @field_validator("tags", mode="after")
    @classmethod
    def validate_optional_tags(cls, value: Optional[List[str]]) -> Optional[List[str]]:
        if value is None:
            return value
        cleaned = [tag.strip() for tag in value if tag.strip()]
        if not cleaned:
            raise ValueError("At least one tag is required")
        if len(cleaned) > 10:
            raise ValueError("A maximum of 10 tags are allowed")
        return list(dict.fromkeys(cleaned))


class AgentResponse(AgentBase):
    config: dict
    id: UUID
    creator_id: UUID
    version: str
    rating: float
    total_runs: int
    total_reviews: int
    status: AgentStatus
    is_public: bool
    source: str
    allow_reviews: bool = False
    review_cost: int = 5
    thumbnail_url: Optional[str]
    creator: Optional[UserRead] = None
    created_at: datetime
    updated_at: datetime
    creator_studio_actions: List[AgentActionResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class AgentListResponse(BaseModel):
    data: List[AgentResponse]
    total: int
    page: int
    per_page: int
    total_pages: int
