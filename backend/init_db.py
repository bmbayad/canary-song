#!/usr/bin/env python
"""Initialize database - creates all tables"""
import sys
from sqlalchemy import text, inspect
from app.db.database import engine, Base

# IMPORTANT: Import ALL models to register them with Base.metadata
from app.models.user import User, UserRole, UserStatus, GoogleIdentity
from app.models.bird import Bird, BirdType
from app.models.recording import Recording
from app.models.evaluation import ScoringConfiguration, ScoringCategory, Evaluation, EvaluationScore
from app.models.configuration import SystemConfiguration
from app.services.bird_service import create_bird_types
from app.services.scoring_service import create_default_scoring_configurations
from app.core.security import hash_password


def create_default_configuration(db):
    """Create default system configuration"""
    from app.models.configuration import SystemConfiguration

    # Check if retention_days is already configured
    existing = db.query(SystemConfiguration).filter_by(key="retention_days").first()
    if not existing:
        config = SystemConfiguration(
            key="retention_days",
            value="14"
        )
        db.add(config)
        db.commit()
        print("   ✓ Default retention configuration created (14 days)")


def create_test_accounts(db):
    """Create test participant, judge, and admin accounts for development"""
    # Test participant
    participant = db.query(User).filter_by(email="participant@test.com").first()
    if not participant:
        participant = User(
            email="participant@test.com",
            password_hash=hash_password("password123"),
            first_name="Test",
            last_name="Participant",
            display_name="Test Participant",
            role=UserRole.PARTICIPANT,
            status=UserStatus.ACTIVE,
        )
        db.add(participant)
        print("   ✓ Test participant created: participant@test.com / password123")

    # Test judge
    judge = db.query(User).filter_by(email="judge@test.com").first()
    if not judge:
        judge = User(
            email="judge@test.com",
            password_hash=hash_password("password123"),
            first_name="Test",
            last_name="Judge",
            display_name="Test Judge",
            role=UserRole.JUDGE,
            status=UserStatus.ACTIVE,
        )
        db.add(judge)
        print("   ✓ Test judge created: judge@test.com / password123")

    # Test admin
    admin = db.query(User).filter_by(email="admin@test.com").first()
    if not admin:
        admin = User(
            email="admin@test.com",
            password_hash=hash_password("password123"),
            first_name="Test",
            last_name="Admin",
            display_name="Test Admin",
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE,
        )
        db.add(admin)
        print("   ✓ Test admin created: admin@test.com / password123")

    db.commit()


def init_db():
    """Create all database tables"""
    try:
        print("🔄 Initializing database...")

        # Check existing tables
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()
        print(f"   Existing tables: {existing_tables if existing_tables else 'none'}")

        # Create all tables from SQLAlchemy models
        print("   Creating tables from models...")
        Base.metadata.create_all(bind=engine)

        # Initialize default bird types
        from app.db.database import SessionLocal
        db = SessionLocal()
        try:
            create_bird_types(db)
            print("   ✓ Bird types initialized")
            create_default_scoring_configurations(db)
            print("   ✓ Scoring configurations initialized")
            create_default_configuration(db)
            print("   ✓ System configuration initialized")
            create_test_accounts(db)
            print("   ✓ Test accounts initialized")
        finally:
            db.close()

        # Verify tables were created
        inspector = inspect(engine)
        new_tables = inspector.get_table_names()
        print(f"   New tables: {new_tables}")

        print("\n✅ Database initialized successfully!")
        print("\nTables created:")
        for table in new_tables:
            print(f"  - {table}")

        print("\n📝 Test Accounts:")
        print("   Participant: participant@test.com / password123")
        print("   Judge:       judge@test.com / password123")
        print("   Admin:       admin@test.com / password123")

        print("\nYou can now start the backend:")
        print("  uvicorn app.main:app --reload --port 8000")
        return True

    except Exception as e:
        print(f"\n❌ Error initializing database:")
        print(f"   {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = init_db()
    sys.exit(0 if success else 1)
