from __future__ import annotations
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator

class GoogleAuthRequest(BaseModel):
    google_token: str = Field(..., min_length=10, description="Google ID token from GIS")

class UserBase(BaseModel):
    name: str = Field(..., min_length=1)
    email: EmailStr

    @field_validator("email")
    @classmethod
    def iba_only(cls, v: EmailStr) -> EmailStr:
        if not str(v).lower().endswith("@iba-suk.edu.pk"):
            raise ValueError("Only Sukkur IBA emails allowed")
        return v

class UserPublic(UserBase):
    picture: Optional[str] = None
    provider: str = "google"

class UserInDB(UserPublic):
    id: Optional[str] = None
    created_at: Optional[datetime] = None
    hashed_password: Optional[str] = None

class TokenData(BaseModel):
    access_token: str
    token_type: str = "bearer"

class GoogleAuthResponse(BaseModel):
    message: str = "Login successful"
    user: UserPublic
