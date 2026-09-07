from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.user import User, UserRole, UserStatus, GoogleIdentity
from app.schemas.user import UserCreate, UserUpdate
from app.core.security import hash_password, verify_password
from typing import Optional
from uuid import UUID
from fastapi import HTTPException, status


def create_user(db: Session, user_create: UserCreate) -> User:
    # Validate password length (bcrypt max is 72 bytes)
    if len(user_create.password) > 72:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be 72 characters or less",
        )

    db_user = User(
        email=user_create.email,
        password_hash=hash_password(user_create.password),
        first_name=user_create.first_name,
        last_name=user_create.last_name,
        display_name=user_create.display_name,
        preferred_language=user_create.preferred_language,
        timezone=user_create.timezone,
        country_region=user_create.country_region,
        phone=user_create.phone,
        role=UserRole.PARTICIPANT,
        status=UserStatus.ACTIVE,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(func.lower(User.email) == func.lower(email)).first()


def get_user_by_id(db: Session, user_id: UUID) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()


def verify_user_password(db: Session, email: str, password: str) -> Optional[User]:
    user = get_user_by_email(db, email)
    if not user or not user.password_hash:
        return None
    if not verify_password(password, user.password_hash):
        return None
    if user.status != UserStatus.ACTIVE:
        return None
    return user


def get_or_create_user_from_google(
    db: Session,
    google_id: str,
    email: str,
    first_name: Optional[str] = None,
    last_name: Optional[str] = None,
) -> User:
    google_identity = db.query(GoogleIdentity).filter(
        GoogleIdentity.google_id == google_id
    ).first()

    if google_identity:
        user = get_user_by_id(db, google_identity.user_id)
        if user:
            return user

    existing_user = get_user_by_email(db, email)
    if existing_user:
        if not db.query(GoogleIdentity).filter(
            GoogleIdentity.user_id == existing_user.id
        ).first():
            google_id_obj = GoogleIdentity(
                user_id=existing_user.id,
                google_id=google_id,
                email=email,
            )
            db.add(google_id_obj)
            db.commit()
        return existing_user

    new_user = User(
        email=email,
        password_hash=None,
        first_name=first_name,
        last_name=last_name,
        display_name=first_name,
        role=UserRole.PARTICIPANT,
        status=UserStatus.ACTIVE,
    )
    db.add(new_user)
    db.flush()

    google_id_obj = GoogleIdentity(
        user_id=new_user.id,
        google_id=google_id,
        email=email,
    )
    db.add(google_id_obj)
    db.commit()
    db.refresh(new_user)
    return new_user


def update_user(db: Session, user_id: UUID, user_update: UserUpdate) -> Optional[User]:
    user = get_user_by_id(db, user_id)
    if not user:
        return None

    update_data = user_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(user, key, value)

    db.add(user)
    db.commit()
    db.refresh(user)
    return user

