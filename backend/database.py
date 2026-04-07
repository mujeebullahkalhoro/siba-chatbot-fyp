from __future__ import annotations
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING
from config import MONGO_URI

client = AsyncIOMotorClient(MONGO_URI, serverSelectionTimeoutMS=5000)
db = client["siba_chatbot"]
users_collection = db["users"]
chat_sessions_collection = db["chat_sessions"]
chat_messages_collection = db["chat_messages"]
feedback_collection = db["feedback"]

async def init_db() -> None:
    try:
        await users_collection.create_index([("email", ASCENDING)], unique=True, name="uniq_email")
        await chat_sessions_collection.create_index([("user_id", ASCENDING)], name="idx_user_id")
        await chat_sessions_collection.create_index([("updated_at", -1)], name="idx_updated_at")
        await chat_messages_collection.create_index([("session_id", ASCENDING), ("created_at", ASCENDING)], name="idx_session_messages")
        print("[OK] Database indexes initialized.")
    except Exception as e:
        print(f"[WARN] Database connection failed (MongoDB might be offline): {e}")
        print("[WARN] Some features (chat history, user auth) will not work, but other services (like STT) might still be available.")

def close_db() -> None:
    client.close()
