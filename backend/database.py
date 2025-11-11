from __future__ import annotations
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING
from config import MONGO_URI

client = AsyncIOMotorClient(MONGO_URI, serverSelectionTimeoutMS=5000)
db = client["siba_chatbot"]
users_collection = db["users"]

async def init_db() -> None:
    await users_collection.create_index([("email", ASCENDING)], unique=True, name="uniq_email")

def close_db() -> None:
    client.close()
