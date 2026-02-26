"""
Agent sharing API endpoints
"""
import uuid
import base64
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
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
    enabled_caps = creator_cfg.get("enabledCapabilities", {})
    
    return {
        "agent_id": str(agent.id),
        "agent_name": agent.name,
        "agent_description": agent.description,
        "welcome_message": agent.welcome_message,
        "starter_questions": agent.starter_questions,
        "link_type": share_link.link_type,
        "share_token": share_token,
        "capabilities": {
            "web_search": bool(enabled_caps.get("web_search", False)),
            "file_handling": bool(enabled_caps.get("file_handling", False)),
            "code_execution": bool(enabled_caps.get("code_execution", False)),
            "rag": bool(enabled_caps.get("rag", False)),
        }
    }


def _validate_share_access(share_link, current_user, db):
    """Shared validation logic for share link access."""
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


@router.post("/share/{share_token}/chat")
async def chat_via_share_link(
    share_token: str,
    message: str = Form(...),
    history: str = Form(default="[]"),
    file: Optional[UploadFile] = File(default=None),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    """
    Chat with an agent via share link. Supports optional file/image upload.
    Public links: No authentication required.
    Private links: Authentication required.
    """
    import json
    share_link = db.query(AgentShareLink).filter(
        AgentShareLink.share_token == share_token
    ).first()
    if not share_link:
        raise HTTPException(404, "Share link not found")

    _validate_share_access(share_link, current_user, db)

    # Increment usage counter
    share_link.current_uses += 1
    db.commit()

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
    capabilities = creator_cfg.get("enabledCapabilities", {})

    try:
        history_list = json.loads(history)
    except Exception:
        history_list = []

    # Handle file/image attachment — embed as context in the message
    file_context = ""
    if file and capabilities.get("file_handling"):
        raw = await file.read()
        mime = file.content_type or "application/octet-stream"
        filename = file.filename or "attachment"
        if mime.startswith("text/") or mime in ("application/json", "application/csv"):
            try:
                text_content = raw.decode("utf-8", errors="replace")
                file_context = f"\n\n[Attached file: {filename}]\n```\n{text_content[:8000]}\n```"
            except Exception:
                file_context = f"\n\n[Attached file: {filename} — could not decode]"
        elif mime.startswith("image/"):
            b64 = base64.b64encode(raw).decode()
            file_context = f"\n\n[Attached image: {filename} — base64 data:{mime};base64,{b64[:200]}... (image analysis depends on model vision support)]"
        else:
            file_context = f"\n\n[Attached file: {filename} ({mime}) — binary file, {len(raw)} bytes]"

    full_message = message + file_context
    safe_message = sanitize_user_input(full_message)
    context_chunks = build_context(db, str(agent.id), sanitize_user_input(message))
    system_instruction = build_system_instruction(
        instruction, context_chunks, None, capabilities
    )

    provider = get_provider_for_model(db, model)
    config = get_llm_config(db, provider)
    api_key = resolve_llm_key(provider, config)

    response_text = generate_response(
        provider, model, system_instruction, safe_message, api_key,
        db=db, history=history_list, agent_id=str(agent.id),
        user_id=str(current_user.id) if current_user else None
    )

    return {"response": response_text}


# ─── Invitation / User Management ─────────────────────────────────────────────

from app.models.agent_invitation import AgentInvitation, generate_invite_token


VALID_ROLES = {"viewer", "editor", "admin"}


class InviteCreate(BaseModel):
    email: EmailStr
    role: str = "viewer"


class InvitationOut(BaseModel):
    id: str
    invited_email: str
    role: str
    status: str
    invited_at: str
    accepted_at: str | None


class AgentUserOut(BaseModel):
    id: str
    invited_email: str
    role: str
    status: str  # pending | accepted | revoked
    invited_at: str
    accepted_at: str | None


def _send_invite_email(to_email: str, agent_name: str, inviter_name: str, invite_url: str) -> None:
    """
    Send an invitation email. Falls back to logging when SMTP is not configured.
    Swap out the body of this function with your email service (SendGrid, SES, etc.).
    """
    import logging
    logger = logging.getLogger(__name__)

    try:
        import smtplib
        from email.mime.text import MIMEText
        from app.core.config import get_settings
        settings = get_settings()

        smtp_host = getattr(settings, "SMTP_HOST", None)
        smtp_port = getattr(settings, "SMTP_PORT", 587)
        smtp_user = getattr(settings, "SMTP_USER", None)
        smtp_pass = getattr(settings, "SMTP_PASSWORD", None)
        from_email = getattr(settings, "SMTP_FROM", smtp_user)

        if not smtp_host or not smtp_user:
            raise ValueError("SMTP not configured")

        body = f"""Hello!

{inviter_name} has invited you to access the agent "{agent_name}" on AgentGrid.

Click the link below to accept your invitation:
{invite_url}

This link expires in 7 days.

– AgentGrid Team
"""
        msg = MIMEText(body)
        msg["Subject"] = f"You've been invited to use {agent_name}"
        msg["From"] = from_email
        msg["To"] = to_email

        with smtplib.SMTP(smtp_host, int(smtp_port)) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)

        logger.info(f"Invite email sent to {to_email}")

    except Exception as e:
        # Log the invite link so it's not lost even if email fails
        logger.warning(
            f"[INVITE EMAIL] Could not send email to {to_email}: {e}. "
            f"Invite link: {invite_url}"
        )


@router.post("/agents/{agent_id}/invite", response_model=InvitationOut)
def invite_user_to_agent(
    agent_id: str,
    payload: InviteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Invite a user by email to access this agent with a specific role.
    Sends an email with an accept link. Works like Canva's share dialog.
    """
    if payload.role not in VALID_ROLES:
        raise HTTPException(400, f"role must be one of: {', '.join(VALID_ROLES)}")

    agent = db.query(Agent).filter(
        Agent.id == uuid.UUID(agent_id),
        Agent.creator_id == current_user.id
    ).first()
    if not agent:
        raise HTTPException(404, "Agent not found")

    email = str(payload.email).lower()

    # Don't allow owner to invite themselves
    if current_user.email and current_user.email.lower() == email:
        raise HTTPException(400, "You cannot invite yourself")

    # Check for an active (non-revoked) invite for this email+agent
    existing = db.query(AgentInvitation).filter(
        AgentInvitation.agent_id == agent.id,
        AgentInvitation.invited_email == email,
        AgentInvitation.status != "revoked",
    ).first()

    if existing:
        # Re-invite: update role and reset token so they get a fresh link
        existing.role = payload.role
        existing.status = "pending"
        existing.invite_token = generate_invite_token()
        db.commit()
        db.refresh(existing)
        invite = existing
    else:
        invite = AgentInvitation(
            agent_id=agent.id,
            invited_email=email,
            role=payload.role,
            status="pending",
            invite_token=generate_invite_token(),
            invited_by=current_user.id,
        )
        db.add(invite)
        db.commit()
        db.refresh(invite)

    # Build accept URL — frontend route
    from app.core.config import get_settings
    settings = get_settings()
    frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
    invite_url = f"{frontend_url}/accept-invite?token={invite.invite_token}"

    inviter_name = getattr(current_user, "full_name", None) or getattr(current_user, "email", "Someone")
    _send_invite_email(email, agent.name, inviter_name, invite_url)

    return InvitationOut(
        id=str(invite.id),
        invited_email=invite.invited_email,
        role=invite.role,
        status=invite.status,
        invited_at=invite.created_at.isoformat(),
        accepted_at=invite.accepted_at.isoformat() if invite.accepted_at else None,
    )


@router.get("/agents/{agent_id}/users", response_model=list[AgentUserOut])
def list_agent_users(
    agent_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    List all users invited to this agent (pending, accepted, revoked).
    """
    agent = db.query(Agent).filter(
        Agent.id == uuid.UUID(agent_id),
        Agent.creator_id == current_user.id
    ).first()
    if not agent:
        raise HTTPException(404, "Agent not found")

    invitations = db.query(AgentInvitation).filter(
        AgentInvitation.agent_id == agent.id
    ).order_by(AgentInvitation.created_at.desc()).all()

    return [
        AgentUserOut(
            id=str(inv.id),
            invited_email=inv.invited_email,
            role=inv.role,
            status=inv.status,
            invited_at=inv.created_at.isoformat(),
            accepted_at=inv.accepted_at.isoformat() if inv.accepted_at else None,
        )
        for inv in invitations
    ]


@router.patch("/agents/{agent_id}/users/{invitation_id}/role")
def update_user_role(
    agent_id: str,
    invitation_id: str,
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Change the role for an existing invitation."""
    new_role = payload.get("role", "viewer")
    if new_role not in VALID_ROLES:
        raise HTTPException(400, f"role must be one of: {', '.join(VALID_ROLES)}")

    agent = db.query(Agent).filter(
        Agent.id == uuid.UUID(agent_id),
        Agent.creator_id == current_user.id
    ).first()
    if not agent:
        raise HTTPException(404, "Agent not found")

    invite = db.query(AgentInvitation).filter(
        AgentInvitation.id == uuid.UUID(invitation_id),
        AgentInvitation.agent_id == agent.id,
    ).first()
    if not invite:
        raise HTTPException(404, "Invitation not found")

    invite.role = new_role
    db.commit()
    return {"ok": True, "role": new_role}


@router.delete("/agents/{agent_id}/users/{invitation_id}")
def revoke_user_access(
    agent_id: str,
    invitation_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Revoke a user's access (sets status to 'revoked')."""
    agent = db.query(Agent).filter(
        Agent.id == uuid.UUID(agent_id),
        Agent.creator_id == current_user.id
    ).first()
    if not agent:
        raise HTTPException(404, "Agent not found")

    invite = db.query(AgentInvitation).filter(
        AgentInvitation.id == uuid.UUID(invitation_id),
        AgentInvitation.agent_id == agent.id,
    ).first()
    if not invite:
        raise HTTPException(404, "Invitation not found")

    invite.status = "revoked"
    db.commit()
    return {"ok": True}


@router.get("/invite/accept")
def accept_invitation(
    token: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Accept an invitation via the token from the invite email.
    The authenticated user must match the invited email.
    """
    invite = db.query(AgentInvitation).filter(
        AgentInvitation.invite_token == token,
    ).first()

    if not invite:
        raise HTTPException(404, "Invitation not found or already used")

    if invite.status == "revoked":
        raise HTTPException(403, "This invitation has been revoked")

    if invite.status == "accepted":
        return {"ok": True, "agent_id": str(invite.agent_id), "role": invite.role, "message": "Already accepted"}

    # Verify email matches
    user_email = getattr(current_user, "email", "") or ""
    if user_email.lower() != invite.invited_email.lower():
        raise HTTPException(403, "This invitation was sent to a different email address")

    invite.status = "accepted"
    invite.accepted_at = datetime.utcnow()
    db.commit()

    return {
        "ok": True,
        "agent_id": str(invite.agent_id),
        "role": invite.role,
        "message": "Invitation accepted! You now have access to this agent.",
    }
