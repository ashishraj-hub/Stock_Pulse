from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.audit import create_audit_log
from app.core.security import hash_password
from app.core.dependencies import require_roles
from app.db.dependencies import get_db
from app.models.organization import Organization
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserResponse


router = APIRouter(
    prefix="/api/v1/organizations/{organization_id}/users",
    tags=["Users"],
)


@router.post(
    "",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_user(
    organization_id: UUID,
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.ADMIN)
    ),
):
    organization = db.get(Organization, organization_id)
    

    if organization is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )

    if current_user.organization_id != organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this organization",
        )

    existing_user = db.scalar(
        select(User).where(User.email == user_data.email)
    )

    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )

    user = User(
        organization_id=organization_id,
        name=user_data.name,
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        role=user_data.role,
    )

    db.add(user)
    db.flush()

    create_audit_log(
    db,
    organization_id=organization_id,
    user_id=current_user.id,
    action="user.create",
    entity_type="User",
    entity_id=user.id,
    details={
        "name": user.name,
        "email": user.email,
        "role": user.role.value,
    },
    )

    db.commit()
    db.refresh(user)

    return user