from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.dependencies import get_db
from app.models.user import User
from app.schemas.reorder import ReorderStatusResponse
from app.schemas.reorder import ReorderSuggestionResponse
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