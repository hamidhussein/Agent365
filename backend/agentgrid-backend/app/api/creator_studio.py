import uuid
import os
from typing import Any

import copy
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, BackgroundTasks, Request
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import ValidationError
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.db.session import SessionLocal

from app.core.deps import get_db, get_current_user, get_current_user_optional
from app.core.security import create_access_token
from app.models.agent import Agent
from app.models.execution import AgentExecution
from app.models.creator_studio import (
    CreatorStudioKnowledgeFile,
    CreatorStudioKnowledgeChunk,
    CreatorStudioLLMConfig,
)
from app.models.transaction import CreditTransaction
from app.models.enums import AgentCategory, AgentStatus, UserRole, ExecutionStatus, ReviewStatus, TransactionType
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
    CreatorStudioPlatformSettings,
    CreatorStudioPublicChatRequest,
    CreatorStudioUserOut,
    CreatorStudioAgentBuildRequest,
    CreatorStudioAgentBuildResponse,
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
    get_default_enabled_model,
    build_agent_chat,
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
        return copy.deepcopy(agent.config.get("creator_studio", {}) or {})
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
        allow_reviews=bool(agent.allow_reviews),
        review_cost=int(agent.review_cost),
        enabledCapabilities=creator_cfg.get("enabledCapabilities"),
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
    # Enforce Admin-Controlled Model Selection
    # Ignore payload.model and always use the default enabled model
    forced_model = get_default_enabled_model(db)
    
    config = {
        "creator_studio": {
            "instruction": payload.instruction,
            "model": forced_model, # Override user selection
            "color": payload.color,
            "inputs": [item.model_dump() for item in payload.inputs],
            "enabledCapabilities": payload.enabledCapabilities.model_dump() if payload.enabledCapabilities else None,
        }
    }
    
    # Map capabilities
    caps_list = []
    if payload.enabledCapabilities:
        if payload.enabledCapabilities.codeExecution:
            caps_list.append("code_execution")
        if payload.enabledCapabilities.webBrowsing:
            caps_list.append("web_search")
        if payload.enabledCapabilities.apiIntegrations:
            caps_list.append("api_access")
        if payload.enabledCapabilities.fileHandling:
            caps_list.append("file_handling")

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
        capabilities=caps_list,
        limitations=[],
        demo_available=False,
        is_public=payload.isPublic,
        source=CREATOR_STUDIO_SOURCE,
        creator_id=current_user.id,
        version="1.0.0",
        allow_reviews=payload.allow_reviews,
        review_cost=payload.review_cost,
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
    # Enforce Admin-Controlled Model Selection
    forced_model = get_default_enabled_model(db)
    
    creator_cfg.update(
        {
            "instruction": payload.instruction,
            "model": forced_model, # Override
            "color": payload.color,
            "inputs": [item.model_dump() for item in payload.inputs],
            "enabledCapabilities": payload.enabledCapabilities.model_dump() if payload.enabledCapabilities else creator_cfg.get("enabledCapabilities"),
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
    flag_modified(agent, "config")
    agent.allow_reviews = payload.allow_reviews
    agent.review_cost = payload.review_cost

    # Map capabilities update
    if payload.enabledCapabilities:
        caps_list = []
        if payload.enabledCapabilities.codeExecution:
            caps_list.append("code_execution")
        if payload.enabledCapabilities.webBrowsing:
            caps_list.append("web_search")
        if payload.enabledCapabilities.apiIntegrations:
            caps_list.append("api_access")
        if payload.enabledCapabilities.fileHandling:
            caps_list.append("file_handling")
        agent.capabilities = caps_list
        flag_modified(agent, "capabilities")

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


def process_knowledge_file_background(
    agent_id: uuid.UUID,
    file_id: uuid.UUID,
    filename: str,
    data: bytes,
):
    db = SessionLocal()
    try:
        text = extract_text(filename, data)
        chunks = chunk_text(text)
        embeddings = embed_texts(db, chunks)
        for idx, chunk in enumerate(chunks):
            embedding = embeddings[idx] if idx < len(embeddings) else []
            chunk_id = uuid.uuid4()
            db.add(
                CreatorStudioKnowledgeChunk(
                    id=chunk_id,
                    file_id=file_id,
                    agent_id=agent_id,
                    chunk_index=idx,
                    text=chunk,
                    embedding=embedding,
                )
            )
            if VECTOR_INDEX is not None and embedding:
                VECTOR_INDEX.add(str(agent_id), str(chunk_id), embedding, chunk)
        db.commit()
    except Exception as e:
        print(f"Error in background processing for file {file_id}: {e}")
        db.rollback()
    finally:
        db.close()


@router.post("/agents/{agent_id}/files", response_model=list[CreatorStudioKnowledgeFileOut])
def upload_files(
    agent_id: str,
    background_tasks: BackgroundTasks,
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
        # Process in background
        background_tasks.add_task(
            process_knowledge_file_background,
            agent.id,
            file_id,
            upload.filename or "",
            data
        )
        
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


@router.post("/files/extract")
def extract_file_text(
    file: UploadFile = File(...),
    current_user: User | None = Depends(get_current_user_optional),
) -> dict:
    data = file.file.read()
    file.file.close()
    if not data:
        return {"text": ""}
    
    filename = file.filename or "file"
    if len(data) > 10 * 1024 * 1024:
         raise HTTPException(status_code=400, detail="File too large (max 10MB)")

    try:
        text = extract_text(filename, data)
        return {"text": text}
    except Exception as e:
        print(f"Extraction failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to extract text from file")


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


@router.post("/agents/build", response_model=CreatorStudioAgentBuildResponse)
def build_agent_architect(
    payload: CreatorStudioAgentBuildRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CreatorStudioAgentBuildResponse:
    # Use architect chat to refine agent metadata
    result = build_agent_chat(
        db,
        message=payload.message,
        current_state=payload.current_state,
        history=[m.model_dump() for m in payload.history] if payload.history else None,
    )
    return CreatorStudioAgentBuildResponse(**result)


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


@router.post("/public/executions/{execution_id}/review")
def request_guest_review(
    request: Request,
    execution_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
) -> dict:
    print(f"[DEBUG] Headers: {dict(request.headers)}", flush=True)
    try:
        exec_uuid = _coerce_uuid(execution_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid execution ID")

    execution = db.get(AgentExecution, exec_uuid)
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")

    if not execution.agent.allow_reviews:
        raise HTTPException(status_code=400, detail="This agent does not support reviews")
    
    if not execution.agent.is_public:
         raise HTTPException(status_code=403, detail="Not authorized")

    if execution.review_status not in (ReviewStatus.NONE, ReviewStatus.REJECTED):
        raise HTTPException(status_code=400, detail="Review already requested or completed")

    guest_id = payload.get("guestId")
    note = payload.get("note")
    
    print(f"[DEBUG] request_guest_review: execution_id={execution_id}, guest_id={guest_id}, current_user={current_user.username if current_user else 'None'}", flush=True)
    
    cost = execution.agent.review_cost
    if cost > 0:
        if current_user:
            if current_user.credits < cost:
                raise HTTPException(status_code=402, detail=f"User {current_user.username} has only {current_user.credits} credits. Review costs {cost} credits.")
            current_user.credits -= cost
            db.add(current_user)
            # Add transaction record
            transaction = CreditTransaction(
                user_id=current_user.id,
                amount=-cost,
                transaction_type=TransactionType.USAGE,
                description=f"Review Request for execution {execution_id}",
            )
            db.add(transaction)
        elif guest_id:
            credits = get_or_create_guest_credits(db, guest_id)
            if credits < cost:
                 raise HTTPException(status_code=402, detail=f"Guest session has only {credits} credits. Review costs {cost} credits.")
            deduct_guest_credits(db, guest_id, cost)
        else:
            raise HTTPException(status_code=401, detail="Authentication required or guestId missing")
    
    execution.review_status = ReviewStatus.PENDING
    execution.review_request_note = note
    db.commit()
    db.refresh(execution)
    
    return {"status": "success", "execution_id": str(execution.id)}


@router.get("/public/executions/{execution_id}")
def get_public_execution(
    execution_id: str,
    db: Session = Depends(get_db),
) -> dict:
    try:
        exec_uuid = _coerce_uuid(execution_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid execution ID")

    execution = db.get(AgentExecution, exec_uuid)
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")

    if not execution.agent.is_public:
         raise HTTPException(status_code=403, detail="Not authorized")

    # We return the data in a format similar to AgentExecutionRead
    return {
        "id": str(execution.id),
        "status": execution.status,
        "review_status": execution.review_status,
        "review_request_note": execution.review_request_note,
        "review_response_note": execution.review_response_note,
        "outputs": execution.outputs,
        "reviewed_at": execution.reviewed_at.isoformat() if execution.reviewed_at else None
    }


@router.post("/public/chat")
def public_chat(
    payload: CreatorStudioPublicChatRequest,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
) -> dict:
    # Handle Preview Case
    if payload.agentId == 'preview' and payload.draftConfig:
        draft = payload.draftConfig
        instruction = draft.get("instruction", "")
        model = draft.get("model")
        if not model or model == "auto":
            model = get_default_enabled_model(db)
        capabilities = draft.get("enabledCapabilities")
        
        # For preview, we skip context (RAG) unless we want to simulate it.
        # Let's just use the instruction and capabilities for now.
        system_instruction = build_system_instruction(instruction, [], payload.inputsContext, capabilities)
        
        provider = get_provider_for_model(db, model)
        config = get_llm_config(db, provider)
        api_key = resolve_llm_key(provider, config)
        
        # Convert history
        history = []
        if payload.messages:
            for m in payload.messages:
                history.append({"role": m.role, "content": m.content})
                
        text = generate_response(provider, model, system_instruction, payload.message, api_key, db=db, history=history)
        return {"text": text, "execution_id": "preview"}

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
    if current_user:
        if current_user.credits < cost:
            raise HTTPException(status_code=402, detail=f"Not enough credits. Run costs {cost} credits.")
        current_user.credits -= cost
        db.add(current_user)
        transaction = CreditTransaction(
            user_id=current_user.id,
            amount=-cost,
            transaction_type=TransactionType.USAGE,
            description=f"Run Agent: {agent.name}",
        )
        db.add(transaction)
    else:
        deduct_guest_credits(db, payload.guestId, cost)
    creator_cfg = _creator_config(agent)
    instruction = creator_cfg.get("instruction") or ""
    model = creator_cfg.get("model") or DEFAULT_MODEL
    capabilities = creator_cfg.get("enabledCapabilities")
    context_chunks = build_context(db, str(agent.id), payload.message)
    system_instruction = build_system_instruction(instruction, context_chunks, payload.inputsContext, capabilities)
    provider = get_provider_for_model(db, model)
    config = get_llm_config(db, provider)
    api_key = resolve_llm_key(provider, config)
    text = generate_response(provider, model, system_instruction, payload.message, api_key, db=db)
    
    # Create execution record for Human-in-Loop
    # Note: guestId is not a real user, so we cannot set user_id if it's FK to users table and not nullable.
    # Assuming user_id can be nullable or we skip execution creation if strict.
    # Let's check AgentExecution model. If user_id is required, we effectively cannot use AgentExecution for guests without a dummy user.
    # For now, we will TRY to insert None. If it fails, we catch it.
    execution_id = None
    try:
        execution = AgentExecution(
            id=uuid.uuid4(),
            agent_id=agent.id,
            user_id=current_user.id if current_user else None, # Authenticated user or Guest
            status=ExecutionStatus.COMPLETED,
            inputs={"message": payload.message, "inputsContext": payload.inputsContext, "guestId": payload.guestId},
            outputs={"text": text},
            credits_used=cost,
            error_message=None,
        )
        db.add(execution)
        db.commit()
        execution_id = str(execution.id)
    except Exception as e:
        print(f"Failed to create execution for guest: {e}")
        # If user_id is non-nullable, this will fail.
        # Fallback: maybe don't create execution for guest, but then Review feature won't work for guests.
        # Proceeding without execution ID.
        pass

    return {"text": text, "execution_id": execution_id}


@router.post("/public/chat/stream")
def public_chat_stream(
    payload: CreatorStudioPublicChatRequest,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
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
    if current_user:
        if current_user.credits < cost:
            raise HTTPException(status_code=402, detail=f"Not enough credits. Run costs {cost} credits.")
        current_user.credits -= cost
        db.add(current_user)
        transaction = CreditTransaction(
            user_id=current_user.id,
            amount=-cost,
            transaction_type=TransactionType.USAGE,
            description=f"Run Agent: {agent.name}",
        )
        db.add(transaction)
    else:
        deduct_guest_credits(db, payload.guestId, cost)
    creator_cfg = _creator_config(agent)
    instruction = creator_cfg.get("instruction") or ""
    model = creator_cfg.get("model") or DEFAULT_MODEL
    capabilities = creator_cfg.get("enabledCapabilities")
    context_chunks = build_context(db, str(agent.id), payload.message)
    system_instruction = build_system_instruction(instruction, context_chunks, payload.inputsContext, capabilities)
    provider = get_provider_for_model(db, model)
    config = get_llm_config(db, provider)
    api_key = resolve_llm_key(provider, config)

    # Convert history
    history_dicts = []
    if payload.messages:
        for m in payload.messages:
            history_dicts.append({"role": m.role, "content": m.content})

    # Create execution record
    execution = AgentExecution(
        id=uuid.uuid4(),
        agent_id=agent.id,
        user_id=current_user.id if current_user else None, # Authenticated user or Guest
        status=ExecutionStatus.RUNNING,
        inputs={"message": payload.message, "inputsContext": payload.inputsContext, "guestId": payload.guestId},
        outputs={},
        credits_used=cost,
        error_message=None,
    )
    # Handle potential DB constraint error if user_id is not nullable
    try:
        db.add(execution)
        db.commit()
        db.refresh(execution)
    except Exception as e:
        print(f"Failed to create execution start for guest: {e}")
        db.rollback()
        execution = None

    def stream() -> Any:
        full_text = ""
        try:
            for chunk in stream_response(provider, model, system_instruction, payload.message, api_key, str(execution.id) if execution else None, db=db, history=history_dicts):
                if isinstance(chunk, bytes):
                    full_text += chunk.decode("utf-8")
                else:
                    full_text += chunk
                yield chunk
            
            # Update execution on completion
            if execution:
                execution.status = ExecutionStatus.COMPLETED
                execution.outputs = {"text": full_text, "streamed": True}
                db.commit()

        except Exception as exc:
            error_payload = f"\n[Error] {exc}"
            if execution:
                execution.status = ExecutionStatus.FAILED
                execution.error_message = str(exc)
                db.commit()
            yield error_payload.encode("utf-8")

    headers = {}
    if execution:
        headers["X-Execution-Id"] = str(execution.id)
    
    # Add CORS headers for streaming response
    headers["Access-Control-Allow-Origin"] = "*"
    headers["Access-Control-Allow-Credentials"] = "true"
    headers["Access-Control-Expose-Headers"] = "X-Execution-Id"

    return StreamingResponse(stream(), media_type="text/plain", headers=headers)


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
    capabilities = creator_cfg.get("enabledCapabilities")
    context_chunks = build_context(db, str(agent.id), payload.message)
    system_instruction = build_system_instruction(instruction, context_chunks, payload.inputsContext, capabilities)
    provider = get_provider_for_model(db, model)
    config = get_llm_config(db, provider)
    api_key = resolve_llm_key(provider, config)

    # Convert history
    history_dicts = []
    if payload.messages:
        for m in payload.messages:
            history_dicts.append({"role": m.role, "content": m.content})

    text = generate_response(provider, model, system_instruction, payload.message, api_key, db=db, history=history_dicts)
    
    # Create execution record
    execution_id = None
    try:
        execution = AgentExecution(
            id=uuid.uuid4(),
            agent_id=agent.id,
            user_id=current_user.id,
            status=ExecutionStatus.COMPLETED,
            inputs={"message": payload.message, "inputsContext": payload.inputsContext},
            outputs={"text": text},
            credits_used=0, # Creator/Internal usage might be free? or check payload? For now 0 or agent price?
            # Creating agent run usually costs credits unless it's the creator?
            # The chat endpoint does NOT deduct credits in the current code (unlike public_chat).
            # So credits_used=0.
            error_message=None,
        )
        db.add(execution)
        db.commit()
        execution_id = str(execution.id)
    except Exception as e:
        print(f"Failed to create execution for user: {e}")

    return {"text": text, "execution_id": execution_id}


@router.post("/chat/stream")
def chat_stream(
    payload: CreatorStudioChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> StreamingResponse:
    try:
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
        capabilities = creator_cfg.get("enabledCapabilities")
        
        print(f"[chat_stream] Agent: {agent.id}, Model: {model}", flush=True)
        
        context_chunks = build_context(db, str(agent.id), payload.message)
        system_instruction = build_system_instruction(instruction, context_chunks, payload.inputsContext, capabilities)
        
        provider = get_provider_for_model(db, model)
        print(f"[chat_stream] Provider: {provider}", flush=True)
        
        config = get_llm_config(db, provider)
        api_key = resolve_llm_key(provider, config)
        
        if not api_key:
            raise HTTPException(status_code=500, detail=f"{provider} API key is not configured.")

        # Convert history
        history_dicts = []
        if payload.messages:
            for m in payload.messages:
                history_dicts.append({"role": m.role, "content": m.content})

        # Create execution record (RUNNING)
        execution = AgentExecution(
            id=uuid.uuid4(),
            agent_id=agent.id,
            user_id=current_user.id,
            status=ExecutionStatus.RUNNING,
            inputs={"message": payload.message, "inputsContext": payload.inputsContext},
            outputs={},
            credits_used=0,
            error_message=None,
        )
        db.add(execution)
        db.commit() # ID is generated
        
        print(f"[chat_stream] Execution created: {execution.id}", flush=True)
        
        def stream() -> Any:
            full_text = ""
            try:
                for chunk in stream_response(provider, model, system_instruction, payload.message, api_key, execution_id=str(execution.id), db=db, history=history_dicts):
                    if isinstance(chunk, bytes):
                        full_text += chunk.decode("utf-8")
                    else:
                        full_text += chunk
                    yield chunk
                
                # Update execution
                execution.status = ExecutionStatus.COMPLETED
                execution.outputs = {"text": full_text, "streamed": True}
                db.commit()

            except Exception as exc:
                import traceback
                traceback.print_exc()
                error_payload = f"\n[Error] {exc}"
                execution.status = ExecutionStatus.FAILED
                execution.error_message = str(exc)
                db.commit()
                yield error_payload.encode("utf-8")

        headers = {
            "X-Execution-Id": str(execution.id),
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Expose-Headers": "X-Execution-Id",
        }
        return StreamingResponse(stream(), media_type="text/plain", headers=headers)
    
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        # Catch any other errors and log them
        import traceback
        print(f"[chat_stream] ERROR: {e}", flush=True)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@router.get("/admin/settings", response_model=CreatorStudioPlatformSettings)
def get_platform_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve global platform settings (API keys for Search, etc).
    """
    _require_admin(current_user)
    from app.services.creator_studio import get_app_setting
    return {
        "SERPAPI_KEY": get_app_setting(db, "SERPAPI_KEY"),
        "GOOGLE_SEARCH_API_KEY": get_app_setting(db, "GOOGLE_SEARCH_API_KEY"),
        "GOOGLE_SEARCH_CX": get_app_setting(db, "GOOGLE_SEARCH_CX"),
    }


@router.post("/admin/settings")
def update_platform_settings(
    payload: CreatorStudioPlatformSettings,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update global platform settings.
    """
    _require_admin(current_user)
    from app.services.creator_studio import set_app_setting
    if payload.SERPAPI_KEY is not None:
        set_app_setting(db, "SERPAPI_KEY", payload.SERPAPI_KEY)
    if payload.GOOGLE_SEARCH_API_KEY is not None:
        set_app_setting(db, "GOOGLE_SEARCH_API_KEY", payload.GOOGLE_SEARCH_API_KEY)
    if payload.GOOGLE_SEARCH_CX is not None:
        set_app_setting(db, "GOOGLE_SEARCH_CX", payload.GOOGLE_SEARCH_CX)
    
    return {"message": "Settings updated"}


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


@router.get("/files/{execution_id}/{filename}")
def get_generated_file(
    execution_id: str,
    filename: str,
) -> FileResponse:
    """
    Serve generated files from code execution.
    """
    file_path = os.path.join(os.getcwd(), ".generated_files", execution_id, filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    # Security check: ensure path is within .generated_files
    real_path = os.path.realpath(file_path)
    base_path = os.path.realpath(os.path.join(os.getcwd(), ".generated_files"))
    if not real_path.startswith(base_path):
        raise HTTPException(status_code=403, detail="Access denied")
    
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="application/octet-stream"
    )
