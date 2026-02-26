import uuid
import os
import uuid
from datetime import datetime
from typing import Any

import copy
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, BackgroundTasks
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.db.session import SessionLocal

from app.core.deps import get_db, get_current_user, get_current_user_optional
from app.models.agent import Agent
from app.models.execution import AgentExecution
from app.models.creator_studio import (
    CreatorStudioKnowledgeFile,
    CreatorStudioKnowledgeChunk,
    CreatorStudioLLMConfig,
)
from app.models.enums import AgentCategory, AgentStatus, UserRole, ExecutionStatus
from app.models.user import User
from app.schemas.creator_studio import (
    CreatorStudioAgentOut,
    CreatorStudioAgentPayload,
    CreatorStudioAgentSuggestRequest,
    CreatorStudioAgentSuggestResponse,
    CreatorStudioAssistModelResponse,
    CreatorStudioAssistModelUpdate,
    CreatorStudioChatRequest,
    CreatorStudioPreviewChatRequest,
    CreatorStudioKnowledgeFileOut,
    CreatorStudioLLMConfigOut,
    CreatorStudioLLMConfigUpdate,
    CreatorStudioPlatformSettings,
    CreatorStudioAgentBuildRequest,
    CreatorStudioAgentBuildResponse,
)
from app.api.v1.endpoints import agent_sharing
from app.services.creator_studio import (
    VECTOR_INDEX,
    build_agent_suggest_prompt,
    build_context,
    build_system_instruction,
    chunk_text,
    embed_texts,
    extract_text,
    format_size,
    generate_response,
    get_assist_model,
    get_default_enabled_model,
    build_agent_chat,
    get_llm_config,
    get_provider_for_model,
    parse_agent_suggest_response,
    resolve_llm_key,
    rewrite_query,
    sanitize_user_input,
    set_app_setting,
    stream_response,
)

router = APIRouter(prefix="/creator-studio/api", tags=["creator-studio"])

# Include agent sharing endpoints
router.include_router(agent_sharing.router, tags=["agent-sharing"])

DEFAULT_MODEL = "gemini-1.5-flash-preview"
DEFAULT_COLOR = "bg-slate-600"
GENERATED_FILES_DIR = os.path.join(os.getcwd(), ".generated_files")


def _coerce_uuid(value: str) -> uuid.UUID:
    try:
        return uuid.UUID(str(value))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid identifier") from exc


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
        createdAt=created_at,
        files=_format_files(db, agent.id),
        enabledCapabilities=creator_cfg.get("enabledCapabilities"),
        isPublic=agent.is_public,
        welcomeMessage=agent.welcome_message,
        starterQuestions=agent.starter_questions,
    )


def _require_admin(user: User) -> None:
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required.")


@router.get("/health")
async def health_check() -> dict:
    return {"ok": True}


@router.get("/agents", response_model=list[CreatorStudioAgentOut])
def list_agents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[CreatorStudioAgentOut]:
    agents = (
        db.query(Agent)
        .filter(
            Agent.creator_id == current_user.id,
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
        status=AgentStatus.ACTIVE,
        config=config,
        capabilities=caps_list,
        limitations=[],
        demo_available=False,
        creator_id=current_user.id,
        version="1.0.0",
        is_public=payload.isPublic,
        welcome_message=payload.welcomeMessage,
        starter_questions=payload.starterQuestions,
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
    agent.is_public = payload.isPublic
    agent.welcome_message = payload.welcomeMessage
    agent.starter_questions = payload.starterQuestions
    agent.config = config
    flag_modified(agent, "config")

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
        
        chunk_metadata = {
            "source": filename,
            "created_at": datetime.utcnow().isoformat()
        }
        
        for idx, chunk in enumerate(chunks):
            embedding = embeddings[idx] if idx < len(embeddings) else []
            chunk_id = uuid.uuid4()
            
            # Save to SQLAlchemy
            chunk_row = CreatorStudioKnowledgeChunk(
                id=chunk_id,
                file_id=file_id,
                agent_id=agent_id,
                chunk_index=idx,
                text=chunk,
                embedding=embedding,
                chunk_metadata=chunk_metadata
            )
            db.add(chunk_row)
            
            # Save to VectorIndex
            if VECTOR_INDEX is not None and embedding:
                VECTOR_INDEX.add(str(agent_id), str(chunk_id), embedding, chunk, chunk_metadata)
                
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
    response_text = generate_response(provider, model, system_instruction, prompt, api_key, user_id=str(current_user.id))
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


@router.post("/chat")
def chat(
    payload: CreatorStudioChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    # Convert history
    history_dicts = []
    if payload.messages:
        for m in payload.messages:
            history_dicts.append({"role": m.role, "content": m.content})

    agent = (
        db.query(Agent)
        .filter(
            Agent.id == _coerce_uuid(payload.agentId),
            Agent.creator_id == current_user.id,
        )
        .first()
    )
    if agent is None:
        raise HTTPException(status_code=404, detail="Agent not found.")
    creator_cfg = _creator_config(agent)
    instruction = creator_cfg.get("instruction") or ""
    model = creator_cfg.get("model") or DEFAULT_MODEL
    capabilities = creator_cfg.get("enabledCapabilities") or agent.capabilities
    safe_message = sanitize_user_input(payload.message)
    search_query = rewrite_query(db, safe_message, history=history_dicts)
    context_chunks = build_context(db, str(agent.id), search_query)
    system_instruction = build_system_instruction(instruction, context_chunks, payload.inputsContext, capabilities)
    provider = get_provider_for_model(db, model)
    config = get_llm_config(db, provider)
    api_key = resolve_llm_key(provider, config)

    api_key = resolve_llm_key(provider, config)

    text = generate_response(
        provider,
        model,
        system_instruction,
        payload.message,
        api_key,
        db=db,
        history=history_dicts,
        agent_id=str(agent.id),
        user_id=str(current_user.id),
    )
    
    # Create execution record
    
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


@router.post("/chat/preview/stream")
def chat_preview_stream(
    payload: CreatorStudioPreviewChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> StreamingResponse:
    history_dicts: list[dict[str, str]] = []
    if payload.messages:
        for m in payload.messages:
            history_dicts.append({"role": m.role, "content": m.content})

    draft = payload.draftConfig
    instruction = (draft.instruction or "").strip()
    # Keep preview aligned with saved behavior (admin-controlled default model).
    model = get_default_enabled_model(db)
    capabilities = (
        draft.enabledCapabilities.model_dump()
        if draft.enabledCapabilities is not None
        else None
    )
    system_instruction = build_system_instruction(
        instruction,
        [],
        payload.inputsContext,
        capabilities,
    )

    provider = get_provider_for_model(db, model)
    config = get_llm_config(db, provider)
    api_key = resolve_llm_key(provider, config)
    if not api_key:
        raise HTTPException(status_code=500, detail=f"{provider} API key is not configured.")

    preview_execution_id = f"preview-{uuid.uuid4()}"

    def stream() -> Any:
        try:
            yield from stream_response(
                provider,
                model,
                system_instruction,
                payload.message,
                api_key,
                execution_id=preview_execution_id,
                db=db,
                history=history_dicts,
                agent_id=None,
                user_id=str(current_user.id),
            )
        except Exception as exc:
            import json
            error_payload = json.dumps(
                {
                    "type": "error",
                    "content": str(exc),
                    "preview": True,
                }
            ) + "\n"
            yield error_payload.encode("utf-8")

    headers = {
        "X-Preview-Mode": "live",
        "X-Preview-Execution-Id": preview_execution_id,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Expose-Headers": "X-Preview-Mode,X-Preview-Execution-Id",
    }
    return StreamingResponse(stream(), media_type="text/plain", headers=headers)


@router.post("/chat/stream")
def chat_stream(
    payload: CreatorStudioChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> StreamingResponse:
    # Convert history
    history_dicts = []
    if payload.messages:
        for m in payload.messages:
            history_dicts.append({"role": m.role, "content": m.content})
    try:
        agent = (
            db.query(Agent)
            .filter(
                Agent.id == _coerce_uuid(payload.agentId),
                Agent.creator_id == current_user.id,
            )
            .first()
        )
        if agent is None:
            raise HTTPException(status_code=404, detail="Agent not found.")
        
        creator_cfg = _creator_config(agent)
        instruction = creator_cfg.get("instruction") or ""
        model = creator_cfg.get("model") or DEFAULT_MODEL
        capabilities = creator_cfg.get("enabledCapabilities") or agent.capabilities
        
        print(f"[chat_stream] Agent: {agent.id}, Model: {model}", flush=True)
        
        safe_message = sanitize_user_input(payload.message)
        search_query = rewrite_query(db, safe_message, history=history_dicts)
        context_chunks = build_context(db, str(agent.id), search_query)
        system_instruction = build_system_instruction(instruction, context_chunks, payload.inputsContext, capabilities)
        
        provider = get_provider_for_model(db, model)
        print(f"[chat_stream] Provider: {provider}", flush=True)
        
        config = get_llm_config(db, provider)
        api_key = resolve_llm_key(provider, config)
        
        if not api_key:
            raise HTTPException(status_code=500, detail=f"{provider} API key is not configured.")

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
                for chunk in stream_response(
                    provider,
                    model,
                    system_instruction,
                    payload.message,
                    api_key,
                    execution_id=str(execution.id),
                    db=db,
                    history=history_dicts,
                    agent_id=str(agent.id),
                    user_id=str(current_user.id),
                ):
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
    file_path = os.path.join(GENERATED_FILES_DIR, execution_id, filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    # Security check: ensure path is within .generated_files
    real_path = os.path.realpath(file_path)
    base_path = os.path.realpath(GENERATED_FILES_DIR)
    if not real_path.startswith(base_path):
        raise HTTPException(status_code=403, detail="Access denied")
    
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="application/octet-stream"
    )


