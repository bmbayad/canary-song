import pytest
from uuid import uuid4
from sqlalchemy.orm import Session

from app.models.user import User, UserRole, UserStatus
from app.models.bird import Bird, BirdType, BirdStatus
from app.models.recording import Recording, RecordingStatus
from app.models.evaluation import Evaluation, EvaluationStatus, ScoringConfiguration, ScoringCategory
from app.services.recording_service import create_recording_presigned_url, confirm_recording_upload
from app.services.evaluation_service import (
    get_judge_queue,
    start_evaluation,
    submit_evaluation,
    mark_unable_to_evaluate,
    get_evaluation_by_id,
)
from app.services.scoring_service import create_default_scoring_configurations, get_active_categories
from app.services.bird_service import create_bird_types
from datetime import datetime, timedelta


@pytest.fixture
def setup_evaluation_test(db_session: Session):
    """Setup test data for evaluation tests"""
    create_bird_types(db_session)
    create_default_scoring_configurations(db_session)

    # Create participant
    participant = User(
        email="participant@test.com",
        password_hash="hashed",
        first_name="John",
        last_name="Participant",
        display_name="John",
        role=UserRole.PARTICIPANT,
        status=UserStatus.ACTIVE,
    )
    db_session.add(participant)
    db_session.commit()
    db_session.refresh(participant)

    # Create judge
    judge = User(
        email="judge@test.com",
        password_hash="hashed",
        first_name="Jane",
        last_name="Judge",
        display_name="Jane",
        role=UserRole.JUDGE,
        status=UserStatus.ACTIVE,
    )
    db_session.add(judge)
    db_session.commit()
    db_session.refresh(judge)

    # Create bird type and bird
    bird_type = db_session.query(BirdType).filter_by(name="Canary – Waterslager").first()
    bird = Bird(
        owner_id=participant.id,
        name="Test Bird",
        leg_band_number="2024-001",
        bird_type_id=bird_type.id,
        status=BirdStatus.ACTIVE,
    )
    db_session.add(bird)
    db_session.commit()
    db_session.refresh(bird)

    # Create recording
    recording = Recording(
        bird_id=bird.id,
        bird_type_id=bird_type.id,
        media_type="MP4",
        storage_key="recordings/test-001.mp4",
        original_filename="test.mp4",
        file_size=10 * 1024 * 1024,
        duration=60,
        uploaded_at=datetime.utcnow(),
        expires_at=datetime.utcnow() + timedelta(days=14),
        status=RecordingStatus.COMPLETED,
    )
    db_session.add(recording)
    db_session.commit()
    db_session.refresh(recording)

    return {
        "participant": participant,
        "judge": judge,
        "bird": bird,
        "bird_type": bird_type,
        "recording": recording,
    }


class TestJudgeQueue:
    def test_judge_can_see_available_recordings(
        self, setup_evaluation_test, db_session: Session
    ):
        """Test judge can see available recordings in queue"""
        judge = setup_evaluation_test["judge"]
        recording = setup_evaluation_test["recording"]

        queue = get_judge_queue(db_session, judge.id)

        assert len(queue) == 1
        assert queue[0].id == recording.id

    def test_judge_cannot_see_already_evaluated_recording(
        self, setup_evaluation_test, db_session: Session
    ):
        """Test judge cannot see recording they already evaluated"""
        judge = setup_evaluation_test["judge"]
        recording = setup_evaluation_test["recording"]

        # Create evaluation
        scoring_config = db_session.query(ScoringConfiguration).filter_by(
            bird_type_id=recording.bird_type_id
        ).first()

        evaluation = Evaluation(
            recording_id=recording.id,
            judge_id=judge.id,
            scoring_configuration_id=scoring_config.id,
            status=EvaluationStatus.SUBMITTED,
        )
        db_session.add(evaluation)
        db_session.commit()

        queue = get_judge_queue(db_session, judge.id)
        assert len(queue) == 0


class TestStartEvaluation:
    def test_start_evaluation_success(self, setup_evaluation_test, db_session: Session):
        """Test starting an evaluation"""
        judge = setup_evaluation_test["judge"]
        recording = setup_evaluation_test["recording"]

        evaluation = start_evaluation(db_session, judge.id, recording.id)

        assert evaluation.recording_id == recording.id
        assert evaluation.judge_id == judge.id
        assert evaluation.status == EvaluationStatus.IN_PROGRESS
        assert evaluation.scoring_configuration_id is not None

    def test_start_evaluation_duplicate_prevention(
        self, setup_evaluation_test, db_session: Session
    ):
        """Test cannot start duplicate evaluation"""
        judge = setup_evaluation_test["judge"]
        recording = setup_evaluation_test["recording"]

        start_evaluation(db_session, judge.id, recording.id)

        with pytest.raises(Exception, match="already evaluated"):
            start_evaluation(db_session, judge.id, recording.id)

    def test_start_evaluation_inactive_judge(
        self, setup_evaluation_test, db_session: Session
    ):
        """Test inactive judge cannot start evaluation"""
        judge = setup_evaluation_test["judge"]
        recording = setup_evaluation_test["recording"]

        judge.status = UserStatus.INACTIVE
        db_session.commit()

        with pytest.raises(Exception, match="not authorized"):
            start_evaluation(db_session, judge.id, recording.id)


class TestSubmitEvaluation:
    def test_submit_evaluation_success(self, setup_evaluation_test, db_session: Session):
        """Test submitting an evaluation with scores"""
        judge = setup_evaluation_test["judge"]
        recording = setup_evaluation_test["recording"]

        evaluation = start_evaluation(db_session, judge.id, recording.id)

        categories = get_active_categories(db_session, evaluation.scoring_configuration_id)

        scores = {str(cat.id): 8 for cat in categories}

        submitted = submit_evaluation(db_session, judge.id, evaluation.id, scores)

        assert submitted.status == EvaluationStatus.SUBMITTED
        assert submitted.total_score == 8 * len(categories)
        assert submitted.submitted_at is not None

    def test_submit_evaluation_score_out_of_range(
        self, setup_evaluation_test, db_session: Session
    ):
        """Test score validation"""
        judge = setup_evaluation_test["judge"]
        recording = setup_evaluation_test["recording"]

        evaluation = start_evaluation(db_session, judge.id, recording.id)
        categories = get_active_categories(db_session, evaluation.scoring_configuration_id)

        scores = {}
        for i, cat in enumerate(categories):
            if i == 0:
                scores[str(cat.id)] = 99  # Out of range
            else:
                scores[str(cat.id)] = 8

        with pytest.raises(Exception, match="out of range"):
            submit_evaluation(db_session, judge.id, evaluation.id, scores)

    def test_submit_evaluation_missing_score(
        self, setup_evaluation_test, db_session: Session
    ):
        """Test all categories must have scores"""
        judge = setup_evaluation_test["judge"]
        recording = setup_evaluation_test["recording"]

        evaluation = start_evaluation(db_session, judge.id, recording.id)

        scores = {}  # Empty scores

        with pytest.raises(Exception, match="Missing score"):
            submit_evaluation(db_session, judge.id, evaluation.id, scores)


class TestUnableToEvaluate:
    def test_mark_unable_to_evaluate(self, setup_evaluation_test, db_session: Session):
        """Test marking recording as unable to evaluate"""
        judge = setup_evaluation_test["judge"]
        recording = setup_evaluation_test["recording"]

        evaluation = start_evaluation(db_session, judge.id, recording.id)

        marked = mark_unable_to_evaluate(
            db_session,
            judge.id,
            evaluation.id,
            "Recording quality too poor"
        )

        assert marked.status == EvaluationStatus.UNABLE_TO_EVALUATE
        assert marked.unable_to_evaluate_reason == "Recording quality too poor"
        assert marked.submitted_at is not None


class TestHistoricalSnapshot:
    def test_evaluation_preserves_scoring_category_snapshot(
        self, setup_evaluation_test, db_session: Session
    ):
        """Test evaluation snapshots scoring configuration"""
        judge = setup_evaluation_test["judge"]
        recording = setup_evaluation_test["recording"]

        evaluation = start_evaluation(db_session, judge.id, recording.id)
        categories = get_active_categories(db_session, evaluation.scoring_configuration_id)

        scores = {str(cat.id): 8 for cat in categories}
        submitted = submit_evaluation(db_session, judge.id, evaluation.id, scores)

        db_session.refresh(submitted)
        eval_scores = submitted.scores

        for eval_score in eval_scores:
            assert eval_score.category_name_snapshot is not None
            assert eval_score.minimum_points_snapshot is not None
            assert eval_score.maximum_points_snapshot is not None
            assert eval_score.score == 8


class TestBlindJudging:
    def test_blind_judging_prevents_duplicate_judges_seeing_each_other(
        self, setup_evaluation_test, db_session: Session
    ):
        """Test blind judging - judges cannot see other judges' results before submitting"""
        participant = setup_evaluation_test["participant"]
        judge1_user = setup_evaluation_test["judge"]
        bird_type = setup_evaluation_test["bird_type"]
        recording = setup_evaluation_test["recording"]

        # Create second judge
        judge2_user = User(
            email="judge2@test.com",
            password_hash="hashed",
            first_name="Bob",
            last_name="Judge2",
            display_name="Bob",
            role=UserRole.JUDGE,
            status=UserStatus.ACTIVE,
        )
        db_session.add(judge2_user)
        db_session.commit()
        db_session.refresh(judge2_user)

        # Judge 1 evaluates and submits
        eval1 = start_evaluation(db_session, judge1_user.id, recording.id)
        scoring_config = eval1.scoring_configuration
        categories = get_active_categories(db_session, scoring_config.id)
        scores1 = {str(cat.id): 7 for cat in categories}
        submit_evaluation(db_session, judge1_user.id, eval1.id, scores1, "Good recording")

        # Judge 2 starts evaluating
        eval2 = start_evaluation(db_session, judge2_user.id, recording.id)

        # Judge 2 should not see Judge 1's evaluation yet (before submitting)
        from app.services.evaluation_service import get_recording_evaluations
        other_evals = get_recording_evaluations(db_session, recording.id, judge2_user.id, include_submitted_only=True)

        # Should only see their own in progress evaluation
        assert len(other_evals) == 1
        assert other_evals[0].judge_id == judge2_user.id
