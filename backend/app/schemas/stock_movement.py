from uuid import UUID
from pydantic import BaseModel, Field


class ReceiveStockRequest(BaseModel):
    quantity: int = Field(gt=0)
    reason: str | None = None


class StockMovementResponse(BaseModel):
    id: UUID
    item_id: UUID
    batch_id: UUID | None
    location_id: UUID
    performed_by: UUID | None
    movement_type: str
    quantity: int
    reason: str | None