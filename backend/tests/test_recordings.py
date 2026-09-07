import pytest
from uuid import uuid4
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.models.user import User, UserRole, UserStatus
from app.models.bird import Bird, BirdType, BirdStatus
from app.models.recording import Recording, RecordingStatus
from app.schemas.recording import GenerateUploadUrlRequest, ConfirmUploadRequest
from app.services.recording_service import (
    create_recording_presigned_url,
    confirm_recording_upload,
    get_user_recordings,
    get_recording_by_id,
)
from app.services.bird_service import create_bird_types


@pytest.fixture
def setup_recording_test(db_session: Session):
    """Setup test data for recording tests"""
    create_bird_types(db_session)

    user = User(
        email="participant@test.com",
        password_hash="hashed",
        first_name="John",
        last_name="Doe",
        display_name="John",
        role=UserRole.PARTICIPANT,
        status=UserStatus.ACTIVE,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    bird_type = db_session.query(BirdType).filter_by(name="Canary – Waterslager").first()

    bird = Bird(
        owner_id=user.id,
        name="Test Bird",
        leg_band_number="2024-001",
        bird_type_id=bird_type.id,
        sex="Male",
        status=BirdStatus.ACTIVE,
    )
    db_session.add(bird)
    db_session.commit()
    db_session.refresh(bird)

    return {"user": user, "bird": bird, "bird_type": bird_type}


class TestRecordingPresignedUrl:
    def test_generate_presigned_url_success(
        self, setup_recording_test, db_session: Session
    ):
        """Test successful presigned URL generation"""
        user = setup_recording_test["user"]
        bird = setup_recording_test["bird"]

        request = GenerateUploadUrlRequest(
            bird_id=bird.id,
            filename="test-recording.mp4",
            file_size=50 * 1024 * 1024,
        )

        result = create_recording_presigned_url(db_session, user.id, request)

        assert "upload_url" in result
        assert "recording_id" in result
        assert "storage_key" in result
        assert result["storage_key"].endswith(".mp4")

        recording = db_session.query(Recording).filter_by(id=result["recording_id"]).first()
        assert recording is not None
        assert recording.bird_id == bird.id
        assert recording.bird_type_id == bird.bird_type_id
        assert recording.status == RecordingStatus.PENDING

    def test_generate_presigned_url_file_size_exceeds_limit(
        self, setup_recording_test, db_session: Session
    ):
        """Test file size validation"""
        user = setup_recording_test["user"]
        bird = setup_recording_test["bird"]

        request = GenerateUploadUrlRequest(
            bird_id=bird.id,
            filename="too-large.mp4",
            file_size=600 * 1024 * 1024,
        )

        with pytest.raises(Exception, match="File size exceeds maximum"):
            create_recording_presigned_url(db_session, user.id, request)

    def test_generate_presigned_url_bird_not_found(
        self, setup_recording_test, db_session: Session
    ):
        """Test with nonexistent bird"""
        user = setup_recording_test["user"]

        request = GenerateUploadUrlRequest(
            bird_id=uuid4(),
            filename="test.mp4",
            file_size=50 * 1024 * 1024,
        )

        with pytest.raises(Exception, match="Bird not found"):
            create_recording_presigned_url(db_session, user.id, request)

    def test_generate_presigned_url_bird_ownership_validation(
        self, setup_recording_test, db_session: Session
    ):
        """Test bird ownership validation"""
        user = setup_recording_test["user"]
        bird = setup_recording_test["bird"]

        other_user = User(
            email="other@test.com",
            password_hash="hashed",
            first_name="Other",
            last_name="User",
            display_name="Other",
            role=UserRole.PARTICIPANT,
            status=UserStatus.ACTIVE,
        )
        db_session.add(other_user)
        db_session.commit()
        db_session.refresh(other_user)

        request = GenerateUploadUrlRequest(
            bird_id=bird.id,
            filename="test.mp4",
            file_size=50 * 1024 * 1024,
        )

        with pytest.raises(Exception, match="Bird ownership validation failed"):
            create_recording_presigned_url(db_session, other_user.id, request)

    def test_generate_presigned_url_archived_bird(
        self, setup_recording_test, db_session: Session
    ):
        """Test cannot upload to archived bird"""
        user = setup_recording_test["user"]
        bird = setup_recording_test["bird"]

        bird.status = BirdStatus.ARCHIVED
        db_session.commit()

        request = GenerateUploadUrlRequest(
            bird_id=bird.id,
            filename="test.mp4",
            file_size=50 * 1024 * 1024,
        )

        with pytest.raises(Exception, match="Cannot upload recording to archived bird"):
            create_recording_presigned_url(db_session, user.id, request)


class TestConfirmRecordingUpload:
    def test_confirm_upload_success(self, setup_recording_test, db_session: Session):
        """Test successful upload confirmation"""
        user = setup_recording_test["user"]
        bird = setup_recording_test["bird"]

        request = GenerateUploadUrlRequest(
            bird_id=bird.id,
            filename="test.mp4",
            file_size=50 * 1024 * 1024,
        )

        upload_result = create_recording_presigned_url(db_session, user.id, request)
        recording_id = upload_result["recording_id"]

        confirm_request = ConfirmUploadRequest(
            recording_id=recording_id,
            file_size=50 * 1024 * 1024,
            duration=180,
        )

        recording = confirm_recording_upload(db_session, user.id, confirm_request)

        assert recording.file_size == 50 * 1024 * 1024
        assert recording.duration == 180
        assert recording.status == RecordingStatus.COMPLETED

    def test_confirm_upload_duration_exceeds_limit(
        self, setup_recording_test, db_session: Session
    ):
        """Test duration validation"""
        user = setup_recording_test["user"]
        bird = setup_recording_test["bird"]

        request = GenerateUploadUrlRequest(
            bird_id=bird.id,
            filename="test.mp4",
            file_size=50 * 1024 * 1024,
        )

        upload_result = create_recording_presigned_url(db_session, user.id, request)
        recording_id = upload_result["recording_id"]

        confirm_request = ConfirmUploadRequest(
            recording_id=recording_id,
            file_size=50 * 1024 * 1024,
            duration=600,
        )

        with pytest.raises(Exception, match="Recording duration exceeds maximum"):
            confirm_recording_upload(db_session, user.id, confirm_request)

    def test_confirm_upload_zero_duration(self, setup_recording_test, db_session: Session):
        """Test cannot have zero duration"""
        user = setup_recording_test["user"]
        bird = setup_recording_test["bird"]

        request = GenerateUploadUrlRequest(
            bird_id=bird.id,
            filename="test.mp4",
            file_size=50 * 1024 * 1024,
        )

        upload_result = create_recording_presigned_url(db_session, user.id, request)
        recording_id = upload_result["recording_id"]

        confirm_request = ConfirmUploadRequest(
            recording_id=recording_id,
            file_size=50 * 1024 * 1024,
            duration=0,
        )

        with pytest.raises(Exception, match="Recording duration must be greater than 0"):
            confirm_recording_upload(db_session, user.id, confirm_request)


class TestRecordingRetrieval:
    def test_get_user_recordings(self, setup_recording_test, db_session: Session):
        """Test retrieving all user recordings"""
        user = setup_recording_test["user"]
        bird = setup_recording_test["bird"]

        request1 = GenerateUploadUrlRequest(
            bird_id=bird.id,
            filename="recording1.mp4",
            file_size=50 * 1024 * 1024,
        )
        request2 = GenerateUploadUrlRequest(
            bird_id=bird.id,
            filename="recording2.mp4",
            file_size=50 * 1024 * 1024,
        )

        result1 = create_recording_presigned_url(db_session, user.id, request1)
        result2 = create_recording_presigned_url(db_session, user.id, request2)

        recordings = get_user_recordings(db_session, user.id)

        assert len(recordings) == 2

    def test_get_recording_by_id(self, setup_recording_test, db_session: Session):
        """Test retrieving specific recording"""
        user = setup_recording_test["user"]
        bird = setup_recording_test["bird"]

        request = GenerateUploadUrlRequest(
            bird_id=bird.id,
            filename="test.mp4",
            file_size=50 * 1024 * 1024,
        )

        result = create_recording_presigned_url(db_session, user.id, request)
        recording_id = result["recording_id"]

        recording = get_recording_by_id(db_session, recording_id, user.id)

        assert recording is not None
        assert recording.id == recording_id

    def test_get_recording_ownership_validation(
        self, setup_recording_test, db_session: Session
    ):
        """Test cannot access other user's recording"""
        user = setup_recording_test["user"]
        bird = setup_recording_test["bird"]

        other_user = User(
            email="other@test.com",
            password_hash="hashed",
            first_name="Other",
            last_name="User",
            display_name="Other",
            role=UserRole.PARTICIPANT,
            status=UserStatus.ACTIVE,
        )
        db_session.add(other_user)
        db_session.commit()
        db_session.refresh(other_user)

        request = GenerateUploadUrlRequest(
            bird_id=bird.id,
            filename="test.mp4",
            file_size=50 * 1024 * 1024,
        )

        result = create_recording_presigned_url(db_session, user.id, request)
        recording_id = result["recording_id"]

        recording = get_recording_by_id(db_session, recording_id, other_user.id)

        assert recording is None


class TestRecordingInvariants:
    def test_recording_bird_type_matches_bird(
        self, setup_recording_test, db_session: Session
    ):
        """Test recording bird type must match bird's bird type"""
        user = setup_recording_test["user"]
        bird = setup_recording_test["bird"]

        request = GenerateUploadUrlRequest(
            bird_id=bird.id,
            filename="test.mp4",
            file_size=50 * 1024 * 1024,
        )

        result = create_recording_presigned_url(db_session, user.id, request)
        recording = db_session.query(Recording).filter_by(id=result["recording_id"]).first()

        assert recording.bird_type_id == bird.bird_type_id

    def test_recording_expiration_default(self, setup_recording_test, db_session: Session):
        """Test recording default expiration is 14 days"""
        user = setup_recording_test["user"]
        bird = setup_recording_test["bird"]

        request = GenerateUploadUrlRequest(
            bird_id=bird.id,
            filename="test.mp4",
            file_size=50 * 1024 * 1024,
        )

        result = create_recording_presigned_url(db_session, user.id, request)
        recording = db_session.query(Recording).filter_by(id=result["recording_id"]).first()

        expected_expiration = datetime.utcnow() + timedelta(days=14)
        assert (recording.expires_at - expected_expiration).total_seconds() < 5
