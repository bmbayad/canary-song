from sqlalchemy.orm import Session
from uuid import UUID
from app.models.user import User, UserRole, UserStatus
from app.models.bird import BirdType
from app.models.evaluation import ScoringConfiguration, ScoringCategory


def create_judge(db: Session, email: str, first_name: str = "", last_name: str = "", display_name: str = "") -> User:
    """Create a new judge account"""
    # Check if user already exists
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise Exception(f"User with email {email} already exists")

    from app.core.security import hash_password

    user = User(
        email=email,
        password_hash=hash_password("TempPassword123!"),
        first_name=first_name,
        last_name=last_name,
        display_name=display_name or email.split("@")[0],
        role=UserRole.JUDGE,
        status=UserStatus.ACTIVE,
        password_reset_required=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_judge_status(db: Session, judge_id: UUID, status: UserStatus) -> User:
    """Update judge account status (Activate/Deactivate)"""
    judge = db.query(User).filter(User.id == judge_id, User.role == UserRole.JUDGE).first()
    if not judge:
        raise Exception("Judge not found")

    judge.status = status
    db.commit()
    db.refresh(judge)
    return judge


def get_judges(db: Session, skip: int = 0, limit: int = 100) -> list:
    """Get all judges"""
    return db.query(User).filter(User.role == UserRole.JUDGE).offset(skip).limit(limit).all()


def get_judge_by_id(db: Session, judge_id: UUID) -> User:
    """Get a specific judge"""
    return db.query(User).filter(User.id == judge_id, User.role == UserRole.JUDGE).first()


def create_or_update_bird_type(db: Session, name: str = None, description: str = None, bird_type_id: UUID = None, active: bool = True) -> BirdType:
    """Create or update a bird type"""
    if bird_type_id:
        # Update existing
        bird_type = db.query(BirdType).filter(BirdType.id == bird_type_id).first()
        if not bird_type:
            raise Exception("Bird type not found")

        if name:
            bird_type.name = name
        if description is not None:
            bird_type.description = description
        bird_type.active = "true" if active else "false"
    else:
        # Create new
        if not name:
            raise Exception("Bird type name is required")

        existing = db.query(BirdType).filter(BirdType.name == name).first()
        if existing:
            raise Exception(f"Bird type {name} already exists")

        bird_type = BirdType(
            name=name,
            description=description,
            active="true" if active else "false",
        )
        db.add(bird_type)

    db.commit()
    db.refresh(bird_type)
    return bird_type


def get_bird_types(db: Session, skip: int = 0, limit: int = 100, include_inactive: bool = False) -> list:
    """Get bird types"""
    query = db.query(BirdType)
    if not include_inactive:
        query = query.filter(BirdType.active == "true")
    return query.offset(skip).limit(limit).all()


def get_bird_type_by_id(db: Session, bird_type_id: UUID) -> BirdType:
    """Get a specific bird type"""
    return db.query(BirdType).filter(BirdType.id == bird_type_id).first()


def create_scoring_configuration(
    db: Session,
    bird_type_id: UUID,
    name: str,
    description: str = None,
    version: int = 1,
) -> ScoringConfiguration:
    """Create a new scoring configuration"""
    bird_type = db.query(BirdType).filter(BirdType.id == bird_type_id).first()
    if not bird_type:
        raise Exception("Bird type not found")

    config = ScoringConfiguration(
        bird_type_id=bird_type_id,
        name=name,
        description=description,
        version=version,
        active="true",
    )
    db.add(config)
    db.commit()
    db.refresh(config)
    return config


def create_scoring_category(
    db: Session,
    scoring_configuration_id: UUID,
    name: str,
    minimum_points: int,
    maximum_points: int,
    display_order: int = 0,
    description: str = None,
) -> ScoringCategory:
    """Create a new scoring category"""
    config = db.query(ScoringConfiguration).filter(ScoringConfiguration.id == scoring_configuration_id).first()
    if not config:
        raise Exception("Scoring configuration not found")

    category = ScoringCategory(
        scoring_configuration_id=scoring_configuration_id,
        name=name,
        description=description,
        minimum_points=minimum_points,
        maximum_points=maximum_points,
        display_order=display_order,
        active="true",
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def update_scoring_category(
    db: Session,
    category_id: UUID,
    name: str = None,
    minimum_points: int = None,
    maximum_points: int = None,
    display_order: int = None,
    description: str = None,
    active: bool = None,
) -> ScoringCategory:
    """Update a scoring category"""
    category = db.query(ScoringCategory).filter(ScoringCategory.id == category_id).first()
    if not category:
        raise Exception("Scoring category not found")

    if name is not None:
        category.name = name
    if minimum_points is not None:
        category.minimum_points = minimum_points
    if maximum_points is not None:
        category.maximum_points = maximum_points
    if display_order is not None:
        category.display_order = display_order
    if description is not None:
        category.description = description
    if active is not None:
        category.active = "true" if active else "false"

    db.commit()
    db.refresh(category)
    return category


def delete_scoring_category(db: Session, category_id: UUID) -> bool:
    """Delete a scoring category"""
    category = db.query(ScoringCategory).filter(ScoringCategory.id == category_id).first()
    if not category:
        raise Exception("Scoring category not found")

    db.delete(category)
    db.commit()
    return True


def get_scoring_categories(
    db: Session,
    scoring_configuration_id: UUID = None,
    skip: int = 0,
    limit: int = 100,
) -> list:
    """Get scoring categories"""
    query = db.query(ScoringCategory)
    if scoring_configuration_id:
        query = query.filter(ScoringCategory.scoring_configuration_id == scoring_configuration_id)
    return query.offset(skip).limit(limit).all()


def get_scoring_category_by_id(db: Session, category_id: UUID) -> ScoringCategory:
    """Get a specific scoring category"""
    return db.query(ScoringCategory).filter(ScoringCategory.id == category_id).first()


def get_retention_days(db: Session) -> int:
    """Get current retention period in days (default: 14)"""
    from app.models.configuration import SystemConfiguration

    config = db.query(SystemConfiguration).filter(SystemConfiguration.key == "retention_days").first()
    if config:
        try:
            return int(config.value)
        except (ValueError, TypeError):
            return 14
    return 14


def set_retention_days(db: Session, days: int) -> int:
    """Set retention period in days"""
    from app.models.configuration import SystemConfiguration
    import logging

    logger = logging.getLogger(__name__)

    if days < 1:
        raise Exception("Retention period must be at least 1 day")
    if days > 365:
        raise Exception("Retention period cannot exceed 365 days")

    try:
        config = db.query(SystemConfiguration).filter(SystemConfiguration.key == "retention_days").first()
        if config:
            config.value = str(days)
            logger.info(f"Updating retention_days to {days}")
        else:
            config = SystemConfiguration(key="retention_days", value=str(days))
            db.add(config)
            logger.info(f"Creating retention_days with value {days}")

        db.commit()
        db.refresh(config)
        logger.info(f"Retention_days successfully set to {config.value}")
        return int(config.value)
    except Exception as e:
        logger.error(f"Error setting retention_days: {str(e)}")
        db.rollback()
        raise
