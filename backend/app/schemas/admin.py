from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime
from typing import Optional, List


class CreateJudgeRequest(BaseModel):
    email: EmailStr
    first_name: Optional[str] = ""
    last_name: Optional[str] = ""
    display_name: Optional[str] = None


class JudgeResponse(BaseModel):
    id: UUID
    email: str
    first_name: str
    last_name: str
    display_name: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class UpdateJudgeStatusRequest(BaseModel):
    status: str  # "Active", "Inactive", "Suspended"


class BirdTypeResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CreateBirdTypeRequest(BaseModel):
    name: str
    description: Optional[str] = None


class UpdateBirdTypeRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    active: Optional[bool] = None


class ScoringCategoryRequest(BaseModel):
    name: str
    description: Optional[str] = None
    minimum_points: int
    maximum_points: int
    display_order: int = 0


class ScoringCategoryResponse(BaseModel):
    id: UUID
    scoring_configuration_id: UUID
    name: str
    description: Optional[str]
    minimum_points: int
    maximum_points: int
    display_order: int
    active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UpdateScoringCategoryRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    minimum_points: Optional[int] = None
    maximum_points: Optional[int] = None
    display_order: Optional[int] = None
    active: Optional[bool] = None


class ScoringConfigurationResponse(BaseModel):
    id: UUID
    bird_type_id: UUID
    name: str
    description: Optional[str]
    version: int
    active: bool
    categories: List[ScoringCategoryResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CreateScoringConfigurationRequest(BaseModel):
    bird_type_id: UUID
    name: str
    description: Optional[str] = None
    version: int = 1


class ListJudgesResponse(BaseModel):
    judges: List[JudgeResponse]
    total: int


class ListBirdTypesResponse(BaseModel):
    bird_types: List[BirdTypeResponse]
    total: int


class ListScoringCategoriesResponse(BaseModel):
    categories: List[ScoringCategoryResponse]
    total: int


class RetentionConfigResponse(BaseModel):
    retention_days: int
    created_at: datetime
    updated_at: datetime


class UpdateRetentionConfigRequest(BaseModel):
    retention_days: int
