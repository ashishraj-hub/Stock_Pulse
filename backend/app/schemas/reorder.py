from uuid import UUID

from pydantic import BaseModel


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