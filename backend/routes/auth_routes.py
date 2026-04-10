from __future__ import annotations

import logging
import os
import hashlib
import secrets
from datetime import datetime
from urllib.parse import quote
from fastapi import APIRouter, HTTPException, Body, Request, status
from fastapi.responses import JSONResponse, RedirectResponse
import httpx
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError

from controllers.auth_controller import create_token, decode_token, assert_iba_email
from utils.google_verify import verify_google_token
from utils.twofa_utils import generate_base32_secret, verify_totp, build_otpauth_uri
from utils.email_utils import send_email_otp
from database import users_collection

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["Auth"])

IBA_DOMAIN = "@iba-suk.edu.pk"
COOKIE_NAME = "access_token"
PENDING_2FA_COOKIE = "pending_2fa_token"
COOKIE_MAX_AGE = 604800  # 7 days
PENDING_2FA_MAX_AGE = 600  # 10 minutes

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")


def _hash_otp(code: str) -> str:
    return hashlib.sha256(code.encode("utf-8")).hexdigest()


async def _issue_email_login_otp(email: str):
    code = f"{secrets.randbelow(1_000_000):06d}"
    code_hash = _hash_otp(code)
    expires_at = datetime.utcnow().timestamp() + PENDING_2FA_MAX_AGE
    await users_collection.update_one(
        {"email": email},
        {
            "$set": {
                "two_factor_login_code_hash": code_hash,
                "two_factor_login_code_expires_at": expires_at,
            }
        },
    )
    try:
        send_email_otp(to_email=email, otp_code=code)
    except Exception as exc:
        # Without SMTP, email OTP cannot be sent — avoid 500 on OAuth callback.
        # OTP is still stored; for local dev check server logs and enter the code in the 2FA modal.
        logger.warning(
            "2FA email OTP could not be sent for %s: %s",
            email,
            exc,
        )
        logger.warning(
            "[DEV] 2FA login OTP for %s (valid ~10 min): %s — configure SMTP_HOST/SMTP_USER/SMTP_PASSWORD to send by email.",
            email,
            code,
        )


def _set_auth_cookie(response, token: str):
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=COOKIE_MAX_AGE,
        path="/",
    )


def _set_pending_2fa_cookie(response, email: str):
    pending = create_token({"email": email, "purpose": "2fa_pending"}, expires_seconds=PENDING_2FA_MAX_AGE)
    response.set_cookie(
        key=PENDING_2FA_COOKIE,
        value=pending,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=PENDING_2FA_MAX_AGE,
        path="/",
    )


def _clear_pending_2fa_cookie(response):
    response.delete_cookie(
        PENDING_2FA_COOKIE,
        path="/",
        samesite="lax",
        secure=False,
    )

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

    existing = await users_collection.find_one({"email": email})
    two_factor_enabled = bool(existing and existing.get("two_factor_enabled"))
    response = JSONResponse(
        {
            "message": "2FA required" if two_factor_enabled else "Login successful",
            "requires_2fa": two_factor_enabled,
            "user": {
                "name": user_data.get("name", "IBA User"),
                "email": email,
                "picture": user_data.get("picture"),
                "provider": "google",
            },
        }
    )
    if two_factor_enabled:
        await _issue_email_login_otp(email)
        _set_pending_2fa_cookie(response, email)
    else:
        token = create_token({"email": email})
        _set_auth_cookie(response, token)
    return response

# OAuth Code flow callback (chooser + redirect)
@router.get("/google/callback")
async def google_oauth_callback(request: Request):
    try:
        err = request.query_params.get("error")
        if err:
            return RedirectResponse(url=f"{FRONTEND_URL}/?error={err}")

        code = request.query_params.get("code")
        if not code:
            return RedirectResponse(url=f"{FRONTEND_URL}/?error=missing_code")

        if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
            logger.error("GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is not set")
            return RedirectResponse(url=f"{FRONTEND_URL}/?error=oauth_config")

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
            logger.warning("Google token exchange failed: %s %s", r.status_code, r.text[:500])
            return RedirectResponse(url=f"{FRONTEND_URL}/?error=token_exchange")

        token_payload = r.json()
        id_token_jwt = token_payload.get("id_token")
        if not id_token_jwt:
            return RedirectResponse(url=f"{FRONTEND_URL}/?error=no_id_token")

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

        existing = await users_collection.find_one({"email": email})
        two_factor_enabled = bool(existing and existing.get("two_factor_enabled"))
        if two_factor_enabled:
            await _issue_email_login_otp(email)
            resp = RedirectResponse(url=f"{FRONTEND_URL}/?twofa=required")
            _set_pending_2fa_cookie(resp, email)
        else:
            jwt_token = create_token({"email": email})
            resp = RedirectResponse(url=f"{FRONTEND_URL}/dashboard")
            _set_auth_cookie(resp, jwt_token)
        return resp
    except HTTPException as he:
        return RedirectResponse(url=f"{FRONTEND_URL}/?error={quote(str(he.detail), safe='')}")
    except (ServerSelectionTimeoutError, ConnectionFailure) as exc:
        # MongoDB not running or wrong MONGO_URI — not a 2FA issue.
        logger.warning("MongoDB unreachable during Google OAuth (start mongod or fix MONGO_URI): %s", exc)
        return RedirectResponse(url=f"{FRONTEND_URL}/?error=mongodb_offline")
    except Exception as exc:
        logger.exception("google_oauth_callback failed: %s", exc)
        return RedirectResponse(url=f"{FRONTEND_URL}/?error=server")

@router.get("/me")
async def get_current_user(request: Request):
    pending_2fa = request.cookies.get(PENDING_2FA_COOKIE)
    if pending_2fa:
        try:
            payload = decode_token(pending_2fa)
            if payload.get("purpose") == "2fa_pending":
                return JSONResponse(
                    status_code=status.HTTP_428_PRECONDITION_REQUIRED,
                    content={"detail": "2FA required"},
                )
        except HTTPException:
            # Ignore invalid/expired pending cookie and continue with normal auth check.
            pass

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
            "two_factor_enabled": bool(user.get("two_factor_enabled", False)),
        }
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

@router.post("/logout")
async def logout():
    response = JSONResponse({"message": "Logged out successfully"})
    response.delete_cookie(
        PENDING_2FA_COOKIE,
        path="/",
        samesite="lax",
        secure=False,
    )
    response.delete_cookie(
        COOKIE_NAME,
        path="/",
        samesite="lax",
        secure=False,
    )
    return response


@router.post("/2fa/setup")
async def setup_2fa(request: Request):
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    payload = decode_token(token)
    email = payload.get("email") or ""
    assert_iba_email(email)

    user = await users_collection.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    secret = generate_base32_secret()
    await users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"two_factor_temp_secret": secret}},
    )
    return {
        "secret": secret,
        "otpauth_url": build_otpauth_uri(email=email, secret=secret, issuer="SIBA Chatbot"),
    }


@router.post("/2fa/enable")
async def enable_2fa(request: Request, code: str = Body(..., embed=True)):
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    payload = decode_token(token)
    email = payload.get("email") or ""
    assert_iba_email(email)

    user = await users_collection.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    temp_secret = user.get("two_factor_temp_secret")
    if not temp_secret:
        raise HTTPException(status_code=400, detail="2FA setup not initialized")
    if not verify_totp(code=code, secret=temp_secret):
        raise HTTPException(status_code=400, detail="Invalid verification code")

    await users_collection.update_one(
        {"_id": user["_id"]},
        {
            "$set": {"two_factor_enabled": True, "two_factor_secret": temp_secret},
            "$unset": {"two_factor_temp_secret": ""},
        },
    )
    return {"message": "2FA enabled"}


@router.post("/2fa/disable")
async def disable_2fa(request: Request, code: str = Body(..., embed=True)):
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    payload = decode_token(token)
    email = payload.get("email") or ""
    assert_iba_email(email)

    user = await users_collection.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if not user.get("two_factor_enabled"):
        raise HTTPException(status_code=400, detail="2FA is not enabled")
    secret = user.get("two_factor_secret")
    if not secret or not verify_totp(code=code, secret=secret):
        raise HTTPException(status_code=400, detail="Invalid verification code")

    await users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"two_factor_enabled": False}, "$unset": {"two_factor_secret": "", "two_factor_temp_secret": ""}},
    )
    return {"message": "2FA disabled"}


@router.post("/2fa/verify-login")
async def verify_login_2fa(request: Request, code: str = Body(..., embed=True)):
    pending_token = request.cookies.get(PENDING_2FA_COOKIE)
    if not pending_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No 2FA challenge found")

    payload = decode_token(pending_token)
    if payload.get("purpose") != "2fa_pending":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid 2FA challenge")

    email = payload.get("email") or ""
    assert_iba_email(email)
    user = await users_collection.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if not user.get("two_factor_enabled"):
        raise HTTPException(status_code=400, detail="2FA is not enabled on this account")

    otp_hash = user.get("two_factor_login_code_hash")
    otp_expires_at = user.get("two_factor_login_code_expires_at") or 0
    now_ts = datetime.utcnow().timestamp()
    if not otp_hash or now_ts > float(otp_expires_at):
        raise HTTPException(status_code=400, detail="Verification code expired. Please request a new code.")
    if _hash_otp((code or "").strip()) != otp_hash:
        raise HTTPException(status_code=400, detail="Invalid verification code")

    jwt_token = create_token({"email": email})
    response = JSONResponse({"message": "2FA verified", "success": True})
    _set_auth_cookie(response, jwt_token)
    _clear_pending_2fa_cookie(response)
    await users_collection.update_one(
        {"_id": user["_id"]},
        {"$unset": {"two_factor_login_code_hash": "", "two_factor_login_code_expires_at": ""}},
    )
    return response


@router.post("/2fa/toggle")
async def toggle_two_factor(request: Request, enabled: bool = Body(..., embed=True)):
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    payload = decode_token(token)
    email = payload.get("email") or ""
    assert_iba_email(email)
    user = await users_collection.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    await users_collection.update_one(
        {"_id": user["_id"]},
        {
            "$set": {"two_factor_enabled": bool(enabled)},
            "$unset": {"two_factor_temp_secret": "", "two_factor_secret": ""},
        },
    )
    return {"message": "2FA updated", "two_factor_enabled": bool(enabled)}


@router.post("/2fa/resend-login-code")
async def resend_login_2fa_code(request: Request):
    pending_token = request.cookies.get(PENDING_2FA_COOKIE)
    if not pending_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No 2FA challenge found")
    payload = decode_token(pending_token)
    if payload.get("purpose") != "2fa_pending":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid 2FA challenge")
    email = payload.get("email") or ""
    assert_iba_email(email)
    await _issue_email_login_otp(email)
    return {"message": "Verification code sent"}
