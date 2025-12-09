from typing import Any, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core import deps
from app.core.deps import get_db
from app.models.review import Review
from app.models.user import User
from app.schemas import review as review_schemas

router = APIRouter()

@router.post("/", response_model=review_schemas.Review)
def create_review(
    *,
    db: Session = Depends(get_db),
    review_in: review_schemas.ReviewCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Create new review.
    """
    # Check if user already reviewed this agent
    existing_review = db.query(Review).filter(
        Review.agent_id == review_in.agent_id,
        Review.user_id == current_user.id
    ).first()
    
    if existing_review:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already reviewed this agent"
        )

    review = Review(
        **review_in.model_dump(),
        user_id=current_user.id
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return review

@router.get("/", response_model=List[review_schemas.Review])
def read_reviews(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    agent_id: UUID = None,
) -> Any:
    """
    Retrieve reviews.
    """
    query = db.query(Review)
    if agent_id:
        query = query.filter(Review.agent_id == agent_id)
    
    reviews = query.offset(skip).limit(limit).all()
    return reviews

@router.get("/{id}", response_model=review_schemas.Review)
def read_review(
    *,
    db: Session = Depends(get_db),
    id: UUID,
) -> Any:
    """
    Get review by ID.
    """
    review = db.query(Review).filter(Review.id == id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    return review

@router.put("/{id}", response_model=review_schemas.Review)
def update_review(
    *,
    db: Session = Depends(get_db),
    id: UUID,
    review_in: review_schemas.ReviewUpdate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Update a review.
    """
    review = db.query(Review).filter(Review.id == id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    if review.user_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=400, detail="Not enough permissions")
    
    update_data = review_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(review, field, value)
        
    db.add(review)
    db.commit()
    db.refresh(review)
    return review

@router.delete("/{id}", response_model=review_schemas.Review)
def delete_review(
    *,
    db: Session = Depends(get_db),
    id: UUID,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Delete a review.
    """
    review = db.query(Review).filter(Review.id == id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    if review.user_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=400, detail="Not enough permissions")
        
    db.delete(review)
    db.commit()
    return review
