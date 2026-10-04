from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_roles
from app.db.dependencies import get_db
from app.models.location import Location
from app.models.organization import Organization
from app.models.user import User, UserRole
from app.schemas.location import LocationCreate, LocationResponse


router = APIRouter(
    prefix="/api/v1/organizations/{organization_id}/locations",
    tags=["Locations"],
)


def validate_organization_access(
    organization_id: UUID,
    current_user: User,
):
    if current_user.organization_id != organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this organization",
        )


@router.get(
    "",
    response_model=list[LocationResponse],
)
def list_locations(
    organization_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    validate_organization_access(
        organization_id,
        current_user,
    )

    organization = db.get(
        Organization,
        organization_id,
    )

    if organization is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )

    statement = (
        select(Location)
        .where(
            Location.organization_id == organization_id,
        )
        .order_by(Location.created_at.asc())
    )

    return db.scalars(statement).all()


@router.get(
    "/{location_id}",
    response_model=LocationResponse,
)
def get_location(
    organization_id: UUID,
    location_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    validate_organization_access(
        organization_id,
        current_user,
    )

    location = db.get(
        Location,
        location_id,
    )

    if (
        location is None
        or location.organization_id != organization_id
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found",
        )

    return location


@router.post(
    "",
    response_model=LocationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_location(
    organization_id: UUID,
    location_data: LocationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.ADMIN)
    ),
):
    validate_organization_access(
        organization_id,
        current_user,
    )

    organization = db.get(
        Organization,
        organization_id,
    )

    if organization is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )

    name = location_data.name.strip()

    if not name:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Location name cannot be empty",
        )

    existing_location = db.scalar(
        select(Location).where(
            Location.organization_id == organization_id,
            Location.name.ilike(name),
        )
    )

    if existing_location is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A location with this name already exists",
        )

    location = Location(
        organization_id=organization_id,
        name=name,
    )

    db.add(location)
    db.commit()
    db.refresh(location)

    return location