from sqlalchemy.orm import Session
from uuid import UUID
from datetime import datetime, timedelta
import uuid

from app.models.recording import Recording, RecordingStatus
from app.models.bird import Bird, BirdStatus
from app.schemas.recording import GenerateUploadUrlRequest, ConfirmUploadRequest
from app.services.r2_service import get_r2_service


MAX_MP4_SIZE = 500 * 1024 * 1024
MAX_DURATION = 300


def create_recording_presigned_url(
    db: Session, user_id: UUID, request: GenerateUploadUrlRequest
) -> dict:
    """
    Generate a presigned URL for recording upload.
    Also creates a temporary recording record.

    Returns:
        {
            "upload_url": presigned_url,
            "recording_id": recording_id,
            "storage_key": storage_key
        }
    """
    bird = db.query(Bird).filter(Bird.id == request.bird_id).first()
    if not bird:
        raise Exception("Bird not found")

    if bird.owner_id != user_id:
        raise Exception("Bird ownership validation failed")

    if bird.status != BirdStatus.ACTIVE:
        raise Exception("Cannot upload recording to archived bird")

    if request.file_size > MAX_MP4_SIZE:
        raise Exception(f"File size exceeds maximum of {MAX_MP4_SIZE} bytes")

    recording_id = uuid.uuid4()
    storage_key = f"recordings/{user_id}/{recording_id}.mp4"

    recording = Recording(
        id=recording_id,
        bird_id=bird.id,
        bird_type_id=bird.bird_type_id,
        media_type="MP4",
        storage_key=storage_key,
        original_filename=request.filename,
        file_size=0,
        duration=0,
        uploaded_at=datetime.utcnow(),
        expires_at=datetime.utcnow() + timedelta(days=14),
        status=RecordingStatus.PENDING,
    )
    db.add(recording)
    db.commit()
    db.refresh(recording)

    r2_service = get_r2_service()
    upload_url = r2_service.generate_presigned_upload_url(storage_key)

    return {
        "upload_url": upload_url,
        "recording_id": str(recording_id),
        "storage_key": storage_key,
    }


def confirm_recording_upload(
    db: Session, user_id: UUID, request: ConfirmUploadRequest
) -> Recording:
    """
    Confirm recording upload and update metadata after file is uploaded to R2.
    """
    recording = (
        db.query(Recording).filter(Recording.id == request.recording_id).first()
    )
    if not recording:
        raise Exception("Recording not found")

    bird = db.query(Bird).filter(Bird.id == recording.bird_id).first()
    if not bird or bird.owner_id != user_id:
        raise Exception("Recording ownership validation failed")

    if request.duration > MAX_DURATION:
        raise Exception(f"Recording duration exceeds maximum of {MAX_DURATION} seconds")

    if request.duration == 0:
        raise Exception("Recording duration must be greater than 0")

    recording.file_size = request.file_size
    recording.duration = request.duration
    recording.status = RecordingStatus.COMPLETED
    recording.uploaded_at = datetime.utcnow()

    db.commit()
    db.refresh(recording)
    return recording


def get_user_recordings(db: Session, user_id: UUID) -> list[Recording]:
    """Get all recordings for a participant (via their birds)."""
    return (
        db.query(Recording)
        .join(Bird, Recording.bird_id == Bird.id)
        .filter(Bird.owner_id == user_id)
        .order_by(Recording.uploaded_at.desc())
        .all()
    )


def get_recording_by_id(
    db: Session, recording_id: UUID, user_id: UUID
) -> Recording:
    """Get a specific recording (with ownership validation)."""
    recording = (
        db.query(Recording)
        .join(Bird, Recording.bird_id == Bird.id)
        .filter(Recording.id == recording_id, Bird.owner_id == user_id)
        .first()
    )
    return recording


def delete_recording(db: Session, recording_id: UUID, user_id: UUID) -> dict:
    """Delete a recording from database and R2 storage (with ownership validation)."""
    import logging

    logger = logging.getLogger(__name__)
    recording = get_recording_by_id(db, recording_id, user_id)

    if not recording:
        raise Exception("Recording not found")

    # Check if recording has any evaluations
    from app.models.evaluation import Evaluation
    evaluation_count = db.query(Evaluation).filter_by(recording_id=recording_id).count()

    if evaluation_count > 0:
        logger.info(f"Cannot delete recording {recording_id}: has {evaluation_count} evaluation(s)")
        raise Exception("Cannot delete a recording that has been evaluated. Evaluated recordings are immutable for audit purposes.")

    # Delete from R2
    r2_service = get_r2_service()
    if recording.storage_key:
        try:
            logger.info(f"Deleting object from R2: {recording.storage_key}")
            result = r2_service.delete_object(recording.storage_key)
            logger.info(f"Successfully deleted from R2: {recording.storage_key}")
        except Exception as e:
            logger.error(f"Failed to delete from R2 ({recording.storage_key}): {str(e)}", exc_info=True)
            raise Exception(f"Failed to delete media file from storage: {str(e)}")
    else:
        logger.warning(f"Recording {recording_id} has no storage_key")

    # Delete from database
    db.delete(recording)
    db.commit()

    return {"message": "Recording deleted successfully"}

