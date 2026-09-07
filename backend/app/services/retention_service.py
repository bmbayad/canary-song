from sqlalchemy.orm import Session
from datetime import datetime
from app.models.recording import Recording, RecordingStatus
from app.services.r2_service import get_r2_service
import logging

logger = logging.getLogger(__name__)


def cleanup_expired_media(db: Session) -> dict:
    """Find and delete expired media from R2, preserve database records"""
    try:
        now = datetime.utcnow()
        r2_service = get_r2_service()

        # Find expired recordings where media hasn't been deleted yet
        expired_recordings = db.query(Recording).filter(
            Recording.expires_at <= now,
            Recording.status != RecordingStatus.EXPIRED
        ).all()

        deleted_count = 0
        failed_count = 0

        for recording in expired_recordings:
            try:
                # Delete from R2
                r2_service.delete_object(recording.storage_key)
                logger.info(f"Deleted R2 object: {recording.storage_key}")

                # Mark as expired but keep database record
                recording.status = RecordingStatus.EXPIRED
                db.commit()
                deleted_count += 1

            except Exception as e:
                failed_count += 1
                logger.error(f"Failed to delete recording {recording.id}: {str(e)}")
                db.rollback()
                # Continue with next recording (retry-safe)
                continue

        return {
            "success": True,
            "deleted_count": deleted_count,
            "failed_count": failed_count,
            "total_expired": len(expired_recordings),
        }

    except Exception as e:
        logger.error(f"Cleanup task failed: {str(e)}")
        return {
            "success": False,
            "error": str(e),
        }
