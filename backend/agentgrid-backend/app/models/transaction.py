import uuid
from typing import TYPE_CHECKING, Optional

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.types import Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.enum_types import LowercaseEnum
from app.models.enums import TransactionType
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class CreditTransaction(TimestampMixin, Base):
    __tablename__ = "credit_transactions"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    transaction_type: Mapped[TransactionType] = mapped_column(
        LowercaseEnum(TransactionType, name="transactiontype"),
        nullable=False,
    )
    description: Mapped[Optional[str]] = mapped_column(String(255))
    reference_id: Mapped[Optional[str]] = mapped_column(String(255))

    user: Mapped["User"] = relationship(back_populates="transactions")
