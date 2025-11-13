from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.auth import AuthResponse, LoginRequest, RefreshRequest
from app.schemas.user import UserCreate, UserRead
from app.services.auth import (
    authenticate_user,
    create_user_tokens,
    refresh_user_session,
    register_user,
)

router = APIRouter(prefix="/auth")


def _build_auth_response(user: User) -> AuthResponse:
    tokens = create_user_tokens(user)
    return AuthResponse(user=user, **tokens)


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    user = register_user(db, user_in)
    return user


@router.post("/login", response_model=AuthResponse)
def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db, credentials.email, credentials.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return _build_auth_response(user)


@router.post("/token", response_model=AuthResponse)
def login_with_oauth(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return _build_auth_response(user)


@router.post("/refresh", response_model=AuthResponse)
def refresh_tokens(payload: RefreshRequest, db: Session = Depends(get_db)):
    user, tokens = refresh_user_session(db, payload.refresh_token)
    return AuthResponse(user=user, **tokens)


@router.get("/me", response_model=UserRead)
def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user
