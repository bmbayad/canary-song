from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Enum as SQLEnum, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta
import uuid
import enum

from app.db.database import Base


class RecordingStatus(str, enum.Enum):
    PENDING = "Pending"
    IN_PROGRESS = "In Progress"
    COMPLETED = "Completed"
    UNABLE_TO_EVALUATE = "Unable to Evaluate"
    EXPIRED = "Expired"


class Recording(Base):
    __tablename__ = "recordings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bird_id = Column(UUID(as_uuid=True), ForeignKey("birds.id"), nullable=False, index=True)
    bird_type_id = Column(UUID(as_uuid=True), ForeignKey("bird_types.id"), nullable=False)
    media_type = Column(String(10), default="MP4", nullable=False)
    storage_key = Column(String(255), nullable=False, unique=True)
    original_filename = Column(String(255), nullable=False)
    file_size = Column(Integer, nullable=False)
    duration = Column(Integer, nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    status = Column(SQLEnum('Pending', 'In Progress', 'Completed', 'Unable to Evaluate', 'Expired', name='recordingstatus'), default='Pending', nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    bird = relationship("Bird", back_populates="recordings")
    bird_type = relationship("BirdType")

    __table_args__ = (
        Index("idx_recording_bird_id", "bird_id"),
        Index("idx_recording_bird_type_id", "bird_type_id"),
    )
