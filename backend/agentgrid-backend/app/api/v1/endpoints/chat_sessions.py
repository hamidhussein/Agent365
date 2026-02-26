"""
Chat session management API endpoints
"""
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.deps import get_db, get_current_user
from app.models.agent import Agent
from app.models.chat_session import ChatSession, ChatMessage
from app.models.user import User

router = APIRouter()


class MessageOut(BaseModel):
    id: str
    role: str
    content: str
    created_at: str
    extra_metadata: dict


class SessionOut(BaseModel):
    id: str
    agent_id: str
    title: str
    created_at: str
    updated_at: str
    message_count: int


class SessionDetailOut(SessionOut):
    messages: List[MessageOut]


class SendMessageRequest(BaseModel):
    message: str


@router.get("/agents/{agent_id}/sessions", response_model=List[SessionOut])
def list_sessions(
    agent_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all chat sessions for an agent."""
    agent = db.query(Agent).filter(
        Agent.id == uuid.UUID(agent_id),
        Agent.creator_id == current_user.id
    ).first()
    
    if not agent:
        raise HTTPException(404, "Agent not found")
    
    sessions = db.query(ChatSession).filter(
        ChatSession.agent_id == agent.id,
        ChatSession.user_id == current_user.id
    ).order_by(ChatSession.updated_at.desc()).all()
    
    return [
        SessionOut(
            id=str(s.id),
            agent_id=str(s.agent_id),
            title=s.title,
            created_at=s.created_at.isoformat(),
            updated_at=s.updated_at.isoformat(),
            message_count=len(s.messages)
        )
        for s in sessions
    ]


@router.post("/agents/{agent_id}/sessions", response_model=SessionOut)
def create_session(
    agent_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new chat session."""
    agent = db.query(Agent).filter(
        Agent.id == uuid.UUID(agent_id),
        Agent.creator_id == current_user.id
    ).first()
    
    if not agent:
        raise HTTPException(404, "Agent not found")
    
    session = ChatSession(
        id=uuid.uuid4(),
        agent_id=agent.id,
        user_id=current_user.id,
        title="New Conversation"
    )
    
    db.add(session)
    db.commit()
    db.refresh(session)
    
    return SessionOut(
        id=str(session.id),
        agent_id=str(session.agent_id),
        title=session.title,
        created_at=session.created_at.isoformat(),
        updated_at=session.updated_at.isoformat(),
        message_count=0
    )


@router.get("/sessions/{session_id}", response_model=SessionDetailOut)
def get_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a session with full message history."""
    session = db.query(ChatSession).filter(
        ChatSession.id == uuid.UUID(session_id),
        ChatSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(404, "Session not found")
    
    return SessionDetailOut(
        id=str(session.id),
        agent_id=str(session.agent_id),
        title=session.title,
        created_at=session.created_at.isoformat(),
        updated_at=session.updated_at.isoformat(),
        message_count=len(session.messages),
        messages=[
            MessageOut(
                id=str(m.id),
                role=m.role,
                content=m.content,
                created_at=m.created_at.isoformat(),
                extra_metadata=m.extra_metadata
            )
            for m in session.messages
        ]
    )


@router.post("/sessions/{session_id}/messages")
def send_message(
    session_id: str,
    payload: SendMessageRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Send a message in a session."""
    session = db.query(ChatSession).filter(
        ChatSession.id == uuid.UUID(session_id),
        ChatSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(404, "Session not found")
    
    # Load history
    history = [
        {"role": m.role, "content": m.content} 
        for m in session.messages
    ]
    
    # Generate response (import here to avoid circular dependency)
    from app.services.creator_studio import (
        generate_response,
        build_context,
        build_system_instruction,
        sanitize_user_input,
        get_provider_for_model,
        get_llm_config,
        resolve_llm_key
    )
    
    agent = session.agent
    creator_cfg = agent.config.get("creator_studio", {})
    instruction = creator_cfg.get("instruction", "")
    model = creator_cfg.get("model", "gemini-1.5-flash-preview")
    capabilities = creator_cfg.get("enabledCapabilities")
    
    safe_message = sanitize_user_input(payload.message)
    context_chunks = build_context(db, str(agent.id), safe_message)
    system_instruction = build_system_instruction(
        instruction, context_chunks, None, capabilities
    )
    
    provider = get_provider_for_model(db, model)
    config = get_llm_config(db, provider)
    api_key = resolve_llm_key(provider, config)
    
    response_text = generate_response(
        provider, model, system_instruction, payload.message, api_key,
        db=db, history=history, agent_id=str(agent.id), user_id=str(current_user.id)
    )
    
    # Save messages
    user_msg = ChatMessage(
        id=uuid.uuid4(),
        session_id=session.id,
        role="user",
        content=payload.message,
        extra_metadata={}
    )
    assistant_msg = ChatMessage(
        id=uuid.uuid4(),
        session_id=session.id,
        role="assistant",
        content=response_text,
        extra_metadata={}
    )
    
    db.add(user_msg)
    db.add(assistant_msg)
    
    # Auto-generate title from first message
    if len(session.messages) == 0:
        session.title = payload.message[:50] + ("..." if len(payload.message) > 50 else "")
    
    db.commit()
    
    return {
        "response": response_text,
        "message_id": str(assistant_msg.id)
    }


@router.delete("/sessions/{session_id}")
def delete_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a chat session."""
    session = db.query(ChatSession).filter(
        ChatSession.id == uuid.UUID(session_id),
        ChatSession.user_id == current_user.id
    ).first()
    
    if not session:
        return {"ok": True}
    
    db.delete(session)
    db.commit()
    
    return {"ok": True}
