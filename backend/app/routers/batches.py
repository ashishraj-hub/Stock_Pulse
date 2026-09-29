from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.models.batch import Batch
from app.models.item import Item
from app.schemas.batch import BatchCreate, BatchResponse


router = APIRouter(
    prefix="/api/v1/organizations/{organization_id}/items/{item_id}/batches",
    tags=["Batches"],
)


@router.post(
    "",
    response_model=BatchResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_batch(
    organization_id: UUID,
    item_id: UUID,
    batch_data: BatchCreate,
    db: Session = Depends(get_db),
):
    item = db.get(Item, item_id)

    if item is None or item.organization_id != organization_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found",
        )

    existing_batch = db.scalar(
        select(Batch).where(
            Batch.item_id == item_id,
            Batch.lot_number == batch_data.lot_number,
        )
    )

    if existing_batch is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A batch with this lot number already exists for this item",
        )

    batch = Batch(
        item_id=item_id,
        lot_number=batch_data.lot_number,
        expiry_date=batch_data.expiry_date,
    )

    db.add(batch)
    db.commit()
    db.refresh(batch)

    return batch


@router.get(
    "",
    response_model=list[BatchResponse],
)
def list_batches(
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

    statement = (
        select(Batch)
        .where(Batch.item_id == item_id)
        .order_by(Batch.expiry_date)
    )

    return db.scalars(statement).all()


@router.get(
    "/{batch_id}",
    response_model=BatchResponse,
)
def get_batch(
    organization_id: UUID,
    item_id: UUID,
    batch_id: UUID,
    db: Session = Depends(get_db),
):
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

    return batch