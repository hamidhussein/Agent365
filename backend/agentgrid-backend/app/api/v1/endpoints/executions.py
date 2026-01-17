from typing import List
import uuid
import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_
from sqlalchemy.orm import joinedload

from app.core.deps import get_current_user, get_db
from app.models.execution import AgentExecution
from app.models.agent import Agent
from app.models.user import User
from app.models.enums import ReviewStatus
from app.schemas.execution import AgentExecutionRead, ReviewRequest, ReviewResponse
from app.services.notification import notification_service

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


@router.get("/reviews", response_model=List[AgentExecutionRead])
def get_creator_reviews(
    status: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get review requests for the creator's agents, optionally filtered by status.
    """
    # Get all agents created by this user
    creator_agent_ids = (
        db.query(Agent.id)
        .filter(Agent.creator_id == current_user.id)
        .all()
    )
    agent_ids = [agent_id[0] for agent_id in creator_agent_ids]
    
    if not agent_ids:
        # Creator has no agents, so no reviews to show
        return []
    
    # Base query
    query = (
        db.query(AgentExecution)
        .options(joinedload(AgentExecution.agent))
        .filter(AgentExecution.agent_id.in_(agent_ids))
    )
    
    # Filter by status if provided
    if status:
        # Convert string to ReviewStatus enum
        try:
            review_status = ReviewStatus(status.lower())
            query = query.filter(AgentExecution.review_status == review_status)
        except ValueError:
            # Invalid status, return empty or raise error
            raise HTTPException(status_code=400, detail=f"Invalid review status: {status}")
    else:
        # If no status filter, exclude those with ReviewStatus.NONE
        query = query.filter(AgentExecution.review_status != ReviewStatus.NONE)
    
    executions = query.order_by(AgentExecution.created_at.desc()).all()
    
    # Manually populate user_username for the schema
    for ex in executions:
        if ex.user_id:
            user = db.get(User, ex.user_id)
            if user:
                ex.user_username = user.username
        else:
            ex.user_username = "Guest User"
            
    return executions


@router.get("/reviews/pending", response_model=List[AgentExecutionRead])
def get_pending_reviews(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Legacy endpoint for pending reviews.
    """
    return get_creator_reviews(status=ReviewStatus.PENDING, db=db, current_user=current_user)


@router.get("/{execution_id}", response_model=AgentExecutionRead)
def read_execution(
    execution_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get a specific execution by ID.
    """
    try:
        exec_uuid = uuid.UUID(execution_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid execution ID")

    execution = db.get(AgentExecution, exec_uuid)
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")

    if execution.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    return execution


@router.post("/{execution_id}/review", response_model=AgentExecutionRead)
def request_execution_review(
    execution_id: str,
    payload: ReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Request a human review for a specific execution.
    """
    try:
        exec_uuid = uuid.UUID(execution_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid execution ID")

    execution = db.get(AgentExecution, exec_uuid)
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")

    if execution.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Check if agent allows reviews
    if not execution.agent.allow_reviews:
        raise HTTPException(status_code=400, detail="This agent does not support reviews")

    if execution.review_status not in (ReviewStatus.NONE, ReviewStatus.REJECTED):
        raise HTTPException(status_code=400, detail="Review already requested or completed")

    # Deduct cost if applicable (Future work: transaction logic)
    cost = execution.agent.review_cost
    if cost > 0:
        if current_user.credits < cost:
             raise HTTPException(status_code=402, detail=f"Not enough credits. Review costs {cost} credits.")
        current_user.credits -= cost
        # Log transaction... (omitted for brevity, ideally use a service)

    execution.review_status = ReviewStatus.PENDING
    execution.review_request_note = payload.note
    db.commit()
    db.refresh(execution)

    # Notify creator
    creator = db.get(User, execution.agent.creator_id)
    if creator:
        notification_service.notify_creator_new_review(execution, creator)

    return execution


@router.post("/{execution_id}/respond", response_model=AgentExecutionRead)
def respond_to_review(
    execution_id: str,
    payload: ReviewResponse,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Creator responds to a review request.
    """
    try:
        exec_uuid = uuid.UUID(execution_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid execution ID")
    
    execution = db.get(AgentExecution, exec_uuid)
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")
    
    # Verify the creator owns the agent
    if execution.agent.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Ensure it's pending
    if execution.review_status != ReviewStatus.PENDING:
        raise HTTPException(status_code=400, detail="Review is not pending")
    
    # Update review response
    execution.review_response_note = payload.response_note
    execution.review_status = ReviewStatus.COMPLETED
    execution.reviewed_at = datetime.datetime.utcnow()
    
    # Update refined outputs if creator provides improved results
    if payload.refined_outputs:
        execution.refined_outputs = payload.refined_outputs
    
    db.commit()
    db.refresh(execution)
    
    # Notify user
    user = db.get(User, execution.user_id)
    if user:
        notification_service.notify_user_review_completed(execution, user)

    return execution
