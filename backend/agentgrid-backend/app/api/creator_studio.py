import uuid
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user
from app.core.security import create_access_token
from app.models.agent import Agent
from app.models.creator_studio import (
    CreatorStudioKnowledgeFile,
    CreatorStudioKnowledgeChunk,
    CreatorStudioLLMConfig,
)
from app.models.enums import AgentCategory, AgentStatus, UserRole
from app.models.user import User
from app.schemas.creator_studio import (
    CreatorStudioAgentOut,
    CreatorStudioAgentPayload,
    CreatorStudioAgentSuggestRequest,
    CreatorStudioAgentSuggestResponse,
    CreatorStudioAssistModelResponse,
    CreatorStudioAssistModelUpdate,
    CreatorStudioAuthRequest,
    CreatorStudioAuthResponse,
    CreatorStudioChatRequest,
    CreatorStudioGuestCreditsRequest,
    CreatorStudioGuestCreditsResponse,
    CreatorStudioKnowledgeFileOut,
    CreatorStudioLLMConfigOut,
    CreatorStudioLLMConfigUpdate,
    CreatorStudioPublicChatRequest,
    CreatorStudioUserOut,
)
from app.schemas.user import UserCreate
from app.services.auth import authenticate_user, register_user
from app.services.creator_studio import (
    VECTOR_INDEX,
    add_guest_credits,
    build_agent_suggest_prompt,
    build_context,
    build_system_instruction,
    chunk_text,
    deduct_guest_credits,
    embed_texts,
    extract_text,
    format_size,
    generate_response,
    get_assist_model,
    get_llm_config,
    get_provider_for_model,
    get_or_create_guest_credits,
    parse_agent_suggest_response,
    resolve_llm_key,
    set_app_setting,
    stream_response,
)

router = APIRouter(prefix="/creator-studio/api", tags=["creator-studio"])

CREATOR_STUDIO_SOURCE = "creator_studio"
DEFAULT_MODEL = "gemini-3-flash-preview"
DEFAULT_COLOR = "bg-slate-600"


def _coerce_uuid(value: str) -> uuid.UUID:
    try:
        return uuid.UUID(str(value))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid identifier") from exc


def _format_user(user: User) -> CreatorStudioUserOut:
    return CreatorStudioUserOut(
        id=user.id,
        email=user.email,
        name=user.full_name or user.username,
        role=user.role.value if hasattr(user.role, "value") else str(user.role),
    )


def _format_files(db: Session, agent_id: uuid.UUID) -> list[CreatorStudioKnowledgeFileOut]:
    files = (
        db.query(CreatorStudioKnowledgeFile)
        .filter(CreatorStudioKnowledgeFile.agent_id == agent_id)
        .all()
    )
    return [
        CreatorStudioKnowledgeFileOut(
            id=str(file.id),
            name=file.name,
            size=format_size(file.size_bytes),
        )
        for file in files
    ]


def _creator_config(agent: Agent) -> dict:
    if isinstance(agent.config, dict):
        return agent.config.get("creator_studio", {}) or {}
    return {}


def _creator_agent_out(db: Session, agent: Agent) -> CreatorStudioAgentOut:
    creator_cfg = _creator_config(agent)
    inputs = creator_cfg.get("inputs") if isinstance(creator_cfg.get("inputs"), list) else []
    model = creator_cfg.get("model") or DEFAULT_MODEL
    color = creator_cfg.get("color") or DEFAULT_COLOR
    instruction = creator_cfg.get("instruction") or ""
    created_at = agent.created_at.isoformat()
    return CreatorStudioAgentOut(
        id=str(agent.id),
        name=agent.name,
        description=agent.description,
        instruction=instruction,
        model=model,
        color=color,
        inputs=inputs,
        isPublic=bool(agent.is_public),
        creditsPerRun=int(agent.price_per_run),
        createdAt=created_at,
        files=_format_files(db, agent.id),
    )


def _require_admin(user: User) -> None:
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required.")


def _build_username(db: Session, email: str) -> str:
    base = email.split("@", 1)[0].strip() or "creator"
    slug = "".join(ch for ch in base if ch.isalnum() or ch in ("-", "_"))
    slug = slug or "creator"
    slug = slug[:40]
    candidate = slug
    while db.query(User).filter(User.username == candidate).first():
        suffix = uuid.uuid4().hex[:6]
        trim = max(1, 40 - len(suffix) - 1)
        candidate = f"{slug[:trim]}-{suffix}"
    return candidate


@router.get("/health")
async def health_check() -> dict:
    return {"ok": True}


@router.post("/auth/register", response_model=CreatorStudioAuthResponse)
def register(payload: CreatorStudioAuthRequest, db: Session = Depends(get_db)) -> CreatorStudioAuthResponse:
    email = payload.email.strip().lower()
    username = _build_username(db, email)
    try:
        user_in = UserCreate(
            email=email,
            username=username,
            password=payload.password,
            role=UserRole.CREATOR,
            credits=0,
        )
    except ValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    user = register_user(db, user_in)
    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    return CreatorStudioAuthResponse(token=token, user=_format_user(user))


@router.post("/auth/login", response_model=CreatorStudioAuthResponse)
def login(payload: CreatorStudioAuthRequest, db: Session = Depends(get_db)) -> CreatorStudioAuthResponse:
    user = authenticate_user(db, payload.email, payload.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    return CreatorStudioAuthResponse(token=token, user=_format_user(user))


@router.get("/me", response_model=CreatorStudioUserOut)
def me(current_user: User = Depends(get_current_user)) -> CreatorStudioUserOut:
    return _format_user(current_user)


@router.get("/agents", response_model=list[CreatorStudioAgentOut])
def list_agents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[CreatorStudioAgentOut]:
    agents = (
        db.query(Agent)
        .filter(
            Agent.creator_id == current_user.id,
            Agent.source == CREATOR_STUDIO_SOURCE,
        )
        .order_by(Agent.created_at.desc())
        .all()
    )
    return [_creator_agent_out(db, agent) for agent in agents]


@router.post("/agents", response_model=CreatorStudioAgentOut)
def create_agent(
    payload: CreatorStudioAgentPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CreatorStudioAgentOut:
    config = {
        "creator_studio": {
            "instruction": payload.instruction,
            "model": payload.model or DEFAULT_MODEL,
            "color": payload.color,
            "inputs": [item.model_dump() for item in payload.inputs],
        }
    }
    agent = Agent(
        id=uuid.uuid4(),
        name=payload.name,
        description=payload.description,
        long_description=payload.description,
        category=AgentCategory.PRODUCTIVITY.value,
        tags=[],
        price_per_run=max(1, payload.creditsPerRun),
        status=AgentStatus.ACTIVE,
        config=config,
        capabilities=[],
        limitations=[],
        demo_available=False,
        is_public=payload.isPublic,
        source=CREATOR_STUDIO_SOURCE,
        creator_id=current_user.id,
        version="1.0.0",
    )
    db.add(agent)
    db.commit()
    db.refresh(agent)
    return _creator_agent_out(db, agent)


@router.put("/agents/{agent_id}", response_model=CreatorStudioAgentOut)
def update_agent(
    agent_id: str,
    payload: CreatorStudioAgentPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CreatorStudioAgentOut:
    agent = (
        db.query(Agent)
        .filter(
            Agent.id == _coerce_uuid(agent_id),
            Agent.creator_id == current_user.id,
            Agent.source == CREATOR_STUDIO_SOURCE,
        )
        .first()
    )
    if agent is None:
        raise HTTPException(status_code=404, detail="Agent not found.")

    creator_cfg = _creator_config(agent)
    creator_cfg.update(
        {
            "instruction": payload.instruction,
            "model": payload.model or creator_cfg.get("model") or DEFAULT_MODEL,
            "color": payload.color,
            "inputs": [item.model_dump() for item in payload.inputs],
        }
    )
    config = dict(agent.config or {})
    config["creator_studio"] = creator_cfg

    agent.name = payload.name
    agent.description = payload.description
    agent.long_description = payload.description
    agent.price_per_run = max(1, payload.creditsPerRun)
    agent.is_public = payload.isPublic
    agent.config = config

    db.commit()
    db.refresh(agent)
    return _creator_agent_out(db, agent)


@router.delete("/agents/{agent_id}")
def delete_agent(
    agent_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    agent = (
        db.query(Agent)
        .filter(
            Agent.id == _coerce_uuid(agent_id),
            Agent.creator_id == current_user.id,
            Agent.source == CREATOR_STUDIO_SOURCE,
        )
        .first()
    )
    if agent is None:
        return {"ok": True}
    if VECTOR_INDEX is not None:
        VECTOR_INDEX.drop_agent(str(agent.id))
    db.delete(agent)
    db.commit()
    return {"ok": True}


@router.delete("/agents")
def delete_all_agents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    agents = (
        db.query(Agent)
        .filter(
            Agent.creator_id == current_user.id,
            Agent.source == CREATOR_STUDIO_SOURCE,
        )
        .all()
    )
    if VECTOR_INDEX is not None:
        for agent in agents:
            VECTOR_INDEX.drop_agent(str(agent.id))
    for agent in agents:
        db.delete(agent)
    db.commit()
    return {"ok": True}


@router.post("/agents/{agent_id}/files", response_model=list[CreatorStudioKnowledgeFileOut])
def upload_files(
    agent_id: str,
    files: list[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[CreatorStudioKnowledgeFileOut]:
    agent = (
        db.query(Agent)
        .filter(
            Agent.id == _coerce_uuid(agent_id),
            Agent.creator_id == current_user.id,
            Agent.source == CREATOR_STUDIO_SOURCE,
        )
        .first()
    )
    if agent is None:
        raise HTTPException(status_code=404, detail="Agent not found.")

    for upload in files:
        data = upload.file.read()
        upload.file.close()
        if not data:
            continue
        file_id = uuid.uuid4()
        db.add(
            CreatorStudioKnowledgeFile(
                id=file_id,
                agent_id=agent.id,
                name=upload.filename or "file",
                size_bytes=len(data),
            )
        )
        text = extract_text(upload.filename or "", data)
        chunks = chunk_text(text)
        embeddings = embed_texts(db, chunks)
        for idx, chunk in enumerate(chunks):
            embedding = embeddings[idx] if idx < len(embeddings) else []
            chunk_id = uuid.uuid4()
            db.add(
                CreatorStudioKnowledgeChunk(
                    id=chunk_id,
                    file_id=file_id,
                    agent_id=agent.id,
                    chunk_index=idx,
                    text=chunk,
                    embedding=embedding,
                )
            )
            if VECTOR_INDEX is not None and embedding:
                VECTOR_INDEX.add(str(agent.id), str(chunk_id), embedding, chunk)
    db.commit()
    return _format_files(db, agent.id)


@router.delete("/agents/{agent_id}/files/{file_id}")
def delete_file(
    agent_id: str,
    file_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    agent = (
        db.query(Agent)
        .filter(
            Agent.id == _coerce_uuid(agent_id),
            Agent.creator_id == current_user.id,
            Agent.source == CREATOR_STUDIO_SOURCE,
        )
        .first()
    )
    if agent is None:
        raise HTTPException(status_code=404, detail="Agent not found.")

    file = (
        db.query(CreatorStudioKnowledgeFile)
        .filter(
            CreatorStudioKnowledgeFile.id == _coerce_uuid(file_id),
            CreatorStudioKnowledgeFile.agent_id == agent.id,
        )
        .first()
    )
    if file is None:
        return {"ok": True}

    chunk_rows = (
        db.query(CreatorStudioKnowledgeChunk)
        .filter(
            CreatorStudioKnowledgeChunk.file_id == file.id,
            CreatorStudioKnowledgeChunk.agent_id == agent.id,
        )
        .all()
    )
    chunk_ids = [str(row.id) for row in chunk_rows]
    if VECTOR_INDEX is not None and chunk_ids:
        VECTOR_INDEX.remove(str(agent.id), chunk_ids)

    db.delete(file)
    db.commit()
    return {"ok": True}


@router.post("/agents/suggest", response_model=CreatorStudioAgentSuggestResponse)
def suggest_agent(
    payload: CreatorStudioAgentSuggestRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CreatorStudioAgentSuggestResponse:
    _ = current_user
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Agent name is required.")
    model = get_assist_model(db)
    if not model:
        raise HTTPException(status_code=400, detail="AI Assist model is not configured in Admin.")
    prompt = build_agent_suggest_prompt(payload.model_dump())
    system_instruction = (
        "You write agent metadata. Return ONLY valid JSON with keys \"description\" and \"instruction\"."
    )
    provider = get_provider_for_model(db, model)
    config = get_llm_config(db, provider)
    api_key = resolve_llm_key(provider, config)
    response_text = generate_response(provider, model, system_instruction, prompt, api_key)
    parsed = parse_agent_suggest_response(response_text, name)
    return CreatorStudioAgentSuggestResponse(**parsed)


@router.get("/public/agents", response_model=list[CreatorStudioAgentOut])
def list_public_agents(db: Session = Depends(get_db)) -> list[CreatorStudioAgentOut]:
    agents = (
        db.query(Agent)
        .filter(
            Agent.source == CREATOR_STUDIO_SOURCE,
            Agent.is_public.is_(True),
            Agent.status == AgentStatus.ACTIVE,
        )
        .order_by(Agent.created_at.desc())
        .all()
    )
    return [_creator_agent_out(db, agent) for agent in agents]


@router.get("/public/credits", response_model=CreatorStudioGuestCreditsResponse)
def get_public_credits(
    guestId: str,
    db: Session = Depends(get_db),
) -> CreatorStudioGuestCreditsResponse:
    credits = get_or_create_guest_credits(db, guestId)
    return CreatorStudioGuestCreditsResponse(credits=credits)


@router.post("/public/credits/purchase", response_model=CreatorStudioGuestCreditsResponse)
def purchase_public_credits(
    payload: CreatorStudioGuestCreditsRequest,
    db: Session = Depends(get_db),
) -> CreatorStudioGuestCreditsResponse:
    credits = add_guest_credits(db, payload.guestId, payload.amount)
    return CreatorStudioGuestCreditsResponse(credits=credits)


@router.post("/public/chat")
def public_chat(
    payload: CreatorStudioPublicChatRequest,
    db: Session = Depends(get_db),
) -> dict:
    agent = (
        db.query(Agent)
        .filter(
            Agent.id == _coerce_uuid(payload.agentId),
            Agent.source == CREATOR_STUDIO_SOURCE,
            Agent.is_public.is_(True),
        )
        .first()
    )
    if agent is None:
        raise HTTPException(status_code=404, detail="Agent not found.")
    cost = max(1, int(agent.price_per_run))
    deduct_guest_credits(db, payload.guestId, cost)
    creator_cfg = _creator_config(agent)
    instruction = creator_cfg.get("instruction") or ""
    model = creator_cfg.get("model") or DEFAULT_MODEL
    context_chunks = build_context(db, str(agent.id), payload.message)
    system_instruction = build_system_instruction(instruction, context_chunks, payload.inputsContext)
    provider = get_provider_for_model(db, model)
    config = get_llm_config(db, provider)
    api_key = resolve_llm_key(provider, config)
    text = generate_response(provider, model, system_instruction, payload.message, api_key)
    return {"text": text}


@router.post("/public/chat/stream")
def public_chat_stream(
    payload: CreatorStudioPublicChatRequest,
    db: Session = Depends(get_db),
) -> StreamingResponse:
    agent = (
        db.query(Agent)
        .filter(
            Agent.id == _coerce_uuid(payload.agentId),
            Agent.source == CREATOR_STUDIO_SOURCE,
            Agent.is_public.is_(True),
        )
        .first()
    )
    if agent is None:
        raise HTTPException(status_code=404, detail="Agent not found.")
    cost = max(1, int(agent.price_per_run))
    deduct_guest_credits(db, payload.guestId, cost)
    creator_cfg = _creator_config(agent)
    instruction = creator_cfg.get("instruction") or ""
    model = creator_cfg.get("model") or DEFAULT_MODEL
    context_chunks = build_context(db, str(agent.id), payload.message)
    system_instruction = build_system_instruction(instruction, context_chunks, payload.inputsContext)
    provider = get_provider_for_model(db, model)
    config = get_llm_config(db, provider)
    api_key = resolve_llm_key(provider, config)

    def stream() -> Any:
        try:
            for chunk in stream_response(provider, model, system_instruction, payload.message, api_key):
                yield chunk
        except Exception as exc:
            error_payload = f"\n[Error] {exc}"
            yield error_payload.encode("utf-8")

    return StreamingResponse(stream(), media_type="text/plain")


@router.post("/chat")
def chat(
    payload: CreatorStudioChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    agent = (
        db.query(Agent)
        .filter(
            Agent.id == _coerce_uuid(payload.agentId),
            Agent.creator_id == current_user.id,
            Agent.source == CREATOR_STUDIO_SOURCE,
        )
        .first()
    )
    if agent is None:
        raise HTTPException(status_code=404, detail="Agent not found.")
    creator_cfg = _creator_config(agent)
    instruction = creator_cfg.get("instruction") or ""
    model = creator_cfg.get("model") or DEFAULT_MODEL
    context_chunks = build_context(db, str(agent.id), payload.message)
    system_instruction = build_system_instruction(instruction, context_chunks, payload.inputsContext)
    provider = get_provider_for_model(db, model)
    config = get_llm_config(db, provider)
    api_key = resolve_llm_key(provider, config)
    text = generate_response(provider, model, system_instruction, payload.message, api_key)
    return {"text": text}


@router.post("/chat/stream")
def chat_stream(
    payload: CreatorStudioChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> StreamingResponse:
    agent = (
        db.query(Agent)
        .filter(
            Agent.id == _coerce_uuid(payload.agentId),
            Agent.creator_id == current_user.id,
            Agent.source == CREATOR_STUDIO_SOURCE,
        )
        .first()
    )
    if agent is None:
        raise HTTPException(status_code=404, detail="Agent not found.")
    creator_cfg = _creator_config(agent)
    instruction = creator_cfg.get("instruction") or ""
    model = creator_cfg.get("model") or DEFAULT_MODEL
    context_chunks = build_context(db, str(agent.id), payload.message)
    system_instruction = build_system_instruction(instruction, context_chunks, payload.inputsContext)
    provider = get_provider_for_model(db, model)
    config = get_llm_config(db, provider)
    api_key = resolve_llm_key(provider, config)

    def stream() -> Any:
        try:
            for chunk in stream_response(provider, model, system_instruction, payload.message, api_key):
                yield chunk
        except Exception as exc:
            error_payload = f"\n[Error] {exc}"
            yield error_payload.encode("utf-8")

    return StreamingResponse(stream(), media_type="text/plain")


@router.get("/admin/llm-configs", response_model=list[CreatorStudioLLMConfigOut])
def list_llm_configs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[CreatorStudioLLMConfigOut]:
    _require_admin(current_user)
    rows = db.query(CreatorStudioLLMConfig).order_by(CreatorStudioLLMConfig.id).all()
    return [
        CreatorStudioLLMConfigOut(
            id=row.id,
            name=row.name,
            provider=row.provider,
            enabled=bool(row.enabled),
            apiKey=row.api_key,
            usage=row.usage,
            limit=row.limit_amount,
        )
        for row in rows
    ]


@router.put("/admin/llm-configs/{config_id}", response_model=CreatorStudioLLMConfigOut)
def update_llm_config(
    config_id: str,
    payload: CreatorStudioLLMConfigUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CreatorStudioLLMConfigOut:
    _require_admin(current_user)
    row = db.get(CreatorStudioLLMConfig, config_id)
    if row is None:
        raise HTTPException(status_code=404, detail=f"LLM config {config_id} not found.")
    if payload.enabled is not None:
        row.enabled = payload.enabled
    if payload.apiKey is not None:
        row.api_key = payload.apiKey
    if payload.usage is not None:
        row.usage = payload.usage
    if payload.limit is not None:
        row.limit_amount = payload.limit
    db.commit()
    db.refresh(row)
    return CreatorStudioLLMConfigOut(
        id=row.id,
        name=row.name,
        provider=row.provider,
        enabled=bool(row.enabled),
        apiKey=row.api_key,
        usage=row.usage,
        limit=row.limit_amount,
    )


@router.get("/admin/assist-model", response_model=CreatorStudioAssistModelResponse)
def get_admin_assist_model(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CreatorStudioAssistModelResponse:
    _require_admin(current_user)
    value = get_assist_model(db)
    return CreatorStudioAssistModelResponse(model=value)


@router.put("/admin/assist-model", response_model=CreatorStudioAssistModelResponse)
def update_admin_assist_model(
    payload: CreatorStudioAssistModelUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CreatorStudioAssistModelResponse:
    _require_admin(current_user)
    model = payload.model.strip()
    if not model:
        raise HTTPException(status_code=400, detail="Model is required.")
    _ = get_provider_for_model(db, model)
    set_app_setting(db, "assist_model", model)
    return CreatorStudioAssistModelResponse(model=model)
