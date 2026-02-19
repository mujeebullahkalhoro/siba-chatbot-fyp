from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from database import chat_sessions_collection, chat_messages_collection
from models.chat_model import ChatSession, ChatMessage, ChatSessionCreate, ChatSessionUpdate
from models.user_model import UserPublic
from routes.auth_routes import get_current_user
from bson import ObjectId
from datetime import datetime

router = APIRouter()

@router.post("/api/chats", response_model=ChatSession)
async def create_chat_session(chat_session: ChatSessionCreate = None, user: dict = Depends(get_current_user)):
    user_id = str(user.get("email"))
    title = chat_session.title if chat_session else "New Chat"
    
    new_session = {
        "user_id": user_id,
        "title": title,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await chat_sessions_collection.insert_one(new_session)
    new_session["_id"] = str(result.inserted_id)
    return new_session

@router.get("/api/chats", response_model=List[ChatSession])
async def list_chat_sessions(user: dict = Depends(get_current_user)):
    user_id = str(user.get("email"))
    cursor = chat_sessions_collection.find({"user_id": user_id}).sort("updated_at", -1)
    sessions = []
    async for session in cursor:
        session["_id"] = str(session["_id"])
        sessions.append(session)
    return sessions

@router.get("/api/chats/{session_id}/messages", response_model=List[ChatMessage])
async def get_chat_messages(session_id: str, user: dict = Depends(get_current_user)):
    user_id = str(user.get("email"))
    session = await chat_sessions_collection.find_one({"_id": ObjectId(session_id), "user_id": user_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    cursor = chat_messages_collection.find({"session_id": session_id}).sort("created_at", 1)
    messages = []
    async for msg in cursor:
        msg["_id"] = str(msg["_id"])
        messages.append(msg)
    return messages

@router.delete("/api/chats/{session_id}")
async def delete_chat_session(session_id: str, user: dict = Depends(get_current_user)):
    user_id = str(user.get("email"))
    # Verify ownership
    session = await chat_sessions_collection.find_one({"_id": ObjectId(session_id), "user_id": user_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    await chat_sessions_collection.delete_one({"_id": ObjectId(session_id)})
    await chat_messages_collection.delete_many({"session_id": session_id})
    return {"status": "success"}

@router.post("/api/chats/{session_id}/share")
async def share_chat_session(session_id: str, user: dict = Depends(get_current_user)):
    user_id = str(user.get("email"))
    session = await chat_sessions_collection.find_one({"_id": ObjectId(session_id), "user_id": user_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # If already shared, return existing share_id
    if session.get("share_id"):
        return {"share_id": session["share_id"]}
    
    # Generate unique share_id
    import uuid
    share_id = str(uuid.uuid4())
    
    await chat_sessions_collection.update_one(
        {"_id": ObjectId(session_id)},
        {"$set": {"share_id": share_id}}
    )
    
    return {"share_id": share_id}

@router.get("/api/shared/{share_id}")
async def get_shared_chat(share_id: str):
    session = await chat_sessions_collection.find_one({"share_id": share_id})
    if not session:
        raise HTTPException(status_code=404, detail="Shared chat not found")
        
    messages_cursor = chat_messages_collection.find({"session_id": str(session["_id"])}).sort("created_at", 1)
    messages = []
    async for msg in messages_cursor:
        msg["_id"] = str(msg["_id"])
        messages.append(msg)
        
    return {
        "title": session.get("title", "Shared Chat"),
        "messages": messages,
        "created_at": session["created_at"]
    }

@router.get("/api/debug/sessions")
async def debug_sessions():
    try:
        count = await chat_sessions_collection.count_documents({})
        return {"count": count, "collection": chat_sessions_collection.name}
    except Exception as e:
        return {"error": str(e)}
