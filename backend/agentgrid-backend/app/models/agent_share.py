"""
Agent sharing and access control
"""
import uuid
import secrets
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.types import Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.agent import Agent
    from app.models.user import User


class AgentShareLink(TimestampMixin, Base):
    """
    Shareable links for agents with access control.
    
    Types:
    - public: Anyone with the link can access
    - private: Only specific users/emails can access
    """
    __tablename__ = "agent_share_links"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    agent_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("agents.id", ondelete="CASCADE"), nullable=False, index=True
    )
    
    # Unique share token (used in URL)
    share_token: Mapped[str] = mapped_column(
        String(64), unique=True, nullable=False, index=True
    )
    
    # Link type: 'public' or 'private'
    link_type: Mapped[str] = mapped_column(String(16), nullable=False, default="public")
    
    # Optional: Link name/description
    name: Mapped[str] = mapped_column(String(255), nullable=True)
    
    # Access control
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    max_uses: Mapped[int] = mapped_column(Integer, nullable=True)  # None = unlimited
    current_uses: Mapped[int] = mapped_column(Integer, default=0)
    
    # Expiration (optional)
    expires_at: Mapped[datetime] = mapped_column(nullable=True)
    
    # Creator
    created_by: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id"), nullable=False
    )
    
    # Relationships
    agent: Mapped["Agent"] = relationship(back_populates="share_links")
    creator: Mapped["User"] = relationship()
    allowed_users: Mapped[list["AgentShareAccess"]] = relationship(
        back_populates="share_link",
        cascade="all, delete-orphan"
    )


class AgentShareAccess(TimestampMixin, Base):
    """
    Access control list for private share links.
    
    Defines which users/emails can access a private link.
    """
    __tablename__ = "agent_share_access"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    share_link_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("agent_share_links.id", ondelete="CASCADE"), nullable=False
    )
    
    # User ID (if registered user)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=True
    )
    
    # Email (for non-registered users)
    email: Mapped[str] = mapped_column(String(255), nullable=True)
    
    # Access granted by
    granted_by: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id"), nullable=False
    )
    
    # Relationships
    share_link: Mapped["AgentShareLink"] = relationship(back_populates="allowed_users")
    user: Mapped["User"] = relationship(foreign_keys=[user_id])
    granter: Mapped["User"] = relationship(foreign_keys=[granted_by])


def generate_share_token() -> str:
    """Generate a secure random token for share links."""
    return secrets.token_urlsafe(32)
