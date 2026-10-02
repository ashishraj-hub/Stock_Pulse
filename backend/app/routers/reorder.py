
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.audit import create_audit_log
from app.core.dependencies import get_current_user, require_roles
from app.db.dependencies import get_db
from app.models.batch import Batch
from app.models.inventory_lot import InventoryLot
from app.models.item import Item
from app.models.purchase_order import PurchaseOrder, PurchaseOrderStatus
from app.models.purchase_order_item import PurchaseOrderItem
from app.models.supplier import Supplier
from app.models.user import User, UserRole
from app.schemas.reorder import (
    ReorderCenterItemResponse,
    ReorderPurchaseOrderCreate,
    ReorderPurchaseOrderResponse,
    ReorderStatusResponse,
    ReorderSuggestionResponse,
)
from app.services.reorder import (
    get_reorder_status,
    get_reorder_suggestion,
)


router = APIRouter(
    prefix="/api/v1/organizations/{organization_id}",
    tags=["reorder"],
)


@router.get(
    "/items/{item_id}/reorder-status",
    response_model=ReorderStatusResponse,
)
def reorder_status(
    organization_id: UUID,
    item_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.organization_id != organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this organization",
        )

    try:
        result = get_reorder_status(
            db,
            organization_id=organization_id,
            item_id=item_id,
        )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found",
        )

    return ReorderStatusResponse(
        item_id=result.item_id,
        sku=result.sku,
        name=result.name,
        available_quantity=result.available_quantity,
        reorder_point=result.reorder_point,
        reorder_quantity=result.reorder_quantity,
        lead_time_days=result.lead_time_days,
        is_low_stock=result.is_low_stock,
    )


@router.get(
    "/items/{item_id}/reorder-suggestion",
    response_model=ReorderSuggestionResponse,
)
def reorder_suggestion(
    organization_id: UUID,
    item_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.organization_id != organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this organization",
        )

    try:
        result = get_reorder_suggestion(
            db,
            organization_id=organization_id,
            item_id=item_id,
        )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found",
        )

    return ReorderSuggestionResponse(
        item_id=result.item_id,
        sku=result.sku,
        name=result.name,
        available_quantity=result.available_quantity,
        reorder_point=result.reorder_point,
        suggested_quantity=result.suggested_quantity,
        lead_time_days=result.lead_time_days,
        is_low_stock=result.is_low_stock,
    )


@router.get(
    "/reorder-center",
    response_model=list[ReorderCenterItemResponse],
)
def get_reorder_center(
    organization_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # ---------------------------------------------------------
    # 1. Verify organization access
    # ---------------------------------------------------------
    if current_user.organization_id != organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this organization",
        )

    # ---------------------------------------------------------
    # 2. Calculate available stock across all locations
    #
    # Available quantity = physical stock - reserved stock.
    #
    # Outer joins ensure that items with no batches or inventory
    # are still considered, with available quantity equal to zero.
    # ---------------------------------------------------------
    available_expression = func.coalesce(
        func.sum(
            InventoryLot.quantity_on_hand
            - InventoryLot.reserved_quantity
        ),
        0,
    )

    rows = db.execute(
        select(
            Item.id.label("item_id"),
            Item.sku.label("sku"),
            Item.name.label("name"),
            available_expression.label("available_quantity"),
            Item.reorder_point.label("reorder_point"),
            Item.reorder_quantity.label("reorder_quantity"),
            Item.lead_time_days.label("lead_time_days"),
        )
        .select_from(Item)
        .outerjoin(
            Batch,
            Batch.item_id == Item.id,
        )
        .outerjoin(
            InventoryLot,
            InventoryLot.batch_id == Batch.id,
        )
        .where(
            Item.organization_id == organization_id,
        )
        .group_by(
            Item.id,
            Item.sku,
            Item.name,
            Item.reorder_point,
            Item.reorder_quantity,
            Item.lead_time_days,
        )
        .order_by(Item.name.asc())
    ).all()

    # ---------------------------------------------------------
    # 3. Return only low-stock items
    # ---------------------------------------------------------
    result = []

    for row in rows:
        available_quantity = int(row.available_quantity or 0)

        if available_quantity <= row.reorder_point:
            result.append(
                ReorderCenterItemResponse(
                    item_id=row.item_id,
                    sku=row.sku,
                    name=row.name,
                    available_quantity=available_quantity,
                    reorder_point=row.reorder_point,
                    suggested_quantity=row.reorder_quantity,
                    lead_time_days=row.lead_time_days,
                    is_low_stock=True,
                )
            )

    return result


@router.post(
    "/reorder/purchase-order",
    response_model=ReorderPurchaseOrderResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_reorder_purchase_order(
    organization_id: UUID,
    payload: ReorderPurchaseOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            UserRole.ADMIN,
            UserRole.STAFF,
        )
    ),
):
    # ---------------------------------------------------------
    # 1. Verify tenant access
    # ---------------------------------------------------------
    if current_user.organization_id != organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this organization",
        )

    # ---------------------------------------------------------
    # 2. Validate item
    # ---------------------------------------------------------
    item = db.scalar(
        select(Item).where(
            Item.id == payload.item_id,
            Item.organization_id == organization_id,
        )
    )

    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found",
        )

    # ---------------------------------------------------------
    # 3. Validate supplier
    # ---------------------------------------------------------
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

    # ---------------------------------------------------------
    # 4. Calculate current available stock
    # ---------------------------------------------------------
    available_quantity = db.scalar(
        select(
            func.coalesce(
                func.sum(
                    InventoryLot.quantity_on_hand
                    - InventoryLot.reserved_quantity
                ),
                0,
            )
        )
        .select_from(InventoryLot)
        .join(
            Batch,
            Batch.id == InventoryLot.batch_id,
        )
        .where(
            Batch.item_id == item.id,
        )
    )

    available_quantity = int(available_quantity or 0)

    # ---------------------------------------------------------
    # 5. Confirm item is low stock
    # ---------------------------------------------------------
    if available_quantity > item.reorder_point:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Item is not currently below the reorder point"
            ),
        )

    # ---------------------------------------------------------
    # 6. Determine purchase quantity
    # ---------------------------------------------------------
    reorder_quantity = (
        payload.quantity
        if payload.quantity is not None
        else item.reorder_quantity
    )

    if reorder_quantity <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reorder quantity must be greater than zero",
        )

    # ---------------------------------------------------------
    # 7. Create draft purchase order
    # ---------------------------------------------------------
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

    # ---------------------------------------------------------
    # 8. Add the requested item
    # ---------------------------------------------------------
    purchase_order_item = PurchaseOrderItem(
        purchase_order_id=purchase_order.id,
        item_id=item.id,
        quantity=reorder_quantity,
        received_quantity=0,
    )

    db.add(purchase_order_item)

    # ---------------------------------------------------------
    # 9. Record audit entry
    # ---------------------------------------------------------
    create_audit_log(
        db,
        organization_id=organization_id,
        user_id=current_user.id,
        action="reorder.purchase_order_created",
        entity_type="purchase_order",
        entity_id=purchase_order.id,
        details={
            "item_id": str(item.id),
            "supplier_id": str(supplier.id),
            "available_quantity": available_quantity,
            "reorder_point": item.reorder_point,
            "suggested_quantity": item.reorder_quantity,
            "ordered_quantity": reorder_quantity,
        },
    )

    # ---------------------------------------------------------
    # 10. Save purchase order and audit entry
    # ---------------------------------------------------------
    db.commit()

    return ReorderPurchaseOrderResponse(
        purchase_order_id=purchase_order.id,
        item_id=item.id,
        supplier_id=supplier.id,
        quantity=reorder_quantity,
        status=purchase_order.status.value,
    )