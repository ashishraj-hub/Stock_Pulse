from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.audit import create_audit_log
from app.core.dependencies import get_current_user
from app.db.dependencies import get_db
from app.models.item import Item
from app.models.purchase_order import PurchaseOrder, PurchaseOrderStatus
from app.models.purchase_order_item import PurchaseOrderItem
from app.models.supplier import Supplier
from app.models.user import User
from app.schemas.purchase_order import (
    PurchaseOrderCreate,
    PurchaseOrderResponse,
)


router = APIRouter(
    prefix="/api/v1/organizations/{organization_id}/purchase-orders",
    tags=["purchase-orders"],
)


@router.post(
    "",
    response_model=PurchaseOrderResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_purchase_order(
    organization_id: UUID,
    payload: PurchaseOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.organization_id != organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this organization",
        )

    supplier = db.scalar(
        select(Supplier).where(
            Supplier.id == payload.supplier_id,
            Supplier.organization_id == organization_id,
        )
    )

    if supplier is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found",
        )

    item_ids = [item.item_id for item in payload.items]

    if len(item_ids) != len(set(item_ids)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Duplicate items are not allowed in a purchase order",
        )

    items = db.scalars(
        select(Item).where(
            Item.id.in_(item_ids),
            Item.organization_id == organization_id,
        )
    ).all()

    items_by_id = {item.id: item for item in items}

    missing_item_ids = [
        str(item_id)
        for item_id in item_ids
        if item_id not in items_by_id
    ]

    if missing_item_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Item(s) not found: {', '.join(missing_item_ids)}",
        )

    purchase_order = PurchaseOrder(
        organization_id=organization_id,
        supplier_id=supplier.id,
        status=PurchaseOrderStatus.DRAFT,
        expected_date=payload.expected_date,
        notes=payload.notes,
        created_by=current_user.id,
    )

    db.add(purchase_order)
    db.flush()

    for item_payload in payload.items:
        purchase_order_item = PurchaseOrderItem(
            purchase_order_id=purchase_order.id,
            item_id=item_payload.item_id,
            quantity=item_payload.quantity,
            unit_price=item_payload.unit_price,
        )

        db.add(purchase_order_item)

    create_audit_log(
        db,
        organization_id=organization_id,
        user_id=current_user.id,
        action="purchase_order.created",
        entity_type="purchase_order",
        entity_id=purchase_order.id,
        details={
            "supplier_id": str(supplier.id),
            "item_count": len(payload.items),
            "status": PurchaseOrderStatus.DRAFT.value,
        },
    )

    db.commit()

    created_purchase_order = db.scalar(
        select(PurchaseOrder)
        .options(selectinload(PurchaseOrder.items))
        .where(PurchaseOrder.id == purchase_order.id)
    )

    return created_purchase_order


@router.get(
    "",
    response_model=list[PurchaseOrderResponse],
)
def get_purchase_orders(
    organization_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.organization_id != organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this organization",
        )

    purchase_orders = db.scalars(
        select(PurchaseOrder)
        .options(selectinload(PurchaseOrder.items))
        .where(
            PurchaseOrder.organization_id == organization_id,
        )
        .order_by(PurchaseOrder.created_at.desc())
    ).all()

    return purchase_orders


@router.get(
    "/{purchase_order_id}",
    response_model=PurchaseOrderResponse,
)
def get_purchase_order(
    organization_id: UUID,
    purchase_order_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.organization_id != organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this organization",
        )

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