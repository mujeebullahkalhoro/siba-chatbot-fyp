from __future__ import annotations

import os
from datetime import datetime
from fastapi import APIRouter, HTTPException, Body, Request, status
from fastapi.responses import JSONResponse, RedirectResponse
import httpx

from controllers.auth_controller import create_token, decode_token, assert_iba_email
from utils.google_verify import verify_google_token
from database import users_collection

router = APIRouter(prefix="/api/auth", tags=["Auth"])

IBA_DOMAIN = "@iba-suk.edu.pk"
COOKIE_NAME = "access_token"
COOKIE_MAX_AGE = 3600

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

# Optional: ID token (popup) endpoint
@router.post("/google")
async def google_auth(google_token: str = Body(..., embed=True)):
    user_data = await verify_google_token(google_token)
    if not user_data:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google token")
    email = user_data["email"]
    assert_iba_email(email)

    existing = await users_collection.find_one({"email": email})
    if not existing:
        await users_collection.insert_one({
            "name": user_data.get("name", "IBA User"),
            "email": email,
            "picture": user_data.get("picture"),
            "provider": "google",
            "created_at": datetime.utcnow(),
        })

    token = create_token({"email": email})
    response = JSONResponse({
        "message": "Login successful",
        "user": {
            "name": user_data.get("name", "IBA User"),
            "email": email,
            "picture": user_data.get("picture"),
            "provider": "google",
        },
    })
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=COOKIE_MAX_AGE,
        path="/",
    )
    return response

# OAuth Code flow callback (chooser + redirect)
@router.get("/google/callback")
async def google_oauth_callback(request: Request):
    err = request.query_params.get("error")
    if err:
        return RedirectResponse(url=f"{FRONTEND_URL}/?error={err}")

    code = request.query_params.get("code")
    if not code:
        raise HTTPException(status_code=400, detail="Missing authorization code")

    redirect_uri = str(request.url.replace(query=""))

    token_url = "https://oauth2.googleapis.com/token"
    data = {
        "code": code,
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
    }
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.post(token_url, data=data)
    if r.status_code != 200:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token exchange failed")

    token_payload = r.json()
    id_token_jwt = token_payload.get("id_token")
    if not id_token_jwt:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No id_token returned")

    idinfo = await verify_google_token(id_token_jwt)
    email = idinfo["email"]
    assert_iba_email(email)

    existing = await users_collection.find_one({"email": email})
    if not existing:
        await users_collection.insert_one({
            "name": idinfo.get("name", "IBA User"),
            "email": email,
            "picture": idinfo.get("picture"),
            "provider": "google",
            "created_at": datetime.utcnow(),
        })

    jwt_token = create_token({"email": email})
    resp = RedirectResponse(url=f"{FRONTEND_URL}/dashboard")
    resp.set_cookie(
        key=COOKIE_NAME,
        value=jwt_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=COOKIE_MAX_AGE,
        path="/",
    )
    return resp

@router.get("/me")
async def get_current_user(request: Request):
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        payload = decode_token(token)
        email = payload.get("email") or ""
        assert_iba_email(email)
        user = await users_collection.find_one({"email": email})
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        return {
            "email": user["email"],
            "name": user.get("name"),
            "picture": user.get("picture"),
            "provider": user.get("provider", "google"),
        }
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

@router.post("/logout")
async def logout():
    response = JSONResponse({"message": "Logged out successfully"})
    response.delete_cookie(
        COOKIE_NAME,
        path="/",
        samesite="none",
        secure=True,
    )
    return response
