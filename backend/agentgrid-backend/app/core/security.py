from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Literal, Optional

import bcrypt
from jose import JWTError, jwt

from app.core.config import get_settings

TokenType = Literal["access", "refresh"]


def verify_password(plain_password: str, hashed_password: str) -> bool:
    plain_bytes = plain_password.encode("utf-8")
    hashed_bytes = hashed_password.encode("utf-8")
    return bcrypt.checkpw(plain_bytes, hashed_bytes)


def get_password_hash(password: str) -> str:
    password_bytes = password.encode("utf-8")
    hashed = bcrypt.hashpw(password_bytes, bcrypt.gensalt())
    return hashed.decode("utf-8")


def _create_token(
    data: Dict[str, Any],
    *,
    expires_delta: timedelta,
    token_type: TokenType,
) -> str:
    settings = get_settings()
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode.update({"exp": expire, "token_type": token_type})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    settings = get_settings()
    expiry = expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return _create_token(data, expires_delta=expiry, token_type="access")


def create_refresh_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    settings = get_settings()
    expiry = expires_delta or timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    return _create_token(data, expires_delta=expiry, token_type="refresh")


def decode_token(token: str) -> Dict[str, Any]:
    settings = get_settings()
    return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])


def is_token_type(payload: Dict[str, Any], expected: TokenType) -> bool:
    return payload.get("token_type") == expected
