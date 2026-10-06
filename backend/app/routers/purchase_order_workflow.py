from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.audit import create_audit_log
from app.core.dependencies import require_roles
from app.db.dependencies import get_db
from app.models.purchase_order import PurchaseOrder, PurchaseOrderStatus
from app.models.user import User, UserRole
from app.schemas.purchase_order import PurchaseOrderResponse


router = APIRouter(
    prefix="/api/v1/organizations/{organization_id}/purchase-orders",
    tags=["purchase-order-workflow"],
)


def get_purchase_order_or_404(
    db: Session,
    organization_id: UUID,
    purchase_order_id: UUID,
) -> PurchaseOrder:
    purchase_order = db.scalar(
        select(PurchaseOrder)
        .options(selectinload(PurchaseOrder.items))
        .where(
            PurchaseOrder.id == purchase_order_id,
            PurchaseOrder.organization_id == organization_id,
        )
    )

    if purchase_order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase order not found",
        )

    return purchase_order


def get_purchase_order_with_items(
    db: Session,
    organization_id: UUID,
    purchase_order_id: UUID,
) -> PurchaseOrder:
    purchase_order = db.scalar(
        select(PurchaseOrder)
        .options(selectinload(PurchaseOrder.items))
        .where(
            PurchaseOrder.id == purchase_order_id,
            PurchaseOrder.organization_id == organization_id,
        )
    )

    if purchase_order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase order not found",
        )

    return purchase_order


@router.post(
    "/{purchase_order_id}/submit",
    response_model=PurchaseOrderResponse,
)
def submit_purchase_order(
    organization_id: UUID,
    purchase_order_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.ADMIN, UserRole.STAFF)
    ),
):
    if current_user.organization_id != organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this organization",
        )

    purchase_order = get_purchase_order_or_404(
        db,
        organization_id,
        purchase_order_id,
    )

    if purchase_order.status != PurchaseOrderStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only draft purchase orders can be submitted",
        )

    purchase_order.status = PurchaseOrderStatus.PENDING_APPROVAL

    create_audit_log(
        db,
        organization_id=organization_id,
        user_id=current_user.id,
        action="purchase_order.submitted",
        entity_type="purchase_order",
        entity_id=purchase_order.id,
        details={
            "from_status": PurchaseOrderStatus.DRAFT.value,
            "to_status": PurchaseOrderStatus.PENDING_APPROVAL.value,
        },
    )

    db.commit()

    return get_purchase_order_with_items(
        db,
        organization_id,
        purchase_order_id,
    )


@router.post(
    "/{purchase_order_id}/approve",
    response_model=PurchaseOrderResponse,
)
def approve_purchase_order(
    organization_id: UUID,
    purchase_order_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.ADMIN)
    ),
):
    if current_user.organization_id != organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this organization",
        )

    purchase_order = get_purchase_order_or_404(
        db,
        organization_id,
        purchase_order_id,
    )

    if purchase_order.status != PurchaseOrderStatus.PENDING_APPROVAL:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only purchase orders pending approval can be approved",
        )

    purchase_order.status = PurchaseOrderStatus.APPROVED

    create_audit_log(
        db,
        organization_id=organization_id,
        user_id=current_user.id,
        action="purchase_order.approved",
        entity_type="purchase_order",
        entity_id=purchase_order.id,
        details={
            "from_status": PurchaseOrderStatus.PENDING_APPROVAL.value,
            "to_status": PurchaseOrderStatus.APPROVED.value,
        },
    )

    db.commit()

    return get_purchase_order_with_items(
        db,
        organization_id,
        purchase_order_id,
    )


@router.post(
    "/{purchase_order_id}/order",
    response_model=PurchaseOrderResponse,
)
def mark_purchase_order_ordered(
    organization_id: UUID,
    purchase_order_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.ADMIN)
    ),
):
    if current_user.organization_id != organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this organization",
        )

    purchase_order = get_purchase_order_or_404(
        db,
        organization_id,
        purchase_order_id,
    )

    if purchase_order.status != PurchaseOrderStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only approved purchase orders can be marked as ordered",
        )

    purchase_order.status = PurchaseOrderStatus.ORDERED
    purchase_order.order_date = datetime.now(timezone.utc)

    create_audit_log(
        db,
        organization_id=organization_id,
        user_id=current_user.id,
        action="purchase_order.ordered",
        entity_type="purchase_order",
        entity_id=purchase_order.id,
        details={
            "from_status": PurchaseOrderStatus.APPROVED.value,
            "to_status": PurchaseOrderStatus.ORDERED.value,
        },
    )

    db.commit()

    return get_purchase_order_with_items(
        db,
        organization_id,
        purchase_order_id,
    )


@router.post(
    "/{purchase_order_id}/cancel",
    response_model=PurchaseOrderResponse,
)
def cancel_purchase_order(
    organization_id: UUID,
    purchase_order_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.ADMIN)
    ),
):
    if current_user.organization_id != organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this organization",
        )

    purchase_order = get_purchase_order_or_404(
        db,
        organization_id,
        purchase_order_id,
    )

    cancellable_statuses = {
        PurchaseOrderStatus.DRAFT,
        PurchaseOrderStatus.PENDING_APPROVAL,
        PurchaseOrderStatus.APPROVED,
        PurchaseOrderStatus.ORDERED,
    }

    if purchase_order.status not in cancellable_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This purchase order cannot be cancelled",
        )

    previous_status = purchase_order.status

    purchase_order.status = PurchaseOrderStatus.CANCELLED

    create_audit_log(
        db,
        organization_id=organization_id,
        user_id=current_user.id,
        action="purchase_order.cancelled",
        entity_type="purchase_order",
        entity_id=purchase_order.id,
        details={
            "from_status": previous_status.value,
            "to_status": PurchaseOrderStatus.CANCELLED.value,
        },
    )

    db.commit()

    return get_purchase_order_with_items(
        db,
        organization_id,
        purchase_order_id,
    )