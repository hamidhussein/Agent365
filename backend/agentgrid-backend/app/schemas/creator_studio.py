from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class CreatorStudioAuthRequest(BaseModel):
    email: EmailStr
    password: str


class CreatorStudioUserOut(BaseModel):
    id: UUID
    email: EmailStr
    name: str
    role: str


class CreatorStudioAuthResponse(BaseModel):
    token: str
    user: CreatorStudioUserOut


class CreatorStudioAgentInput(BaseModel):
    id: str
    label: str
    type: Literal["text", "textarea", "file"]
    required: bool
    description: Optional[str] = None


class CreatorStudioAgentPayload(BaseModel):
    name: str
    description: str
    instruction: str
    model: Optional[str] = None
    color: str
    inputs: list[CreatorStudioAgentInput] = Field(default_factory=list)
    isPublic: bool = False
    creditsPerRun: int = 1


class CreatorStudioKnowledgeFileOut(BaseModel):
    id: str
    name: str
    size: str


class CreatorStudioAgentOut(BaseModel):
    id: str
    name: str
    description: str
    instruction: str
    model: str
    color: str
    inputs: list[CreatorStudioAgentInput]
    isPublic: bool
    creditsPerRun: int
    createdAt: str
    files: list[CreatorStudioKnowledgeFileOut]


class CreatorStudioAgentSuggestRequest(BaseModel):
    name: str
    description: Optional[str] = None
    instruction: Optional[str] = None
    notes: Optional[str] = None
    action: Literal["suggest", "refine", "regenerate"] = "suggest"
    model: Optional[str] = None


class CreatorStudioAgentSuggestResponse(BaseModel):
    description: str
    instruction: str


class CreatorStudioLLMConfigOut(BaseModel):
    id: str
    name: str
    provider: str
    enabled: bool
    apiKey: str
    usage: int
    limit: int


class CreatorStudioLLMConfigUpdate(BaseModel):
    enabled: Optional[bool] = None
    apiKey: Optional[str] = None
    usage: Optional[int] = None
    limit: Optional[int] = None


class CreatorStudioAssistModelUpdate(BaseModel):
    model: str


class CreatorStudioAssistModelResponse(BaseModel):
    model: Optional[str] = None


class CreatorStudioChatRequest(BaseModel):
    agentId: str
    message: str
    inputsContext: Optional[str] = None


class CreatorStudioPublicChatRequest(BaseModel):
    guestId: str
    agentId: str
    message: str
    inputsContext: Optional[str] = None


class CreatorStudioGuestCreditsRequest(BaseModel):
    guestId: str
    amount: int = 10


class CreatorStudioGuestCreditsResponse(BaseModel):
    credits: int
