"""Pydantic Models for api endpoints"""

from pydantic import BaseModel


class ChatRequest(BaseModel):
    """Chat request model"""

    message: str
    session_id: str


class ContextInjectionRequest(BaseModel):
    """Context injection model"""

    content: str
    session_id: str
