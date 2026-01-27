import uuid
from typing import List, TYPE_CHECKING

from sqlalchemy import Integer, String
from sqlalchemy.types import Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.enum_types import LowercaseEnum
from app.models.enums import UserRole
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.agent import Agent
    from app.models.execution import AgentExecution
    from app.models.transaction import CreditTransaction
    from app.models.review import Review


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        LowercaseEnum(UserRole, name="userrole"),
        default=UserRole.USER,
        nullable=False,
    )
    credits: Mapped[int] = mapped_column(Integer, default=0)

    agents: Mapped[List["Agent"]] = relationship(back_populates="creator", cascade="all, delete")
    executions: Mapped[List["AgentExecution"]] = relationship(
        back_populates="user",
        cascade="all, delete",
        foreign_keys="AgentExecution.user_id",
    )
    transactions: Mapped[List["CreditTransaction"]] = relationship(
        back_populates="user", cascade="all, delete"
    )
    reviews: Mapped[List["Review"]] = relationship(
        back_populates="user", cascade="all, delete"
    )

    favorite_agents: Mapped[List["Agent"]] = relationship(
        secondary="user_favorites",
        back_populates="favorited_by_users",
        lazy="selectin"
    )

    @property
    def favoriteAgentIds(self) -> List[uuid.UUID]:
        return [agent.id for agent in self.favorite_agents]
