from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models.transaction import CreditTransaction
from app.models.user import User
from app.schemas.transaction import CreditTransactionRead

router = APIRouter(prefix="/credits", tags=["credits"])


@router.get("/transactions", response_model=List[CreditTransactionRead])
def read_my_transactions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100,
):
    """
    Retrieve current user's transaction history.
    """
    transactions = (
        db.query(CreditTransaction)
        .filter(CreditTransaction.user_id == current_user.id)
        .order_by(CreditTransaction.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return transactions
