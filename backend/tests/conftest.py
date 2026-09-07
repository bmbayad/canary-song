import pytest
from sqlalchemy import create_engine, text, event
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from app.db.database import Base
from app.core.config import settings

# Use PostgreSQL for testing
DATABASE_URL = settings.database_url

# Create engine with proper connection handling
engine = create_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,  # Test connection before using
)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def setup_teardown_db():
    """Create and clean database tables for each test"""
    # Create all tables before test
    Base.metadata.create_all(bind=engine)
    yield
    # Tables will persist but data is cleared via transactions


@pytest.fixture(scope="function")
def db_session():
    """Provide a test database session with transaction rollback"""
    # Start a new connection
    connection = engine.connect()
    transaction = connection.begin()

    # Create session with this connection
    session = TestingSessionLocal(bind=connection)

    try:
        yield session
    finally:
        session.close()
        # Rollback all changes
        transaction.rollback()
        connection.close()


@pytest.fixture
def client():
    """Provide a test client for API tests"""
    from fastapi.testclient import TestClient
    from app.main import app
    from app.db.database import get_db

    def override_get_db():
        connection = engine.connect()
        transaction = connection.begin()
        session = TestingSessionLocal(bind=connection)

        try:
            yield session
        finally:
            session.close()
            transaction.rollback()
            connection.close()

    app.dependency_overrides[get_db] = override_get_db

    # Create tables
    Base.metadata.create_all(bind=engine)

    client = TestClient(app)
    yield client

    app.dependency_overrides.clear()



