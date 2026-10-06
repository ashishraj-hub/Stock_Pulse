from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.audit import create_audit_log
from app.core.dependencies import get_current_user, require_roles
from app.db.dependencies import get_db
from app.models.batch import Batch
from app.models.inventory_lot import InventoryLot
from app.models.item import Item
from app.models.purchase_order import PurchaseOrder, PurchaseOrderStatus
from app.models.purchase_order_item import PurchaseOrderItem
from app.models.supplier import Supplier
from app.models.user import User, UserRole
from app.schemas.smart_reorder import SmartReorderResponse
from app.services.reorder import (
    get_smart_reorder_recommendation,
)
from app.schemas.reorder import (
    ReorderCenterItemResponse,
    ReorderPurchaseOrderCreate,
    ReorderPurchaseOrderResponse,
    ReorderStatusResponse,
    ReorderSuggestionResponse,
)
from app.services.reorder import (
    get_reorder_status,
    get_reorder_suggestion,
)


router = APIRouter(
    prefix="/api/v1/organizations/{organization_id}",
    tags=["reorder"],
)


@router.get(
    "/items/{item_id}/reorder-status",
    response_model=ReorderStatusResponse,
)
def reorder_status(
    organization_id: UUID,
    item_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.organization_id != organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this organization",
        )

    try:
        result = get_reorder_status(
            db,
            organization_id=organization_id,
            item_id=item_id,
        )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found",
        )

    return ReorderStatusResponse(
        item_id=result.item_id,
        sku=result.sku,
        name=result.name,
        available_quantity=result.available_quantity,
        reorder_point=result.reorder_point,
        reorder_quantity=result.reorder_quantity,
        lead_time_days=result.lead_time_days,
        is_low_stock=result.is_low_stock,
    )


@router.get(
    "/items/{item_id}/reorder-suggestion",
    response_model=ReorderSuggestionResponse,
)
def reorder_suggestion(
    organization_id: UUID,
    item_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.organization_id != organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this organization",
        )

    try:
        result = get_reorder_suggestion(
            db,
            organization_id=organization_id,
            item_id=item_id,
        )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found",
        )

    return ReorderSuggestionResponse(
        item_id=result.item_id,
        sku=result.sku,
        name=result.name,
        available_quantity=result.available_quantity,
        reorder_point=result.reorder_point,
        suggested_quantity=result.suggested_quantity,
        lead_time_days=result.lead_time_days,
        is_low_stock=result.is_low_stock,
    )


@router.get(
    "/reorder-center",
    response_model=list[ReorderCenterItemResponse],
)
def get_reorder_center(
    organization_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # ---------------------------------------------------------
    # 1. Verify organization access
    # ---------------------------------------------------------
    if current_user.organization_id != organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this organization",
        )

    # ---------------------------------------------------------
    # 2. Calculate available stock across all locations
    # ---------------------------------------------------------
    available_expression = func.coalesce(
        func.sum(
            InventoryLot.quantity_on_hand
            - InventoryLot.reserved_quantity
        ),
        0,
    )

    rows = db.execute(
        select(
            Item.id.label("item_id"),
            Item.sku.label("sku"),
            Item.name.label("name"),
            available_expression.label("available_quantity"),
            Item.reorder_point.label("reorder_point"),
            Item.reorder_quantity.label("reorder_quantity"),
            Item.lead_time_days.label("lead_time_days"),
        )
        .select_from(Item)
        .outerjoin(
            Batch,
            Batch.item_id == Item.id,
        )
        .outerjoin(
            InventoryLot,
            InventoryLot.batch_id == Batch.id,
        )
        .where(
            Item.organization_id == organization_id,
        )
        .group_by(
            Item.id,
            Item.sku,
            Item.name,
            Item.reorder_point,
            Item.reorder_quantity,
            Item.lead_time_days,
        )
        .order_by(Item.name.asc())
    ).all()

    # ---------------------------------------------------------
    # 3. Build reorder candidates
    #
    # An item can now enter the Reorder Center for either:
    #
    # A. Conventional low-stock logic
    #    available <= reorder_point
    #
    # B. Forecast-driven Smart Reorder logic
    #    recommended_quantity > 0
    #
    # This means an item can require future replenishment even
    # when it is currently above its conventional reorder point.
    # ---------------------------------------------------------
    result = []

    for row in rows:
        available_quantity = int(
            row.available_quantity or 0
        )

        # -----------------------------------------------------
        # A. Conventional low-stock candidate
        # -----------------------------------------------------
        if available_quantity <= row.reorder_point:
            result.append(
                ReorderCenterItemResponse(
                    item_id=row.item_id,
                    sku=row.sku,
                    name=row.name,
                    available_quantity=available_quantity,
                    reorder_point=row.reorder_point,
                    suggested_quantity=row.reorder_quantity,
                    lead_time_days=row.lead_time_days,
                    is_low_stock=True,
                )
            )

            # We already have a conventional reorder signal.
            # No need to run the forecast again for this item.
            continue

        # -----------------------------------------------------
        # B. Forecast-driven reorder candidate
        # -----------------------------------------------------
        #
        # We intentionally use the same defaults as the
        # Smart Reorder page:
        #
        # history_days      = 30
        # forecast_days     = 7
        # safety_stock_days = 3
        #
        # The Smart Reorder service itself decides whether
        # enough usage history exists.
        # -----------------------------------------------------
        try:
            smart_recommendation = (
                get_smart_reorder_recommendation(
                    db=db,
                    item_id=row.item_id,
                    organization_id=organization_id,
                    history_days=30,
                    forecast_days=7,
                    safety_stock_days=3,
                )
            )
        except ValueError:
            # Not enough historical usage to produce a
            # meaningful Smart Reorder recommendation.
            #
            # This is expected for new/inactive items and
            # should not make the entire Reorder Center fail.
            continue

        # -----------------------------------------------------
        # Only include forecast candidates where the model
        # recommends purchasing additional stock.
        # -----------------------------------------------------
        if smart_recommendation.recommended_quantity <= 0:
            continue

        result.append(
            ReorderCenterItemResponse(
                item_id=row.item_id,
                sku=row.sku,
                name=row.name,
                available_quantity=available_quantity,
                reorder_point=row.reorder_point,
                suggested_quantity=(
                    smart_recommendation.recommended_quantity
                ),
                lead_time_days=row.lead_time_days,
                is_low_stock=False,
            )
        )

    return result


@router.post(
    "/reorder/purchase-order",
    response_model=ReorderPurchaseOrderResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_reorder_purchase_order(
    organization_id: UUID,
    payload: ReorderPurchaseOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            UserRole.ADMIN,
            UserRole.STAFF,
        )
    ),
):
    # ---------------------------------------------------------
    # 1. Verify tenant access
    # ---------------------------------------------------------
    if current_user.organization_id != organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this organization",
        )

    # ---------------------------------------------------------
    # 2. Validate item
    # ---------------------------------------------------------
    item = db.scalar(
        select(Item).where(
            Item.id == payload.item_id,
            Item.organization_id == organization_id,
        )
    )

    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found",
        )

    # ---------------------------------------------------------
    # 3. Validate supplier
    # ---------------------------------------------------------
    supplier = db.scalar(
        select(Supplier).where(
            Supplier.id == payload.supplier_id,
            Supplier.organization_id == organization_id,
        )
    )

    if supplier is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found",
        )

    # ---------------------------------------------------------
    # 4. Calculate current available stock
    # ---------------------------------------------------------
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
            Batch.item_id == item.id,
        )
    )

    available_quantity = int(available_quantity or 0)

    # ---------------------------------------------------------
    # 5. Confirm item is low stock
    #
    # This validation intentionally remains here.
    # The Smart Reorder endpoint below does NOT use this rule.
    # ---------------------------------------------------------
    if available_quantity > item.reorder_point:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Item is not currently below the reorder point"
            ),
        )

    # ---------------------------------------------------------
    # 6. Determine purchase quantity
    # ---------------------------------------------------------
    reorder_quantity = (
        payload.quantity
        if payload.quantity is not None
        else item.reorder_quantity
    )

    if reorder_quantity <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reorder quantity must be greater than zero",
        )

    # ---------------------------------------------------------
    # 7. Create draft purchase order
    # ---------------------------------------------------------
    purchase_order = PurchaseOrder(
        organization_id=organization_id,
        supplier_id=supplier.id,
        status=PurchaseOrderStatus.DRAFT,
        expected_date=payload.expected_date,
        notes=payload.notes,
        created_by=current_user.id,
    )

    db.add(purchase_order)
    db.flush()

    # ---------------------------------------------------------
    # 8. Add the requested item
    # ---------------------------------------------------------
    purchase_order_item = PurchaseOrderItem(
        purchase_order_id=purchase_order.id,
        item_id=item.id,
        quantity=reorder_quantity,
        received_quantity=0,
    )

    db.add(purchase_order_item)

    # ---------------------------------------------------------
    # 9. Record audit entry
    # ---------------------------------------------------------
    create_audit_log(
        db,
        organization_id=organization_id,
        user_id=current_user.id,
        action="reorder.purchase_order_created",
        entity_type="purchase_order",
        entity_id=purchase_order.id,
        details={
            "item_id": str(item.id),
            "supplier_id": str(supplier.id),
            "available_quantity": available_quantity,
            "reorder_point": item.reorder_point,
            "suggested_quantity": item.reorder_quantity,
            "ordered_quantity": reorder_quantity,
        },
    )

    # ---------------------------------------------------------
    # 10. Save purchase order and audit entry
    # ---------------------------------------------------------
    db.commit()

    return ReorderPurchaseOrderResponse(
        purchase_order_id=purchase_order.id,
        item_id=item.id,
        supplier_id=supplier.id,
        quantity=reorder_quantity,
        status=purchase_order.status.value,
    )


@router.get(
    "/items/{item_id}/smart-reorder",
    response_model=SmartReorderResponse,
)
def get_smart_reorder(
    organization_id: UUID,
    item_id: UUID,
    history_days: int = 30,
    forecast_days: int = 7,
    safety_stock_days: int = 3,
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

    if safety_stock_days < 0 or safety_stock_days > 90:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="safety_stock_days must be between 0 and 90",
        )

    try:
        return get_smart_reorder_recommendation(
            db=db,
            organization_id=organization_id,
            item_id=item_id,
            history_days=history_days,
            forecast_days=forecast_days,
            safety_stock_days=safety_stock_days,
        )

    except ValueError as exc:
        message = str(exc)

        if message == "Item not found":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=message,
            )

        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=message,
        )


@router.post(
    "/items/{item_id}/smart-reorder/purchase-order",
    response_model=ReorderPurchaseOrderResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_smart_reorder_purchase_order(
    organization_id: UUID,
    item_id: UUID,
    payload: ReorderPurchaseOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            UserRole.ADMIN,
            UserRole.STAFF,
        )
    ),
):
    # ---------------------------------------------------------
    # 1. Verify tenant access
    # ---------------------------------------------------------
    if current_user.organization_id != organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this organization",
        )

    # ---------------------------------------------------------
    # 2. Validate that the URL item matches the payload item
    # ---------------------------------------------------------
    if payload.item_id != item_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Item ID in URL does not match item ID in payload",
        )

    # ---------------------------------------------------------
    # 3. Validate item
    # ---------------------------------------------------------
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

    # ---------------------------------------------------------
    # 4. Validate supplier
    # ---------------------------------------------------------
    supplier = db.scalar(
        select(Supplier).where(
            Supplier.id == payload.supplier_id,
            Supplier.organization_id == organization_id,
        )
    )

    if supplier is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found",
        )

    # ---------------------------------------------------------
    # 5. Recalculate Smart Reorder recommendation
    #
    # Important:
    # We intentionally do NOT check:
    #
    #     available_quantity <= reorder_point
    #
    # Smart Reorder is based on forecasted demand,
    # lead time, and safety stock.
    # ---------------------------------------------------------
    try:
        recommendation = get_smart_reorder_recommendation(
            db=db,
            organization_id=organization_id,
            item_id=item_id,
            history_days=30,
            forecast_days=7,
            safety_stock_days=3,
        )

    except ValueError as exc:
        message = str(exc)

        if message == "Item not found":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=message,
            )

        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=message,
        )

    # ---------------------------------------------------------
    # 6. Make sure Smart Reorder actually recommends a purchase
    # ---------------------------------------------------------
    if recommendation.recommended_quantity <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Smart Reorder does not currently recommend a purchase",
        )

    # ---------------------------------------------------------
    # 7. Determine purchase quantity
    #
    # If the frontend does not provide a quantity, use the
    # server-calculated Smart Reorder recommendation.
    #
    # If the frontend provides one, allow a positive override.
    # ---------------------------------------------------------
    reorder_quantity = (
        payload.quantity
        if payload.quantity is not None
        else recommendation.recommended_quantity
    )

    if reorder_quantity <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Purchase quantity must be greater than zero",
        )

    # ---------------------------------------------------------
    # 8. Create draft purchase order
    # ---------------------------------------------------------
    purchase_order = PurchaseOrder(
        organization_id=organization_id,
        supplier_id=supplier.id,
        status=PurchaseOrderStatus.DRAFT,
        expected_date=payload.expected_date,
        notes=payload.notes,
        created_by=current_user.id,
    )

    db.add(purchase_order)
    db.flush()

    # ---------------------------------------------------------
    # 9. Add Smart Reorder item
    # ---------------------------------------------------------
    purchase_order_item = PurchaseOrderItem(
        purchase_order_id=purchase_order.id,
        item_id=item.id,
        quantity=reorder_quantity,
        received_quantity=0,
    )

    db.add(purchase_order_item)

    # ---------------------------------------------------------
    # 10. Record Smart Reorder audit entry
    # ---------------------------------------------------------
    create_audit_log(
        db,
        organization_id=organization_id,
        user_id=current_user.id,
        action="smart_reorder.purchase_order_created",
        entity_type="purchase_order",
        entity_id=purchase_order.id,
        details={
            "item_id": str(item.id),
            "supplier_id": str(supplier.id),
            "available_quantity": recommendation.available_quantity,
            "reorder_point": recommendation.reorder_point,
            "average_daily_usage": recommendation.average_daily_usage,
            "predicted_daily_usage": recommendation.predicted_daily_usage,
            "lead_time_days": recommendation.lead_time_days,
            "safety_stock_days": recommendation.safety_stock_days,
            "lead_time_demand": recommendation.lead_time_demand,
            "safety_stock": recommendation.safety_stock,
            "target_stock": recommendation.target_stock,
            "recommended_quantity": recommendation.recommended_quantity,
            "ordered_quantity": reorder_quantity,
            "forecast_method": recommendation.forecast_method,
            "forecast_confidence": recommendation.forecast_confidence,
        },
    )

    # ---------------------------------------------------------
    # 11. Save purchase order and audit entry
    # ---------------------------------------------------------
    db.commit()

    return ReorderPurchaseOrderResponse(
        purchase_order_id=purchase_order.id,
        item_id=item.id,
        supplier_id=supplier.id,
        quantity=reorder_quantity,
        status=purchase_order.status.value,
    )