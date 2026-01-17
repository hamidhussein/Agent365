import uuid

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.types import JSON, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin


class CreatorStudioKnowledgeFile(TimestampMixin, Base):
    __tablename__ = "creator_studio_knowledge_files"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    agent_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("agents.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)

    agent = relationship("Agent", back_populates="creator_studio_files")
    chunks = relationship(
        "CreatorStudioKnowledgeChunk", back_populates="file", cascade="all, delete"
    )


class CreatorStudioKnowledgeChunk(TimestampMixin, Base):
    __tablename__ = "creator_studio_knowledge_chunks"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    file_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("creator_studio_knowledge_files.id", ondelete="CASCADE"), nullable=False
    )
    agent_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("agents.id", ondelete="CASCADE"), nullable=False
    )
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    embedding: Mapped[list] = mapped_column(JSON, default=list)

    file = relationship("CreatorStudioKnowledgeFile", back_populates="chunks")
    agent = relationship("Agent", back_populates="creator_studio_chunks")




class CreatorStudioLLMConfig(TimestampMixin, Base):
    __tablename__ = "creator_studio_llm_configs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    provider: Mapped[str] = mapped_column(String(64), nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    api_key: Mapped[str] = mapped_column(String(512), default="", nullable=False)
    usage: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    limit_amount: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class CreatorStudioAppSetting(TimestampMixin, Base):
    __tablename__ = "creator_studio_app_settings"

    key: Mapped[str] = mapped_column(String(128), primary_key=True)
    value: Mapped[str] = mapped_column(String(2048), nullable=False)


class CreatorStudioGuestCredit(TimestampMixin, Base):
    __tablename__ = "creator_studio_guest_credits"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    credits: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
