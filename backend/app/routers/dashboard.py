from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.dependencies import get_db
from app.models.user import User
from app.schemas.low_stock import LowStockItemResponse
from app.services.low_stock import get_low_stock_items
from app.schemas.dashboard import DashboardSummaryResponse
from app.services.dashboard import get_dashboard_summary


router = APIRouter(
    prefix="/api/v1/organizations/{organization_id}/dashboard",
    tags=["dashboard"],
)


@router.get(
    "/low-stock",
    response_model=list[LowStockItemResponse],
)
def low_stock_items(
    organization_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.organization_id != organization_id:
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this organization",
        )

    results = get_low_stock_items(
        db,
        organization_id=organization_id,
    )

    return [
        LowStockItemResponse(
            item_id=result.item_id,
            sku=result.sku,
            name=result.name,
            available_quantity=result.available_quantity,
            reorder_point=result.reorder_point,
            reorder_quantity=result.reorder_quantity,
            lead_time_days=result.lead_time_days,
            shortage_quantity=result.shortage_quantity,
        )
        for result in results
    ]


@router.get(
    "/summary",
    response_model=DashboardSummaryResponse,
)
def dashboard_summary(
    organization_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.organization_id != organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this organization",
        )

    result = get_dashboard_summary(
        db,
        organization_id=organization_id,
    )

    return DashboardSummaryResponse(**result)