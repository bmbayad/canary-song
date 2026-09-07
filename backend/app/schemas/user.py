from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional
from uuid import UUID


class UserBase(BaseModel):
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    display_name: Optional[str] = None
    preferred_language: str = "en"
    timezone: Optional[str] = None
    country_region: Optional[str] = None
    phone: Optional[str] = None


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    display_name: Optional[str] = None
    preferred_language: Optional[str] = None
    timezone: Optional[str] = None
    country_region: Optional[str] = None
    phone: Optional[str] = None


class UserResponse(UserBase):
    id: UUID
    role: str
    status: str
    password_reset_required: bool = False
    created_at: datetime
    updated_at: datetime
    last_login_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


class GoogleAuthRequest(BaseModel):
    id_token: str


class ResetPasswordRequest(BaseModel):
    old_password: str
    new_password: str
