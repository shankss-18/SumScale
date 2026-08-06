"""
OmniAid — Free Multilingual OTP Service
=======================================
Generates secure 6-digit OTPs for Phone & Email authentication.
Dispatches REAL Emails via Gmail SMTP (100% Free) and REAL SMS via Twilio / Fast2SMS,
with fallback to Dev Mode when API credentials are not yet set in .env.
"""

import os
import random
import logging
import datetime
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Tuple, Optional, Dict, Any
from dotenv import load_dotenv

# Ensure environment variables from .env are loaded into os.environ
load_dotenv()

logger = logging.getLogger("omniaid.otp_service")

# 5 minutes expiration
OTP_EXPIRATION_MINUTES = 5

def generate_6digit_otp() -> str:
    """Generate secure 6-digit numeric OTP string."""
    return f"{random.randint(100000, 999999)}"


def normalize_identifier(identifier: str) -> Tuple[str, str]:
    """
    Classify and normalize identifier into ('phone' | 'email', cleaned_string).
    """
    cleaned = identifier.strip()
    if "@" in cleaned:
        return "email", cleaned.lower()
    
    # Phone number cleaning: keep digits and leading +
    digits = "".join(ch for ch in cleaned if ch.isdigit() or ch == "+")
    if not digits.startswith("+"):
        # Default to India (+91) if 10 digits provided without country code
        if len(digits) == 10:
            digits = f"+91{digits}"
        else:
            digits = f"+{digits}"
    return "phone", digits


def send_real_email_otp(recipient_email: str, otp_code: str) -> bool:
    """
    Sends a real, beautifully formatted HTML OTP email via Gmail SMTP (100% Free).
    Uses Port 587 (STARTTLS) primary with Port 465 (SSL) fallback.
    """
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")

    if not smtp_user or not smtp_password:
        logger.error(f"SMTP_USER/SMTP_PASSWORD not set in .env.")
        return False

    msg = MIMEMultipart()
    msg["From"] = f"SumScale Security <{smtp_user}>"
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

    # Attempt 1: Port 587 (STARTTLS) - standard for Gmail
    try:
        with smtplib.SMTP("smtp.gmail.com", 587, timeout=10) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.sendmail(smtp_user, recipient_email, msg.as_string())
        logger.info(f"✅ Real Email OTP successfully delivered to {recipient_email} (Port 587)")
        return True
    except Exception as e587:
        logger.warning(f"Port 587 attempt failed for {recipient_email}: {e587}. Trying Port 465...")

    # Attempt 2: Port 465 (SSL) fallback
    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=10) as server:
            server.login(smtp_user, smtp_password)
            server.sendmail(smtp_user, recipient_email, msg.as_string())
        logger.info(f"✅ Real Email OTP successfully delivered to {recipient_email} (Port 465)")
        return True
    except Exception as e465:
        logger.error(f"❌ Both SMTP Port 587 and 465 failed for {recipient_email}: {e465}")
        return False


def send_real_sms_otp(phone_number: str, otp_code: str) -> bool:
    """
    Dispatches a real SMS OTP via Twilio or Fast2SMS.
    """
    twilio_sid = os.getenv("TWILIO_ACCOUNT_SID")
    twilio_token = os.getenv("TWILIO_AUTH_TOKEN")
    twilio_phone = os.getenv("TWILIO_PHONE_NUMBER")

    if twilio_sid and twilio_token and twilio_phone:
        try:
            from twilio.rest import Client
            client = Client(twilio_sid, twilio_token)
            msg_body = f"Your SumScale verification code is {otp_code}. Valid for 5 minutes."
            client.messages.create(body=msg_body, from_=twilio_phone, to=phone_number)
            logger.info(f"✅ Real Twilio SMS sent successfully to {phone_number}")
            return True
        except Exception as e:
            logger.error(f"❌ Twilio SMS failed for {phone_number}: {e}")

    # Fast2SMS (Free trial for Indian numbers)
    fast2sms_key = os.getenv("FAST2SMS_API_KEY")
    if fast2sms_key:
        try:
            import urllib.request
            import urllib.parse
            
            clean_digits = "".join(ch for ch in phone_number if ch.isdigit())[-10:]
            url = "https://www.fast2sms.com/dev/bulkV2"
            payload = {
                "variables_values": otp_code,
                "route": "otp",
                "numbers": clean_digits
            }
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode('utf-8'),
                headers={
                    "authorization": fast2sms_key,
                    "Content-Type": "application/json"
                }
            )
            with urllib.request.urlopen(req) as resp:
                logger.info(f"✅ Fast2SMS response: {resp.read().decode()}")
                return True
        except Exception as e:
            logger.error(f"❌ Fast2SMS failed: {e}")

    return False


async def send_otp_identifier(
    db: Any,
    identifier: str,
    purpose: str = "login"
) -> Dict[str, Any]:
    """
    Generates OTP, saves to MongoDB 'otp_verifications', and sends real SMS / Email.
    """
    id_type, clean_id = normalize_identifier(identifier)
    otp_code = generate_6digit_otp()
    expires_at = datetime.datetime.utcnow() + datetime.timedelta(minutes=OTP_EXPIRATION_MINUTES)

    # Save to MongoDB otp_verifications collection
    otp_doc = {
        "identifier": clean_id,
        "id_type": id_type,
        "otp_code": otp_code,
        "purpose": purpose,
        "verified": False,
        "created_at": datetime.datetime.utcnow(),
        "expires_at": expires_at,
    }

    # Invalidate previous unverified OTPs for this identifier
    await db.otp_verifications.update_many(
        {"identifier": clean_id, "verified": False},
        {"$set": {"verified": True, "invalidated": True}}
    )

    await db.otp_verifications.insert_one(otp_doc)

    real_sent = False
    if id_type == "email":
        real_sent = send_real_email_otp(clean_id, otp_code)
    else:
        real_sent = send_real_sms_otp(clean_id, otp_code)

    return {
        "status": "success",
        "identifier": clean_id,
        "id_type": id_type,
        "expires_in_seconds": OTP_EXPIRATION_MINUTES * 60,
        "real_sent": real_sent,
        "dev_otp": None,
    }


async def verify_otp_identifier(
    db: Any,
    identifier: str,
    otp_code: str
) -> Tuple[bool, str]:
    """
    Verifies OTP code against DB records.
    Returns (is_valid, clean_identifier or error_message).
    """
    _, clean_id = normalize_identifier(identifier)
    code_clean = otp_code.strip()

    record = await db.otp_verifications.find_one({
        "identifier": clean_id,
        "otp_code": code_clean,
        "verified": False,
    }, sort=[("created_at", -1)])

    if not record:
        return False, "Invalid OTP code. Please check your Inbox / Messages and try again."

    expires_at = record.get("expires_at")
    if expires_at and datetime.datetime.utcnow() > expires_at:
        return False, "OTP code has expired. Please request a new code."

    # Mark as verified
    await db.otp_verifications.update_one(
        {"_id": record["_id"]},
        {"$set": {"verified": True, "verified_at": datetime.datetime.utcnow()}}
    )

    return True, clean_id
