# main.py
from __future__ import annotations

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes import auth_routes
from database import init_db, close_db

# Explicit origins are required when allow_credentials=True
ALLOW_ORIGINS = [
    "http://localhost:3000",
    "https://siba-chatbot.vercel.app",
]

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()     # ensure unique email index exists
    yield
    # Shutdown
    close_db()

app = FastAPI(title="SIBA Chatbot Backend", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOW_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# Auth router (includes /api/auth/google/callback and others)
app.include_router(auth_routes.router)
