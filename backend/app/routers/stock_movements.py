from datetime import date, timedelta
from uuid import UUID

from sqlalchemy import func, select

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.audit import create_audit_log
from app.core.dependencies import get_current_user, require_roles
from app.db.dependencies import get_db
from app.models.batch import Batch
from app.models.inventory_lot import InventoryLot
from app.models.item import Item
from app.models.location import Location
from app.models.stock_movement import MovementType, StockMovement
from app.models.user import User, UserRole
from app.schemas.forecast import ForecastResponse
from app.services.forecast import build_forecast
from app.schemas.stock_movement import (
    FefoIssueRequest,
    IssueStockRequest,
    ReceiveStockRequest,
    StockMovementListItemResponse,
    StockMovementResponse,
    TransferStockRequest,
    UsageHistoryItemResponse,
    WastageStockRequest,
)


router = APIRouter(
    prefix="/api/v1/organizations/{organization_id}",
    tags=["Stock Movements"],
)


@router.get(
    "/stock-movements",
    response_model=list[StockMovementListItemResponse],
)
def list_stock_movements(
    organization_id: UUID,
    movement_type: MovementType | None = None,
    item_id: UUID | None = None,
    location_id: UUID | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 1. Verify the authenticated user belongs to this organization.
    if current_user.organization_id != organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this organization",
        )

    # 2. Build the movement-history query.
    stmt = (
        select(
            StockMovement,
            Item,
            Batch,
            Location,
            User,
        )
        .join(
            Item,
            StockMovement.item_id == Item.id,
        )
        .outerjoin(
            Batch,
            StockMovement.batch_id == Batch.id,
        )
        .join(
            Location,
            StockMovement.location_id == Location.id,
        )
        .join(
            User,
            StockMovement.performed_by == User.id,
        )
        .where(
            Item.organization_id == organization_id,
            Location.organization_id == organization_id,
        )
        .order_by(
            StockMovement.created_at.desc(),
        )
    )

    # 3. Optional movement-type filter.
    if movement_type is not None:
        stmt = stmt.where(
            StockMovement.movement_type == movement_type
        )

    # 4. Optional item filter.
    if item_id is not None:
        stmt = stmt.where(
            StockMovement.item_id == item_id
        )

    # 5. Optional location filter.
    if location_id is not None:
        stmt = stmt.where(
            StockMovement.location_id == location_id
        )

    # 6. Execute query.
    rows = db.execute(stmt).all()

    # 7. Convert database rows into API responses.
    results = []

    for movement, item, batch, location, user in rows:
        results.append(
            StockMovementListItemResponse(
                id=movement.id,
                item_id=item.id,
                sku=item.sku,
                item_name=item.name,
                batch_id=batch.id if batch else None,
                lot_number=batch.lot_number if batch else None,
                location_id=location.id,
                location_name=location.name,
                performed_by=user.id if user else None,
                performed_by_name=user.name if user else None,
                movement_type=movement.movement_type,
                quantity=movement.quantity,
                reason=movement.reason,
                created_at=movement.created_at,
            )
        )

    return results


@router.get(
    "/items/{item_id}/usage-history",
    response_model=list[UsageHistoryItemResponse],
)
def get_item_usage_history(
    organization_id: UUID,
    item_id: UUID,
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return daily item usage based on ISSUE stock movements.

    Only ISSUE movements are treated as consumption/demand.
    Receiving, transfers, wastage, and other movement types
    are intentionally excluded from this first forecasting dataset.
    """

    # 1. Verify authenticated user belongs to this organization.
    if current_user.organization_id != organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this organization",
        )

    # 2. Validate requested history length.
    if days < 1 or days > 365:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="days must be between 1 and 365",
        )

    # 3. Verify item belongs to this organization.
    item = db.get(Item, item_id)

    if item is None or item.organization_id != organization_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found",
        )

    # 4. Determine the date range.
    today = date.today()
    start_date = today - timedelta(days=days - 1)

    # 5. Convert the date range into a timezone-aware timestamp range.
    start_datetime = func.date_trunc(
        "day",
        func.now(),
    )

    # We use a Python datetime range below so that the query remains
    # straightforward and PostgreSQL can use the created_at index.
    from datetime import datetime, timezone

    start_datetime_value = datetime.combine(
        start_date,
        datetime.min.time(),
        tzinfo=timezone.utc,
    )

    end_datetime_value = datetime.combine(
        today + timedelta(days=1),
        datetime.min.time(),
        tzinfo=timezone.utc,
    )

    # 6. Aggregate ISSUE movements by calendar day.
    rows = db.execute(
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
            StockMovement.movement_type == MovementType.ISSUE,
            StockMovement.created_at >= start_datetime_value,
            StockMovement.created_at < end_datetime_value,
        )
        .group_by(
            func.date(StockMovement.created_at),
        )
        .order_by(
            func.date(StockMovement.created_at).asc(),
        )
    ).all()

    # 7. Convert database rows into API responses.
    return [
        UsageHistoryItemResponse(
            date=row.usage_date,
            quantity=int(row.usage_quantity),
        )
        for row in rows
    ]


@router.get(
    "/items/{item_id}/forecast",
    response_model=ForecastResponse,
)
def get_item_forecast(
    organization_id: UUID,
    item_id: UUID,
    history_days: int = 30,
    forecast_days: int = 7,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.organization_id != organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organization access denied",
        )

    if history_days < 1 or history_days > 365:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="history_days must be between 1 and 365",
        )

    if forecast_days < 1 or forecast_days > 90:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="forecast_days must be between 1 and 90",
        )

    item = db.scalar(
        select(Item).where(
            Item.id == item_id,
            Item.organization_id == organization_id,
        )
    )

    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found",
        )

    today = date.today()
    start_date = today - timedelta(days=history_days - 1)
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
            StockMovement.movement_type == MovementType.ISSUE,
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
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "At least 3 days of usage history are required "
                "to generate a forecast"
            ),
        )

    try:
        result = build_forecast(
            usage_history=usage_history,
            forecast_days=forecast_days,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        )

    return ForecastResponse(
        item_id=item_id,
        historical_days=history_days,
        forecast_days=forecast_days,
        average_daily_usage=result.average_daily_usage,
        predicted_daily_usage=result.predicted_daily_usage,
        forecast=result.forecast,
        method=result.method,
        confidence=result.confidence,
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
    current_user: User = Depends(
        require_roles(UserRole.ADMIN, UserRole.STAFF)
    ),
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

    # 7. Flush both changes together.
    db.flush()

    create_audit_log(
        db,
        organization_id=organization_id,
        user_id=current_user.id,
        action="stock.receive",
        entity_type="StockMovement",
        entity_id=movement.id,
        details={
            "item_id": str(item_id),
            "batch_id": str(batch_id),
            "location_id": str(location_id),
            "quantity": data.quantity,
            "reason": data.reason,
        },
    )

    db.commit()

    # 8. Refresh movement from database.
    db.refresh(movement)

    return movement


@router.post(
    "/items/{item_id}/batches/{batch_id}/locations/{location_id}/issue",
    response_model=StockMovementResponse,
    status_code=status.HTTP_201_CREATED,
)
def issue_stock(
    organization_id: UUID,
    item_id: UUID,
    batch_id: UUID,
    location_id: UUID,
    data: IssueStockRequest,
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

    item = db.get(Item, item_id)

    if item is None or item.organization_id != organization_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found",
        )

    batch = db.get(Batch, batch_id)

    if batch is None or batch.item_id != item_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Batch not found",
        )

    location = db.get(Location, location_id)

    if location is None or location.organization_id != organization_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found",
        )

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
            detail="Inventory record not found",
        )

    available_quantity = (
        inventory_lot.quantity_on_hand
        - inventory_lot.reserved_quantity
    )

    if data.quantity > available_quantity:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Insufficient available stock",
        )

    inventory_lot.quantity_on_hand -= data.quantity

    movement = StockMovement(
        item_id=item_id,
        batch_id=batch_id,
        location_id=location_id,
        performed_by=current_user.id,
        movement_type=MovementType.ISSUE,
        quantity=data.quantity,
        reason=data.reason,
    )

    db.add(movement)
    db.flush()

    create_audit_log(
        db,
        organization_id=organization_id,
        user_id=current_user.id,
        action="stock.issue",
        entity_type="StockMovement",
        entity_id=movement.id,
        details={
            "item_id": str(item_id),
            "batch_id": str(batch_id),
            "location_id": str(location_id),
            "quantity": data.quantity,
            "reason": data.reason,
        },
    )

    db.commit()
    db.refresh(movement)

    return movement


@router.post(
    "/items/{item_id}/batches/{batch_id}/locations/{location_id}/wastage",
    response_model=StockMovementResponse,
    status_code=status.HTTP_201_CREATED,
)
def record_wastage(
    organization_id: UUID,
    item_id: UUID,
    batch_id: UUID,
    location_id: UUID,
    data: WastageStockRequest,
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

    item = db.get(Item, item_id)

    if item is None or item.organization_id != organization_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found",
        )

    batch = db.get(Batch, batch_id)

    if batch is None or batch.item_id != item_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Batch not found",
        )

    location = db.get(Location, location_id)

    if location is None or location.organization_id != organization_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found",
        )

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
            detail="Inventory record not found",
        )

    available_quantity = (
        inventory_lot.quantity_on_hand
        - inventory_lot.reserved_quantity
    )

    if data.quantity > available_quantity:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Insufficient available stock",
        )

    inventory_lot.quantity_on_hand -= data.quantity

    movement = StockMovement(
        item_id=item_id,
        batch_id=batch_id,
        location_id=location_id,
        performed_by=current_user.id,
        movement_type=MovementType.WASTAGE,
        quantity=data.quantity,
        reason=data.reason,
    )

    db.add(movement)

    db.flush()

    create_audit_log(
        db,
        organization_id=organization_id,
        user_id=current_user.id,
        action="stock.wastage",
        entity_type="StockMovement",
        entity_id=movement.id,
        details={
            "item_id": str(item_id),
            "batch_id": str(batch_id),
            "location_id": str(location_id),
            "quantity": data.quantity,
            "reason": data.reason,
        },
    )

    db.commit()
    db.refresh(movement)

    return movement


@router.post(
    "/items/{item_id}/batches/{batch_id}/locations/{location_id}/transfer",
    response_model=list[StockMovementResponse],
    status_code=status.HTTP_201_CREATED,
)
def transfer_stock(
    organization_id: UUID,
    item_id: UUID,
    batch_id: UUID,
    location_id: UUID,
    data: TransferStockRequest,
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

    if location_id == data.destination_location_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Source and destination locations must be different",
        )

    item = db.get(Item, item_id)

    if item is None or item.organization_id != organization_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found",
        )

    batch = db.get(Batch, batch_id)

    if batch is None or batch.item_id != item_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Batch not found",
        )

    source_location = db.get(Location, location_id)

    if (
        source_location is None
        or source_location.organization_id != organization_id
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Source location not found",
        )

    destination_location = db.get(
        Location,
        data.destination_location_id,
    )

    if (
        destination_location is None
        or destination_location.organization_id != organization_id
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Destination location not found",
        )

    source_inventory_lot = (
        db.query(InventoryLot)
        .filter(
            InventoryLot.batch_id == batch_id,
            InventoryLot.location_id == location_id,
        )
        .first()
    )

    if source_inventory_lot is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Source inventory record not found",
        )

    available_quantity = (
        source_inventory_lot.quantity_on_hand
        - source_inventory_lot.reserved_quantity
    )

    if data.quantity > available_quantity:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Insufficient available stock",
        )

    destination_inventory_lot = (
        db.query(InventoryLot)
        .filter(
            InventoryLot.batch_id == batch_id,
            InventoryLot.location_id == data.destination_location_id,
        )
        .first()
    )

    if destination_inventory_lot is None:
        destination_inventory_lot = InventoryLot(
            batch_id=batch_id,
            location_id=data.destination_location_id,
            quantity_on_hand=0,
            reserved_quantity=0,
        )
        db.add(destination_inventory_lot)

    source_inventory_lot.quantity_on_hand -= data.quantity
    destination_inventory_lot.quantity_on_hand += data.quantity

    source_movement = StockMovement(
        item_id=item_id,
        batch_id=batch_id,
        location_id=location_id,
        performed_by=current_user.id,
        movement_type=MovementType.TRANSFER,
        quantity=data.quantity,
        reason=data.reason,
    )

    destination_movement = StockMovement(
        item_id=item_id,
        batch_id=batch_id,
        location_id=data.destination_location_id,
        performed_by=current_user.id,
        movement_type=MovementType.TRANSFER,
        quantity=data.quantity,
        reason=data.reason,
    )

    db.add(source_movement)
    db.add(destination_movement)

    db.flush()

    create_audit_log(
        db,
        organization_id=organization_id,
        user_id=current_user.id,
        action="stock.transfer",
        entity_type="StockMovement",
        entity_id=source_movement.id,
        details={
            "item_id": str(item_id),
            "batch_id": str(batch_id),
            "source_location_id": str(location_id),
            "destination_location_id": str(data.destination_location_id),
            "quantity": data.quantity,
            "reason": data.reason,
            "destination_movement_id": str(destination_movement.id),
        },
    )

    db.commit()

    db.refresh(source_movement)
    db.refresh(destination_movement)

    return [source_movement, destination_movement]


@router.post(
    "/items/{item_id}/locations/{location_id}/fefo-issue",
    response_model=list[StockMovementResponse],
    status_code=status.HTTP_201_CREATED,
)
def fefo_issue_stock(
    organization_id: UUID,
    item_id: UUID,
    location_id: UUID,
    data: FefoIssueRequest,
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

    item = db.get(Item, item_id)

    if item is None or item.organization_id != organization_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found",
        )

    location = db.get(Location, location_id)

    if location is None or location.organization_id != organization_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found",
        )

    inventory_lots = (
        db.query(InventoryLot)
        .join(Batch, InventoryLot.batch_id == Batch.id)
        .filter(
            InventoryLot.location_id == location_id,
            Batch.item_id == item_id,
            InventoryLot.quantity_on_hand > InventoryLot.reserved_quantity,
        )
        .order_by(
            Batch.expiry_date.asc().nullslast(),
            Batch.received_at.asc(),
        )
        .all()
    )

    available_quantity = sum(
        lot.quantity_on_hand - lot.reserved_quantity
        for lot in inventory_lots
    )

    if data.quantity > available_quantity:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Insufficient available stock",
        )

    remaining_quantity = data.quantity
    movements: list[StockMovement] = []

    for inventory_lot in inventory_lots:
        if remaining_quantity == 0:
            break

        available_from_lot = (
            inventory_lot.quantity_on_hand
            - inventory_lot.reserved_quantity
        )

        quantity_to_issue = min(
            remaining_quantity,
            available_from_lot,
        )

        inventory_lot.quantity_on_hand -= quantity_to_issue

        movement = StockMovement(
            item_id=item_id,
            batch_id=inventory_lot.batch_id,
            location_id=location_id,
            performed_by=current_user.id,
            movement_type=MovementType.ISSUE,
            quantity=quantity_to_issue,
            reason=data.reason,
        )

        db.add(movement)
        movements.append(movement)

        remaining_quantity -= quantity_to_issue

    db.flush()

    create_audit_log(
        db,
        organization_id=organization_id,
        user_id=current_user.id,
        action="stock.fefo_issue",
        entity_type="Item",
        entity_id=item_id,
        details={
            "location_id": str(location_id),
            "requested_quantity": data.quantity,
            "reason": data.reason,
            "movements": [
                {
                    "movement_id": str(movement.id),
                    "batch_id": str(movement.batch_id),
                    "quantity": movement.quantity,
                }
                for movement in movements
            ],
        },
    )

    db.commit()

    for movement in movements:
        db.refresh(movement)

    return movements