from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from app.db.database import get_db
from app.core.deps import get_current_user
from app.models.user import User, UserRole
from app.schemas.evaluation import (
    JudgeQueueResponse,
    RecordingForQueueResponse,
    StartEvaluationResponse,
    EvaluationResponse,
    SubmitEvaluationRequest,
    UnableToEvaluateRequest,
    RecordingEvaluationSummaryResponse,
    RecordingEvaluationDetailResponse,
    JudgeEvaluationItemResponse,
)
from app.services.evaluation_service import (
    get_judge_queue,
    start_evaluation,
    submit_evaluation,
    mark_unable_to_evaluate,
    get_evaluation_by_id,
    get_judge_evaluations,
    get_recording_evaluation_status,
)
from app.services.scoring_service import get_active_categories
from app.models.bird import Bird
from app.models.recording import Recording
from datetime import datetime

router = APIRouter(prefix="/evaluations", tags=["evaluations"])


@router.get("/queue", response_model=JudgeQueueResponse)
def get_queue(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get judge queue - available recordings for evaluation"""
    if current_user.role != UserRole.JUDGE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only judges can access the evaluation queue"
        )

    available = get_judge_queue(db, current_user.id)

    recordings = []
    for recording in available:
        bird = recording.bird
        bird_type = recording.bird_type
        rec = RecordingForQueueResponse(
            id=recording.id,
            bird_name=bird.name,
            leg_band_number=bird.leg_band_number,
            bird_type_name=bird_type.name,
            original_filename=recording.original_filename,
            uploaded_at=recording.uploaded_at,
            expires_at=recording.expires_at,
        )
        recordings.append(rec)

    return JudgeQueueResponse(
        available_count=len(recordings),
        available_recordings=recordings,
    )


@router.post("/{recording_id}/start", response_model=StartEvaluationResponse)
def start_eval(
    recording_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Start evaluating a recording"""
    if current_user.role != UserRole.JUDGE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only judges can start evaluations"
        )

    try:
        recording_uuid = UUID(recording_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid recording ID format"
        )

    try:
        evaluation = start_evaluation(db, current_user.id, recording_uuid)

        categories = get_active_categories(db, evaluation.scoring_configuration_id)

        return StartEvaluationResponse(
            evaluation_id=evaluation.id,
            recording_id=recording_uuid,
            scoring_configuration={
                "id": evaluation.scoring_configuration.id,
                "bird_type_id": evaluation.scoring_configuration.bird_type_id,
                "name": evaluation.scoring_configuration.name,
                "description": evaluation.scoring_configuration.description,
                "version": evaluation.scoring_configuration.version,
                "categories": [
                    {
                        "id": cat.id,
                        "name": cat.name,
                        "description": cat.description,
                        "minimum_points": cat.minimum_points,
                        "maximum_points": cat.maximum_points,
                        "display_order": cat.display_order,
                    }
                    for cat in categories
                ]
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/{evaluation_id}/submit", response_model=EvaluationResponse)
def submit_eval(
    evaluation_id: str,
    request: SubmitEvaluationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Submit an evaluation with scores"""
    if current_user.role != UserRole.JUDGE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only judges can submit evaluations"
        )

    try:
        eval_uuid = UUID(evaluation_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid evaluation ID format"
        )

    try:
        evaluation = submit_evaluation(
            db,
            current_user.id,
            eval_uuid,
            request.scores,
            request.comments
        )
        return evaluation
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/{evaluation_id}/unable-to-evaluate", response_model=EvaluationResponse)
def mark_unable(
    evaluation_id: str,
    request: UnableToEvaluateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark evaluation as unable to evaluate"""
    if current_user.role != UserRole.JUDGE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only judges can submit evaluations"
        )

    try:
        eval_uuid = UUID(evaluation_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid evaluation ID format"
        )

    try:
        evaluation = mark_unable_to_evaluate(
            db,
            current_user.id,
            eval_uuid,
            request.reason
        )
        return evaluation
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


# Participant endpoints for viewing evaluation results
# These must come BEFORE the generic /{evaluation_id} endpoint to prevent route shadowing
@router.get("/results", response_model=list[RecordingEvaluationSummaryResponse])
def list_recording_results(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all recordings with evaluation status for participant"""
    if current_user.role != UserRole.PARTICIPANT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only participants can view evaluation results"
        )

    recordings = (
        db.query(Recording)
        .join(Bird, Recording.bird_id == Bird.id)
        .filter(Bird.owner_id == current_user.id)
        .all()
    )

    results = []
    for recording in recordings:
        eval_status = get_recording_evaluation_status(db, recording.id)
        is_expired = recording.expires_at < datetime.utcnow()

        summary = RecordingEvaluationSummaryResponse(
            recording_id=recording.id,
            bird_name=recording.bird.name,
            leg_band_number=recording.bird.leg_band_number,
            bird_type_name=recording.bird_type.name,
            uploaded_at=recording.uploaded_at,
            expires_at=recording.expires_at,
            is_expired=is_expired,
            total_judges=eval_status["submitted_count"] + eval_status["unable_to_evaluate_count"],
            completed_count=eval_status["submitted_count"] + eval_status["unable_to_evaluate_count"],
            unable_count=eval_status["unable_to_evaluate_count"],
            aggregate_score=eval_status["aggregate_score"],
        )
        results.append(summary)

    return results


@router.get("/recordings/{recording_id}/results", response_model=RecordingEvaluationDetailResponse)
def get_recording_results(
    recording_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get evaluation results for a recording (participants only)"""
    if current_user.role != UserRole.PARTICIPANT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only participants can view evaluation results"
        )

    try:
        rec_uuid = UUID(recording_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid recording ID format"
        )

    recording = db.query(Recording).filter(Recording.id == rec_uuid).first()
    if not recording:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recording not found"
        )

    if recording.bird.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this recording"
        )

    eval_status = get_recording_evaluation_status(db, rec_uuid)
    evaluations = eval_status["evaluations"]

    is_expired = recording.expires_at < datetime.utcnow()

    eval_items = []
    for evaluation in evaluations:
        eval_item = JudgeEvaluationItemResponse(
            id=evaluation.id,
            judge_id=evaluation.judge_id,
            status=evaluation.status,
            total_score=evaluation.total_score,
            comments=evaluation.comments,
            unable_to_evaluate_reason=evaluation.unable_to_evaluate_reason,
            submitted_at=evaluation.submitted_at,
            scores=[
                {
                    "id": score.id,
                    "category_id": score.category_id,
                    "category_name_snapshot": score.category_name_snapshot,
                    "minimum_points_snapshot": score.minimum_points_snapshot,
                    "maximum_points_snapshot": score.maximum_points_snapshot,
                    "score": score.score,
                }
                for score in evaluation.scores
            ],
        )
        eval_items.append(eval_item)

    return RecordingEvaluationDetailResponse(
        recording_id=rec_uuid,
        bird_name=recording.bird.name,
        leg_band_number=recording.bird.leg_band_number,
        bird_type_name=recording.bird_type.name,
        original_filename=recording.original_filename,
        uploaded_at=recording.uploaded_at,
        expires_at=recording.expires_at,
        is_expired=is_expired,
        aggregate_score=eval_status["aggregate_score"],
        total_judges=eval_status["submitted_count"] + eval_status["unable_to_evaluate_count"],
        evaluations=eval_items,
    )


# Judge endpoints for managing their evaluations
@router.get("", response_model=list[EvaluationResponse])
def list_evaluations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all evaluations for current judge"""
    if current_user.role != UserRole.JUDGE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only judges can view evaluations"
        )

    evaluations = get_judge_evaluations(db, current_user.id)
    return evaluations


@router.get("/{evaluation_id}", response_model=EvaluationResponse)
def get_evaluation(
    evaluation_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a specific evaluation"""
    if current_user.role != UserRole.JUDGE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only judges can view evaluations"
        )

    try:
        eval_uuid = UUID(evaluation_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid evaluation ID format"
        )

    evaluation = get_evaluation_by_id(db, eval_uuid, current_user.id)
    if not evaluation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evaluation not found"
        )

    return evaluation
