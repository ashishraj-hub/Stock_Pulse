from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.models.batch import Batch
from app.models.inventory_lot import InventoryLot
from app.models.item import Item
from app.models.location import Location
from app.models.organization import Organization
from app.schemas.inventory_lot import (
    InventoryLotCreate,
    InventoryLotResponse,
)


router = APIRouter(
    prefix="/api/v1/organizations/{organization_id}/items/{item_id}/batches/{batch_id}/inventory",
    tags=["Inventory"],
)


@router.post(
    "",
    response_model=InventoryLotResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_inventory_lot(
    organization_id: UUID,
    item_id: UUID,
    batch_id: UUID,
    inventory_data: InventoryLotCreate,
    db: Session = Depends(get_db),
):
    # 1. Verify that the item belongs to this organization.
    item = db.get(Item, item_id)

    if item is None or item.organization_id != organization_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found",
        )

    # 2. Verify that the batch belongs to this item.
    batch = db.get(Batch, batch_id)

    if batch is None or batch.item_id != item_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Batch not found",
        )

    # 3. Verify that the location belongs to this organization.
    location = db.get(Location, inventory_data.location_id)

    if location is None or location.organization_id != organization_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found",
        )

    # 4. Prevent duplicate inventory records.
    existing_inventory = db.scalar(
        select(InventoryLot).where(
            InventoryLot.batch_id == batch_id,
            InventoryLot.location_id == inventory_data.location_id,
        )
    )

    if existing_inventory is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Inventory already exists for this batch at this location",
        )

    # 5. Create the inventory record.
    inventory_lot = InventoryLot(
        batch_id=batch_id,
        location_id=inventory_data.location_id,
        quantity_on_hand=inventory_data.quantity_on_hand,
        reserved_quantity=inventory_data.reserved_quantity,
    )

    db.add(inventory_lot)
    db.commit()
    db.refresh(inventory_lot)

    return inventory_lot


@router.get(
    "",
    response_model=list[InventoryLotResponse],
)
def list_inventory_lots(
    organization_id: UUID,
    item_id: UUID,
    batch_id: UUID,
    db: Session = Depends(get_db),
):
    # Verify item.
    item = db.get(Item, item_id)

    if item is None or item.organization_id != organization_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found",
        )

    # Verify batch.
    batch = db.get(Batch, batch_id)

    if batch is None or batch.item_id != item_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Batch not found",
        )

    statement = (
        select(InventoryLot)
        .where(InventoryLot.batch_id == batch_id)
        .order_by(InventoryLot.updated_at)
    )

    return db.scalars(statement).all()


@router.get(
    "/{inventory_lot_id}",
    response_model=InventoryLotResponse,
)
def get_inventory_lot(
    organization_id: UUID,
    item_id: UUID,
    batch_id: UUID,
    inventory_lot_id: UUID,
    db: Session = Depends(get_db),
):
    # Verify item.
    item = db.get(Item, item_id)

    if item is None or item.organization_id != organization_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found",
        )

    # Verify batch.
    batch = db.get(Batch, batch_id)

    if batch is None or batch.item_id != item_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Batch not found",
        )

    inventory_lot = db.get(InventoryLot, inventory_lot_id)

    if (
        inventory_lot is None
        or inventory_lot.batch_id != batch_id
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory record not found",
        )

    return inventory_lot