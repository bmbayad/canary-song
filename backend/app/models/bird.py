from sqlalchemy import Column, String, DateTime, Enum, ForeignKey, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum

from app.db.database import Base


class BirdTypeEnum(str, enum.Enum):
    WATERSLAGER = "Waterslager"
    ROLLER = "Roller"
    AMERICAN_SINGER = "American Singer"


class BirdStatus(str, enum.Enum):
    ACTIVE = "Active"
    ARCHIVED = "Archived"


class BirdType(Base):
    __tablename__ = "bird_types"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, unique=True, nullable=False, index=True)
    description = Column(String, nullable=True)
    active = Column(String, default="true", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("idx_bird_type_name", "name"),
    )


class Bird(Base):
    __tablename__ = "birds"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    name = Column(String, nullable=False)
    leg_band_number = Column(String, nullable=False)
    bird_type_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    sex = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    status = Column(Enum('Active', 'Archived', name='birdstatus'), default='Active', nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    recordings = relationship("Recording", back_populates="bird")

    __table_args__ = (
        UniqueConstraint("owner_id", "leg_band_number", name="uq_owner_leg_band"),
        Index("idx_bird_owner_id", "owner_id"),
        Index("idx_bird_type_id", "bird_type_id"),
    )
