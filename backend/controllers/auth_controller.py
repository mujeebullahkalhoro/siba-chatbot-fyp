from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict
from fastapi import HTTPException, status
from jose import jwt, JWTError
from config import JWT_SECRET, JWT_ALGORITHM

ACCESS_TOKEN_EXPIRES_SECONDS: int = 3600
IBA_DOMAIN: str = "@iba-suk.edu.pk"

def create_token(data: Dict[str, Any], expires_seconds: int = ACCESS_TOKEN_EXPIRES_SECONDS) -> str:
    payload = data.copy()
    now = datetime.now(timezone.utc)
    exp = now + timedelta(seconds=expires_seconds)
    payload["exp"] = int(exp.timestamp())
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> Dict[str, Any]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from exc

def is_iba_email(email: str) -> bool:
    return isinstance(email, str) and email.lower().endswith(IBA_DOMAIN)

def assert_iba_email(email: str) -> None:
    if not is_iba_email(email):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Sukkur IBA users allowed",
        )
