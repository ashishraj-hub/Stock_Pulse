from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.batch import Batch
from app.models.inventory_lot import InventoryLot
from app.models.item import Item


@dataclass
class ReorderStatus:
    item_id: UUID
    sku: str
    name: str
    available_quantity: int
    reorder_point: int
    reorder_quantity: int
    lead_time_days: int
    is_low_stock: bool


def get_reorder_status(
    db: Session,
    *,
    organization_id: UUID,
    item_id: UUID,
) -> ReorderStatus:
    # 1. Find the item inside the requested organization.
    item = db.scalar(
        select(Item).where(
            Item.id == item_id,
            Item.organization_id == organization_id,
        )
    )

    if item is None:
        raise ValueError("Item not found")

    # 2. Calculate available stock across all locations.
    #
    # InventoryLot -> Batch -> Item
    #
    # available = quantity_on_hand - reserved_quantity
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
        .join(
            Batch,
            InventoryLot.batch_id == Batch.id,
        )
        .where(
            Batch.item_id == item_id,
        )
    )

    available_quantity = int(available_quantity or 0)

    # 3. Compare available stock with the item's reorder point.
    is_low_stock = available_quantity <= item.reorder_point

    return ReorderStatus(
        item_id=item.id,
        sku=item.sku,
        name=item.name,
        available_quantity=available_quantity,
        reorder_point=item.reorder_point,
        reorder_quantity=item.reorder_quantity,
        lead_time_days=item.lead_time_days,
        is_low_stock=is_low_stock,
    )


@dataclass
class ReorderSuggestion:
    item_id: UUID
    sku: str
    name: str
    available_quantity: int
    reorder_point: int
    suggested_quantity: int
    lead_time_days: int
    is_low_stock: bool


def get_reorder_suggestion(
    db: Session,
    *,
    organization_id: UUID,
    item_id: UUID,
) -> ReorderSuggestion:
    status = get_reorder_status(
        db,
        organization_id=organization_id,
        item_id=item_id,
    )

    suggested_quantity = (
        status.reorder_quantity
        if status.is_low_stock
        else 0
    )

    return ReorderSuggestion(
        item_id=status.item_id,
        sku=status.sku,
        name=status.name,
        available_quantity=status.available_quantity,
        reorder_point=status.reorder_point,
        suggested_quantity=suggested_quantity,
        lead_time_days=status.lead_time_days,
        is_low_stock=status.is_low_stock,
    )