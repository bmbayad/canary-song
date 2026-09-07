from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from app.db.database import get_db
from app.core.deps import get_current_user
from app.models.user import User, UserRole, UserStatus
from app.schemas.admin import (
    CreateJudgeRequest,
    JudgeResponse,
    UpdateJudgeStatusRequest,
    BirdTypeResponse,
    CreateBirdTypeRequest,
    UpdateBirdTypeRequest,
    ScoringCategoryRequest,
    ScoringCategoryResponse,
    UpdateScoringCategoryRequest,
    ScoringConfigurationResponse,
    CreateScoringConfigurationRequest,
    ListJudgesResponse,
    ListBirdTypesResponse,
    ListScoringCategoriesResponse,
    RetentionConfigResponse,
    UpdateRetentionConfigRequest,
)
from app.services import admin_service

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/judges", response_model=JudgeResponse)
def create_judge(
    request: CreateJudgeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new judge account (admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can create judges"
        )

    try:
        judge = admin_service.create_judge(
            db,
            email=request.email,
            first_name=request.first_name,
            last_name=request.last_name,
            display_name=request.display_name,
        )
        return judge
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/judges", response_model=ListJudgesResponse)
def list_judges(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all judges (admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can list judges"
        )

    judges = admin_service.get_judges(db, skip=skip, limit=limit)
    return ListJudgesResponse(judges=judges, total=len(judges))


@router.get("/judges/{judge_id}", response_model=JudgeResponse)
def get_judge(
    judge_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a specific judge (admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can view judges"
        )

    try:
        judge_uuid = UUID(judge_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid judge ID format"
        )

    judge = admin_service.get_judge_by_id(db, judge_uuid)
    if not judge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Judge not found"
        )

    return judge


@router.patch("/judges/{judge_id}/status", response_model=JudgeResponse)
def update_judge_status(
    judge_id: str,
    request: UpdateJudgeStatusRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update judge status (admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can update judge status"
        )

    try:
        judge_uuid = UUID(judge_id)
        status_enum = UserStatus(request.status)
    except (ValueError, KeyError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid judge ID or status format"
        )

    try:
        judge = admin_service.update_judge_status(db, judge_uuid, status_enum)
        return judge
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/bird-types", response_model=BirdTypeResponse)
def create_bird_type(
    request: CreateBirdTypeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new bird type (admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can create bird types"
        )

    try:
        bird_type = admin_service.create_or_update_bird_type(
            db,
            name=request.name,
            description=request.description,
            active=True,
        )
        return bird_type
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/bird-types", response_model=ListBirdTypesResponse)
def list_bird_types(
    skip: int = 0,
    limit: int = 100,
    include_inactive: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List bird types (admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can list bird types"
        )

    bird_types = admin_service.get_bird_types(db, skip=skip, limit=limit, include_inactive=include_inactive)
    return ListBirdTypesResponse(bird_types=bird_types, total=len(bird_types))


@router.get("/bird-types/{bird_type_id}", response_model=BirdTypeResponse)
def get_bird_type(
    bird_type_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a specific bird type (admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can view bird types"
        )

    try:
        bird_type_uuid = UUID(bird_type_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid bird type ID format"
        )

    bird_type = admin_service.get_bird_type_by_id(db, bird_type_uuid)
    if not bird_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bird type not found"
        )

    return bird_type


@router.patch("/bird-types/{bird_type_id}", response_model=BirdTypeResponse)
def update_bird_type(
    bird_type_id: str,
    request: UpdateBirdTypeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update bird type (admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can update bird types"
        )

    try:
        bird_type_uuid = UUID(bird_type_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid bird type ID format"
        )

    try:
        bird_type = admin_service.create_or_update_bird_type(
            db,
            name=request.name,
            description=request.description,
            bird_type_id=bird_type_uuid,
            active=request.active if request.active is not None else True,
        )
        return bird_type
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/scoring-configurations", response_model=ScoringConfigurationResponse)
def create_scoring_configuration(
    request: CreateScoringConfigurationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new scoring configuration (admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can create scoring configurations"
        )

    try:
        config = admin_service.create_scoring_configuration(
            db,
            bird_type_id=request.bird_type_id,
            name=request.name,
            description=request.description,
            version=request.version,
        )
        return config
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/scoring-configurations", response_model=list[ScoringConfigurationResponse])
def list_scoring_configurations(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all scoring configurations (admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can list scoring configurations"
        )

    from app.models.evaluation import ScoringConfiguration
    configs = db.query(ScoringConfiguration).offset(skip).limit(limit).all()
    return configs


@router.post("/scoring-categories", response_model=ScoringCategoryResponse)
def create_scoring_category(
    request: ScoringCategoryRequest,
    scoring_configuration_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new scoring category (admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can create scoring categories"
        )

    try:
        config_uuid = UUID(scoring_configuration_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid scoring configuration ID format"
        )

    try:
        category = admin_service.create_scoring_category(
            db,
            scoring_configuration_id=config_uuid,
            name=request.name,
            minimum_points=request.minimum_points,
            maximum_points=request.maximum_points,
            display_order=request.display_order,
            description=request.description,
        )
        return category
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/scoring-categories", response_model=ListScoringCategoriesResponse)
def list_scoring_categories(
    scoring_configuration_id: str = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List scoring categories (admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can list scoring categories"
        )

    config_uuid = None
    if scoring_configuration_id:
        try:
            config_uuid = UUID(scoring_configuration_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid scoring configuration ID format"
            )

    categories = admin_service.get_scoring_categories(db, scoring_configuration_id=config_uuid, skip=skip, limit=limit)
    return ListScoringCategoriesResponse(categories=categories, total=len(categories))


@router.patch("/scoring-categories/{category_id}", response_model=ScoringCategoryResponse)
def update_scoring_category(
    category_id: str,
    request: UpdateScoringCategoryRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a scoring category (admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can update scoring categories"
        )

    try:
        category_uuid = UUID(category_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid category ID format"
        )

    try:
        category = admin_service.update_scoring_category(
            db,
            category_uuid,
            name=request.name,
            minimum_points=request.minimum_points,
            maximum_points=request.maximum_points,
            display_order=request.display_order,
            description=request.description,
            active=request.active,
        )
        return category
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/scoring-categories/{category_id}")
def delete_scoring_category(
    category_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a scoring category (admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can delete scoring categories"
        )

    try:
        category_uuid = UUID(category_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid category ID format"
        )

    try:
        admin_service.delete_scoring_category(db, category_uuid)
        return {"message": "Category deleted successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/retention", response_model=RetentionConfigResponse)
def get_retention_config(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get retention configuration (admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can view retention configuration"
        )

    from app.models.configuration import SystemConfiguration
    from datetime import datetime

    retention_days = admin_service.get_retention_days(db)
    config = db.query(SystemConfiguration).filter(SystemConfiguration.key == "retention_days").first()

    return RetentionConfigResponse(
        retention_days=retention_days,
        created_at=config.created_at if config else datetime.utcnow(),
        updated_at=config.updated_at if config else datetime.utcnow(),
    )


@router.patch("/retention", response_model=RetentionConfigResponse)
def update_retention_config(
    request: UpdateRetentionConfigRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update retention configuration (admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can update retention configuration"
        )

    try:
        retention_days = admin_service.set_retention_days(db, request.retention_days)

        from app.models.configuration import SystemConfiguration
        config = db.query(SystemConfiguration).filter(SystemConfiguration.key == "retention_days").first()

        return RetentionConfigResponse(
            retention_days=retention_days,
            created_at=config.created_at,
            updated_at=config.updated_at,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
