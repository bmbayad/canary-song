from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.user import UserUpdate, UserResponse
from app.services.user_service import update_user
from app.core.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("/me", response_model=UserResponse)
def get_profile(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)


@router.put("/me", response_model=UserResponse)
def update_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    updated_user = update_user(db, current_user.id, user_update)
    return UserResponse.model_validate(updated_user)
