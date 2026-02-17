import sys
import os
import json
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
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

@router.post("/api/chat")
async def chat_endpoint(request: Request, chat_req: ChatRequest):
    is_authenticated = False
    token = request.cookies.get("access_token")
    if token:
        try:
            decode_token(token)
            is_authenticated = True
        except:
            is_authenticated = False
            
    try:
        response = await faculty_chat(chat_req.message, chat_req.session_id, is_authenticated=is_authenticated)
        return {"response": response}
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

    async def event_generator():
        try:
            async for chunk in faculty_chat_stream(
                chat_req.message, chat_req.session_id, is_authenticated=is_authenticated
            ):
                # SSE format: data: <json>\n\n
                yield f"data: {json.dumps({'token': chunk})}\n\n"
            # Signal end of stream
            yield f"data: {json.dumps({'done': True})}\n\n"
        except Exception as e:
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
