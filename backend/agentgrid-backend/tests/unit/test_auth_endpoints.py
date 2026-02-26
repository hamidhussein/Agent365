from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import get_settings
from app.core.deps import get_db
from app.db.base import Base
from app.main import app

settings = get_settings()

SQLALCHEMY_DATABASE_URL = settings.TEST_DATABASE_URL

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def _unique_email() -> str:
    return f"user-{uuid4().hex}@example.com"


def _register_user(payload: dict) -> None:
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201, response.text
    assert response.json()["user"]["role"] == "creator"


def test_register_login_and_me_flow():
    password = "Password123!"
    payload = {
        "email": _unique_email(),
        "username": f"user-{uuid4().hex[:8]}",
        "password": password,
        "full_name": "API Tester",
    }
    _register_user(payload)

    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": payload["email"], "password": password},
    )
    assert login_response.status_code == 200, login_response.text
    tokens = login_response.json()
    assert tokens["access_token"]
    assert tokens["refresh_token"]

    auth_headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    me_response = client.get("/api/v1/auth/me", headers=auth_headers)
    assert me_response.status_code == 200, me_response.text
    assert me_response.json()["email"] == payload["email"]
    assert me_response.json()["role"] == "creator"


def test_refresh_endpoint_returns_new_token():
    password = "Password123!"
    payload = {
        "email": _unique_email(),
        "username": f"user-{uuid4().hex[:8]}",
        "password": password,
        "full_name": "Refresh Tester",
    }
    _register_user(payload)

    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": payload["email"], "password": password},
    )
    tokens = login_response.json()

    refresh_response = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": tokens["refresh_token"]},
    )
    assert refresh_response.status_code == 200, refresh_response.text
    refreshed = refresh_response.json()
    assert refreshed["access_token"]
    assert refreshed["refresh_token"]
    assert refreshed["user"]["email"] == payload["email"]
    assert refreshed["user"]["role"] == "creator"
