from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta
import os

from app.db.database import get_db
from app.schemas.user import (
    UserCreate,
    LoginRequest,
    TokenResponse,
    UserResponse,
    GoogleAuthRequest,
    ResetPasswordRequest,
)
from app.services.user_service import (
    create_user,
    get_user_by_email,
    verify_user_password,
    get_or_create_user_from_google,
)
from app.core.security import create_access_token
from app.core.deps import get_current_user
from app.models.user import User, UserRole
from datetime import datetime
from pydantic import BaseModel

router = APIRouter(prefix="/auth", tags=["auth"])


class AdminRegistrationRequest(BaseModel):
    email: str
    password: str
    secret_key: str


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(user_create: UserCreate, db: Session = Depends(get_db)):
    existing_user = get_user_by_email(db, user_create.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    user = create_user(db, user_create)

    access_token = create_access_token(data={"sub": str(user.id)})

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
def login(login_request: LoginRequest, db: Session = Depends(get_db)):
    user = verify_user_password(db, login_request.email, login_request.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    user.last_login_at = datetime.utcnow()
    db.add(user)
    db.commit()
    db.refresh(user)

    access_token = create_access_token(data={"sub": str(user.id)})

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.post("/google", response_model=TokenResponse)
def google_auth(request: GoogleAuthRequest, db: Session = Depends(get_db)):
    try:
        import google.auth.transport.requests
        from google.oauth2 import id_token

        request_obj = google.auth.transport.requests.Request()
        idinfo = id_token.verify_oauth2_token(request.id_token, request_obj)

        if "email" not in idinfo:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email not available from Google",
            )

        google_id = idinfo.get("sub")
        email = idinfo.get("email")
        first_name = idinfo.get("given_name")
        last_name = idinfo.get("family_name")

        user = get_or_create_user_from_google(
            db, google_id, email, first_name, last_name
        )

        user.last_login_at = datetime.utcnow()
        db.add(user)
        db.commit()
        db.refresh(user)

        access_token = create_access_token(data={"sub": str(user.id)})

        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            user=UserResponse.model_validate(user),
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Google authentication failed: {str(e)}",
        )


@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)


@router.post("/reset-password", response_model=UserResponse)
def reset_password(
    request: ResetPasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Reset password (can be used for first login or anytime)"""
    from app.core.security import verify_password, hash_password

    if not verify_password(request.old_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect",
        )

    current_user.password_hash = hash_password(request.new_password)
    current_user.password_reset_required = False
    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return UserResponse.model_validate(current_user)


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(current_user: User = Depends(get_current_user)):
    """Refresh access token"""
    access_token = create_access_token(data={"sub": str(current_user.id)})
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(current_user),
    )


@router.post("/register-admin", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register_admin(admin_request: AdminRegistrationRequest, db: Session = Depends(get_db)):
    """
    Register the first admin account (only if no admins exist).
    Requires ADMIN_SECRET_KEY environment variable.
    """
    from app.core.security import hash_password

    # Check if secret key is correct
    expected_secret = os.getenv("ADMIN_SECRET_KEY")
    if not expected_secret or admin_request.secret_key != expected_secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid secret key",
        )

    # Check if any admin already exists
    existing_admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
    if existing_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin account already exists. Use regular registration.",
        )

    # Check if email already in use
    existing_user = get_user_by_email(db, admin_request.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Create admin user
    admin_user = User(
        email=admin_request.email,
        password_hash=hash_password(admin_request.password),
        role=UserRole.ADMIN,
        status="ACTIVE",
    )
    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)

    access_token = create_access_token(data={"sub": str(admin_user.id)})

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(admin_user),
    )
