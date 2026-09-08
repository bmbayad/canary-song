from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from app.models.bird import Bird, BirdType, BirdStatus, BirdTypeEnum
from app.schemas.bird import BirdCreate, BirdUpdate
from typing import Optional, List
from uuid import UUID
from fastapi import HTTPException, status


def create_bird_types(db: Session):
    """Initialize default bird types"""
    types = [
        {"name": "Canary - Waterslager", "description": "Waterslager canary"},
        {"name": "Canary - Roller", "description": "Roller canary"},
        {"name": "Canary - American Singer", "description": "American Singer canary"},
    ]

    for bird_type in types:
        existing = db.query(BirdType).filter(BirdType.name == bird_type["name"]).first()
        if not existing:
            new_type = BirdType(
                name=bird_type["name"],
                description=bird_type["description"],
                active="true"
            )
            db.add(new_type)

    db.commit()


def get_bird_types(db: Session) -> List[BirdType]:
    """Get all active bird types"""
    return db.query(BirdType).filter(BirdType.active == "true").all()


def get_bird_type_by_id(db: Session, bird_type_id: UUID) -> Optional[BirdType]:
    """Get bird type by ID"""
    return db.query(BirdType).filter(BirdType.id == bird_type_id).first()


def create_bird(db: Session, owner_id: UUID, bird_create: BirdCreate) -> Bird:
    """Create a new bird"""
    # Validate bird type exists
    bird_type = get_bird_type_by_id(db, bird_create.bird_type_id)
    if not bird_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid bird type"
        )

    # Check for duplicate leg band number for this owner
    existing = db.query(Bird).filter(
        and_(
            Bird.owner_id == owner_id,
            Bird.leg_band_number == bird_create.leg_band_number
        )
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A bird with this leg band number already exists"
        )

    # Create bird
    new_bird = Bird(
        owner_id=owner_id,
        name=bird_create.name,
        leg_band_number=bird_create.leg_band_number,
        bird_type_id=bird_create.bird_type_id,
        sex=bird_create.sex,
        notes=bird_create.notes,
        status=BirdStatus.ACTIVE
    )

    db.add(new_bird)
    db.commit()
    db.refresh(new_bird)
    return new_bird


def get_bird_by_id(db: Session, bird_id: UUID, owner_id: Optional[UUID] = None) -> Optional[Bird]:
    """Get bird by ID, optionally verify ownership"""
    query = db.query(Bird).filter(Bird.id == bird_id)

    if owner_id:
        query = query.filter(Bird.owner_id == owner_id)

    return query.first()


def get_user_birds(db: Session, owner_id: UUID, status: Optional[str] = None) -> List[Bird]:
    """Get all birds for a participant"""
    query = db.query(Bird).filter(Bird.owner_id == owner_id)

    if status:
        query = query.filter(Bird.status == status)

    return query.order_by(Bird.created_at.desc()).all()


def delete_bird(db: Session, bird_id: UUID, owner_id: UUID) -> dict:
    """Delete a bird (only if it has no recordings)"""
    bird = get_bird_by_id(db, bird_id, owner_id)

    if not bird:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bird not found"
        )

    # Check if bird has any recordings
    from app.models.recording import Recording
    recording_count = db.query(Recording).filter_by(bird_id=bird_id).count()

    if recording_count > 0:
        raise Exception(f"Cannot delete bird with {recording_count} recording(s). Use 'Stop Judging' to archive the bird instead.")

    # Safe to delete - no recordings
    db.delete(bird)
    db.commit()

    return {"message": "Bird deleted successfully"}


def archive_bird(db: Session, bird_id: UUID, owner_id: UUID) -> Bird:
    """Archive a bird (stop accepting new recordings, preserve evaluation history)"""
    bird = get_bird_by_id(db, bird_id, owner_id)

    if not bird:
        raise Exception("Bird not found")

    bird.status = BirdStatus.ARCHIVED
    db.commit()
    db.refresh(bird)
    return bird


def archive_bird(db: Session, bird_id: UUID, owner_id: UUID) -> Bird:
    """Archive a bird (soft delete)"""
    bird = get_bird_by_id(db, bird_id, owner_id)

    if not bird:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bird not found"
        )

    if bird.status == BirdStatus.ARCHIVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bird is already archived"
        )

    bird.status = BirdStatus.ARCHIVED
    db.add(bird)
    db.commit()
    db.refresh(bird)
    return bird


def update_bird(db: Session, bird_id: UUID, owner_id: UUID, bird_update: BirdUpdate) -> Bird:
    """Update bird (only non-identity fields)"""
    bird = get_bird_by_id(db, bird_id, owner_id)

    if not bird:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bird not found"
        )

    # Only allow updating non-identity fields
    update_data = bird_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(bird, key, value)

    db.add(bird)
    db.commit()
    db.refresh(bird)
    return bird
