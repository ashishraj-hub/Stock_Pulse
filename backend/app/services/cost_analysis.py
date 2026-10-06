from collections import defaultdict
from datetime import date, timedelta
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.batch import Batch
from app.models.inventory_lot import InventoryLot
from app.models.item import Item
from app.models.purchase_order import PurchaseOrder, PurchaseOrderStatus
from app.models.purchase_order_item import PurchaseOrderItem
from app.models.stock_movement import MovementType, StockMovement
from app.schemas.cost_analysis import (
    CostAnalysisResponse,
    CostItemBreakdown,
    CostTrendPoint,
)


def get_cost_analysis(
    db: Session,
    *,
    organization_id: UUID,
    history_days: int = 30,
) -> CostAnalysisResponse:
    period_end = date.today()
    period_start = period_end - timedelta(days=history_days - 1)

    # ---------------------------------------------------------
    # 1. Procurement spend
    # ---------------------------------------------------------
    procurement_rows = (
        db.query(
            PurchaseOrderItem.item_id,
            PurchaseOrderItem.received_quantity,
            PurchaseOrderItem.unit_price,
            PurchaseOrder.order_date,
            PurchaseOrder.created_at,
        )
        .join(
            PurchaseOrder,
            PurchaseOrder.id == PurchaseOrderItem.purchase_order_id,
        )
        .filter(
            PurchaseOrder.organization_id == organization_id,
            PurchaseOrder.status == PurchaseOrderStatus.RECEIVED,
            PurchaseOrderItem.received_quantity > 0,
            PurchaseOrderItem.unit_price.isnot(None),
        )
        .all()
    )

    procurement_spend = Decimal("0")
    received_units = 0

    latest_unit_cost: dict[UUID, Decimal] = {}

    for row in procurement_rows:
        quantity = int(row.received_quantity)
        unit_price = Decimal(row.unit_price)

        procurement_spend += unit_price * quantity
        received_units += quantity

        latest_unit_cost[row.item_id] = unit_price

    # ---------------------------------------------------------
    # 2. Also include ordered POs that have already received
    #    partial quantities.
    #
    #    A PO can remain ORDERED while only partially received.
    # ---------------------------------------------------------
    partial_rows = (
        db.query(
            PurchaseOrderItem.item_id,
            PurchaseOrderItem.received_quantity,
            PurchaseOrderItem.unit_price,
            PurchaseOrder.order_date,
            PurchaseOrder.created_at,
        )
        .join(
            PurchaseOrder,
            PurchaseOrder.id == PurchaseOrderItem.purchase_order_id,
        )
        .filter(
            PurchaseOrder.organization_id == organization_id,
            PurchaseOrder.status == PurchaseOrderStatus.ORDERED,
            PurchaseOrderItem.received_quantity > 0,
            PurchaseOrderItem.unit_price.isnot(None),
        )
        .all()
    )

    for row in partial_rows:
        quantity = int(row.received_quantity)
        unit_price = Decimal(row.unit_price)

        procurement_spend += unit_price * quantity
        received_units += quantity

        latest_unit_cost[row.item_id] = unit_price

    # ---------------------------------------------------------
    # 3. Find the latest known purchase price for every item.
    #
    #    This is used to estimate inventory and wastage value.
    # ---------------------------------------------------------
    all_purchase_rows = (
        db.query(
            PurchaseOrderItem.item_id,
            PurchaseOrderItem.unit_price,
            PurchaseOrder.order_date,
            PurchaseOrder.created_at,
        )
        .join(
            PurchaseOrder,
            PurchaseOrder.id == PurchaseOrderItem.purchase_order_id,
        )
        .filter(
            PurchaseOrder.organization_id == organization_id,
            PurchaseOrder.status != PurchaseOrderStatus.CANCELLED,
            PurchaseOrderItem.unit_price.isnot(None),
        )
        .order_by(
            PurchaseOrder.order_date.desc().nullslast(),
            PurchaseOrder.created_at.desc(),
        )
        .all()
    )

    latest_purchase_price: dict[UUID, Decimal] = {}

    for row in all_purchase_rows:
        if row.item_id not in latest_purchase_price:
            latest_purchase_price[row.item_id] = Decimal(row.unit_price)

    # Prefer the latest known purchase price discovered above.
    latest_unit_cost.update(latest_purchase_price)

    # ---------------------------------------------------------
    # 4. Current inventory value
    # ---------------------------------------------------------
    inventory_rows = (
        db.query(
            Item.id,
            Item.sku,
            Item.name,
            func.coalesce(
                func.sum(
                    InventoryLot.quantity_on_hand
                    - InventoryLot.reserved_quantity
                ),
                0,
            ),
        )
        .join(Batch, Batch.item_id == Item.id)
        .join(InventoryLot, InventoryLot.batch_id == Batch.id)
        .filter(
            Item.organization_id == organization_id,
            Batch.is_archived.is_(False),
        )
        .group_by(Item.id, Item.sku, Item.name)
        .all()
    )

    inventory_by_item: list[CostItemBreakdown] = []
    estimated_inventory_value = Decimal("0")
    available_units = 0

    for item_id, sku, name, quantity in inventory_rows:
        quantity = int(quantity or 0)

        if quantity <= 0:
            continue

        unit_cost = latest_unit_cost.get(item_id, Decimal("0"))
        estimated_cost = unit_cost * quantity

        available_units += quantity
        estimated_inventory_value += estimated_cost

        inventory_by_item.append(
            CostItemBreakdown(
                item_id=item_id,
                sku=sku,
                item_name=name,
                quantity=quantity,
                unit_cost=unit_cost,
                estimated_cost=estimated_cost,
            )
        )

    inventory_by_item.sort(
        key=lambda row: row.estimated_cost,
        reverse=True,
    )

    # ---------------------------------------------------------
    # 5. Wastage
    # ---------------------------------------------------------
    wastage_rows = (
        db.query(
            StockMovement.item_id,
            StockMovement.quantity,
            StockMovement.created_at,
            Item.sku,
            Item.name,
        )
        .join(Item, Item.id == StockMovement.item_id)
        .filter(
            Item.organization_id == organization_id,
            StockMovement.movement_type == MovementType.WASTAGE,
            StockMovement.created_at >= period_start,
            StockMovement.created_at < period_end + timedelta(days=1),
        )
        .all()
    )

    wasted_units = 0
    estimated_wastage_cost = Decimal("0")

    wastage_by_item: dict[UUID, dict] = {}

    for row in wastage_rows:
        quantity = int(row.quantity)
        unit_cost = latest_unit_cost.get(
            row.item_id,
            Decimal("0"),
        )

        cost = unit_cost * quantity

        wasted_units += quantity
        estimated_wastage_cost += cost

        if row.item_id not in wastage_by_item:
            wastage_by_item[row.item_id] = {
                "sku": row.sku,
                "name": row.name,
                "quantity": 0,
                "unit_cost": unit_cost,
                "estimated_cost": Decimal("0"),
            }

        wastage_by_item[row.item_id]["quantity"] += quantity
        wastage_by_item[row.item_id]["estimated_cost"] += cost

    top_wastage_items = [
        CostItemBreakdown(
            item_id=item_id,
            sku=data["sku"],
            item_name=data["name"],
            quantity=data["quantity"],
            unit_cost=data["unit_cost"],
            estimated_cost=data["estimated_cost"],
        )
        for item_id, data in wastage_by_item.items()
    ]

    top_wastage_items.sort(
        key=lambda row: row.estimated_cost,
        reverse=True,
    )

    # ---------------------------------------------------------
    # 6. Daily trend
    # ---------------------------------------------------------
    daily_procurement: dict[date, Decimal] = defaultdict(
        lambda: Decimal("0")
    )
    daily_wastage: dict[date, Decimal] = defaultdict(
        lambda: Decimal("0")
    )

    # Procurement trend comes from stock RECEIVE movements.
    receive_rows = (
        db.query(
            StockMovement.item_id,
            StockMovement.quantity,
            StockMovement.created_at,
        )
        .join(Item, Item.id == StockMovement.item_id)
        .filter(
            Item.organization_id == organization_id,
            StockMovement.movement_type == MovementType.RECEIVE,
            StockMovement.created_at >= period_start,
            StockMovement.created_at < period_end + timedelta(days=1),
        )
        .all()
    )

    for row in receive_rows:
        movement_date = row.created_at.date()
        unit_cost = latest_unit_cost.get(
            row.item_id,
            Decimal("0"),
        )

        daily_procurement[movement_date] += (
            unit_cost * int(row.quantity)
        )

    for row in wastage_rows:
        movement_date = row.created_at.date()
        unit_cost = latest_unit_cost.get(
            row.item_id,
            Decimal("0"),
        )

        daily_wastage[movement_date] += (
            unit_cost * int(row.quantity)
        )

    trend: list[CostTrendPoint] = []

    current_date = period_start

    while current_date <= period_end:
        trend.append(
            CostTrendPoint(
                date=current_date,
                procurement_spend=daily_procurement[current_date],
                wastage_cost=daily_wastage[current_date],
            )
        )

        current_date += timedelta(days=1)

    return CostAnalysisResponse(
        period_start=period_start,
        period_end=period_end,
        procurement_spend=procurement_spend,
        estimated_wastage_cost=estimated_wastage_cost,
        estimated_inventory_value=estimated_inventory_value,
        received_units=received_units,
        wasted_units=wasted_units,
        available_units=available_units,
        top_wastage_items=top_wastage_items[:10],
        inventory_by_item=inventory_by_item[:50],
        trend=trend,
    )