from datetime import date, timedelta
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.batch import Batch
from app.models.inventory_lot import InventoryLot
from app.models.item import Item
from app.models.stock_movement import MovementType, StockMovement
from app.services.forecast import build_forecast
from app.services.reorder import get_smart_reorder_recommendation


def get_analytics_summary(
    db: Session,
    *,
    organization_id: UUID,
    history_days: int = 30,
    expiring_days: int = 30,
):
    today = date.today()

    # ---------------------------------------------------------
    # Inventory overview
    # ---------------------------------------------------------

    item_rows = db.scalars(
        select(Item)
        .where(Item.organization_id == organization_id)
        .order_by(Item.name.asc())
    ).all()

    total_items = len(item_rows)

    available_by_item: dict[UUID, int] = {}

    inventory_rows = db.execute(
        select(
            InventoryLot,
            Batch,
            Item,
        )
        .join(Batch, InventoryLot.batch_id == Batch.id)
        .join(Item, Batch.item_id == Item.id)
        .where(Item.organization_id == organization_id)
    ).all()

    for inventory_lot, batch, item in inventory_rows:
        available_quantity = max(
            inventory_lot.quantity_on_hand
            - inventory_lot.reserved_quantity,
            0,
        )

        available_by_item[item.id] = (
            available_by_item.get(item.id, 0)
            + available_quantity
        )

    total_available_units = sum(available_by_item.values())

    low_stock_count = 0
    out_of_stock_count = 0

    for item in item_rows:
        available_quantity = available_by_item.get(item.id, 0)

        if available_quantity <= item.reorder_point:
            low_stock_count += 1

        if available_quantity == 0:
            out_of_stock_count += 1

    # ---------------------------------------------------------
    # Stock movements
    # ---------------------------------------------------------

    movement_rows = db.execute(
        select(
            StockMovement.movement_type,
            func.coalesce(func.sum(StockMovement.quantity), 0),
        )
        .join(Item, StockMovement.item_id == Item.id)
        .where(Item.organization_id == organization_id)
        .group_by(StockMovement.movement_type)
    ).all()

    movement_totals = {
        movement_type.value: int(total or 0)
        for movement_type, total in movement_rows
    }

    total_received_units = movement_totals.get(
        MovementType.RECEIVE.value,
        0,
    )

    total_issued_units = movement_totals.get(
        MovementType.ISSUE.value,
        0,
    )

    total_wastage_units = movement_totals.get(
        MovementType.WASTAGE.value,
        0,
    )

    total_transfer_units = movement_totals.get(
        MovementType.TRANSFER.value,
        0,
    )

    movement_summary = {
        "receive": total_received_units,
        "issue": total_issued_units,
        "wastage": total_wastage_units,
        "transfer": total_transfer_units,
    }

    # ---------------------------------------------------------
    # Usage history
    # ---------------------------------------------------------

    history_start = today - timedelta(days=history_days - 1)

    usage_rows = db.execute(
        select(
            func.date(StockMovement.created_at).label("usage_date"),
            func.sum(StockMovement.quantity).label("quantity"),
        )
        .join(Item, StockMovement.item_id == Item.id)
        .where(
            Item.organization_id == organization_id,
            StockMovement.movement_type == MovementType.ISSUE,
            StockMovement.created_at >= history_start,
        )
        .group_by(func.date(StockMovement.created_at))
        .order_by(func.date(StockMovement.created_at))
    ).all()

    usage_by_date = {
        row.usage_date: int(row.quantity or 0)
        for row in usage_rows
    }

    daily_usage = []

    for offset in range(history_days):
        usage_date = history_start + timedelta(days=offset)

        daily_usage.append(
            {
                "date": usage_date,
                "quantity": usage_by_date.get(
                    usage_date,
                    0,
                ),
            }
        )

    total_usage = sum(
        row["quantity"]
        for row in daily_usage
    )

    average_daily_usage = (
        total_usage / history_days
        if history_days > 0
        else 0
    )

    # ---------------------------------------------------------
    # Forecast
    # ---------------------------------------------------------

    forecast_result = None

    if total_usage > 0:
        try:
            forecast_result = build_forecast(
                usage_history=daily_usage,
                forecast_days=7,
            )
        except ValueError:
            forecast_result = None

    predicted_daily_usage = (
        forecast_result.predicted_daily_usage
        if forecast_result is not None
        else average_daily_usage
    )

    # ---------------------------------------------------------
    # Top consumed items
    # ---------------------------------------------------------

    top_usage_rows = db.execute(
        select(
            Item.id,
            Item.sku,
            Item.name,
            func.sum(StockMovement.quantity).label("quantity"),
        )
        .join(
            StockMovement,
            StockMovement.item_id == Item.id,
        )
        .where(
            Item.organization_id == organization_id,
            StockMovement.movement_type == MovementType.ISSUE,
            StockMovement.created_at >= history_start,
        )
        .group_by(
            Item.id,
            Item.sku,
            Item.name,
        )
        .order_by(
            func.sum(StockMovement.quantity).desc()
        )
        .limit(10)
    ).all()

    top_consumed_items = [
        {
            "item_id": row.id,
            "sku": row.sku,
            "name": row.name,
            "quantity": int(row.quantity or 0),
        }
        for row in top_usage_rows
    ]

    # ---------------------------------------------------------
    # Expiring inventory
    # ---------------------------------------------------------

    expiry_limit = today + timedelta(days=expiring_days)

    expiring_rows = db.execute(
        select(
            InventoryLot,
            Batch,
            Item,
        )
        .join(Batch, InventoryLot.batch_id == Batch.id)
        .join(Item, Batch.item_id == Item.id)
        .where(
            Item.organization_id == organization_id,
            Batch.expiry_date.is_not(None),
            Batch.expiry_date <= expiry_limit,
            InventoryLot.quantity_on_hand
            > InventoryLot.reserved_quantity,
        )
        .order_by(Batch.expiry_date.asc())
    ).all()

    expiring_items = []

    for inventory_lot, batch, item in expiring_rows:
        available_quantity = max(
            inventory_lot.quantity_on_hand
            - inventory_lot.reserved_quantity,
            0,
        )

        if available_quantity <= 0:
            continue

        days_until_expiry = (
            batch.expiry_date - today
        ).days

        expiring_items.append(
            {
                "item_id": item.id,
                "sku": item.sku,
                "name": item.name,
                "lot_number": batch.lot_number,
                "expiry_date": batch.expiry_date,
                "quantity": available_quantity,
                "days_until_expiry": days_until_expiry,
            }
        )

    # ---------------------------------------------------------
    # Forecast-based reorder intelligence
    # ---------------------------------------------------------

    forecast_reorder_count = 0
    forecast_reorder_units = 0

    for item in item_rows:
        try:
            recommendation = get_smart_reorder_recommendation(
                db=db,
                item_id=item.id,
                organization_id=organization_id,
                history_days=30,
                forecast_days=7,
                safety_stock_days=3,
            )
        except ValueError:
            continue

        if (
            recommendation.recommended_quantity > 0
            and not recommendation.is_low_stock
        ):
            forecast_reorder_count += 1
            forecast_reorder_units += (
                recommendation.recommended_quantity
            )

    return {
        "total_items": total_items,
        "total_available_units": total_available_units,
        "low_stock_count": low_stock_count,
        "out_of_stock_count": out_of_stock_count,

        "total_received_units": total_received_units,
        "total_issued_units": total_issued_units,
        "total_wastage_units": total_wastage_units,
        "total_transfer_units": total_transfer_units,

        "average_daily_usage": round(
            average_daily_usage,
            2,
        ),
        "predicted_daily_usage": round(
            predicted_daily_usage,
            2,
        ),

        "forecast_reorder_count": forecast_reorder_count,
        "forecast_reorder_units": forecast_reorder_units,

        "movement_summary": movement_summary,

        "top_consumed_items": top_consumed_items,
        "daily_usage": daily_usage,
        "expiring_items": expiring_items,
    }