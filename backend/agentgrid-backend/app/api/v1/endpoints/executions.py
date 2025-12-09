from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models.execution import AgentExecution
from app.models.user import User
from app.schemas.execution import AgentExecutionRead

router = APIRouter(prefix="/executions", tags=["executions"])


@router.get("", response_model=List[AgentExecutionRead])
def read_my_executions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100,
):
    """
    Retrieve current user's execution history.
    """
    executions = (
        db.query(AgentExecution)
        .filter(AgentExecution.user_id == current_user.id)
        .order_by(AgentExecution.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return executions
