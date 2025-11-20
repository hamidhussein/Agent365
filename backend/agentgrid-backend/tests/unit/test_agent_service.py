import uuid

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.models.agent import Agent
from app.models.enums import AgentCategory, AgentStatus, UserRole
from app.models.user import User
from app.schemas.agent import AgentConfig, AgentCreate, AgentUpdate
from app.services.agent import AgentService


@pytest.fixture()
def db_session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(bind=engine)
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


def _create_user(db_session) -> User:
    user = User(
        email=f"creator-{uuid.uuid4().hex[:6]}@example.com",
        username=f"creator-{uuid.uuid4().hex[:6]}",
        full_name="Creator",
        hashed_password="hashed",
        role=UserRole.CREATOR,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def _agent_payload(name: str = "Research Agent") -> AgentCreate:
    return AgentCreate(
        name=name,
        description="Performs deep research across datasets.",
        long_description="Extended description here.",
        category=AgentCategory.RESEARCH,
        tags=["research", "analysis"],
        price_per_run=25.0,
        config=AgentConfig(
            model="gpt-4",
            temperature=0.2,
            max_tokens=4000,
            timeout_seconds=120,
            required_inputs=[{"name": "topic", "type": "string"}],
            output_schema={"type": "object"},
        ),
        capabilities=["summaries", "citations"],
        limitations=["beta"],
        demo_available=True,
    )


def test_create_agent(db_session):
    creator = _create_user(db_session)
    agent = AgentService.create_agent(db_session, _agent_payload(), creator)

    assert agent.name == "Research Agent"
    assert agent.status == AgentStatus.PENDING_REVIEW
    assert agent.creator_id == creator.id
    assert agent.capabilities == ["summaries", "citations"]


def test_list_agents_with_filters(db_session):
    creator = _create_user(db_session)
    AgentService.create_agent(db_session, _agent_payload("Agent One"), creator)
    AgentService.create_agent(
        db_session,
        _agent_payload("Agent Two").model_copy(
            update={
                "tags": ["support"],
                "category": AgentCategory.SUPPORT,
                "price_per_run": 10.0,
                "capabilities": ["chat"],
            }
        ),
        creator,
    )
    for agent in db_session.query(Agent).all():
        agent.status = AgentStatus.ACTIVE
    db_session.commit()

    agents, total = AgentService.list_agents(
        db_session,
        skip=0,
        limit=10,
        category=AgentCategory.RESEARCH,
        search="Agent",
        tags=["research"],
    )

    assert total == 1
    assert len(agents) == 1
    assert agents[0].name == "Agent One"


def test_update_agent_enforces_access(db_session):
    creator = _create_user(db_session)
    other = _create_user(db_session)
    agent = AgentService.create_agent(db_session, _agent_payload(), creator)

    updated = AgentService.update_agent(
        db_session,
        str(agent.id),
        AgentUpdate(name="Updated"),
        creator,
    )
    assert updated.name == "Updated"

    with pytest.raises(Exception):
        AgentService.update_agent(
            db_session,
            str(agent.id),
            AgentUpdate(name="Hacker"),
            other,
        )


def test_delete_agent_soft(db_session):
    creator = _create_user(db_session)
    agent = AgentService.create_agent(db_session, _agent_payload(), creator)

    result = AgentService.delete_agent(db_session, str(agent.id), creator)
    assert result is True
    db_session.refresh(agent)
    assert agent.status == AgentStatus.INACTIVE
