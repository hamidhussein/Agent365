from typing import Any, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_db
from app.models.agent import Agent
from app.models.enums import AgentStatus
from app.schemas.agent import AgentResponse
from app.services.creator_studio import build_agent_chat, stream_response

router = APIRouter()

@router.get("/public/{agent_id}", response_model=AgentResponse)
def get_public_agent(
    agent_id: UUID,
    db: Session = Depends(get_db)
) -> Any:
    """
    Get public metadata for an agent.
    """
    agent = db.query(Agent).filter(
        Agent.id == agent_id,
        Agent.is_public == True,
        Agent.status == AgentStatus.ACTIVE
    ).first()
    
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Public agent not found"
        )
    
    return agent

@router.post("/chat/public/{agent_id}")
async def public_agent_chat(
    agent_id: UUID,
    payload: dict, # { "message": "...", "history": [...] }
    db: Session = Depends(get_db)
) -> Any:
    """
    Anonymous chat with a public agent.
    """
    agent = db.query(Agent).filter(
        Agent.id == agent_id,
        Agent.is_public == True,
        Agent.status == AgentStatus.ACTIVE
    ).first()
    
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Public agent not found"
        )

    # Note: In a real app, you'd add rate limiting here for anonymous users.
    
    message = payload.get("message", "")
    history = payload.get("history", [])
    
    # Use the existing creator studio chat service
    # We pass None for user_id to indicate anonymous
    return await build_agent_chat(
        db=db,
        agent=agent,
        payload_message=message,
        history=history,
        user_id=None 
    )
