from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Optional


class RecordingResponse(BaseModel):
    id: UUID
    bird_id: UUID
    bird_type_id: UUID
    media_type: str
    storage_key: str
    original_filename: str
    file_size: int
    duration: int
    uploaded_at: datetime
    expires_at: datetime
    status: str

    class Config:
        from_attributes = True


class GenerateUploadUrlRequest(BaseModel):
    bird_id: UUID = Field(..., description="ID of the bird to upload recording for")
    filename: str = Field(..., description="Original filename of the recording")
    file_size: int = Field(..., description="File size in bytes")


class GenerateUploadUrlResponse(BaseModel):
    upload_url: str = Field(..., description="Presigned URL for direct upload to R2")
    recording_id: UUID = Field(..., description="Temporary recording ID for confirmation")


class ConfirmUploadRequest(BaseModel):
    recording_id: UUID = Field(..., description="Recording ID from upload response")
    file_size: int = Field(..., description="Actual file size uploaded")
    duration: int = Field(..., description="Recording duration in seconds")


class ListRecordingsResponse(BaseModel):
    recordings: list[RecordingResponse]
    total: int
