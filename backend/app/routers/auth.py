"""
OmniAid — Authentication Router
================================
Handles user registration, authentication, token issuance, and token refresh.

Security Rules:
- Password minimum length enforced by Pydantic schema (8 chars).
- Generic error message on duplicate email registration to prevent enumeration.
- Rate limited login endpoint to protect against brute force / credential stuffing.
- Short-lived access tokens + refresh token pattern.
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from bson import ObjectId

from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    RefreshTokenRequest,
    SendOTPRequest,
    VerifyOTPRequest,
    OTPResponse,
)
from app.models.user import UserResponse
from app.utils.auth import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.services.otp_service import send_otp_identifier, verify_otp_identifier, normalize_identifier
from app.utils.limiter import limiter
from app.dependencies.auth import get_current_user
from app.models.user import UserInDB

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
    response_model=UserResponse,
    summary="Register a new user",
    description="Registers a new user account with hashed password.",
)
async def register(request: Request, body: RegisterRequest):
    db = getattr(request.app.state, "db", None)
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection unavailable",
        )

    # Normalize email & phone
    email_clean = body.email.lower().strip()
    phone_clean = body.phone_number.strip() if body.phone_number else None

    # Check for existing account by email or phone
    query = [{"email": email_clean}]
    if phone_clean:
        query.append({"phone_number": phone_clean})

    existing_user = await db.users.find_one({"$or": query})
    if existing_user:
        # Generic error message to prevent account enumeration attacks
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to register with these details",
        )

    # Hash password (never log or store plaintext)
    hashed_pwd = hash_password(body.password)

    new_user_doc = {
        "email": email_clean,
        "phone_number": phone_clean,
        "hashed_password": hashed_pwd,
        "created_at": datetime.now(timezone.utc),
    }

    result = await db.users.insert_one(new_user_doc)
    user_id = str(result.inserted_id)

    return UserResponse(
        id=user_id,
        email=email_clean,
        phone_number=phone_clean,
        created_at=new_user_doc["created_at"],
    )


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate user and issue JWT tokens",
    description="Validates credentials via email or phone number. Rate limited to 5 attempts per minute.",
)
@limiter.limit("5/minute")
async def login(request: Request, body: LoginRequest):
    db = getattr(request.app.state, "db", None)
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection unavailable",
        )

    identifier = (body.email or body.phone_number or "").strip()
    if not identifier:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide an email address or phone number",
        )

    # Search user doc by email OR phone_number
    user_doc = await db.users.find_one({
        "$or": [
            {"email": identifier.lower()},
            {"phone_number": identifier},
        ]
    })

    invalid_cred_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid credentials. Please check your email/phone and password.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not user_doc:
        raise invalid_cred_exception

    if not verify_password(body.password, user_doc["hashed_password"]):
        raise invalid_cred_exception

    user_id = str(user_doc["_id"])
    access_token = create_access_token(user_id=user_id)
    refresh_token = create_refresh_token(user_id=user_id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
    )


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Refresh access token",
    description="Exchanges a valid refresh token for a new access token and refresh token.",
)
async def refresh_tokens(body: RefreshTokenRequest):
    try:
        payload = decode_token(body.refresh_token, expected_type="refresh")
        user_id = payload.get("sub")
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    new_access = create_access_token(user_id=user_id)
    new_refresh = create_refresh_token(user_id=user_id)

    return TokenResponse(
        access_token=new_access,
        refresh_token=new_refresh,
        token_type="bearer",
    )


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current authenticated user profile",
)
async def get_me(current_user: UserInDB = Depends(get_current_user)):
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        created_at=current_user.created_at,
    )


@router.post(
    "/send-otp",
    response_model=OTPResponse,
    summary="Send 6-digit OTP to Phone or Email",
)
async def send_otp_endpoint(request: Request, body: SendOTPRequest):
    db = getattr(request.app.state, "db", None)
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection unavailable")

    _, cleaned_id = normalize_identifier(body.identifier)

    # Check if user exists by email or phone_number
    query = {"$or": [{"email": cleaned_id}, {"phone_number": cleaned_id}]}
    user_doc = await db.users.find_one(query)

    if body.purpose == "login" and not user_doc:
        raise HTTPException(
            status_code=404,
            detail="No account found with this Email/Phone. Please sign up first.",
        )

    if body.purpose == "signup" and user_doc:
        raise HTTPException(
            status_code=400,
            detail="An account with this Email/Phone already exists. Please sign in instead.",
        )

    result = await send_otp_identifier(db=db, identifier=body.identifier, purpose=body.purpose)
    if not result.get("real_sent"):
        raise HTTPException(
            status_code=500,
            detail="Failed to send OTP code to your Email/Phone. Please verify your number/email and try again.",
        )
    return OTPResponse(**result)


@router.post(
    "/verify-otp",
    response_model=TokenResponse,
    summary="Verify OTP and issue JWT Access Token",
)
async def verify_otp_endpoint(request: Request, body: VerifyOTPRequest):
    db = getattr(request.app.state, "db", None)
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection unavailable")

    is_valid, msg_or_id = await verify_otp_identifier(db=db, identifier=body.identifier, otp_code=body.otp_code)
    if not is_valid:
        raise HTTPException(status_code=400, detail=msg_or_id)

    cleaned_id = msg_or_id

    # Check if user already exists by email or phone_number
    query = {"$or": [{"email": cleaned_id}, {"phone_number": cleaned_id}]}
    user_doc = await db.users.find_one(query)

    if not user_doc:
        # Create new user record automatically via OTP signup!
        dummy_email = cleaned_id if "@" in cleaned_id else f"{cleaned_id.replace('+', '').replace(' ', '')}@omniaid.ai"
        new_user = {
            "email": dummy_email,
            "phone_number": cleaned_id if "@" not in cleaned_id else None,
            "hashed_password": hash_password(f"OTP_AUTH_{cleaned_id}"),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "phone_verified": True if "@" not in cleaned_id else False,
            "email_verified": True if "@" in cleaned_id else False,
        }
        res = await db.users.insert_one(new_user)
        user_id = str(res.inserted_id)
    else:
        user_id = str(user_doc["_id"])

    access_token = create_access_token(user_id=user_id)
    refresh_token = create_refresh_token(user_id=user_id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
    )
