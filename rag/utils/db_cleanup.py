# rag/utils/db_cleanup.py
import re
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
import os
from pathlib import Path
from dotenv import load_dotenv

# Load env from backend directory as it has MONGO_URI
backend_dir = Path(__file__).parent.parent.parent / "backend"
load_dotenv(backend_dir / ".env")

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/siba_chatbot")

def sanitize_text(text: str) -> str:
    """Same logic as main_graph.py to keep only Urdu and English."""
    if not text:
        return text
    # Allowed: ASCII (00-7F), Arabic/Urdu (06, 07, 08, FB, FE), Whitespace, ZWNJ (\u200C), Punctuation (\u2000-\u206F)
    pattern = re.compile(r'[^\u0000-\u007F\u0600-\u06FF\u0750-\u077F\u0870-\u089F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\u2000-\u206F\u200C\s]')
    return pattern.sub('', text)

async def cleanup_database():
    print(f"[CLEANUP] Connecting to {MONGO_URI}...")
    client = AsyncIOMotorClient(MONGO_URI)
    db = client.get_database()
    collection = db.get_collection("chat_messages")

    cursor = collection.find({})
    count = 0
    updated = 0
    
    async for doc in cursor:
        count += 1
        original_text = doc.get("text", "")
        if not original_text:
            continue
            
        sanitized_text = sanitize_text(original_text)
        
        if sanitized_text != original_text:
            # We found contamination!
            print(f"[CLEANUP] Cleaning message {doc['_id']}...")
            
            await collection.update_one(
                {"_id": doc["_id"]},
                {"$set": {"text": sanitized_text}}
            )
            updated += 1

    print(f"[CLEANUP] Finished. Scanned {count} messages, updated {updated}.")
    client.close()

if __name__ == "__main__":
    asyncio.run(cleanup_database())
