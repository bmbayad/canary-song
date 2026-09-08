from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Optional, List


class ScoringCategoryResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    minimum_points: int
    maximum_points: int
    display_order: int

    class Config:
        from_attributes = True


class ScoringConfigurationResponse(BaseModel):
    id: UUID
    bird_type_id: UUID
    name: str
    description: Optional[str]
    version: int
    categories: List[ScoringCategoryResponse]

    class Config:
        from_attributes = True


class EvaluationScoreResponse(BaseModel):
    id: UUID
    category_id: UUID
    category_name_snapshot: str
    minimum_points_snapshot: int
    maximum_points_snapshot: int
    score: int

    class Config:
        from_attributes = True


class EvaluationResponse(BaseModel):
    id: UUID
    recording_id: UUID
    judge_id: UUID
    status: str
    total_score: Optional[float]
    comments: Optional[str]
    unable_to_evaluate_reason: Optional[str]
    started_at: datetime
    submitted_at: Optional[datetime]
    scores: List[EvaluationScoreResponse]
    scoring_configuration: Optional[ScoringConfigurationResponse] = None

    class Config:
        from_attributes = True


class StartEvaluationResponse(BaseModel):
    evaluation_id: UUID
    recording_id: UUID
    scoring_configuration: ScoringConfigurationResponse


class SubmitEvaluationRequest(BaseModel):
    scores: dict = Field(..., description="Dict of category_id -> score")
    comments: Optional[str] = None


class UnableToEvaluateRequest(BaseModel):
    reason: str = Field(..., description="Reason for unable to evaluate")


class RecordingForQueueResponse(BaseModel):
    id: UUID
    bird_name: str
    leg_band_number: str
    bird_type_name: str
    original_filename: str
    uploaded_at: datetime
    expires_at: datetime
    video_url: str

    class Config:
        from_attributes = True


class JudgeQueueResponse(BaseModel):
    available_count: int
    available_recordings: List[RecordingForQueueResponse]


class RecordingEvaluationSummaryResponse(BaseModel):
    recording_id: UUID
    bird_name: str
    leg_band_number: str
    bird_type_name: str
    uploaded_at: datetime
    expires_at: datetime
    is_expired: bool
    total_judges: int
    completed_count: int
    unable_count: int
    aggregate_score: Optional[float]


class JudgeEvaluationItemResponse(BaseModel):
    id: UUID
    judge_id: UUID
    status: str
    total_score: Optional[float]
    comments: Optional[str]
    unable_to_evaluate_reason: Optional[str]
    submitted_at: Optional[datetime]
    scores: List[EvaluationScoreResponse]

    class Config:
        from_attributes = True


class RecordingEvaluationDetailResponse(BaseModel):
    recording_id: UUID
    bird_name: str
    leg_band_number: str
    bird_type_name: str
    original_filename: str
    uploaded_at: datetime
    expires_at: datetime
    is_expired: bool
    video_url: str
    aggregate_score: Optional[float]
    total_judges: int
    evaluations: List[JudgeEvaluationItemResponse]

    class Config:
        from_attributes = True
