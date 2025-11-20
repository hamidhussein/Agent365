from uuid import UUID
from typing import Optional, Tuple

from fastapi import HTTPException, status
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_password_hash,
    is_token_type,
    verify_password,
)
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.user import UserCreate


def register_user(db: Session, user_in: UserCreate) -> User:
    existing = (
        db.query(User)
        .filter((User.email == user_in.email) | (User.username == user_in.username))
        .first()
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User already exists")

    if isinstance(user_in.role, UserRole):
        role_enum = user_in.role
    else:
        role_enum = UserRole(str(user_in.role).lower())

    user = User(
        email=user_in.email,
        username=user_in.username,
        full_name=user_in.full_name,
        role=role_enum,
        credits=user_in.credits,
        hashed_password=get_password_hash(user_in.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user


def _build_token_payload(user: User) -> dict:
    return {"sub": str(user.id), "role": user.role.value}


def create_user_tokens(user: User) -> dict:
    settings = get_settings()
    payload = _build_token_payload(user)
    access_token = create_access_token(payload)
    refresh_token = create_refresh_token(payload)
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }


def refresh_user_session(db: Session, refresh_token: str) -> Tuple[User, dict]:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid refresh token",
    )
    try:
        payload = decode_token(refresh_token)
    except JWTError as exc:
        raise unauthorized from exc

    if not is_token_type(payload, "refresh"):
        raise unauthorized

    subject = payload.get("sub")
    if not subject:
        raise unauthorized

    try:
        user_id = UUID(subject)
    except ValueError as exc:
        raise unauthorized from exc

    user = db.get(User, user_id)
    if not user:
        raise unauthorized
    return user, create_user_tokens(user)
