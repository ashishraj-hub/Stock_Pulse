from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.audit import create_audit_log
from app.core.dependencies import get_current_user, require_roles
from app.db.dependencies import get_db
from app.models.organization import Organization
from app.models.supplier import Supplier
from app.models.user import User, UserRole
from app.schemas.supplier import (
    SupplierCreate,
    SupplierResponse,
)


router = APIRouter(
    prefix="/api/v1/organizations/{organization_id}/suppliers",
    tags=["Suppliers"],
)


@router.get(
    "",
    response_model=list[SupplierResponse],
)
def list_suppliers(
    organization_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.organization_id != organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this organization",
        )

    statement = (
        select(Supplier)
        .where(
            Supplier.organization_id == organization_id,
        )
        .order_by(Supplier.created_at.asc())
    )

    return db.scalars(statement).all()


@router.get(
    "/{supplier_id}",
    response_model=SupplierResponse,
)
def get_supplier(
    organization_id: UUID,
    supplier_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.organization_id != organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this organization",
        )

    supplier = db.get(
        Supplier,
        supplier_id,
    )

    if (
        supplier is None
        or supplier.organization_id != organization_id
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found",
        )

    return supplier


@router.post(
    "",
    response_model=SupplierResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_supplier(
    organization_id: UUID,
    supplier_data: SupplierCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.ADMIN),
    ),
):
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

    supplier = Supplier(
        organization_id=organization_id,
        name=supplier_data.name,
        contact_name=supplier_data.contact_name,
        email=supplier_data.email,
        phone=supplier_data.phone,
        address=supplier_data.address,
    )

    db.add(supplier)

    db.flush()

    create_audit_log(
        db,
        organization_id=organization_id,
        user_id=current_user.id,
        action="supplier.created",
        entity_type="supplier",
        entity_id=supplier.id,
        details={
            "name": supplier.name,
            "email": supplier.email,
        },
    )

    db.commit()
    db.refresh(supplier)

    return supplier