from typing import List, Optional, Tuple
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from app.models.agent import Agent
from app.models.enums import AgentCategory, AgentStatus, UserRole
from app.models.user import User
from app.schemas.agent import AgentCreate, AgentUpdate


def _coerce_uuid(value: str) -> UUID:
    try:
        return UUID(str(value))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid identifier") from exc


class AgentService:
    @staticmethod
    def create_agent(db: Session, agent_data: AgentCreate, creator: User) -> Agent:
        agent_payload = agent_data.model_dump()
        agent_payload["category"] = agent_payload["category"].value
        agent_payload["status"] = AgentStatus.ACTIVE  # Changed from PENDING_REVIEW to ACTIVE
        agent = Agent(
            creator_id=creator.id,
            **agent_payload,
        )
        db.add(agent)
        db.commit()
        db.refresh(agent)
        return agent

    @staticmethod
    def get_agent(
        db: Session,
        agent_id: str,
        include_creator_studio_public: bool = False,
    ) -> Optional[Agent]:
        agent_uuid = _coerce_uuid(agent_id)
        agent = db.query(Agent).filter(Agent.id == agent_uuid).first()
        if agent and agent.source == "creator_studio":
            if not include_creator_studio_public or not agent.is_public:
                return None
        return agent

    @staticmethod
    def list_agents(
        db: Session,
        skip: int = 0,
        limit: int = 20,
        category: Optional[AgentCategory] = None,
        search: Optional[str] = None,
        min_rating: Optional[float] = None,
        max_price: Optional[float] = None,
        tags: Optional[List[str]] = None,
        sort_by: str = "newest",
        creator_id: Optional[str] = None,
        source: Optional[str] = "manual",
        include_creator_studio_public: bool = False,
    ) -> Tuple[List[Agent], int]:
        query = db.query(Agent).filter(Agent.status == AgentStatus.ACTIVE)
        creator_public_filter = and_(Agent.source == "creator_studio", Agent.is_public.is_(True))

        if source == "manual" or source is None:
            if include_creator_studio_public:
                query = query.filter(or_(Agent.source == "manual", creator_public_filter))
            else:
                query = query.filter(Agent.source == "manual")
        elif source == "creator_studio":
            if include_creator_studio_public:
                query = query.filter(creator_public_filter)
            else:
                query = query.filter(Agent.id.is_(None))
        elif source == "all":
            if include_creator_studio_public:
                query = query.filter(or_(Agent.source == "manual", creator_public_filter))
            else:
                query = query.filter(Agent.source != "creator_studio")
        bind = db.get_bind()

        if category:
            query = query.filter(Agent.category == category.value)
        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                or_(Agent.name.ilike(search_pattern), Agent.description.ilike(search_pattern))
            )
        if min_rating is not None:
            query = query.filter(Agent.rating >= min_rating)
        if max_price is not None:
            query = query.filter(Agent.price_per_run <= max_price)
        if tags:
            if bind and bind.dialect.name == "sqlite":
                for tag in tags:
                    query = query.filter(Agent.tags.like(f'%{tag}%'))
            else:
                for tag in tags:
                    query = query.filter(Agent.tags.contains([tag]))
        if creator_id:
            creator_uuid = _coerce_uuid(creator_id)
            query = query.filter(Agent.creator_id == creator_uuid)

        if sort_by == "popular":
            query = query.order_by(Agent.total_runs.desc())
        elif sort_by == "rating":
            query = query.order_by(Agent.rating.desc())
        elif sort_by == "price_low":
            query = query.order_by(Agent.price_per_run.asc())
        elif sort_by == "price_high":
            query = query.order_by(Agent.price_per_run.desc())
        else:
            query = query.order_by(Agent.created_at.desc())

        total = query.count()
        agents = query.offset(skip).limit(limit).all()
        return agents, total

    @staticmethod
    def update_agent(
        db: Session,
        agent_id: str,
        agent_data: AgentUpdate,
        current_user: User,
    ) -> Agent:
        agent_uuid = _coerce_uuid(agent_id)
        agent = db.query(Agent).filter(Agent.id == agent_uuid).first()
        if not agent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Agent not found",
            )

        if agent.creator_id != current_user.id and current_user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this agent",
            )

        update_payload = agent_data.model_dump(exclude_unset=True)
        if "category" in update_payload and update_payload["category"] is not None:
            update_payload["category"] = update_payload["category"].value

        for field, value in update_payload.items():
            setattr(agent, field, value)

        db.commit()
        db.refresh(agent)
        return agent

    @staticmethod
    def delete_agent(db: Session, agent_id: str, current_user: User) -> bool:
        agent_uuid = _coerce_uuid(agent_id)
        agent = db.query(Agent).filter(Agent.id == agent_uuid).first()
        if not agent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Agent not found",
            )

        if agent.creator_id != current_user.id and current_user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to delete this agent",
            )

        agent.status = AgentStatus.INACTIVE
        db.commit()
        return True
