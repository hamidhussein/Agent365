from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core import deps
from app.models.agent import Agent
from app.models.user import User
from app.schemas.user import UserRead

router = APIRouter()

@router.post("/me/favorites/{agent_id}", response_model=UserRead)
def toggle_favorite(
    *,
    db: Session = Depends(deps.get_db),
    agent_id: UUID,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Toggle favorite status for an agent.
    """
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    if agent in current_user.favorite_agents:
        current_user.favorite_agents.remove(agent)
    else:
        current_user.favorite_agents.append(agent)

    db.commit()
    db.refresh(current_user)
    return current_user
