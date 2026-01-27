from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core import deps, security
from app.models.agent import Agent
from app.models.user import User
from app.schemas.user import UserRead, UserUpdate, PasswordUpdate

router = APIRouter()

@router.get("/me", response_model=UserRead)
def read_current_user(current_user: User = Depends(deps.get_current_user)):
    return current_user

@router.patch("/me", response_model=UserRead)
def update_me(
    *,
    db: Session = Depends(deps.get_db),
    user_in: UserUpdate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Update current user profile.
    """
    if user_in.full_name is not None:
        current_user.full_name = user_in.full_name

    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/me/password")
def update_password(
    *,
    db: Session = Depends(deps.get_db),
    password_in: PasswordUpdate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Update user password.
    """
    if not security.verify_password(password_in.old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect old password")
    
    current_user.hashed_password = security.get_password_hash(password_in.new_password)
    db.commit()
    return {"message": "Password updated successfully"}

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
