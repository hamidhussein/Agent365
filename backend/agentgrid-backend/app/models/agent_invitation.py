"""
Agent Invitation system — Canva-style direct user invitations with roles.
Separate from share links; gives named users persistent access with a role.
"""
import uuid
import secrets
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String
from sqlalchemy.types import Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.agent import Agent
    from app.models.user import User


class AgentInvitation(TimestampMixin, Base):
    """
    Direct invitation granting a user access to an agent with a specific role.

    Roles:
    - viewer : can chat with the agent (read-only)
    - editor : can chat + see basic analytics
    - admin  : full access — chat, analytics, configure

    Status:
    - pending  : invite sent, user hasn't accepted
    - accepted : user has accepted the invite
    - revoked  : access removed by agent owner
    """
    __tablename__ = "agent_invitations"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)

    agent_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("agents.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Who was invited (email — may or may not have an account)
    invited_email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)

    # Role granted
    role: Mapped[str] = mapped_column(String(32), nullable=False, default="viewer")  # viewer | editor | admin

    # Invite status
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")  # pending | accepted | revoked

    # Unique token in the accept URL (e.g. /accept-invite?token=xxx)
    invite_token: Mapped[str] = mapped_column(String(128), unique=True, nullable=False, index=True)

    # Who sent the invite
    invited_by: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id"), nullable=False
    )

    # When the invite was accepted (if applicable)
    accepted_at: Mapped[datetime] = mapped_column(nullable=True)

    # Relationships
    agent: Mapped["Agent"] = relationship(back_populates="invitations")
    inviter: Mapped["User"] = relationship(foreign_keys=[invited_by])


def generate_invite_token() -> str:
    """Generate a secure random token for invitation links."""
    return secrets.token_urlsafe(48)
