from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.deps import get_current_user, get_participant_user
from app.models.user import User
from app.schemas.bird import BirdCreate, BirdUpdate, BirdResponse, BirdTypeResponse
from app.services.bird_service import (
    create_bird,
    get_bird_types,
    get_user_birds,
    delete_bird,
    archive_bird,
    get_bird_by_id,
    update_bird,
    create_bird_types,
)

router = APIRouter(prefix="/birds", tags=["birds"])


# Bird Types endpoints - MUST be first (before /{bird_id})
@router.get("/types", response_model=list[BirdTypeResponse])
def get_bird_types_endpoint(db: Session = Depends(get_db)):
    """Get all available bird types (public endpoint)"""
    return get_bird_types(db)


@router.post("", response_model=BirdResponse, status_code=status.HTTP_201_CREATED)
def create_bird_endpoint(
    bird_create: BirdCreate,
    current_user: User = Depends(get_participant_user),
    db: Session = Depends(get_db),
):
    """Create a new bird"""
    return create_bird(db, current_user.id, bird_create)


@router.get("", response_model=list[BirdResponse])
def list_birds(
    current_user: User = Depends(get_participant_user),
    db: Session = Depends(get_db),
):
    """List all birds for the current participant"""
    return get_user_birds(db, current_user.id)


@router.get("/{bird_id}", response_model=BirdResponse)
def get_bird_endpoint(
    bird_id: str,
    current_user: User = Depends(get_participant_user),
    db: Session = Depends(get_db),
):
    """Get a specific bird"""
    import uuid
    try:
        bird_uuid = uuid.UUID(bird_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid bird ID format"
        )

    bird = get_bird_by_id(db, bird_uuid, current_user.id)
    if not bird:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bird not found"
        )
    return bird


@router.put("/{bird_id}", response_model=BirdResponse)
def update_bird_endpoint(
    bird_id: str,
    bird_update: BirdUpdate,
    current_user: User = Depends(get_participant_user),
    db: Session = Depends(get_db),
):
    """Update bird (non-identity fields only)"""
    import uuid
    try:
        bird_uuid = uuid.UUID(bird_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid bird ID format"
        )

    return update_bird(db, bird_uuid, current_user.id, bird_update)


@router.delete("/{bird_id}", status_code=status.HTTP_200_OK)
def delete_bird_endpoint(
    bird_id: str,
    current_user: User = Depends(get_participant_user),
    db: Session = Depends(get_db),
):
    """Delete a bird (only if it has no recordings)"""
    import uuid
    try:
        bird_uuid = uuid.UUID(bird_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid bird ID format"
        )

    try:
        return delete_bird(db, bird_uuid, current_user.id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/{bird_id}/archive", response_model=BirdResponse)
def archive_bird_endpoint(
    bird_id: str,
    current_user: User = Depends(get_participant_user),
    db: Session = Depends(get_db),
):
    """Archive a bird (stop accepting new recordings, preserve evaluation history)"""
    import uuid
    try:
        bird_uuid = uuid.UUID(bird_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid bird ID format"
        )

    try:
        return archive_bird(db, bird_uuid, current_user.id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
