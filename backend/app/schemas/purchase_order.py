from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.purchase_order import PurchaseOrderStatus


class PurchaseOrderItemCreate(BaseModel):
    item_id: UUID
    quantity: int = Field(gt=0)
    unit_price: Decimal | None = Field(
        default=None,
        ge=0,
        decimal_places=2,
    )


class PurchaseOrderCreate(BaseModel):
    supplier_id: UUID
    expected_date: datetime | None = None
    notes: str | None = None
    items: list[PurchaseOrderItemCreate] = Field(min_length=1)


class PurchaseOrderItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    purchase_order_id: UUID
    item_id: UUID
    quantity: int
    received_quantity: int
    unit_price: Decimal | None


class PurchaseOrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    organization_id: UUID
    supplier_id: UUID
    status: PurchaseOrderStatus
    order_date: datetime | None
    expected_date: datetime | None
    notes: str | None
    created_by: UUID
    created_at: datetime
    items: list[PurchaseOrderItemResponse]