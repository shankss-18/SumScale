"""
OmniAid — APScheduler Background Service
=========================================
Monitors scheduled reminders in MongoDB and updates pending reminders to 'due'
once their due_date has passed.
"""

import logging
from datetime import datetime, timezone
from apscheduler.schedulers.asyncio import AsyncIOScheduler

logger = logging.getLogger("omniaid.scheduler")

scheduler = AsyncIOScheduler()


async def check_due_reminders(db):
    """
    Finds pending reminders whose due_date is in the past,
    and updates their status to 'due'.
    """
    if db is None:
        return

    now = datetime.now(timezone.utc)
    try:
        result = await db.reminders.update_many(
            {
                "status": "pending",
                "due_date": {"$lte": now},
            },
            {
                "$set": {
                    "status": "due",
                    "updated_at": now,
                }
            },
        )
        if result.modified_count > 0:
            logger.info(f"APScheduler: Marked {result.modified_count} reminders as 'due'.")
    except Exception as exc:
        logger.error(f"Error checking due reminders: {exc}")


def start_scheduler(app):
    """Start background scheduler loop."""
    if not scheduler.running:
        scheduler.add_job(
            check_due_reminders,
            "interval",
            seconds=30,
            args=[getattr(app.state, "db", None)],
            id="check_due_reminders_job",
            replace_existing=True,
        )
        scheduler.start()
        logger.info("APScheduler started for due reminder monitoring.")


def shutdown_scheduler():
    """Shut down background scheduler loop."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("APScheduler shut down.")
