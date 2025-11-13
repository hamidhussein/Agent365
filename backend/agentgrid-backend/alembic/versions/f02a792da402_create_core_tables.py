"""create core tables

Revision ID: f02a792da402
Revises: 
Create Date: 2025-11-13 10:45:54.938209

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "f02a792da402"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

user_role_enum = sa.Enum("user", "creator", "admin", name="userrole")
agent_status_enum = sa.Enum("active", "inactive", "pending_review", name="agentstatus")
execution_status_enum = sa.Enum("pending", "running", "completed", "failed", name="executionstatus")
transaction_type_enum = sa.Enum("purchase", "usage", "refund", "earning", name="transactiontype")


def upgrade() -> None:
    bind = op.get_bind()
    user_role_enum.create(bind, checkfirst=True)
    agent_status_enum.create(bind, checkfirst=True)
    execution_status_enum.create(bind, checkfirst=True)
    transaction_type_enum.create(bind, checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False, unique=True),
        sa.Column("username", sa.String(length=50), nullable=False, unique=True),
        sa.Column("full_name", sa.String(length=255)),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("role", user_role_enum, nullable=False, server_default="user"),
        sa.Column("credits", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
    )

    op.create_table(
        "agents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.String(length=512), nullable=False),
        sa.Column("long_description", sa.Text()),
        sa.Column("category", sa.String(length=64), nullable=False),
        sa.Column("tags", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb")),
        sa.Column("price_per_run", sa.Integer(), nullable=False),
        sa.Column("rating", sa.Float(), nullable=False, server_default="0"),
        sa.Column("total_runs", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", agent_status_enum, nullable=False, server_default="pending_review"),
        sa.Column("config", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb")),
        sa.Column("creator_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
    )

    op.create_table(
        "agent_executions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("agent_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("agents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", execution_status_enum, nullable=False, server_default="pending"),
        sa.Column("inputs", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb")),
        sa.Column("outputs", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb")),
        sa.Column("error_message", sa.Text()),
        sa.Column("credits_used", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
    )

    op.create_table(
        "credit_transactions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column("transaction_type", transaction_type_enum, nullable=False),
        sa.Column("description", sa.String(length=255)),
        sa.Column("reference_id", sa.String(length=255)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
    )


def downgrade() -> None:
    bind = op.get_bind()
    op.drop_table("credit_transactions")
    op.drop_table("agent_executions")
    op.drop_table("agents")
    op.drop_table("users")

    transaction_type_enum.drop(bind, checkfirst=True)
    execution_status_enum.drop(bind, checkfirst=True)
    agent_status_enum.drop(bind, checkfirst=True)
    user_role_enum.drop(bind, checkfirst=True)
