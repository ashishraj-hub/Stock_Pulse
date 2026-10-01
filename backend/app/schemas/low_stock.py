from uuid import UUID

from pydantic import BaseModel


class LowStockItemResponse(BaseModel):
    item_id: UUID
    sku: str
    name: str
    available_quantity: int
    reorder_point: int
    reorder_quantity: int
    lead_time_days: int
    shortage_quantity: int