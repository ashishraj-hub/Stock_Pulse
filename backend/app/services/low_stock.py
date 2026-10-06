from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.batch import Batch
from app.models.inventory_lot import InventoryLot
from app.models.item import Item


@dataclass
class LowStockItem:
    item_id: UUID
    sku: str
    name: str
    available_quantity: int
    reorder_point: int
    reorder_quantity: int
    lead_time_days: int
    shortage_quantity: int


def get_low_stock_items(
    db: Session,
    *,
    organization_id: UUID,
) -> list[LowStockItem]:

    stock_subquery = (
        select(
            Batch.item_id.label("item_id"),
            func.coalesce(
                func.sum(
                    InventoryLot.quantity_on_hand
                    - InventoryLot.reserved_quantity
                ),
                0,
            ).label("available_quantity"),
        )
        .join(
            InventoryLot,
            InventoryLot.batch_id == Batch.id,
        )
        .group_by(Batch.item_id)
        .subquery()
    )

    rows = db.execute(
        select(
            Item,
            func.coalesce(
                stock_subquery.c.available_quantity,
                0,
            ).label("available_quantity"),
        )
        .outerjoin(
            stock_subquery,
            stock_subquery.c.item_id == Item.id,
        )
        .where(
            Item.organization_id == organization_id,
            func.coalesce(
                stock_subquery.c.available_quantity,
                0,
            ) <= Item.reorder_point,
        )
        .order_by(Item.name.asc())
    ).all()

    results: list[LowStockItem] = []

    for item, available_quantity in rows:
        available_quantity = int(available_quantity or 0)

        shortage_quantity = max(
            item.reorder_point - available_quantity,
            0,
        )

        results.append(
            LowStockItem(
                item_id=item.id,
                sku=item.sku,
                name=item.name,
                available_quantity=available_quantity,
                reorder_point=item.reorder_point,
                reorder_quantity=item.reorder_quantity,
                lead_time_days=item.lead_time_days,
                shortage_quantity=shortage_quantity,
            )
        )

    return results