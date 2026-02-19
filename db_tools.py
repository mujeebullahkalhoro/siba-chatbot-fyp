import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(__file__), "backend", ".env")
load_dotenv(env_path)
MONGO_URI = os.getenv("MONGO_URI")

if not MONGO_URI:
    print("MONGO_URI not found")
    exit(1)

client = AsyncIOMotorClient(MONGO_URI)
db = client["siba_chatbot"]
chat_sessions_collection = db["chat_sessions"]

async def list_all():
    print("Databases:")
    dbs = await client.list_database_names()
    print(dbs)
    if "siba_chatbot" in dbs:
        db = client["siba_chatbot"]
        print("\nCollections in siba_chatbot:")
        cols = await db.list_collection_names()
        print(cols)
        
        chat_sessions_collection = db["chat_sessions"]
        count = await chat_sessions_collection.count_documents({})
        print(f"\nchat_sessions count: {count}")

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "delete":
        # ... existing delete logic ...
        asyncio.run(delete_all_sessions())
    else:
        asyncio.run(list_all())
