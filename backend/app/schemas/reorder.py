
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class ReorderStatusResponse(BaseModel):
    item_id: UUID
    sku: str
    name: str
    available_quantity: int
    reorder_point: int
    reorder_quantity: int
    lead_time_days: int
    is_low_stock: bool


class ReorderSuggestionResponse(BaseModel):
    item_id: UUID
    sku: str
    name: str
    available_quantity: int
    reorder_point: int
    suggested_quantity: int
    lead_time_days: int
    is_low_stock: bool


class ReorderPurchaseOrderCreate(BaseModel):
    item_id: UUID
    supplier_id: UUID
    notes: str | None = None
    expected_date: datetime | None = None
    quantity: int | None = Field(default=None, gt=0)


class ReorderPurchaseOrderResponse(BaseModel):
    purchase_order_id: UUID
    item_id: UUID
    supplier_id: UUID
    quantity: int
    status: str


class ReorderCenterItemResponse(BaseModel):
    item_id: UUID
    sku: str
    name: str
    available_quantity: int
    reorder_point: int
    suggested_quantity: int
    lead_time_days: int
    is_low_stock: bool