"""
OmniAid — Reminder Router
=========================
Endpoints for creating, listing, updating, and deleting reminders.
Every operation is strictly scoped to `user_id == current_user.id`.
"""

from datetime import datetime, timezone
from typing import List, Optional
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query

from app.schemas.reminder import ReminderCreateRequest, ReminderUpdateRequest
from app.models.reminder import ReminderInDB
from app.dependencies.auth import get_current_user
from app.models.user import UserInDB

router = APIRouter(prefix="/reminders", tags=["reminders"])


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=ReminderInDB,
    summary="Create a new reminder",
)
async def create_reminder(
    request: Request,
    body: ReminderCreateRequest,
    current_user: UserInDB = Depends(get_current_user),
):
    db = getattr(request.app.state, "db", None)
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection unavailable")

    reminder_id = f"rem_{uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)

    # Determine initial status
    is_due = body.due_date <= now
    initial_status = "due" if is_due else "pending"

    reminder_doc = {
        "_id": reminder_id,
        "user_id": current_user.id,
        "case_id": body.case_id,
        "title": body.title,
        "due_date": body.due_date,
        "notes": body.notes,
        "status": initial_status,
        "is_completed": False,
        "created_at": now,
        "updated_at": now,
    }

    await db.reminders.insert_one(reminder_doc)
    return ReminderInDB(**reminder_doc)


@router.get(
    "",
    response_model=List[ReminderInDB],
    summary="List reminders for authenticated user",
)
async def list_reminders(
    request: Request,
    status_filter: Optional[str] = Query(default=None, alias="status"),
    current_user: UserInDB = Depends(get_current_user),
):
    db = getattr(request.app.state, "db", None)
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection unavailable")

    # SECURITY RULE: filter strictly by user_id
    query = {"user_id": current_user.id}
    if status_filter:
        query["status"] = status_filter

    cursor = db.reminders.find(query).sort("due_date", 1)
    docs = await cursor.to_list(length=100)
    return [ReminderInDB(**doc) for doc in docs]


@router.put(
    "/{reminder_id}/complete",
    response_model=ReminderInDB,
    summary="Mark reminder as completed",
)
async def complete_reminder(
    request: Request,
    reminder_id: str,
    current_user: UserInDB = Depends(get_current_user),
):
    db = getattr(request.app.state, "db", None)
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection unavailable")

    reminder_doc = await db.reminders.find_one({"_id": reminder_id, "user_id": current_user.id})
    if not reminder_doc:
        raise HTTPException(status_code=404, detail="Reminder not found")

    now = datetime.now(timezone.utc)
    await db.reminders.update_one(
        {"_id": reminder_id, "user_id": current_user.id},
        {"$set": {"is_completed": True, "status": "completed", "updated_at": now}},
    )

    updated = await db.reminders.find_one({"_id": reminder_id, "user_id": current_user.id})
    return ReminderInDB(**updated)


@router.delete(
    "/{reminder_id}",
    summary="Delete a reminder",
)
async def delete_reminder(
    request: Request,
    reminder_id: str,
    current_user: UserInDB = Depends(get_current_user),
):
    db = getattr(request.app.state, "db", None)
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection unavailable")

    res = await db.reminders.delete_one({"_id": reminder_id, "user_id": current_user.id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Reminder not found")

    return {"status": "deleted", "reminder_id": reminder_id}


# ---------------------------------------------------------------------------
# Free Email Alerts & 1-Click Google Calendar Integrations
# ---------------------------------------------------------------------------

from pydantic import BaseModel
from app.services.reminder_service import create_google_calendar_link, send_free_email_alert


class EmailAlertRequest(BaseModel):
    case_id: Optional[str] = None
    title: str
    summary: str
    checklist: Optional[List[str]] = None
    recipient_email: Optional[str] = None
    due_date: Optional[datetime] = None


class CalendarLinkRequest(BaseModel):
    title: str
    details: str
    start_dt: Optional[datetime] = None


@router.post("/send-email", summary="Send free email notification & Google Calendar alert via Gmail SMTP")
async def send_email_notification_endpoint(
    body: EmailAlertRequest,
    current_user: UserInDB = Depends(get_current_user),
):
    target_email = body.recipient_email or current_user.email
    if not target_email:
        raise HTTPException(status_code=400, detail="No valid recipient email address provided")

    cal_link = create_google_calendar_link(
        title=body.title,
        details=body.summary,
        start_dt=body.due_date,
    )

    success = send_free_email_alert(
        recipient_email=target_email,
        case_title=body.title,
        summary=body.summary,
        checklist=body.checklist or [],
        google_calendar_url=cal_link,
    )

    return {
        "success": success,
        "recipient": target_email,
        "google_calendar_url": cal_link,
        "message": "Email alert dispatched successfully" if success else "Failed to send email alert"
    }


@router.post("/google-calendar", summary="Generate a 1-click Google Calendar template URL")
async def get_google_calendar_link(
    body: CalendarLinkRequest,
    _current_user: UserInDB = Depends(get_current_user),
):
    url = create_google_calendar_link(
        title=body.title,
        details=body.details,
        start_dt=body.start_dt,
    )
    return {"google_calendar_url": url}

