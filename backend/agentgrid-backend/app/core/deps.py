from collections.abc import Callable, Generator
from typing import Optional
from uuid import UUID

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import decode_token, is_token_type
from app.db.session import SessionLocal
from app.models.enums import UserRole
from app.models.user import User

settings = get_settings()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/token")
optional_oauth2_scheme = HTTPBearer(auto_error=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_settings_dependency():
    return settings


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    unauthorized_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
    except JWTError as exc:
        raise unauthorized_exc from exc

    if not is_token_type(payload, "access"):
        raise unauthorized_exc

    subject = payload.get("sub")
    if subject is None:
        raise unauthorized_exc

    try:
        user_id = UUID(subject)
    except ValueError as exc:
        raise unauthorized_exc from exc

    user = db.get(User, user_id)
    if not user:
        raise unauthorized_exc
    return user


def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(optional_oauth2_scheme),
    db: Session = Depends(get_db),
) -> User | None:
    if not credentials:
        return None
    try:
        payload = decode_token(credentials.credentials)
        if not is_token_type(payload, "access"):
            return None
        subject = payload.get("sub")
        if subject is None:
            return None
        user_id = UUID(subject)
        return db.get(User, user_id)
    except (JWTError, ValueError):
        return None


def require_roles(*roles: UserRole) -> Callable[[User], User]:
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if roles and current_user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return current_user

    return role_checker


def require_creator(current_user: User = Depends(require_roles(UserRole.CREATOR, UserRole.ADMIN, UserRole.USER))) -> User:
    return current_user
