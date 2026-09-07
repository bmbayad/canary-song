from sqlalchemy.orm import Session
from sqlalchemy import and_
from uuid import UUID
from datetime import datetime

from app.models.recording import Recording, RecordingStatus
from app.models.evaluation import Evaluation, EvaluationStatus, EvaluationScore
from app.models.user import User, UserRole, UserStatus
from app.services.scoring_service import get_scoring_configuration_for_bird_type, get_active_categories


def get_judge_queue(db: Session, judge_id: UUID) -> list:
    """
    Get available recordings for judge.
    Blind judging: don't return evaluations from other judges.
    """
    recordings = (
        db.query(Recording)
        .filter(
            Recording.status == RecordingStatus.COMPLETED,
            Recording.expires_at > datetime.utcnow(),
        )
        .all()
    )

    available = []
    for recording in recordings:
        existing_eval = (
            db.query(Evaluation)
            .filter(
                and_(
                    Evaluation.recording_id == recording.id,
                    Evaluation.judge_id == judge_id
                )
            )
            .first()
        )

        if not existing_eval:
            available.append(recording)

    return available


def start_evaluation(
    db: Session, judge_id: UUID, recording_id: UUID
) -> Evaluation:
    """
    Start an evaluation for a recording.
    Checks for duplicate evaluations and initializes scoring configuration.
    """
    judge = db.query(User).filter(User.id == judge_id).first()
    if not judge or judge.role != UserRole.JUDGE or judge.status != UserStatus.ACTIVE:
        raise Exception("Judge not authorized")

    recording = db.query(Recording).filter(Recording.id == recording_id).first()
    if not recording:
        raise Exception("Recording not found")

    existing = (
        db.query(Evaluation)
        .filter(
            and_(
                Evaluation.recording_id == recording_id,
                Evaluation.judge_id == judge_id
            )
        )
        .first()
    )

    if existing:
        raise Exception("Judge has already evaluated this recording")

    scoring_config = get_scoring_configuration_for_bird_type(
        db, recording.bird_type_id
    )
    if not scoring_config:
        raise Exception("No scoring configuration found for this bird type")

    evaluation = Evaluation(
        recording_id=recording_id,
        judge_id=judge_id,
        scoring_configuration_id=scoring_config.id,
        status=EvaluationStatus.IN_PROGRESS,
        started_at=datetime.utcnow(),
    )

    db.add(evaluation)
    db.commit()
    db.refresh(evaluation)
    return evaluation


def submit_evaluation(
    db: Session,
    judge_id: UUID,
    evaluation_id: UUID,
    scores: dict,
    comments: str = None,
) -> Evaluation:
    """
    Submit an evaluation with scores.
    Creates historical snapshots of scoring categories.
    """
    evaluation = db.query(Evaluation).filter(Evaluation.id == evaluation_id).first()
    if not evaluation:
        raise Exception("Evaluation not found")

    if evaluation.judge_id != judge_id:
        raise Exception("Only the evaluating judge can submit")

    if evaluation.status != EvaluationStatus.IN_PROGRESS:
        raise Exception("Evaluation is not in progress")

    categories = get_active_categories(db, evaluation.scoring_configuration_id)
    total_score = 0

    for category in categories:
        if str(category.id) not in scores:
            raise Exception(f"Missing score for category {category.name}")

        score_value = int(scores[str(category.id)])
        if score_value < category.minimum_points or score_value > category.maximum_points:
            raise Exception(
                f"Score for {category.name} out of range "
                f"({category.minimum_points}-{category.maximum_points})"
            )

        eval_score = EvaluationScore(
            evaluation_id=evaluation_id,
            category_id=category.id,
            category_name_snapshot=category.name,
            minimum_points_snapshot=category.minimum_points,
            maximum_points_snapshot=category.maximum_points,
            score=score_value,
        )
        db.add(eval_score)
        total_score += score_value

    evaluation.total_score = total_score
    evaluation.comments = comments
    evaluation.status = EvaluationStatus.SUBMITTED
    evaluation.submitted_at = datetime.utcnow()

    db.commit()
    db.refresh(evaluation)
    return evaluation


def mark_unable_to_evaluate(
    db: Session, judge_id: UUID, evaluation_id: UUID, reason: str
) -> Evaluation:
    """Mark an evaluation as unable to evaluate with a reason."""
    evaluation = db.query(Evaluation).filter(Evaluation.id == evaluation_id).first()
    if not evaluation:
        raise Exception("Evaluation not found")

    if evaluation.judge_id != judge_id:
        raise Exception("Only the evaluating judge can mark as unable to evaluate")

    if evaluation.status != EvaluationStatus.IN_PROGRESS:
        raise Exception("Evaluation is not in progress")

    evaluation.status = EvaluationStatus.UNABLE_TO_EVALUATE
    evaluation.unable_to_evaluate_reason = reason
    evaluation.submitted_at = datetime.utcnow()

    db.commit()
    db.refresh(evaluation)
    return evaluation


def get_evaluation_by_id(db: Session, evaluation_id: UUID, judge_id: UUID) -> Evaluation:
    """Get evaluation (only if judge owns it)"""
    return (
        db.query(Evaluation)
        .filter(
            and_(
                Evaluation.id == evaluation_id,
                Evaluation.judge_id == judge_id
            )
        )
        .first()
    )


def get_judge_evaluations(db: Session, judge_id: UUID) -> list:
    """Get all evaluations for a judge"""
    return (
        db.query(Evaluation)
        .filter(Evaluation.judge_id == judge_id)
        .order_by(Evaluation.started_at.desc())
        .all()
    )


def get_recording_evaluations(
    db: Session, recording_id: UUID, judge_id: UUID = None, include_submitted_only: bool = False
) -> list:
    """
    Get evaluations for a recording.
    Blind judging: if judge_id provided, don't return other judges' evaluations unless submitted.
    """
    query = db.query(Evaluation).filter(Evaluation.recording_id == recording_id)

    if judge_id:
        if include_submitted_only:
            query = query.filter(
                (Evaluation.judge_id == judge_id) |
                (Evaluation.status == EvaluationStatus.SUBMITTED)
            )
        else:
            query = query.filter(Evaluation.judge_id == judge_id)

    return query.all()


def get_recording_evaluation_status(db: Session, recording_id: UUID) -> dict:
    """
    Get evaluation status summary for a recording.
    Returns: pending count, in_progress count, completed count, unable_to_evaluate count
    """
    evaluations = db.query(Evaluation).filter(Evaluation.recording_id == recording_id).all()

    status_counts = {
        EvaluationStatus.SUBMITTED: 0,
        EvaluationStatus.UNABLE_TO_EVALUATE: 0,
        EvaluationStatus.IN_PROGRESS: 0,
    }

    for eval in evaluations:
        if eval.status in status_counts:
            status_counts[eval.status] += 1

    # Include both submitted and unable_to_evaluate evaluations
    completed_evals = [e for e in evaluations if e.status in [EvaluationStatus.SUBMITTED, EvaluationStatus.UNABLE_TO_EVALUATE]]

    submitted_evals = [e for e in evaluations if e.status == EvaluationStatus.SUBMITTED]
    aggregate_score = None
    if submitted_evals:
        total = sum(e.total_score for e in submitted_evals if e.total_score)
        aggregate_score = total / len(submitted_evals) if submitted_evals else None

    return {
        "submitted_count": status_counts[EvaluationStatus.SUBMITTED],
        "unable_to_evaluate_count": status_counts[EvaluationStatus.UNABLE_TO_EVALUATE],
        "in_progress_count": status_counts[EvaluationStatus.IN_PROGRESS],
        "aggregate_score": aggregate_score,
        "evaluations": completed_evals,
    }
