from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.core.audit import create_audit_log
from app.core.dependencies import get_current_user, require_roles
from app.models.inventory_lot import InventoryLot
from app.models.user import User, UserRole
from app.models.batch import Batch
from app.models.item import Item
from app.schemas.batch import (
    BatchArchiveResponse,
    BatchCreate,
    BatchResponse,
)

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
            status_code=404,
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
            status_code=409,
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
            status_code=404,
            detail="Item not found",
        )

    statement = (
        select(Batch)
        .where(Batch.item_id == item_id)
        .order_by(
            Batch.expiry_date,
            Batch.received_at,
        )
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
            status_code=404,
            detail="Item not found",
        )

    batch = db.get(Batch, batch_id)

    if batch is None or batch.item_id != item_id:
        raise HTTPException(
            status_code=404,
            detail="Batch not found",
        )

    return batch


@router.post(
    "/{batch_id}/archive",
    response_model=BatchArchiveResponse,
)
def archive_batch(
    organization_id: UUID,
    item_id: UUID,
    batch_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    if current_user.organization_id != organization_id:
        raise HTTPException(
            status_code=403,
            detail="You do not have access to this organization",
        )

    item = db.get(Item, item_id)

    if item is None or item.organization_id != organization_id:
        raise HTTPException(
            status_code=404,
            detail="Item not found",
        )

    batch = db.scalar(
        select(Batch).where(
            Batch.id == batch_id,
            Batch.item_id == item_id,
        )
    )

    if batch is None:
        raise HTTPException(
            status_code=404,
            detail="Batch not found",
        )

    if batch.is_archived:
        raise HTTPException(
            status_code=409,
            detail="Batch is already archived",
        )

    inventory_lots = db.scalars(
        select(InventoryLot).where(
            InventoryLot.batch_id == batch.id,
        )
    ).all()

    total_available = sum(
        lot.quantity_on_hand - lot.reserved_quantity
        for lot in inventory_lots
    )

    if total_available > 0:
        raise HTTPException(
            status_code=409,
            detail="Batch cannot be archived while available stock remains",
        )

    batch.is_archived = True

    create_audit_log(
        db,
        organization_id=organization_id,
        user_id=current_user.id,
        action="batch.archived",
        entity_type="batch",
        entity_id=batch.id,
        details={
            "lot_number": batch.lot_number,
        },
    )

    db.commit()

    return BatchArchiveResponse(
        id=batch.id,
        lot_number=batch.lot_number,
        is_archived=batch.is_archived,
    )