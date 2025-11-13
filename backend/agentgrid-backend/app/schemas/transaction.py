from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.enums import TransactionType


class CreditTransactionRead(BaseModel):
    id: UUID
    user_id: UUID
    amount: int
    transaction_type: TransactionType
    description: str | None = None
    reference_id: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
