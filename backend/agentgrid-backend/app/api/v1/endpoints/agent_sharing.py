"""
Agent sharing API endpoints
"""
import uuid
from datetime import datetime, timedelta
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from app.core.deps import get_db, get_current_user, get_current_user_optional
from app.models.agent import Agent
from app.models.agent_share import AgentShareLink, AgentShareAccess, generate_share_token
from app.models.user import User

router = APIRouter()


class ShareLinkCreate(BaseModel):
    name: str | None = None
    link_type: str = "public"  # 'public' or 'private'
    max_uses: int | None = None
    expires_in_days: int | None = None
    allowed_emails: List[EmailStr] = []


class ShareLinkOut(BaseModel):
    id: str
    share_token: str
    share_url: str
    name: str | None
    link_type: str
    is_active: bool
    max_uses: int | None
    current_uses: int
    expires_at: str | None
    created_at: str
    allowed_emails: List[str]


class ShareAccessOut(BaseModel):
    email: str
    granted_at: str


@router.post("/agents/{agent_id}/share", response_model=ShareLinkOut)
def create_share_link(
    agent_id: str,
    payload: ShareLinkCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a shareable link for an agent.
    
    - Public links: Anyone with the link can access
    - Private links: Only specified emails can access
    """
    agent = db.query(Agent).filter(
        Agent.id == uuid.UUID(agent_id),
        Agent.creator_id == current_user.id
    ).first()
    
    if not agent:
        raise HTTPException(404, "Agent not found")
    
    # Validate link type
    if payload.link_type not in ["public", "private"]:
        raise HTTPException(400, "link_type must be 'public' or 'private'")
    
    # Private links require at least one email
    if payload.link_type == "private" and not payload.allowed_emails:
        raise HTTPException(400, "Private links require at least one allowed email")
    
    # Calculate expiration
    expires_at = None
    if payload.expires_in_days:
        expires_at = datetime.utcnow() + timedelta(days=payload.expires_in_days)
    
    # Create share link
    share_link = AgentShareLink(
        id=uuid.uuid4(),
        agent_id=agent.id,
        share_token=generate_share_token(),
        link_type=payload.link_type,
        name=payload.name,
        max_uses=payload.max_uses,
        expires_at=expires_at,
        created_by=current_user.id
    )
    
    db.add(share_link)
    db.flush()  # Get the ID
    
    # Add allowed users for private links
    if payload.link_type == "private":
        for email in payload.allowed_emails:
            # Check if user exists
            user = db.query(User).filter(User.email == email.lower()).first()
            
            access = AgentShareAccess(
                id=uuid.uuid4(),
                share_link_id=share_link.id,
                user_id=user.id if user else None,
                email=email.lower(),
                granted_by=current_user.id
            )
            db.add(access)
    
    db.commit()
    db.refresh(share_link)
    
    # Build share URL
    base_url = "http://localhost:3000"  # TODO: Get from config
    share_url = f"{base_url}/share/{share_link.share_token}"
    
    # Get allowed emails
    allowed_emails = [a.email for a in share_link.allowed_users] if share_link.allowed_users else []
    
    return ShareLinkOut(
        id=str(share_link.id),
        share_token=share_link.share_token,
        share_url=share_url,
        name=share_link.name,
        link_type=share_link.link_type,
        is_active=share_link.is_active,
        max_uses=share_link.max_uses,
        current_uses=share_link.current_uses,
        expires_at=share_link.expires_at.isoformat() if share_link.expires_at else None,
        created_at=share_link.created_at.isoformat(),
        allowed_emails=allowed_emails
    )


@router.get("/agents/{agent_id}/share", response_model=List[ShareLinkOut])
def list_share_links(
    agent_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all share links for an agent."""
    agent = db.query(Agent).filter(
        Agent.id == uuid.UUID(agent_id),
        Agent.creator_id == current_user.id
    ).first()
    
    if not agent:
        raise HTTPException(404, "Agent not found")
    
    share_links = db.query(AgentShareLink).filter(
        AgentShareLink.agent_id == agent.id
    ).order_by(AgentShareLink.created_at.desc()).all()
    
    base_url = "http://localhost:3000"  # TODO: Get from config
    
    return [
        ShareLinkOut(
            id=str(link.id),
            share_token=link.share_token,
            share_url=f"{base_url}/share/{link.share_token}",
            name=link.name,
            link_type=link.link_type,
            is_active=link.is_active,
            max_uses=link.max_uses,
            current_uses=link.current_uses,
            expires_at=link.expires_at.isoformat() if link.expires_at else None,
            created_at=link.created_at.isoformat(),
            allowed_emails=[a.email for a in link.allowed_users] if link.allowed_users else []
        )
        for link in share_links
    ]


@router.delete("/share/{share_link_id}")
def delete_share_link(
    share_link_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a share link."""
    share_link = db.query(AgentShareLink).filter(
        AgentShareLink.id == uuid.UUID(share_link_id),
        AgentShareLink.created_by == current_user.id
    ).first()
    
    if not share_link:
        return {"ok": True}
    
    db.delete(share_link)
    db.commit()
    
    return {"ok": True}


@router.patch("/share/{share_link_id}/toggle")
def toggle_share_link(
    share_link_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Activate or deactivate a share link."""
    share_link = db.query(AgentShareLink).filter(
        AgentShareLink.id == uuid.UUID(share_link_id),
        AgentShareLink.created_by == current_user.id
    ).first()
    
    if not share_link:
        raise HTTPException(404, "Share link not found")
    
    share_link.is_active = not share_link.is_active
    db.commit()
    
    return {"is_active": share_link.is_active}


# Public endpoint - no authentication required
@router.get("/share/{share_token}/info")
def get_share_info(
    share_token: str,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    """
    Get information about a shared agent.
    
    This endpoint checks if the user has access to the shared agent.
    """
    share_link = db.query(AgentShareLink).filter(
        AgentShareLink.share_token == share_token
    ).first()
    
    if not share_link:
        raise HTTPException(404, "Share link not found")
    
    # Check if link is active
    if not share_link.is_active:
        raise HTTPException(403, "This share link has been deactivated")
    
    # Check expiration
    if share_link.expires_at and share_link.expires_at < datetime.utcnow():
        raise HTTPException(403, "This share link has expired")
    
    # Check max uses
    if share_link.max_uses and share_link.current_uses >= share_link.max_uses:
        raise HTTPException(403, "This share link has reached its maximum number of uses")
    
    # Check access for private links
    if share_link.link_type == "private":
        if not current_user:
            raise HTTPException(401, "Authentication required for private links")
        
        # Check if user has access
        has_access = db.query(AgentShareAccess).filter(
            AgentShareAccess.share_link_id == share_link.id,
            (AgentShareAccess.user_id == current_user.id) | 
            (AgentShareAccess.email == current_user.email.lower())
        ).first()
        
        if not has_access:
            raise HTTPException(403, "You don't have access to this agent")
    
    agent = share_link.agent
    creator_cfg = agent.config.get("creator_studio", {})
    
    return {
        "agent_id": str(agent.id),
        "agent_name": agent.name,
        "agent_description": agent.description,
        "welcome_message": agent.welcome_message,
        "starter_questions": agent.starter_questions,
        "link_type": share_link.link_type,
        "share_token": share_token
    }


@router.post("/share/{share_token}/chat")
def chat_via_share_link(
    share_token: str,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    """
    Chat with an agent via share link.
    
    Public links: No authentication required
    Private links: Authentication required and access checked
    """
    share_link = db.query(AgentShareLink).filter(
        AgentShareLink.share_token == share_token
    ).first()
    
    if not share_link:
        raise HTTPException(404, "Share link not found")
    
    # Validate access (same checks as get_share_info)
    if not share_link.is_active:
        raise HTTPException(403, "This share link has been deactivated")
    
    if share_link.expires_at and share_link.expires_at < datetime.utcnow():
        raise HTTPException(403, "This share link has expired")
    
    if share_link.max_uses and share_link.current_uses >= share_link.max_uses:
        raise HTTPException(403, "This share link has reached its maximum number of uses")
    
    if share_link.link_type == "private":
        if not current_user:
            raise HTTPException(401, "Authentication required for private links")
        
        has_access = db.query(AgentShareAccess).filter(
            AgentShareAccess.share_link_id == share_link.id,
            (AgentShareAccess.user_id == current_user.id) | 
            (AgentShareAccess.email == current_user.email.lower())
        ).first()
        
        if not has_access:
            raise HTTPException(403, "You don't have access to this agent")
    
    # Increment usage counter
    share_link.current_uses += 1
    db.commit()
    
    # Generate response using agent
    from app.services.creator_studio import (
        generate_response,
        build_context,
        build_system_instruction,
        sanitize_user_input,
        get_provider_for_model,
        get_llm_config,
        resolve_llm_key
    )
    
    agent = share_link.agent
    creator_cfg = agent.config.get("creator_studio", {})
    instruction = creator_cfg.get("instruction", "")
    model = creator_cfg.get("model", "gemini-1.5-flash-preview")
    capabilities = creator_cfg.get("enabledCapabilities")
    
    message = payload.get("message", "")
    history = payload.get("history", [])
    
    safe_message = sanitize_user_input(message)
    context_chunks = build_context(db, str(agent.id), safe_message)
    system_instruction = build_system_instruction(
        instruction, context_chunks, None, capabilities
    )
    
    provider = get_provider_for_model(db, model)
    config = get_llm_config(db, provider)
    api_key = resolve_llm_key(provider, config)
    
    response_text = generate_response(
        provider, model, system_instruction, message, api_key,
        db=db, history=history, agent_id=str(agent.id),
        user_id=str(current_user.id) if current_user else None
    )
    
    return {"response": response_text}
