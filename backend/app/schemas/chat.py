"""
OmniAid — Chatbot Schemas
=========================
Input validation schemas for RAG Chatbot queries.
"""

from typing import Optional, List
from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(
        min_length=1,
        max_length=2000,
        description="User chat message or question about their case history.",
    )
    language: Optional[str] = Field(default="en", description="Output language code (e.g. en, hi, es)")
    chat_history: Optional[List[dict]] = Field(default_factory=list)


class CaseCitation(BaseModel):
    case_id: str
    department: str
    summary: str


class ChatResponse(BaseModel):
    answer: str
    cited_cases: List[CaseCitation] = Field(default_factory=list)
    suggested_next_questions: List[str] = Field(default_factory=list)
    auto_generated_title: Optional[str] = None


