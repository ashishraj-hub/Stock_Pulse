from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.models.item import Item
from app.models.organization import Organization
from app.schemas.item import ItemCreate, ItemResponse


router = APIRouter(
    prefix="/api/v1/organizations/{organization_id}/items",
    tags=["Items"],
)


@router.post(
    "",
    response_model=ItemResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_item(
    organization_id: UUID,
    item_data: ItemCreate,
    db: Session = Depends(get_db),
):
    organization = db.get(Organization, organization_id)

    if organization is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )

    existing_item = db.scalar(
        select(Item).where(
            Item.organization_id == organization_id,
            Item.sku == item_data.sku,
        )
    )

    if existing_item is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An item with this SKU already exists",
        )

    item = Item(
        organization_id=organization_id,
        sku=item_data.sku,
        name=item_data.name,
        barcode=item_data.barcode,
        unit=item_data.unit,
        reorder_point=item_data.reorder_point,
        reorder_quantity=item_data.reorder_quantity,
        lead_time_days=item_data.lead_time_days,
    )

    db.add(item)
    db.commit()
    db.refresh(item)

    return item


@router.get(
    "",
    response_model=list[ItemResponse],
)
def list_items(
    organization_id: UUID,
    db: Session = Depends(get_db),
):
    organization = db.get(Organization, organization_id)

    if organization is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )

    statement = (
        select(Item)
        .where(Item.organization_id == organization_id)
        .order_by(Item.created_at)
    )

    return db.scalars(statement).all()


@router.get(
    "/{item_id}",
    response_model=ItemResponse,
)
def get_item(
    organization_id: UUID,
    item_id: UUID,
    db: Session = Depends(get_db),
):
    item = db.get(Item, item_id)

    if item is None or item.organization_id != organization_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found",
        )

    return item