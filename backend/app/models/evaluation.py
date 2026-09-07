from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Enum as SQLEnum, Text, Float, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum

from app.db.database import Base


class EvaluationStatus(str, enum.Enum):
    IN_PROGRESS = "In Progress"
    SUBMITTED = "Submitted"
    UNABLE_TO_EVALUATE = "Unable to Evaluate"


class ScoringConfiguration(Base):
    __tablename__ = "scoring_configurations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bird_type_id = Column(UUID(as_uuid=True), ForeignKey("bird_types.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    version = Column(Integer, default=1, nullable=False)
    active = Column(String, default="true", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    bird_type = relationship("BirdType")
    categories = relationship("ScoringCategory", back_populates="scoring_configuration")

    __table_args__ = (
        Index("idx_scoring_config_bird_type", "bird_type_id"),
    )


class ScoringCategory(Base):
    __tablename__ = "scoring_categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scoring_configuration_id = Column(UUID(as_uuid=True), ForeignKey("scoring_configurations.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    minimum_points = Column(Integer, nullable=False)
    maximum_points = Column(Integer, nullable=False)
    display_order = Column(Integer, default=0, nullable=False)
    active = Column(String, default="true", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    scoring_configuration = relationship("ScoringConfiguration", back_populates="categories")

    __table_args__ = (
        Index("idx_scoring_category_config", "scoring_configuration_id"),
    )


class Evaluation(Base):
    __tablename__ = "evaluations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    recording_id = Column(UUID(as_uuid=True), ForeignKey("recordings.id"), nullable=False, index=True)
    judge_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    scoring_configuration_id = Column(UUID(as_uuid=True), ForeignKey("scoring_configurations.id"), nullable=False)
    status = Column(SQLEnum(EvaluationStatus), default=EvaluationStatus.IN_PROGRESS, nullable=False)
    total_score = Column(Float, nullable=True)
    comments = Column(Text, nullable=True)
    unable_to_evaluate_reason = Column(Text, nullable=True)
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    submitted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    recording = relationship("Recording")
    judge = relationship("User")
    scoring_configuration = relationship("ScoringConfiguration")
    scores = relationship("EvaluationScore", back_populates="evaluation")

    __table_args__ = (
        UniqueConstraint("recording_id", "judge_id", name="uq_recording_judge"),
        Index("idx_evaluation_recording", "recording_id"),
        Index("idx_evaluation_judge", "judge_id"),
        Index("idx_evaluation_status", "status"),
    )


class EvaluationScore(Base):
    __tablename__ = "evaluation_scores"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    evaluation_id = Column(UUID(as_uuid=True), ForeignKey("evaluations.id"), nullable=False, index=True)
    category_id = Column(UUID(as_uuid=True), nullable=False)
    category_name_snapshot = Column(String, nullable=False)
    minimum_points_snapshot = Column(Integer, nullable=False)
    maximum_points_snapshot = Column(Integer, nullable=False)
    score = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    evaluation = relationship("Evaluation", back_populates="scores")

    __table_args__ = (
        Index("idx_evaluation_score_evaluation", "evaluation_id"),
    )
