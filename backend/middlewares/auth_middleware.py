from typing import List
from fastapi import Request
from fastapi.responses import JSONResponse
from jose import jwt, JWTError
from config import JWT_SECRET, JWT_ALGORITHM
from database import users_collection

IBA_DOMAIN = "@iba-suk.edu.pk"

PUBLIC_PATHS: List[str] = [
    "/",
    "/api/public",
    "/api/auth/google",           # ID token endpoint (optional)
    "/api/auth/google/callback",  # OAuth code callback
    "/api/auth/logout",
    "/docs", "/openapi.json", "/favicon.ico", "/redoc"
]

def _path_is_public(path: str) -> bool:
    return any(path.startswith(p) for p in PUBLIC_PATHS)

async def verify_jwt(request: Request, call_next):
    if _path_is_public(request.url.path):
        return await call_next(request)

    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth.split(" ", 1)[1]

    if not token:
        return JSONResponse(status_code=401, content={"detail": "Not authenticated"})

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        return JSONResponse(status_code=401, content={"detail": "Invalid or expired token"})

    email = payload.get("email")
    if not email or not email.lower().endswith(IBA_DOMAIN):
        return JSONResponse(status_code=403, content={"detail": "Only Sukkur IBA users allowed"})

    user = await users_collection.find_one({"email": email})
    if not user:
        return JSONResponse(status_code=404, content={"detail": "User not found"})

    request.state.user = {
        "email": user["email"],
        "name": user.get("name"),
        "picture": user.get("picture"),
        "provider": user.get("provider", "google"),
    }
    return await call_next(request)
