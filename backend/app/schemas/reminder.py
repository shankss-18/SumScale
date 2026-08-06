"""
OmniAid — Reminder Schemas
==========================
Input validation schemas for creating and updating reminders.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class ReminderCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200, description="Reminder title")
    due_date: datetime = Field(description="ISO 8601 due date")
    notes: Optional[str] = Field(default=None, max_length=500, description="Optional notes")
    case_id: Optional[str] = Field(default=None, max_length=100, description="Optional linked case ID")


class ReminderUpdateRequest(BaseModel):
    is_completed: bool = Field(default=True)
