"""
OmniAid — Reminder Model
========================
Pydantic v2 domain model for Reminder documents stored in MongoDB.
"""

from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class ReminderInDB(BaseModel):
    """
    Representation of a Reminder document stored in MongoDB.
    Always associated with a specific user_id.
    """

    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(alias="_id", description="Reminder unique identifier")
    user_id: str = Field(description="Owner user ID")
    case_id: Optional[str] = Field(default=None, description="Linked case ID if applicable")
    title: str = Field(max_length=200)
    due_date: datetime
    notes: Optional[str] = Field(default=None, max_length=500)
    status: str = Field(default="pending", description="pending | due | completed")
    is_completed: bool = False

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
