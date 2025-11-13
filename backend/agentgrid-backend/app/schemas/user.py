from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator

from app.models.enums import UserRole


class UserBase(BaseModel):
    email: EmailStr
    username: str = Field(max_length=50)
    full_name: str | None = None
    role: UserRole = UserRole.USER
    credits: int = 0


class UserCreate(UserBase):
    password: str = Field(min_length=8)

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, value: str) -> str:
        if not any(char.isupper() for char in value):
            raise ValueError("Password must include at least one uppercase letter")
        if not any(char.islower() for char in value):
            raise ValueError("Password must include at least one lowercase letter")
        if not any(char.isdigit() for char in value):
            raise ValueError("Password must include at least one digit")
        return value


class UserRead(UserBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
