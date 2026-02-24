# backend/routes/feedback_routes.py
from __future__ import annotations

from datetime import datetime
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional

from database import feedback_collection

router = APIRouter(prefix="/api", tags=["feedback"])


class FeedbackRequest(BaseModel):
    message_id: str
    session_id: str
    rating: str  # "up" or "down"
    query: Optional[str] = None
    response_text: Optional[str] = None


@router.post("/feedback")
async def submit_feedback(body: FeedbackRequest):
    """Public endpoint — any user can submit feedback on a bot response."""
    doc = {
        "message_id": body.message_id,
        "session_id": body.session_id,
        "rating": body.rating,
        "query": body.query,
        "response_text": body.response_text,
        "created_at": datetime.utcnow(),
    }
    await feedback_collection.insert_one(doc)
    return {"message": "Feedback submitted", "rating": body.rating}
