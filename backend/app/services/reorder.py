from datetime import date, timedelta
from math import ceil
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.batch import Batch
from app.models.inventory_lot import InventoryLot
from app.models.item import Item
from app.models.stock_movement import MovementType, StockMovement
from app.schemas.reorder import (
    ReorderStatusResponse,
    ReorderSuggestionResponse,
)
from app.schemas.smart_reorder import SmartReorderResponse
from app.services.forecast import build_forecast


def get_available_quantity(
    db: Session,
    item_id: UUID,
) -> int:
    """
    Calculate currently available inventory.

    Available quantity:
        quantity_on_hand - reserved_quantity
    """

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
            Batch.item_id == item_id,
        )
    )

    return int(available_quantity or 0)


def get_reorder_status(
    db: Session,
    *,
    organization_id: UUID,
    item_id: UUID,
) -> ReorderStatusResponse:
    """
    Return the current reorder status for one item.
    """

    item = db.scalar(
        select(Item).where(
            Item.id == item_id,
            Item.organization_id == organization_id,
        )
    )

    if item is None:
        raise ValueError("Item not found")

    available_quantity = get_available_quantity(
        db,
        item_id,
    )

    is_low_stock = (
        available_quantity <= item.reorder_point
    )

    return ReorderStatusResponse(
        item_id=item.id,
        sku=item.sku,
        name=item.name,
        available_quantity=available_quantity,
        reorder_point=item.reorder_point,
        reorder_quantity=item.reorder_quantity,
        lead_time_days=item.lead_time_days,
        is_low_stock=is_low_stock,
    )


def get_reorder_suggestion(
    db: Session,
    *,
    organization_id: UUID,
    item_id: UUID,
) -> ReorderSuggestionResponse:
    """
    Return the existing static reorder suggestion.

    This preserves the original StockPulse reorder behavior.
    Smart reorder is implemented separately below.
    """

    status_result = get_reorder_status(
        db,
        organization_id=organization_id,
        item_id=item_id,
    )

    suggested_quantity = (
        status_result.reorder_quantity
        if status_result.is_low_stock
        else 0
    )

    return ReorderSuggestionResponse(
        item_id=status_result.item_id,
        sku=status_result.sku,
        name=status_result.name,
        available_quantity=status_result.available_quantity,
        reorder_point=status_result.reorder_point,
        suggested_quantity=suggested_quantity,
        lead_time_days=status_result.lead_time_days,
        is_low_stock=status_result.is_low_stock,
    )


def calculate_smart_reorder_quantity(
    *,
    predicted_daily_usage: float,
    lead_time_days: int,
    available_quantity: int,
    safety_stock_days: int,
) -> dict:
    """
    Calculate a demand-based reorder recommendation.

    Formula:

        lead_time_demand
            = predicted_daily_usage × lead_time_days

        safety_stock
            = predicted_daily_usage × safety_stock_days

        target_stock
            = lead_time_demand + safety_stock

        recommended_quantity
            = max(
                0,
                target_stock - available_quantity
            )
    """

    if predicted_daily_usage < 0:
        raise ValueError(
            "predicted_daily_usage cannot be negative"
        )

    if lead_time_days < 0:
        raise ValueError(
            "lead_time_days cannot be negative"
        )

    if available_quantity < 0:
        raise ValueError(
            "available_quantity cannot be negative"
        )

    if safety_stock_days < 0:
        raise ValueError(
            "safety_stock_days cannot be negative"
        )

    lead_time_demand = (
        predicted_daily_usage * lead_time_days
    )

    safety_stock = (
        predicted_daily_usage * safety_stock_days
    )

    target_stock = (
        lead_time_demand + safety_stock
    )

    raw_recommended_quantity = (
        target_stock - available_quantity
    )

    recommended_quantity = max(
        0,
        ceil(raw_recommended_quantity),
    )

    return {
        "lead_time_demand": round(
            lead_time_demand,
            2,
        ),
        "safety_stock": round(
            safety_stock,
            2,
        ),
        "target_stock": round(
            target_stock,
            2,
        ),
        "recommended_quantity": recommended_quantity,
    }


def get_smart_reorder_recommendation(
    *,
    db: Session,
    organization_id: UUID,
    item_id: UUID,
    history_days: int,
    forecast_days: int,
    safety_stock_days: int,
) -> SmartReorderResponse:
    """
    Generate a demand-based reorder recommendation
    for one item.
    """

    item = db.scalar(
        select(Item).where(
            Item.id == item_id,
            Item.organization_id == organization_id,
        )
    )

    if item is None:
        raise ValueError("Item not found")

    available_quantity = get_available_quantity(
        db,
        item_id,
    )

    today = date.today()

    start_date = (
        today - timedelta(days=history_days - 1)
    )

    end_date = today + timedelta(days=1)

    usage_rows = db.execute(
        select(
            func.date(
                StockMovement.created_at
            ).label("usage_date"),
            func.sum(
                StockMovement.quantity
            ).label("usage_quantity"),
        )
        .where(
            StockMovement.item_id == item_id,
            StockMovement.movement_type
            == MovementType.ISSUE,
            StockMovement.created_at >= start_date,
            StockMovement.created_at < end_date,
        )
        .group_by(
            func.date(
                StockMovement.created_at
            )
        )
        .order_by(
            func.date(
                StockMovement.created_at
            )
        )
    ).all()

    usage_history = [
        {
            "date": row.usage_date,
            "quantity": int(row.usage_quantity),
        }
        for row in usage_rows
    ]

    if len(usage_history) < 3:
        raise ValueError(
            "At least 3 days of usage history are required "
            "to generate a smart reorder recommendation"
        )

    forecast_result = build_forecast(
        usage_history=usage_history,
        forecast_days=forecast_days,
    )

    calculation = calculate_smart_reorder_quantity(
        predicted_daily_usage=(
            forecast_result.predicted_daily_usage
        ),
        lead_time_days=item.lead_time_days,
        available_quantity=available_quantity,
        safety_stock_days=safety_stock_days,
    )

    return SmartReorderResponse(
        item_id=item.id,
        sku=item.sku,
        name=item.name,
        available_quantity=available_quantity,
        reorder_point=item.reorder_point,
        lead_time_days=item.lead_time_days,
        safety_stock_days=safety_stock_days,
        average_daily_usage=(
            forecast_result.average_daily_usage
        ),
        predicted_daily_usage=(
            forecast_result.predicted_daily_usage
        ),
        lead_time_demand=calculation[
            "lead_time_demand"
        ],
        safety_stock=calculation[
            "safety_stock"
        ],
        target_stock=calculation[
            "target_stock"
        ],
        recommended_quantity=calculation[
            "recommended_quantity"
        ],
        forecast_method=forecast_result.method,
        forecast_confidence=forecast_result.confidence,
        is_low_stock=(
            available_quantity
            <= item.reorder_point
        ),
    )