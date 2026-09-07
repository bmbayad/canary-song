import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.main import app
from app.db.database import get_db, SessionLocal, Base, engine
from app.models.user import User, UserRole, UserStatus
from app.models.bird import Bird, BirdType
from app.schemas.user import UserCreate
from app.services.user_service import create_user
from app.services.bird_service import create_bird, create_bird_types
from app.schemas.bird import BirdCreate
import uuid


@pytest.fixture(scope="function")
def db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Create default bird types
    create_bird_types(db)

    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client(db):
    def override_get_db():
        return db

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


@pytest.fixture
def participant_user(db):
    """Create a test participant user"""
    user_create = UserCreate(email="participant@example.com", password="password123")
    return create_user(db, user_create)


@pytest.fixture
def participant_token(client, participant_user):
    """Get auth token for participant"""
    response = client.post(
        "/auth/login",
        json={"email": "participant@example.com", "password": "password123"},
    )
    return response.json()["access_token"]


class TestBirdTypes:
    def test_get_bird_types(self, client):
        response = client.get("/birds/types")
        assert response.status_code == 200
        types = response.json()
        assert len(types) == 3
        type_names = [t["name"] for t in types]
        assert "Canary – Waterslager" in type_names
        assert "Canary – Roller" in type_names
        assert "Canary – American Singer" in type_names


class TestBirdCreation:
    def test_create_bird(self, client, participant_token, db):
        # Get bird types
        bird_types = db.query(BirdType).all()
        bird_type_id = bird_types[0].id

        response = client.post(
            "/birds",
            json={
                "name": "Sunny",
                "leg_band_number": "2024-001",
                "bird_type_id": str(bird_type_id),
                "sex": "Male",
                "notes": "Great singer",
            },
            headers={"Authorization": f"Bearer {participant_token}"},
        )

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Sunny"
        assert data["leg_band_number"] == "2024-001"
        assert data["status"] == "Active"
        assert data["bird_type_id"] == str(bird_type_id)

    def test_create_bird_without_auth(self, client, db):
        bird_types = db.query(BirdType).all()
        bird_type_id = bird_types[0].id

        response = client.post(
            "/birds",
            json={
                "name": "Sunny",
                "leg_band_number": "2024-001",
                "bird_type_id": str(bird_type_id),
            },
        )

        assert response.status_code == 403

    def test_create_bird_with_each_type(self, client, participant_token, db):
        bird_types = db.query(BirdType).all()

        for idx, bird_type in enumerate(bird_types):
            response = client.post(
                "/birds",
                json={
                    "name": f"Bird {idx}",
                    "leg_band_number": f"2024-{idx:03d}",
                    "bird_type_id": str(bird_type.id),
                },
                headers={"Authorization": f"Bearer {participant_token}"},
            )
            assert response.status_code == 201
            data = response.json()
            assert data["bird_type_id"] == str(bird_type.id)

    def test_create_bird_invalid_type(self, client, participant_token):
        response = client.post(
            "/birds",
            json={
                "name": "Invalid",
                "leg_band_number": "2024-001",
                "bird_type_id": str(uuid.uuid4()),
            },
            headers={"Authorization": f"Bearer {participant_token}"},
        )

        assert response.status_code == 400
        assert "Invalid bird type" in response.json()["detail"]


class TestBirdImmutability:
    def test_bird_identity_immutable(self, client, participant_token, db):
        # Create bird
        bird_types = db.query(BirdType).all()
        create_response = client.post(
            "/birds",
            json={
                "name": "Original",
                "leg_band_number": "2024-001",
                "bird_type_id": str(bird_types[0].id),
            },
            headers={"Authorization": f"Bearer {participant_token}"},
        )
        bird_id = create_response.json()["id"]

        # Try to update name
        update_response = client.put(
            f"/birds/{bird_id}",
            json={"name": "Updated"},
            headers={"Authorization": f"Bearer {participant_token}"},
        )

        # Should succeed (updating only allowed fields)
        assert update_response.status_code == 200
        data = update_response.json()
        # Name is immutable - shouldn't change
        assert data["name"] == "Original"

    def test_update_allowed_fields(self, client, participant_token, db):
        # Create bird
        bird_types = db.query(BirdType).all()
        create_response = client.post(
            "/birds",
            json={
                "name": "Sunny",
                "leg_band_number": "2024-001",
                "bird_type_id": str(bird_types[0].id),
                "sex": "Male",
            },
            headers={"Authorization": f"Bearer {participant_token}"},
        )
        bird_id = create_response.json()["id"]

        # Update allowed fields
        update_response = client.put(
            f"/birds/{bird_id}",
            json={"notes": "Updated notes", "sex": "Female"},
            headers={"Authorization": f"Bearer {participant_token}"},
        )

        assert update_response.status_code == 200
        data = update_response.json()
        assert data["notes"] == "Updated notes"
        assert data["sex"] == "Female"


class TestDuplicateLegBand:
    def test_duplicate_leg_band_same_owner(self, client, participant_token, db):
        bird_types = db.query(BirdType).all()

        # Create first bird
        response1 = client.post(
            "/birds",
            json={
                "name": "Bird 1",
                "leg_band_number": "2024-001",
                "bird_type_id": str(bird_types[0].id),
            },
            headers={"Authorization": f"Bearer {participant_token}"},
        )
        assert response1.status_code == 201

        # Try to create second bird with same leg band
        response2 = client.post(
            "/birds",
            json={
                "name": "Bird 2",
                "leg_band_number": "2024-001",
                "bird_type_id": str(bird_types[1].id),
            },
            headers={"Authorization": f"Bearer {participant_token}"},
        )

        assert response2.status_code == 400
        assert "already exists" in response2.json()["detail"]

    def test_same_leg_band_different_owners(self, client, db):
        # Create two users
        user1 = create_user(db, UserCreate(email="user1@example.com", password="pass123"))
        user2 = create_user(db, UserCreate(email="user2@example.com", password="pass123"))

        # Login both users
        token1_resp = client.post(
            "/auth/login",
            json={"email": "user1@example.com", "password": "pass123"},
        )
        token1 = token1_resp.json()["access_token"]

        token2_resp = client.post(
            "/auth/login",
            json={"email": "user2@example.com", "password": "pass123"},
        )
        token2 = token2_resp.json()["access_token"]

        bird_types = db.query(BirdType).all()

        # User 1 creates bird
        response1 = client.post(
            "/birds",
            json={
                "name": "User1 Bird",
                "leg_band_number": "2024-001",
                "bird_type_id": str(bird_types[0].id),
            },
            headers={"Authorization": f"Bearer {token1}"},
        )
        assert response1.status_code == 201

        # User 2 can use same leg band
        response2 = client.post(
            "/birds",
            json={
                "name": "User2 Bird",
                "leg_band_number": "2024-001",
                "bird_type_id": str(bird_types[0].id),
            },
            headers={"Authorization": f"Bearer {token2}"},
        )
        assert response2.status_code == 201


class TestBirdArchival:
    def test_archive_bird(self, client, participant_token, db):
        bird_types = db.query(BirdType).all()

        # Create bird
        create_response = client.post(
            "/birds",
            json={
                "name": "To Archive",
                "leg_band_number": "2024-001",
                "bird_type_id": str(bird_types[0].id),
            },
            headers={"Authorization": f"Bearer {participant_token}"},
        )
        bird_id = create_response.json()["id"]

        # Archive it
        archive_response = client.post(
            f"/birds/{bird_id}/archive",
            headers={"Authorization": f"Bearer {participant_token}"},
        )

        assert archive_response.status_code == 200
        data = archive_response.json()
        assert data["status"] == "Archived"

    def test_archive_already_archived(self, client, participant_token, db):
        bird_types = db.query(BirdType).all()

        # Create and archive bird
        create_response = client.post(
            "/birds",
            json={
                "name": "To Archive",
                "leg_band_number": "2024-001",
                "bird_type_id": str(bird_types[0].id),
            },
            headers={"Authorization": f"Bearer {participant_token}"},
        )
        bird_id = create_response.json()["id"]

        client.post(
            f"/birds/{bird_id}/archive",
            headers={"Authorization": f"Bearer {participant_token}"},
        )

        # Try to archive again
        response = client.post(
            f"/birds/{bird_id}/archive",
            headers={"Authorization": f"Bearer {participant_token}"},
        )

        assert response.status_code == 400


class TestBirdOwnership:
    def test_cannot_access_other_users_bird(self, client, db):
        user1 = create_user(db, UserCreate(email="user1@example.com", password="pass123"))
        user2 = create_user(db, UserCreate(email="user2@example.com", password="pass123"))

        token1_resp = client.post(
            "/auth/login",
            json={"email": "user1@example.com", "password": "pass123"},
        )
        token1 = token1_resp.json()["access_token"]

        token2_resp = client.post(
            "/auth/login",
            json={"email": "user2@example.com", "password": "pass123"},
        )
        token2 = token2_resp.json()["access_token"]

        bird_types = db.query(BirdType).all()

        # User 1 creates bird
        create_response = client.post(
            "/birds",
            json={
                "name": "User1 Bird",
                "leg_band_number": "2024-001",
                "bird_type_id": str(bird_types[0].id),
            },
            headers={"Authorization": f"Bearer {token1}"},
        )
        bird_id = create_response.json()["id"]

        # User 2 tries to access it
        response = client.get(
            f"/birds/{bird_id}",
            headers={"Authorization": f"Bearer {token2}"},
        )

        assert response.status_code == 404


class TestListBirds:
    def test_list_user_birds(self, client, participant_token, db):
        bird_types = db.query(BirdType).all()

        # Create 3 birds
        for i in range(3):
            client.post(
                "/birds",
                json={
                    "name": f"Bird {i}",
                    "leg_band_number": f"2024-{i:03d}",
                    "bird_type_id": str(bird_types[0].id),
                },
                headers={"Authorization": f"Bearer {participant_token}"},
            )

        # List birds
        response = client.get(
            "/birds",
            headers={"Authorization": f"Bearer {participant_token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3
