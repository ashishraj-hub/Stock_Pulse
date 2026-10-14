from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.dependencies import get_db
from app.models.organization import Organization
from app.models.user import User
from app.schemas.organization import (
    OrganizationCreate,
    OrganizationResponse,
)

router = APIRouter(
    prefix="/api/v1/organizations",
    tags=["Organizations"],
)


@router.post(
    "",
    response_model=OrganizationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_organization(
    organization_data: OrganizationCreate,
    db: Session = Depends(get_db),
):
    """
    Create an organization.

    This endpoint is retained for bootstrap/administrative tooling.
    The current application does not call it from the frontend.
    """

    organization = Organization(
        name=organization_data.name,
    )

    db.add(organization)
    db.commit()
    db.refresh(organization)

    return organization


@router.get(
    "",
    response_model=list[OrganizationResponse],
)
def list_organizations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return only the organization belonging to the authenticated user.

    Organization enumeration across tenants is not allowed.
    """

    organization = db.get(
        Organization,
        current_user.organization_id,
    )

    if organization is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )

    return [organization]


@router.get(
    "/{organization_id}",
    response_model=OrganizationResponse,
)
def get_organization(
    organization_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return the authenticated user's organization.

    Users cannot inspect another tenant's organization.
    """

    if current_user.organization_id != organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this organization",
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

    return organization