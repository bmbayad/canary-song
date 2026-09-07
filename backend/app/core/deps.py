from fastapi import Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.security import decode_access_token
from app.services.user_service import get_user_by_id
from app.models.user import User, UserStatus
from typing import Optional


async def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authenticated",
        )

    token = authorization.replace("Bearer ", "")
    payload = decode_access_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )

    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    if user.status != UserStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is not active",
        )

    return user


async def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role.value != "Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


async def get_participant_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role.value != "Participant":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Participant access required",
        )
    return current_user


async def get_judge_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role.value != "Judge":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Judge access required",
        )
    return current_user



def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role.value != "Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


def get_participant_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role.value != "Participant":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Participant access required",
        )
    return current_user


def get_judge_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role.value != "Judge":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Judge access required",
        )
    return current_user
