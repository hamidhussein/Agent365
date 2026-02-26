from typing import Literal, Optional
from pydantic import BaseModel, Field


class CreatorStudioAgentCapabilities(BaseModel):
    codeExecution: bool = False
    webBrowsing: bool = False
    apiIntegrations: bool = False
    fileHandling: bool = False


class CreatorStudioAgentInput(BaseModel):
    id: str
    label: str
    type: Literal["text", "textarea", "file"]
    required: bool
    description: Optional[str] = None


class CreatorStudioAgentPayload(BaseModel):
    name: str = Field(..., min_length=3, max_length=100)
    description: str = Field(..., min_length=10, max_length=500)
    instruction: str = Field(..., min_length=10, max_length=10000)
    model: Optional[str] = None
    color: str
    inputs: list[CreatorStudioAgentInput] = Field(default_factory=list)
    enabledCapabilities: Optional[CreatorStudioAgentCapabilities] = None
    isPublic: Optional[bool] = False
    welcomeMessage: Optional[str] = None
    starterQuestions: list[str] = Field(default_factory=list)


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
    createdAt: str
    files: list[CreatorStudioKnowledgeFileOut]
    enabledCapabilities: Optional[CreatorStudioAgentCapabilities] = None
    isPublic: Optional[bool] = False
    welcomeMessage: Optional[str] = None
    starterQuestions: list[str] = Field(default_factory=list)


class CreatorStudioAgentSuggestRequest(BaseModel):
    name: str
    description: Optional[str] = None
    instruction: Optional[str] = None
    notes: Optional[str] = None
    action: Literal["suggest", "refine", "regenerate"] = "suggest"
    model: Optional[str] = None
    enabledCapabilities: Optional[CreatorStudioAgentCapabilities] = None


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


class CreatorStudioChatMessage(BaseModel):
    role: Literal["user", "model", "system"]
    content: str


class CreatorStudioAssistModelResponse(BaseModel):
    model: Optional[str] = None


class CreatorStudioChatRequest(BaseModel):
    agentId: str
    message: str
    inputsContext: Optional[str] = None
    messages: Optional[list[CreatorStudioChatMessage]] = None


class CreatorStudioAgentPreviewPayload(BaseModel):
    # Relaxed validation for unsaved draft previews.
    name: str = Field(default="", max_length=100)
    description: str = Field(default="", max_length=500)
    instruction: str = Field(default="", max_length=10000)
    model: Optional[str] = None
    color: str = "bg-slate-600"
    inputs: list[CreatorStudioAgentInput] = Field(default_factory=list)
    enabledCapabilities: Optional[CreatorStudioAgentCapabilities] = None
    isPublic: Optional[bool] = False
    welcomeMessage: Optional[str] = None
    starterQuestions: list[str] = Field(default_factory=list)


class CreatorStudioPreviewChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=10000)
    draftConfig: CreatorStudioAgentPreviewPayload
    inputsContext: Optional[str] = None
    messages: Optional[list[CreatorStudioChatMessage]] = None


class CreatorStudioPlatformSettings(BaseModel):
    SERPAPI_KEY: Optional[str] = None
    GOOGLE_SEARCH_API_KEY: Optional[str] = None
    GOOGLE_SEARCH_CX: Optional[str] = None


class CreatorStudioAgentBuildRequest(BaseModel):
    message: str
    agent_id: Optional[str] = None
    current_state: Optional[dict] = None
    history: Optional[list[CreatorStudioChatMessage]] = None



class CreatorStudioAgentBuildResponse(BaseModel):
    architect_message: str
    suggested_changes: Optional[dict] = None


class AgentActionResponse(BaseModel):
    id: str
    label: str
    type: str
