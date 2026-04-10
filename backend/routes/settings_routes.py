from __future__ import annotations

from datetime import datetime
from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, Field

from controllers.auth_controller import decode_token, assert_iba_email
from database import users_collection


router = APIRouter(prefix="/api/settings", tags=["Settings"])
COOKIE_NAME = "access_token"


class SettingsUpdateRequest(BaseModel):
    auto_speak: bool | None = None
    enter_to_send: bool | None = None
    show_suggested_prompts: bool | None = None
    reduce_animations: bool | None = None

class ProfileUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=80)
    picture: str | None = Field(default=None, max_length=2_000_000)


DEFAULT_SETTINGS = {
    "auto_speak": False,
    "enter_to_send": True,
    "show_suggested_prompts": True,
    "reduce_animations": False,
}

ALLOWED_SETTINGS_KEYS = set(DEFAULT_SETTINGS.keys())


async def _get_authenticated_user(request: Request):
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    payload = decode_token(token)
    email = payload.get("email") or ""
    assert_iba_email(email)
    user = await users_collection.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.get("")
async def get_settings(request: Request):
    user = await _get_authenticated_user(request)
    stored = user.get("settings") or {}
    sanitized = {k: v for k, v in stored.items() if k in ALLOWED_SETTINGS_KEYS}
    merged = {**DEFAULT_SETTINGS, **sanitized}
    return {
        "settings": merged,
        "two_factor_enabled": bool(user.get("two_factor_enabled", False)),
    }


@router.put("")
async def update_settings(request: Request, payload: SettingsUpdateRequest):
    user = await _get_authenticated_user(request)
    incoming = payload.model_dump(exclude_none=True)
    current = user.get("settings") or {}
    current_sanitized = {k: v for k, v in current.items() if k in ALLOWED_SETTINGS_KEYS}
    incoming_sanitized = {k: v for k, v in incoming.items() if k in ALLOWED_SETTINGS_KEYS}
    updated = {**current_sanitized, **incoming_sanitized}
    await users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"settings": updated, "updated_at": datetime.utcnow()}},
    )
    merged = {**DEFAULT_SETTINGS, **updated}
    return {"message": "Settings saved", "settings": merged}


@router.get("/profile")
async def get_profile(request: Request):
    user = await _get_authenticated_user(request)
    return {
        "name": user.get("name", ""),
        "email": user.get("email", ""),
        "picture": user.get("picture"),
    }


@router.put("/profile")
async def update_profile(request: Request, payload: ProfileUpdateRequest):
    user = await _get_authenticated_user(request)
    updates = payload.model_dump(exclude_none=True)
    if not updates:
        return {
            "message": "No profile changes",
            "profile": {
                "name": user.get("name", ""),
                "email": user.get("email", ""),
                "picture": user.get("picture"),
            },
        }
    await users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {**updates, "updated_at": datetime.utcnow()}},
    )
    updated_user = await users_collection.find_one({"_id": user["_id"]})
    return {
        "message": "Profile updated",
        "profile": {
            "name": updated_user.get("name", ""),
            "email": updated_user.get("email", ""),
            "picture": updated_user.get("picture"),
        },
    }
