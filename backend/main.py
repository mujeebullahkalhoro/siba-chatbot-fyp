# main.py
from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from routes import auth_routes, chat_routes, audio_routes, chat_history_routes, admin_routes, feedback_routes
from database import init_db, close_db

# Explicit origins are required when allow_credentials=True
ALLOW_ORIGINS = [
    "http://localhost:3000",
    "https://siba-chatbot.vercel.app",
]

async def _warmup_rag():
    """Pre-load retrievers & LLM in background after server starts."""
    try:
        from graph.main_graph import _get_universal_retriever, _get_llm
        await asyncio.to_thread(_get_universal_retriever)
        _get_llm()
        print("[OK] RAG components warmed up (faculty + policies)")
    except Exception as e:
        print(f"[WARN] RAG warm-up failed (will retry on first request): {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()     # ensure unique email index exists
    # Warm up RAG components in background so first request isn't slow
    asyncio.create_task(_warmup_rag())
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

# Mount Course Schemas
SCHEMA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "rag", "data", "schema"))
if not os.path.exists(SCHEMA_DIR):
    os.makedirs(SCHEMA_DIR, exist_ok=True)
app.mount("/schemas", StaticFiles(directory=SCHEMA_DIR), name="schemas")

# Auth router (includes /api/auth/google/callback and others)
app.include_router(auth_routes.router)
app.include_router(chat_routes.router)
app.include_router(audio_routes.router)
app.include_router(chat_history_routes.router)
app.include_router(admin_routes.router)
app.include_router(feedback_routes.router)
