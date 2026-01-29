import uuid
from typing import Optional

from sqlalchemy import Boolean, Integer, String
from sqlalchemy.types import Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import TimestampMixin


class CodeExecutionLog(TimestampMixin, Base):
    __tablename__ = "code_execution_logs"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    execution_id: Mapped[str] = mapped_column(String(64), nullable=False)
    tool_name: Mapped[str] = mapped_column(String(32), nullable=False, default="run_python")
    status: Mapped[str] = mapped_column(String(32), nullable=False)

    duration_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    stdout_len: Mapped[int] = mapped_column(Integer, default=0)
    stderr_len: Mapped[int] = mapped_column(Integer, default=0)
    file_count: Mapped[int] = mapped_column(Integer, default=0)
    total_file_bytes: Mapped[int] = mapped_column(Integer, default=0)

    error_message: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    sandboxed: Mapped[bool] = mapped_column(Boolean, default=False)
    docker_image: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    agent_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, nullable=True)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, nullable=True)
