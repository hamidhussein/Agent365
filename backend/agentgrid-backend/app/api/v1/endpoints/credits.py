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


from pydantic import BaseModel

class PurchaseRequest(BaseModel):
    amount: int

@router.post("/purchase")
def purchase_credits(
    request: PurchaseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models.enums import TransactionType
    
    # 1. Update User Balance
    current_user.credits += request.amount
    db.add(current_user)

    # 2. Log Transaction
    transaction = CreditTransaction(
        user_id=current_user.id,
        amount=request.amount,
        transaction_type=TransactionType.PURCHASE,
        description=f"Purchased {request.amount} credits",
    )
    db.add(transaction)
    
    db.commit()
    
    return {"status": "success", "new_balance": current_user.credits}
