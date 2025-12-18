from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_creator, get_current_user_optional
from app.models.enums import AgentCategory
from app.models.user import User
from app.schemas.agent import AgentCreate, AgentListResponse, AgentResponse, AgentUpdate
from app.services.agent import AgentService
from app.services.execution import ExecutionService
from app.schemas.execution import AgentExecutionRead
from typing import Dict, Any

router = APIRouter(tags=["agents"])


@router.post("/", response_model=AgentResponse, status_code=status.HTTP_201_CREATED)
def create_agent(
    agent_data: AgentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_creator),
):
    return AgentService.create_agent(db, agent_data, current_user)


@router.get("/", response_model=AgentListResponse)
def list_agents(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    category: Optional[AgentCategory] = None,
    search: Optional[str] = None,
    min_rating: Optional[float] = Query(None, ge=0, le=5),
    max_price: Optional[float] = Query(None, ge=0),
    tags: Optional[List[str]] = Query(None),
    sort_by: str = Query("newest", pattern="^(popular|rating|newest|price_low|price_high)$"),
    creator_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    if creator_id == "me":
        if not current_user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
        creator_id = str(current_user.id)

    agents, total = AgentService.list_agents(
        db=db,
        skip=skip,
        limit=limit,
        category=category,
        search=search,
        min_rating=min_rating,
        max_price=max_price,
        tags=tags,
        sort_by=sort_by,
        creator_id=creator_id,
    )

    return {
        "data": agents,
        "total": total,
        "page": (skip // limit) + 1 if limit else 1,
        "per_page": limit,
        "total_pages": (total + limit - 1) // limit if limit else 1,
    }


@router.get("/{agent_id}", response_model=AgentResponse)
def get_agent(agent_id: str, db: Session = Depends(get_db)):
    agent = AgentService.get_agent(db, agent_id)
    if not agent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")
    return agent


@router.patch("/{agent_id}", response_model=AgentResponse)
def update_agent(
    agent_id: str,
    agent_data: AgentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_creator),
):
    return AgentService.update_agent(db, agent_id, agent_data, current_user)


    AgentService.delete_agent(db, agent_id, current_user)
    return None


@router.post("/{agent_id}/execute", response_model=AgentExecutionRead)
def execute_agent(
    agent_id: UUID,
    inputs: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_optional), # Should be required, but optional for now if testing
):
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
        
    # Unwrap inputs if wrapped (frontend sends { inputs: { ... } })
    execution_inputs = inputs.get("inputs", inputs)
    if not isinstance(execution_inputs, dict):
        execution_inputs = inputs

    return ExecutionService.execute_agent(db, agent_id, execution_inputs, current_user)
