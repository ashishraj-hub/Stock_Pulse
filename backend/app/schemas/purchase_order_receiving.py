from datetime import date
from uuid import UUID

from pydantic import BaseModel, Field


class PurchaseOrderReceiveItem(BaseModel):
    purchase_order_item_id: UUID
    location_id: UUID
    quantity: int = Field(gt=0)
    lot_number: str = Field(min_length=1, max_length=255)
    expiry_date: date | None = None


class PurchaseOrderReceiveRequest(BaseModel):
    items: list[PurchaseOrderReceiveItem] = Field(min_length=1)