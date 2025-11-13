from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import pytest

from app.db.base import Base
from fastapi import HTTPException

from app.schemas.user import UserCreate
from app.services.auth import (
    authenticate_user,
    create_user_tokens,
    refresh_user_session,
    register_user,
)


@pytest.fixture()
def db_session():
    engine = create_engine("sqlite:///:memory:")
    TestingSessionLocal = sessionmaker(bind=engine)
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


def test_register_and_authenticate_user(db_session):
    user_in = UserCreate(
        email="test@example.com", username="tester", password="Password123!", full_name="Test User"
    )
    user = register_user(db_session, user_in)
    assert user.email == user_in.email

    authenticated = authenticate_user(db_session, user_in.email, user_in.password)
    assert authenticated is not None
    assert authenticated.id == user.id


def test_register_duplicate_user_raises(db_session):
    user_in = UserCreate(
        email="dupe@example.com",
        username="dupe",
        password="Password123!",
        full_name="Dupe",
    )
    register_user(db_session, user_in)
    with pytest.raises(HTTPException):
        register_user(db_session, user_in)


def test_authenticate_user_invalid_password(db_session):
    user_in = UserCreate(
        email="invalid-pass@example.com",
        username="invalid-pass",
        password="Password123!",
        full_name="Invalid Pass",
    )
    register_user(db_session, user_in)
    assert authenticate_user(db_session, user_in.email, "WrongPassword1") is None


def test_create_and_refresh_tokens(db_session):
    user_in = UserCreate(
        email="token@example.com",
        username="token-user",
        password="Password123!",
        full_name="Token User",
    )
    user = register_user(db_session, user_in)
    tokens = create_user_tokens(user)
    assert tokens["access_token"]
    assert tokens["refresh_token"]
    refreshed_user, refreshed_tokens = refresh_user_session(db_session, tokens["refresh_token"])
    assert refreshed_user.id == user.id
    assert refreshed_tokens["access_token"]
