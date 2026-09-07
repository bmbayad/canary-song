import pytest
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient
from app.main import app
from app.db.database import get_db, SessionLocal, Base, engine
from app.models.user import User, UserRole, UserStatus
from app.schemas.user import UserCreate
from app.services.user_service import create_user, verify_user_password, get_user_by_email


@pytest.fixture(scope="function")
def db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
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


class TestUserCreation:
    def test_create_user(self, db: Session):
        user_create = UserCreate(email="test@example.com", password="password123")
        user = create_user(db, user_create)

        assert user.email == "test@example.com"
        assert user.role == UserRole.PARTICIPANT
        assert user.status == UserStatus.ACTIVE
        assert user.password_hash is not None
        assert user.password_hash != "password123"

    def test_create_user_with_profile_data(self, db: Session):
        user_create = UserCreate(
            email="test@example.com",
            password="password123",
            first_name="John",
            last_name="Doe",
            preferred_language="es",
        )
        user = create_user(db, user_create)

        assert user.first_name == "John"
        assert user.last_name == "Doe"
        assert user.preferred_language == "es"

    def test_verify_password(self, db: Session):
        user_create = UserCreate(email="test@example.com", password="password123")
        create_user(db, user_create)

        user = verify_user_password(db, "test@example.com", "password123")
        assert user is not None
        assert user.email == "test@example.com"

    def test_verify_password_invalid(self, db: Session):
        user_create = UserCreate(email="test@example.com", password="password123")
        create_user(db, user_create)

        user = verify_user_password(db, "test@example.com", "wrongpassword")
        assert user is None

    def test_get_user_by_email_case_insensitive(self, db: Session):
        user_create = UserCreate(email="Test@Example.com", password="password123")
        create_user(db, user_create)

        user = get_user_by_email(db, "test@example.com")
        assert user is not None
        assert user.email == "Test@Example.com"


class TestAuthentication:
    def test_register_endpoint(self, client: TestClient):
        response = client.post(
            "/auth/register",
            json={
                "email": "newuser@example.com",
                "password": "password123",
                "first_name": "Jane",
                "last_name": "Doe",
            },
        )

        assert response.status_code == 201
        data = response.json()
        assert data["access_token"]
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == "newuser@example.com"
        assert data["user"]["role"] == "Participant"
        assert data["user"]["status"] == "Active"

    def test_register_duplicate_email(self, client: TestClient):
        client.post(
            "/auth/register",
            json={"email": "test@example.com", "password": "password123"},
        )

        response = client.post(
            "/auth/register",
            json={"email": "test@example.com", "password": "password123"},
        )

        assert response.status_code == 400
        assert "already registered" in response.json()["detail"]

    def test_login_endpoint(self, client: TestClient):
        client.post(
            "/auth/register",
            json={"email": "test@example.com", "password": "password123"},
        )

        response = client.post(
            "/auth/login",
            json={"email": "test@example.com", "password": "password123"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["access_token"]
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == "test@example.com"

    def test_login_invalid_credentials(self, client: TestClient):
        client.post(
            "/auth/register",
            json={"email": "test@example.com", "password": "password123"},
        )

        response = client.post(
            "/auth/login",
            json={"email": "test@example.com", "password": "wrongpassword"},
        )

        assert response.status_code == 401
        assert "Invalid" in response.json()["detail"]

    def test_login_nonexistent_user(self, client: TestClient):
        response = client.post(
            "/auth/login",
            json={"email": "nonexistent@example.com", "password": "password123"},
        )

        assert response.status_code == 401

    def test_get_current_user(self, client: TestClient):
        register_response = client.post(
            "/auth/register",
            json={"email": "test@example.com", "password": "password123"},
        )
        token = register_response.json()["access_token"]

        response = client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "test@example.com"
        assert data["role"] == "Participant"

    def test_get_current_user_without_token(self, client: TestClient):
        response = client.get("/auth/me")
        assert response.status_code == 403

    def test_get_current_user_invalid_token(self, client: TestClient):
        response = client.get(
            "/auth/me",
            headers={"Authorization": "Bearer invalid_token"},
        )
        assert response.status_code == 401


class TestUserStatus:
    def test_inactive_user_cannot_login(self, client: TestClient, db: Session):
        user_create = UserCreate(email="test@example.com", password="password123")
        user = create_user(db, user_create)
        user.status = UserStatus.INACTIVE
        db.add(user)
        db.commit()

        response = client.post(
            "/auth/login",
            json={"email": "test@example.com", "password": "password123"},
        )

        assert response.status_code == 401

    def test_suspended_user_cannot_login(self, client: TestClient, db: Session):
        user_create = UserCreate(email="test@example.com", password="password123")
        user = create_user(db, user_create)
        user.status = UserStatus.SUSPENDED
        db.add(user)
        db.commit()

        response = client.post(
            "/auth/login",
            json={"email": "test@example.com", "password": "password123"},
        )

        assert response.status_code == 401


class TestUserRole:
    def test_self_registration_creates_participant(self, client: TestClient):
        response = client.post(
            "/auth/register",
            json={"email": "test@example.com", "password": "password123"},
        )

        data = response.json()
        assert data["user"]["role"] == "Participant"

    def test_cannot_select_judge_role_on_registration(self, client: TestClient, db: Session):
        response = client.post(
            "/auth/register",
            json={
                "email": "test@example.com",
                "password": "password123",
            },
        )

        user_data = response.json()["user"]
        assert user_data["role"] != "Judge"
        assert user_data["role"] == "Participant"

    def test_cannot_select_admin_role_on_registration(self, client: TestClient, db: Session):
        response = client.post(
            "/auth/register",
            json={
                "email": "test@example.com",
                "password": "password123",
            },
        )

        user_data = response.json()["user"]
        assert user_data["role"] != "Admin"
        assert user_data["role"] == "Participant"


class TestProfileEndpoint:
    def test_get_profile(self, client: TestClient):
        register_response = client.post(
            "/auth/register",
            json={
                "email": "test@example.com",
                "password": "password123",
                "first_name": "John",
            },
        )
        token = register_response.json()["access_token"]

        response = client.get(
            "/profile/me",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "test@example.com"
        assert data["first_name"] == "John"

    def test_update_profile(self, client: TestClient):
        register_response = client.post(
            "/auth/register",
            json={"email": "test@example.com", "password": "password123"},
        )
        token = register_response.json()["access_token"]

        response = client.put(
            "/profile/me",
            json={
                "first_name": "Jane",
                "last_name": "Doe",
                "preferred_language": "es",
            },
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["first_name"] == "Jane"
        assert data["last_name"] == "Doe"
        assert data["preferred_language"] == "es"

    def test_update_profile_without_auth(self, client: TestClient):
        response = client.put(
            "/profile/me",
            json={"first_name": "Jane"},
        )

        assert response.status_code == 403


class TestHealthCheck:
    def test_health_check(self, client: TestClient):
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"
