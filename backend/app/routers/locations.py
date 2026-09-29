from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.models.location import Location
from app.models.organization import Organization
from app.schemas.location import LocationCreate, LocationResponse


router = APIRouter(
    prefix="/api/v1/organizations/{organization_id}/locations",
    tags=["Locations"],
)


@router.post(
    "",
    response_model=LocationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_location(
    organization_id: UUID,
    location_data: LocationCreate,
    db: Session = Depends(get_db),
):
    organization = db.get(Organization, organization_id)

    if organization is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )

    location = Location(
        organization_id=organization_id,
        name=location_data.name,
    )

    db.add(location)
    db.commit()
    db.refresh(location)

    return location


@router.get(
    "",
    response_model=list[LocationResponse],
)
def list_locations(
    organization_id: UUID,
    db: Session = Depends(get_db),
):
    organization = db.get(Organization, organization_id)

    if organization is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )

    statement = (
        select(Location)
        .where(Location.organization_id == organization_id)
        .order_by(Location.created_at)
    )

    locations = db.scalars(statement).all()

    return locations


@router.get(
    "/{location_id}",
    response_model=LocationResponse,
)
def get_location(
    organization_id: UUID,
    location_id: UUID,
    db: Session = Depends(get_db),
):
    location = db.get(Location, location_id)

    if location is None or location.organization_id != organization_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found",
        )

    return location