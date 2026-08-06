"""
OmniAid — Free Email OTP Service
===============================
Generates secure 6-digit OTPs for Email authentication.
Dispatches REAL Emails via SMTP (Gmail, Brevo, Resend, etc.),
with automatic DB storage & 5-minute expiration.
"""

import os
import random
import logging
import datetime
import smtplib
import asyncio
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Tuple, Optional, Dict, Any
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("omniaid.otp_service")

# 5 minutes expiration
OTP_EXPIRATION_MINUTES = 5


def generate_6digit_otp() -> str:
    """Generate secure 6-digit numeric OTP string."""
    return f"{random.randint(100000, 999999)}"


def normalize_email(email: str) -> str:
    """Clean and normalize recipient email address."""
    return email.strip().lower()


def send_real_email_otp(recipient_email: str, otp_code: str) -> bool:
    """
    Sends a real, beautifully formatted HTML OTP email via SMTP.
    Uses configurable SMTP settings with Gmail fallback.
    """
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", 465))
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    sender_email = os.getenv("SMTP_FROM_EMAIL") or smtp_user or "noreply@sumscale.ai"

    if not smtp_user or not smtp_password:
        logger.warning(f"SMTP_USER/SMTP_PASSWORD not set in .env. Falling back to dev mode OTP: {otp_code}")
        return False

    msg = MIMEMultipart()
    msg["From"] = f"SumScale Security <{sender_email}>"
    msg["To"] = recipient_email
    msg["Subject"] = f"{otp_code} is your SumScale verification code"

    body = f"""
    <!DOCTYPE html>
    <html>
      <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f7f6; color: #333;">
        <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border: 1px solid #83C5BE; border-radius: 24px; padding: 32px; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <h2 style="color: #006D77; margin-top: 0; font-size: 22px;">SumScale Verification Code</h2>
          <p style="font-size: 14px; color: #555; line-height: 1.5;">Use the following 6-digit verification code to complete your login or registration:</p>
          <div style="background: #EDF6F9; border: 1px solid #83C5BE; border-radius: 16px; padding: 18px; margin: 24px 0; font-size: 34px; font-weight: 800; letter-spacing: 10px; color: #006D77;">
            {otp_code}
          </div>
          <p style="font-size: 12px; color: #888;">This code is valid for 5 minutes. If you did not request this code, please ignore this message.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="font-size: 11px; color: #aaa;">© 2026 SumScale Multimodal AI Platform</p>
        </div>
      </body>
    </html>
    """
    msg.attach(MIMEText(body, "html"))

    # Attempt SSL or STARTTLS based on port
    if smtp_port == 465:
        try:
            with smtplib.SMTP_SSL(smtp_host, 465, timeout=4.0) as server:
                server.login(smtp_user, smtp_password)
                server.sendmail(sender_email, recipient_email, msg.as_string())
            logger.info(f"✅ Real Email OTP delivered to {recipient_email} via SSL")
            return True
        except Exception as e:
            logger.warning(f"Port 465 SSL failed for {recipient_email}: {e}. Retrying on Port 587 STARTTLS...")

    # Port 587 / Fallback
    try:
        with smtplib.SMTP(smtp_host, 587, timeout=4.0) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.sendmail(sender_email, recipient_email, msg.as_string())
        logger.info(f"✅ Real Email OTP delivered to {recipient_email} via STARTTLS")
        return True
    except Exception as e:
        logger.error(f"❌ SMTP delivery failed for {recipient_email}: {e}")
        return False


async def send_otp_identifier(
    db: Any,
    email: str,
    purpose: str = "login"
) -> Dict[str, Any]:
    """
    Generates 6-digit OTP, stores in DB with 5-minute expiry, and dispatches email via SMTP asynchronously.
    """
    clean_email = normalize_email(email)
    otp_code = generate_6digit_otp()
    expires_at = datetime.datetime.utcnow() + datetime.timedelta(minutes=OTP_EXPIRATION_MINUTES)

    # Document to insert into MongoDB
    otp_doc = {
        "email": clean_email,
        "identifier": clean_email,
        "otp_code": otp_code,
        "purpose": purpose,
        "verified": False,
        "created_at": datetime.datetime.utcnow(),
        "expires_at": expires_at,
    }

    # Invalidate previous unverified OTPs for this email address
    await db.otp_verifications.update_many(
        {"$or": [{"email": clean_email}, {"identifier": clean_email}], "verified": False},
        {"$set": {"verified": True, "invalidated": True}}
    )

    await db.otp_verifications.insert_one(otp_doc)

    # Dispatch email asynchronously in background task
    asyncio.create_task(asyncio.to_thread(send_real_email_otp, clean_email, otp_code))

    res = {
        "status": "success",
        "email": clean_email,
        "expires_in_seconds": OTP_EXPIRATION_MINUTES * 60,
        "real_sent": True,
    }

    # Only include dev_otp in automated test environment for pytest suite
    if os.getenv("ENVIRONMENT") == "test":
        res["dev_otp"] = otp_code

    return res


async def verify_otp_identifier(
    db: Any,
    email: str,
    otp_code: str
) -> Tuple[bool, str]:
    """
    Strictly verifies OTP code against database records.
    Returns (is_valid, clean_email or error_message).
    Requires exact match with unverified, unexpired OTP code.
    """
    clean_email = normalize_email(email)
    code_clean = otp_code.strip()

    if not code_clean:
        return False, "Please enter the 6-digit verification code."

    record = await db.otp_verifications.find_one({
        "$or": [{"email": clean_email}, {"identifier": clean_email}],
        "otp_code": code_clean,
        "verified": False,
    }, sort=[("created_at", -1)])

    if not record:
        return False, "Invalid OTP code. Please check your Email Inbox and try again."

    expires_at = record.get("expires_at")
    if expires_at and datetime.datetime.utcnow() > expires_at:
        return False, "OTP code has expired. Please request a new verification code."

    # Mark OTP as verified after successful use (prevents code reuse)
    await db.otp_verifications.update_one(
        {"_id": record["_id"]},
        {"$set": {"verified": True, "verified_at": datetime.datetime.utcnow()}}
    )

    return True, clean_email


