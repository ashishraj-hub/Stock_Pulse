from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.audit import create_audit_log
from app.core.dependencies import get_current_user, require_roles
from app.db.dependencies import get_db
from app.models.batch import Batch
from app.models.inventory_lot import InventoryLot
from app.models.item import Item
from app.models.location import Location
from app.models.purchase_order import PurchaseOrder, PurchaseOrderStatus
from app.models.stock_movement import MovementType, StockMovement
from app.models.user import User, UserRole
from app.schemas.purchase_order_receiving import PurchaseOrderReceiveRequest


router = APIRouter(
    prefix="/api/v1/organizations/{organization_id}/purchase-orders",
    tags=["purchase-order-receiving"],
)


@router.post("/{purchase_order_id}/receive")
def receive_purchase_order(
    organization_id: UUID,
    purchase_order_id: UUID,
    payload: PurchaseOrderReceiveRequest,
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

    if purchase_order.status != PurchaseOrderStatus.ORDERED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only ordered purchase orders can be received",
        )

    previous_status = purchase_order.status

    po_items = {
        po_item.id: po_item
        for po_item in purchase_order.items
    }

    requested_item_ids: set[UUID] = set()

    for receive_item in payload.items:
        if receive_item.purchase_order_item_id in requested_item_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Duplicate purchase order items are not allowed",
            )

        requested_item_ids.add(receive_item.purchase_order_item_id)

        po_item = po_items.get(receive_item.purchase_order_item_id)

        if po_item is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=(
                    "Purchase order item does not belong to "
                    "this purchase order"
                ),
            )

        remaining_quantity = (
            po_item.quantity - po_item.received_quantity
        )

        if receive_item.quantity > remaining_quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Received quantity for item {po_item.item_id} "
                    f"cannot exceed remaining quantity "
                    f"({remaining_quantity})"
                ),
            )

        location = db.scalar(
            select(Location).where(
                Location.id == receive_item.location_id,
                Location.organization_id == organization_id,
            )
        )

        if location is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Location not found",
            )

        item = db.scalar(
            select(Item).where(
                Item.id == po_item.item_id,
                Item.organization_id == organization_id,
            )
        )

        if item is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Item not found",
            )

        batch = db.scalar(
            select(Batch).where(
                Batch.item_id == item.id,
                Batch.lot_number == receive_item.lot_number,
            )
        )

        if batch is None:
            batch = Batch(
                item_id=item.id,
                lot_number=receive_item.lot_number,
                expiry_date=receive_item.expiry_date,
            )

            db.add(batch)
            db.flush()

        else:
            if (
                receive_item.expiry_date is not None
                and batch.expiry_date is not None
                and receive_item.expiry_date != batch.expiry_date
            ):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        "Expiry date does not match the existing batch"
                    ),
                )

        inventory_lot = db.scalar(
            select(InventoryLot).where(
                InventoryLot.batch_id == batch.id,
                InventoryLot.location_id == location.id,
            )
        )

        if inventory_lot is None:
            inventory_lot = InventoryLot(
                batch_id=batch.id,
                location_id=location.id,
                quantity_on_hand=receive_item.quantity,
                reserved_quantity=0,
            )

            db.add(inventory_lot)

        else:
            inventory_lot.quantity_on_hand += receive_item.quantity

        stock_movement = StockMovement(
            item_id=item.id,
            batch_id=batch.id,
            location_id=location.id,
            performed_by=current_user.id,
            movement_type=MovementType.RECEIVE,
            quantity=receive_item.quantity,
            reason=f"Purchase order {purchase_order.id}",
        )

        db.add(stock_movement)

        # Track how much of this PO item has now been received.
        po_item.received_quantity += receive_item.quantity

        create_audit_log(
            db,
            organization_id=organization_id,
            user_id=current_user.id,
            action="purchase_order.item_received",
            entity_type="purchase_order",
            entity_id=purchase_order.id,
            details={
                "purchase_order_item_id": str(
                    receive_item.purchase_order_item_id
                ),
                "item_id": str(item.id),
                "batch_id": str(batch.id),
                "location_id": str(location.id),
                "quantity": receive_item.quantity,
                "lot_number": receive_item.lot_number,
                "received_quantity": po_item.received_quantity,
                "ordered_quantity": po_item.quantity,
                "remaining_quantity": (
                    po_item.quantity - po_item.received_quantity
                ),
            },
        )

    # The PO becomes RECEIVED only when every PO item
    # has been completely received.
    all_items_received = all(
        item.received_quantity >= item.quantity
        for item in purchase_order.items
    )

    if all_items_received:
        purchase_order.status = PurchaseOrderStatus.RECEIVED

        create_audit_log(
            db,
            organization_id=organization_id,
            user_id=current_user.id,
            action="purchase_order.received",
            entity_type="purchase_order",
            entity_id=purchase_order.id,
            details={
                "from_status": previous_status.value,
                "to_status": PurchaseOrderStatus.RECEIVED.value,
                "item_count": len(purchase_order.items),
            },
        )

    db.commit()
    db.refresh(purchase_order)

    return purchase_order