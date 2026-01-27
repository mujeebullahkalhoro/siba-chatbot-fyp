import sys
import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

# Add rag directory to sys.path to allow imports from rag module
# Assuming this file is in backend/routes/
# ../../rag resolves to the rag directory
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../rag")))

try:
    from graph.main_graph import faculty_chat
except ImportError as e:
    print(f"Error importing faculty_chat: {e}")
    raise e

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    session_id: str

@router.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    try:
        response = faculty_chat(request.message, request.session_id)
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
