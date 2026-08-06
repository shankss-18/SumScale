"""
OmniAid — Authentication Schemas
================================
Input validation schemas for auth endpoints with strict field length constraints.
"""

from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class UserResponse(BaseModel):
    id: str
    email: str
    phone_number: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True


class SendOTPRequest(BaseModel):
    identifier: str = Field(
        min_length=3,
        max_length=100,
        description="Phone number (e.g. +919876543210) or Email address for OTP verification",
    )
    purpose: Optional[str] = Field(default="login", description="login | signup")


class VerifyOTPRequest(BaseModel):
    identifier: str = Field(min_length=3, max_length=100)
    otp_code: str = Field(min_length=4, max_length=10, description="6-digit OTP code")
    full_name: Optional[str] = Field(default=None, max_length=100)


class OTPResponse(BaseModel):
    status: str
    identifier: str
    id_type: str
    expires_in_seconds: int
    sms_sent: bool = False
    dev_otp: Optional[str] = None


class RegisterRequest(BaseModel):
    email: EmailStr
    phone_number: Optional[str] = Field(
        default=None,
        max_length=20,
        description="Optional phone number (e.g. +1234567890)",
    )
    password: str = Field(
        min_length=8,
        max_length=128,
        description="Password must be between 8 and 128 characters long",
    )


class LoginRequest(BaseModel):
    email: Optional[str] = Field(
        default=None,
        description="Email address or phone number for login",
    )
    phone_number: Optional[str] = Field(
        default=None,
        description="Optional explicit phone number for login",
    )
    password: str = Field(
        min_length=1,
        max_length=128,
        description="Password input field",
    )


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshTokenRequest(BaseModel):
    refresh_token: str
