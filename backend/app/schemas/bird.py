from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from uuid import UUID


class BirdTypeResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    active: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BirdCreate(BaseModel):
    name: str
    leg_band_number: str
    bird_type_id: UUID
    sex: Optional[str] = None
    notes: Optional[str] = None


class BirdUpdate(BaseModel):
    sex: Optional[str] = None
    notes: Optional[str] = None


class BirdResponse(BaseModel):
    id: UUID
    owner_id: UUID
    name: str
    leg_band_number: str
    bird_type_id: UUID
    sex: Optional[str] = None
    notes: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BirdDetailResponse(BirdResponse):
    bird_type: Optional[BirdTypeResponse] = None
