from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from app.db.database import get_db
from app.core.deps import get_participant_user
from app.models.user import User
from app.schemas.recording import (
    GenerateUploadUrlRequest,
    GenerateUploadUrlResponse,
    ConfirmUploadRequest,
    RecordingResponse,
    ListRecordingsResponse,
)
from app.services.recording_service import (
    create_recording_presigned_url,
    confirm_recording_upload,
    get_user_recordings,
    get_recording_by_id,
    delete_recording,
)

router = APIRouter(prefix="/recordings", tags=["recordings"])


@router.post("/upload-url", response_model=GenerateUploadUrlResponse)
def generate_upload_url(
    request: GenerateUploadUrlRequest,
    current_user: User = Depends(get_participant_user),
    db: Session = Depends(get_db),
):
    """Generate presigned URL for recording upload to R2"""
    try:
        result = create_recording_presigned_url(db, current_user.id, request)
        return GenerateUploadUrlResponse(
            upload_url=result["upload_url"],
            recording_id=UUID(result["recording_id"]),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/confirm-upload", response_model=RecordingResponse)
def confirm_upload(
    request: ConfirmUploadRequest,
    current_user: User = Depends(get_participant_user),
    db: Session = Depends(get_db),
):
    """Confirm recording upload and finalize metadata"""
    try:
        recording = confirm_recording_upload(db, current_user.id, request)
        return recording
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("", response_model=ListRecordingsResponse)
def list_recordings(
    current_user: User = Depends(get_participant_user),
    db: Session = Depends(get_db),
):
    """List all recordings for the authenticated participant"""
    recordings = get_user_recordings(db, current_user.id)
    return ListRecordingsResponse(recordings=recordings, total=len(recordings))


@router.get("/{recording_id}", response_model=RecordingResponse)
def get_recording(
    recording_id: str,
    current_user: User = Depends(get_participant_user),
    db: Session = Depends(get_db),
):
    """Get a specific recording"""
    try:
        recording_uuid = UUID(recording_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid recording ID format",
        )

    recording = get_recording_by_id(db, recording_uuid, current_user.id)
    if not recording:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recording not found",
        )
    return recording


@router.delete("/{recording_id}", status_code=status.HTTP_200_OK)
def delete_recording_endpoint(
    recording_id: str,
    current_user: User = Depends(get_participant_user),
    db: Session = Depends(get_db),
):
    """Delete a recording from database and R2 storage"""
    try:
        recording_uuid = UUID(recording_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid recording ID format",
        )

    try:
        return delete_recording(db, recording_uuid, current_user.id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

