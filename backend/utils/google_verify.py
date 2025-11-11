from __future__ import annotations
from typing import Dict, Any
from google.oauth2 import id_token
from google.auth.transport import requests
from fastapi import HTTPException, status
from config import GOOGLE_CLIENT_ID

CLOCK_SKEW_SECONDS = 10

async def verify_google_token(token: str) -> Dict[str, Any]:
    try:
        idinfo = id_token.verify_oauth2_token(
            token,
            requests.Request(),
            GOOGLE_CLIENT_ID,
            clock_skew_in_seconds=CLOCK_SKEW_SECONDS,
        )
        return {
            "sub": idinfo.get("sub"),
            "email": idinfo.get("email"),
            "email_verified": idinfo.get("email_verified", False),
            "name": idinfo.get("name", "Google User"),
            "picture": idinfo.get("picture"),
            "hd": idinfo.get("hd"),
            "iss": idinfo.get("iss"),
            "aud": idinfo.get("aud"),
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Google token: {str(e)}"
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to verify Google token."
        )
