import uuid
from typing import List, TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.types import Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.enum_types import LowercaseEnum
from app.models.enums import UserRole
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.agent import Agent
    from app.models.execution import AgentExecution


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
        default=UserRole.CREATOR,
        nullable=False,
    )

    agents: Mapped[List["Agent"]] = relationship(back_populates="creator", cascade="all, delete")
    executions: Mapped[List["AgentExecution"]] = relationship(
        back_populates="user",
        cascade="all, delete",
        foreign_keys="AgentExecution.user_id",
    )
