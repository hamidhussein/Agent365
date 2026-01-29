"""add code execution logs

Revision ID: b3f1d2a4c6e7
Revises: 4412fc932463
Create Date: 2026-01-27
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "b3f1d2a4c6e7"
down_revision: Union[str, Sequence[str], None] = "4412fc932463"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "code_execution_logs",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("execution_id", sa.String(length=64), nullable=False),
        sa.Column("tool_name", sa.String(length=32), nullable=False, server_default="run_python"),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.Column("stdout_len", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("stderr_len", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("file_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_file_bytes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("error_message", sa.String(length=1024), nullable=True),
        sa.Column("sandboxed", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("docker_image", sa.String(length=255), nullable=True),
        sa.Column("agent_id", sa.Uuid(), nullable=True),
        sa.Column("user_id", sa.Uuid(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
    )
    op.create_index("ix_code_exec_logs_execution_id", "code_execution_logs", ["execution_id"])
    op.create_index("ix_code_exec_logs_created_at", "code_execution_logs", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_code_exec_logs_created_at", table_name="code_execution_logs")
    op.drop_index("ix_code_exec_logs_execution_id", table_name="code_execution_logs")
    op.drop_table("code_execution_logs")
