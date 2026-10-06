from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.batch import Batch
from app.models.inventory_lot import InventoryLot
from app.models.item import Item


def get_dashboard_summary(
    db: Session,
    *,
    organization_id: UUID,
):
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

    item_rows = db.execute(
        select(
            Item.id,
            Item.reorder_point,
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
        )
    ).all()

    total_items = len(item_rows)

    total_available_units = sum(
        int(row.available_quantity or 0)
        for row in item_rows
    )

    low_stock_count = sum(
        1
        for row in item_rows
        if int(row.available_quantity or 0)
        <= row.reorder_point
    )

    out_of_stock_count = sum(
        1
        for row in item_rows
        if int(row.available_quantity or 0) <= 0
    )

    pending_reorder_count = low_stock_count

    return {
        "total_items": total_items,
        "total_available_units": total_available_units,
        "low_stock_count": low_stock_count,
        "out_of_stock_count": out_of_stock_count,
        "pending_reorder_count": pending_reorder_count,
    }