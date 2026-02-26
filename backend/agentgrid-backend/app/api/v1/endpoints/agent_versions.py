"""
Agent versioning API endpoints
"""
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.deps import get_db, get_current_user
from app.models.agent import Agent
from app.models.agent_version import AgentVersion
from app.models.user import User

router = APIRouter()


class VersionCreate(BaseModel):
    change_summary: str


class VersionOut(BaseModel):
    id: str
    version: int
    change_summary: str | None
    is_active: bool
    created_at: str
    created_by: str


@router.get("/agents/{agent_id}/versions", response_model=List[VersionOut])
def list_versions(
    agent_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all versions of an agent."""
    agent = db.query(Agent).filter(
        Agent.id == uuid.UUID(agent_id),
        Agent.creator_id == current_user.id
    ).first()
    
    if not agent:
        raise HTTPException(404, "Agent not found")
    
    versions = db.query(AgentVersion).filter(
        AgentVersion.agent_id == agent.id
    ).order_by(AgentVersion.version.desc()).all()
    
    return [
        VersionOut(
            id=str(v.id),
            version=v.version,
            change_summary=v.change_summary,
            is_active=v.is_active,
            created_at=v.created_at.isoformat(),
            created_by=str(v.created_by)
        )
        for v in versions
    ]


@router.post("/agents/{agent_id}/versions", response_model=VersionOut)
def create_version(
    agent_id: str,
    payload: VersionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new version snapshot of the agent."""
    agent = db.query(Agent).filter(
        Agent.id == uuid.UUID(agent_id),
        Agent.creator_id == current_user.id
    ).first()
    
    if not agent:
        raise HTTPException(404, "Agent not found")
    
    # Get next version number
    max_version = db.query(AgentVersion).filter(
        AgentVersion.agent_id == agent.id
    ).count()
    
    # Extract instruction from config
    creator_cfg = agent.config.get("creator_studio", {})
    instruction = creator_cfg.get("instruction", "")
    
    # Create version
    version = AgentVersion(
        id=uuid.uuid4(),
        agent_id=agent.id,
        version=max_version + 1,
        config=agent.config,
        instruction=instruction,
        created_by=current_user.id,
        is_active=True,
        change_summary=payload.change_summary
    )
    
    # Deactivate other versions
    db.query(AgentVersion).filter(
        AgentVersion.agent_id == agent.id
    ).update({"is_active": False})
    
    db.add(version)
    db.commit()
    db.refresh(version)
    
    return VersionOut(
        id=str(version.id),
        version=version.version,
        change_summary=version.change_summary,
        is_active=version.is_active,
        created_at=version.created_at.isoformat(),
        created_by=str(version.created_by)
    )


@router.post("/agents/{agent_id}/versions/{version_id}/activate")
def activate_version(
    agent_id: str,
    version_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Rollback to a previous version."""
    agent = db.query(Agent).filter(
        Agent.id == uuid.UUID(agent_id),
        Agent.creator_id == current_user.id
    ).first()
    
    if not agent:
        raise HTTPException(404, "Agent not found")
    
    version = db.query(AgentVersion).filter(
        AgentVersion.id == uuid.UUID(version_id),
        AgentVersion.agent_id == agent.id
    ).first()
    
    if not version:
        raise HTTPException(404, "Version not found")
    
    # Restore config from version
    agent.config = version.config
    
    # Mark version as active
    db.query(AgentVersion).filter(
        AgentVersion.agent_id == agent.id
    ).update({"is_active": False})
    version.is_active = True
    
    db.commit()
    
    return {"message": f"Rolled back to version {version.version}"}
