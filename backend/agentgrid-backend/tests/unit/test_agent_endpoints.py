import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.deps import get_db, require_creator
from app.db.base import Base
from app.main import app
from app.models.enums import AgentCategory, UserRole
from app.schemas.agent import AgentConfig

DATABASE_URL = "sqlite://"
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def override_get_db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


class DummyUser:
    def __init__(self):
        self.id = uuid.uuid4()
        self.role = UserRole.CREATOR


dummy_user = DummyUser()


def override_require_creator():
    return dummy_user


app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[require_creator] = override_require_creator
client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


def _agent_payload(name: str = "Endpoint Agent"):
    return {
        "name": name,
        "description": "Agent description with sufficient detail.",
        "long_description": "Long form description.",
        "category": AgentCategory.RESEARCH.value,
        "tags": ["api", "test"],
        "price_per_run": 12.5,
        "config": AgentConfig(
            model="gpt-4",
            temperature=0.2,
            max_tokens=2000,
            timeout_seconds=120,
            required_inputs=[{"name": "topic"}],
            output_schema={"type": "object"},
        ).model_dump(),
        "capabilities": ["responses"],
        "limitations": ["beta"],
        "demo_available": False,
    }


def test_create_and_get_agent_via_api():
    create_resp = client.post("/api/v1/agents/", json=_agent_payload())
    assert create_resp.status_code == 201
    agent_id = create_resp.json()["id"]

    client.patch(f"/api/v1/agents/{agent_id}", json={"status": "active"})

    list_resp = client.get("/api/v1/agents/")
    assert list_resp.status_code == 200
    assert list_resp.json()["total"] == 1

    get_resp = client.get(f"/api/v1/agents/{agent_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["name"] == "Endpoint Agent"


def test_update_and_delete_agent_via_api():
    create_resp = client.post("/api/v1/agents/", json=_agent_payload("Initial"))
    agent_id = create_resp.json()["id"]

    client.patch(f"/api/v1/agents/{agent_id}", json={"status": "active"})

    update_resp = client.patch(
        f"/api/v1/agents/{agent_id}",
        json={"name": "Updated Name"},
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["name"] == "Updated Name"

    delete_resp = client.delete(f"/api/v1/agents/{agent_id}")
    assert delete_resp.status_code == 204
