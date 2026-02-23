import sys
import os
import json
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel
from controllers.auth_controller import decode_token

# Add rag directory to sys.path to allow imports from rag module
# Assuming this file is in backend/routes/
# ../../rag resolves to the rag directory
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../rag")))

try:
    from graph.main_graph import faculty_chat, faculty_chat_stream
except ImportError as e:
    print(f"Error importing faculty_chat: {e}")
    raise e

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    session_id: str

from database import chat_messages_collection, chat_sessions_collection
from datetime import datetime
from bson import ObjectId

@router.post("/api/chat")
async def chat_endpoint(request: Request, chat_req: ChatRequest):
    is_authenticated = False
    
    # ... (auth logic) ...
    token = request.cookies.get("access_token")
    if token:
        try:
            decode_token(token)
            is_authenticated = True
        except:
            is_authenticated = False
            
    try:
        # Save User Message
        user_msg = {
            "session_id": chat_req.session_id,
            "sender": "user",
            "text": chat_req.message,
            "created_at": datetime.utcnow()
        }
        await chat_messages_collection.insert_one(user_msg)
        
        # Get Bot Response
        response_text = await faculty_chat(chat_req.message, chat_req.session_id, is_authenticated=is_authenticated)
        
        # Save Bot Message (only if not a control message like LOGIN_REQUIRED, or maybe save that too? 
        # Typically we save what the user sees. If LOGIN_REQUIRED implies a modal and no text bubble, maybe don't save?
        # But for history consistency, if the user sees it as a bubble (or modal), we track it.
        # implementation_plan said: "Save the bot's response". 
        # For LOGIN_REQUIRED, the frontend handles it specially. Let's save it so history reflects the attempt? 
        # Or better, don't save LOGIN_REQUIRED as a text message if it triggers a modal. 
        # The prompt says: "if user ask greeting it should repsoe".
        # Let's save it. Frontend can filter or display.
        
        # Wait, if LOGIN_REQUIRED is returned, the frontend shows a modal, NOT a chat bubble.
        # So we probably shouldn't save "LOGIN_REQUIRED" as a message in the history, 
        # otherwise reloading the chat would show "LOGIN_REQUIRED" bubble.
        
        if response_text != "LOGIN_REQUIRED":
            bot_msg = {
                "session_id": chat_req.session_id,
                "sender": "bot",
                "text": response_text,
                "created_at": datetime.utcnow()
            }
            await chat_messages_collection.insert_one(bot_msg)
            
            # Update Session Timestamp
            # Update Session Timestamp only for persistent sessions
            if ObjectId.is_valid(chat_req.session_id):
                await chat_sessions_collection.update_one(
                    {"_id": ObjectId(chat_req.session_id)},
                    {"$set": {"updated_at": datetime.utcnow()}}
                )

        return {"response": response_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/chat/stream")
async def chat_stream_endpoint(request: Request, chat_req: ChatRequest):
    """Stream LLM response via Server-Sent Events."""
    is_authenticated = False
    token = request.cookies.get("access_token")
    if token:
        try:
            decode_token(token)
            is_authenticated = True
        except:
            is_authenticated = False

    # Save User Message immediately
    user_msg = {
        "session_id": chat_req.session_id,
        "sender": "user",
        "text": chat_req.message,
        "created_at": datetime.utcnow()
    }
    await chat_messages_collection.insert_one(user_msg)

    async def event_generator():
        full_response = ""
        try:
            async for chunk in faculty_chat_stream(
                chat_req.message, chat_req.session_id, is_authenticated=is_authenticated
            ):
                full_response += chunk
                # SSE format: data: <json>\n\n
                yield f"data: {json.dumps({'token': chunk})}\n\n"
            
            # Save Bot Message after stream completes
            if full_response:
                bot_msg = {
                    "session_id": chat_req.session_id,
                    "sender": "bot",
                    "text": full_response,
                    "created_at": datetime.utcnow()
                }
                await chat_messages_collection.insert_one(bot_msg)
                
                # Update Session Timestamp
                # Update Session Timestamp only for persistent sessions (not guest)
                if ObjectId.is_valid(chat_req.session_id):
                    await chat_sessions_collection.update_one(
                        {"_id": ObjectId(chat_req.session_id)},
                        {"$set": {"updated_at": datetime.utcnow()}}
                    )

            # Signal end of stream
            yield f"data: {json.dumps({'done': True})}\n\n"
        except Exception as e:
            print(f"Stream error: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )

import urllib.parse

@router.get("/api/schemas/download/{filename}")
async def download_schema(filename: str):
    """Download a schema PDF with correct headers."""
    # Decode URL-encoded characters (like %20 for spaces)
    decoded_filename = urllib.parse.unquote(filename)
    
    # Assuming the schemas are in rag/data/schema/ relative to this file's grand-parent
    schema_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../rag/data/schema"))
    file_path = os.path.join(schema_dir, decoded_filename)
    
    if not os.path.exists(file_path):
        # Debugging: check if it's there but maybe name mismatch
        print(f"[DEBUG] Download requested for '{filename}' (decoded: '{decoded_filename}'), but not found at {file_path}")
        raise HTTPException(status_code=404, detail="File not found")
        
    return FileResponse(
        path=file_path,
        filename=decoded_filename,
        media_type='application/pdf'
    )
