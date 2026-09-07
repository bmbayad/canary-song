from sqlalchemy import Column, String, DateTime, Enum, Index, Boolean
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
import enum

from app.db.database import Base


class UserRole(str, enum.Enum):
    PARTICIPANT = "Participant"
    JUDGE = "Judge"
    ADMIN = "Admin"


class UserStatus(str, enum.Enum):
    ACTIVE = "Active"
    INACTIVE = "Inactive"
    SUSPENDED = "Suspended"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=True)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    display_name = Column(String, nullable=True)
    role = Column(Enum(UserRole), default=UserRole.PARTICIPANT, nullable=False)
    status = Column(Enum(UserStatus), default=UserStatus.ACTIVE, nullable=False)
    password_reset_required = Column(Boolean, default=False, nullable=False)
    preferred_language = Column(String, default="en", nullable=False)
    timezone = Column(String, nullable=True)
    country_region = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    notification_preferences = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    last_login_at = Column(DateTime, nullable=True)

    __table_args__ = (
        Index("idx_user_email", "email"),
    )


class GoogleIdentity(Base):
    __tablename__ = "google_identities"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    google_id = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("idx_google_identity_user_id", "user_id"),
        Index("idx_google_identity_google_id", "google_id"),
    )
