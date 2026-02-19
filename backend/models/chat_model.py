from __future__ import annotations
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

class ChatMessage(BaseModel):
    id: str = Field(..., alias="_id")
    session_id: str
    sender: str  # 'user' or 'bot'
    text: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True

class ChatSession(BaseModel):
    id: str = Field(..., alias="_id")
    user_id: str
    title: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    share_id: Optional[str] = None

    class Config:
        populate_by_name = True

class ChatSessionCreate(BaseModel):
    title: Optional[str] = "New Chat"

class ChatSessionUpdate(BaseModel):
    title: Optional[str] = None
    updated_at: Optional[datetime] = None

class ChatMessageCreate(BaseModel):
    sender: str
    text: str

class ChatHistoryResponse(BaseModel):
    sessions: List[ChatSession]
