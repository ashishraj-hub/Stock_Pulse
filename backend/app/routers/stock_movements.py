from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.dependencies import get_db
from app.models.batch import Batch
from app.models.inventory_lot import InventoryLot
from app.models.item import Item
from app.models.location import Location
from app.models.stock_movement import MovementType, StockMovement
from app.models.user import User
from app.schemas.stock_movement import ReceiveStockRequest, StockMovementResponse


router = APIRouter(
    prefix="/api/v1/organizations/{organization_id}",
    tags=["Stock Movements"],
)


@router.post(
    "/items/{item_id}/batches/{batch_id}/locations/{location_id}/receive",
    response_model=StockMovementResponse,
    status_code=status.HTTP_201_CREATED,
)
def receive_stock(
    organization_id: UUID,
    item_id: UUID,
    batch_id: UUID,
    location_id: UUID,
    data: ReceiveStockRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 1. Verify item belongs to organization.
    item = db.get(Item, item_id)

    if item is None or item.organization_id != organization_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found",
        )

    # 2. Verify batch belongs to item.
    batch = db.get(Batch, batch_id)

    if batch is None or batch.item_id != item_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Batch not found",
        )

    # 3. Verify location belongs to organization.
    location = db.get(Location, location_id)

    if location is None or location.organization_id != organization_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found",
        )

    # 4. Find existing inventory record.
    inventory_lot = (
        db.query(InventoryLot)
        .filter(
            InventoryLot.batch_id == batch_id,
            InventoryLot.location_id == location_id,
        )
        .first()
    )

    if inventory_lot is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory record not found for this batch and location",
        )

    # 5. Increase current inventory.
    inventory_lot.quantity_on_hand += data.quantity

    # 6. Record the movement.
    movement = StockMovement(
        item_id=item_id,
        batch_id=batch_id,
        location_id=location_id,
        performed_by=current_user.id,
        movement_type=MovementType.RECEIVE,
        quantity=data.quantity,
        reason=data.reason,
    )

    db.add(movement)

    # 7. Commit both changes together.
    db.commit()

    # 8. Refresh movement from database.
    db.refresh(movement)

    return movement