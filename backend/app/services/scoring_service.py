from sqlalchemy.orm import Session
from uuid import UUID

from app.models.bird import BirdType
from app.models.evaluation import ScoringConfiguration, ScoringCategory


def create_default_scoring_configurations(db: Session) -> None:
    """Initialize default scoring configurations for each bird type"""
    bird_types = db.query(BirdType).all()

    scoring_configs = {
        "Canary – Waterslager": {
            "name": "Waterslager Scoring",
            "description": "Scoring configuration for Waterslager canaries",
            "categories": [
                {"name": "Tone Quality", "description": "Clarity and purity of tone", "min": 0, "max": 10, "order": 1},
                {"name": "Volume", "description": "Loudness and projection", "min": 0, "max": 10, "order": 2},
                {"name": "Song Pattern", "description": "Consistency and structure of song", "min": 0, "max": 10, "order": 3},
                {"name": "Endurance", "description": "Duration and stamina", "min": 0, "max": 10, "order": 4},
            ]
        },
        "Canary – Roller": {
            "name": "Roller Scoring",
            "description": "Scoring configuration for Roller canaries",
            "categories": [
                {"name": "Tour Quality", "description": "Quality of tour singing", "min": 0, "max": 10, "order": 1},
                {"name": "Softness", "description": "Softness of voice", "min": 0, "max": 10, "order": 2},
                {"name": "Variety", "description": "Variety of song figures", "min": 0, "max": 10, "order": 3},
                {"name": "Evenness", "description": "Evenness throughout song", "min": 0, "max": 10, "order": 4},
            ]
        },
        "Canary – American Singer": {
            "name": "American Singer Scoring",
            "description": "Scoring configuration for American Singer canaries",
            "categories": [
                {"name": "Melodious Song", "description": "Melodiousness and sweetness", "min": 0, "max": 10, "order": 1},
                {"name": "Phrasing", "description": "Phrasing and song structure", "min": 0, "max": 10, "order": 2},
                {"name": "Tone", "description": "Quality of tone", "min": 0, "max": 10, "order": 3},
                {"name": "Performance", "description": "Overall performance quality", "min": 0, "max": 10, "order": 4},
            ]
        },
    }

    for bird_type in bird_types:
        if bird_type.name not in scoring_configs:
            continue

        existing = db.query(ScoringConfiguration).filter_by(bird_type_id=bird_type.id).first()
        if existing:
            continue

        config_def = scoring_configs[bird_type.name]
        config = ScoringConfiguration(
            bird_type_id=bird_type.id,
            name=config_def["name"],
            description=config_def["description"],
            version=1,
            active="true",
        )
        db.add(config)
        db.flush()

        for cat_def in config_def["categories"]:
            category = ScoringCategory(
                scoring_configuration_id=config.id,
                name=cat_def["name"],
                description=cat_def["description"],
                minimum_points=cat_def["min"],
                maximum_points=cat_def["max"],
                display_order=cat_def["order"],
                active="true",
            )
            db.add(category)

    db.commit()


def get_scoring_configuration_for_bird_type(db: Session, bird_type_id: UUID) -> ScoringConfiguration:
    """Get active scoring configuration for a bird type"""
    return (
        db.query(ScoringConfiguration)
        .filter(
            ScoringConfiguration.bird_type_id == bird_type_id,
            ScoringConfiguration.active == "true"
        )
        .order_by(ScoringConfiguration.version.desc())
        .first()
    )


def get_active_categories(db: Session, scoring_configuration_id: UUID) -> list:
    """Get active scoring categories for a configuration"""
    return (
        db.query(ScoringCategory)
        .filter(
            ScoringCategory.scoring_configuration_id == scoring_configuration_id,
            ScoringCategory.active == "true"
        )
        .order_by(ScoringCategory.display_order)
        .all()
    )
