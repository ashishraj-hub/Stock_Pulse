from datetime import date
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.batch import Batch
from app.models.inventory_lot import InventoryLot
from app.models.item import Item
from app.models.location import Location
from app.schemas.alerts import AlertResponse


def get_inventory_alerts(
    db: Session,
    *,
    organization_id: UUID,
) -> list[AlertResponse]:
    """
    Build the current inventory alert state for one organization.

    Alerts are derived from current inventory and batch data.
    They are intentionally not persisted in the database.
    """

    alerts: list[AlertResponse] = []

    # ---------------------------------------------------------
    # 1. Stock-level alerts
    #
    # Calculate available stock per item:
    #
    # available = quantity_on_hand - reserved_quantity
    # ---------------------------------------------------------

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
        )
        .order_by(Item.name.asc())
    ).all()

    for item, available_quantity in item_rows:
        available_quantity = int(
            available_quantity or 0
        )

        # -----------------------------------------------------
        # Out of stock
        # -----------------------------------------------------

        if available_quantity <= 0:
            alerts.append(
                AlertResponse(
                    id=f"stock:out:{item.id}",
                    type="out_of_stock",
                    severity="critical",
                    title=f"{item.name} is out of stock",
                    message=(
                        f"Available quantity is "
                        f"{available_quantity} units."
                    ),
                    item_id=item.id,
                    sku=item.sku,
                    item_name=item.name,
                    available_quantity=available_quantity,
                    reorder_point=item.reorder_point,
                )
            )

        # -----------------------------------------------------
        # Low stock
        #
        # Out-of-stock items already have a stronger alert,
        # so do not create a duplicate low-stock alert.
        # -----------------------------------------------------

        elif available_quantity <= item.reorder_point:
            shortage_quantity = max(
                item.reorder_point
                - available_quantity,
                0,
            )

            alerts.append(
                AlertResponse(
                    id=f"stock:low:{item.id}",
                    type="low_stock",
                    severity="warning",
                    title=f"{item.name} is low on stock",
                    message=(
                        f"Available quantity is "
                        f"{available_quantity} units, "
                        f"{shortage_quantity} units below "
                        f"the reorder point."
                    ),
                    item_id=item.id,
                    sku=item.sku,
                    item_name=item.name,
                    available_quantity=available_quantity,
                    reorder_point=item.reorder_point,
                )
            )

    # ---------------------------------------------------------
    # 2. Expiry alerts
    #
    # Each batch/location combination can have a separate
    # expiry alert because the same batch may exist at
    # multiple locations.
    # ---------------------------------------------------------

    today = date.today()

    expiry_rows = db.execute(
        select(
            Batch,
            Item,
            InventoryLot,
            Location,
        )
        .join(
            Item,
            Item.id == Batch.item_id,
        )
        .join(
            InventoryLot,
            InventoryLot.batch_id == Batch.id,
        )
        .join(
            Location,
            Location.id == InventoryLot.location_id,
        )
        .where(
            Item.organization_id == organization_id,
            InventoryLot.quantity_on_hand
            - InventoryLot.reserved_quantity
            > 0,
            Batch.expiry_date.is_not(None),
        )
        .order_by(
            Batch.expiry_date.asc(),
            Item.name.asc(),
            Location.name.asc(),
        )
    ).all()

    for batch, item, inventory_lot, location in expiry_rows:
        if batch.expiry_date is None:
            continue

        available_quantity = max(
            int(
                inventory_lot.quantity_on_hand
                - inventory_lot.reserved_quantity
            ),
            0,
        )

        if available_quantity <= 0:
            continue

        days_until_expiry = (
            batch.expiry_date - today
        ).days

        # -----------------------------------------------------
        # Already expired
        # -----------------------------------------------------

        if days_until_expiry < 0:
            alerts.append(
                AlertResponse(
                    id=(
                        f"expiry:expired:"
                        f"{batch.id}:"
                        f"{location.id}"
                    ),
                    type="expired",
                    severity="critical",
                    title=(
                        f"{item.name} has expired stock"
                    ),
                    message=(
                        f"Lot {batch.lot_number} expired "
                        f"{abs(days_until_expiry)} days ago "
                        f"and still has "
                        f"{available_quantity} units "
                        f"available at {location.name}."
                    ),
                    item_id=item.id,
                    sku=item.sku,
                    item_name=item.name,
                    available_quantity=available_quantity,
                    reorder_point=item.reorder_point,
                    batch_id=batch.id,
                    lot_number=batch.lot_number,
                    location_id=location.id,
                    location_name=location.name,
                    expiry_date=batch.expiry_date,
                    days_until_expiry=days_until_expiry,
                )
            )

        # -----------------------------------------------------
        # Expires within 7 days
        # -----------------------------------------------------

        elif days_until_expiry <= 7:
            alerts.append(
                AlertResponse(
                    id=(
                        f"expiry:soon:"
                        f"{batch.id}:"
                        f"{location.id}"
                    ),
                    type="expiring_soon",
                    severity="warning",
                    title=(
                        f"{item.name} expires soon"
                    ),
                    message=(
                        f"Lot {batch.lot_number} expires "
                        f"in {days_until_expiry} days "
                        f"and has "
                        f"{available_quantity} units "
                        f"at {location.name}."
                    ),
                    item_id=item.id,
                    sku=item.sku,
                    item_name=item.name,
                    available_quantity=available_quantity,
                    reorder_point=item.reorder_point,
                    batch_id=batch.id,
                    lot_number=batch.lot_number,
                    location_id=location.id,
                    location_name=location.name,
                    expiry_date=batch.expiry_date,
                    days_until_expiry=days_until_expiry,
                )
            )

        # -----------------------------------------------------
        # Expires within 30 days
        #
        # 1-7 day batches already receive the stronger
        # "expiring soon" alert.
        # -----------------------------------------------------

        elif days_until_expiry <= 30:
            alerts.append(
                AlertResponse(
                    id=(
                        f"expiry:upcoming:"
                        f"{batch.id}:"
                        f"{location.id}"
                    ),
                    type="expiring",
                    severity="notice",
                    title=(
                        f"{item.name} is approaching expiry"
                    ),
                    message=(
                        f"Lot {batch.lot_number} expires "
                        f"in {days_until_expiry} days "
                        f"and has "
                        f"{available_quantity} units "
                        f"at {location.name}."
                    ),
                    item_id=item.id,
                    sku=item.sku,
                    item_name=item.name,
                    available_quantity=available_quantity,
                    reorder_point=item.reorder_point,
                    batch_id=batch.id,
                    lot_number=batch.lot_number,
                    location_id=location.id,
                    location_name=location.name,
                    expiry_date=batch.expiry_date,
                    days_until_expiry=days_until_expiry,
                )
            )

    # ---------------------------------------------------------
    # 3. Sort alerts by severity first.
    #
    # Critical → Warning → Notice
    # ---------------------------------------------------------

    severity_order = {
        "critical": 0,
        "warning": 1,
        "notice": 2,
    }

    alerts.sort(
        key=lambda alert: (
            severity_order[alert.severity],
            alert.title.lower(),
        )
    )

    return alerts