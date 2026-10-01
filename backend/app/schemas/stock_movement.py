from uuid import UUID
from pydantic import BaseModel, Field
from datetime import datetime
from app.models.stock_movement import MovementType

class ReceiveStockRequest(BaseModel):
    quantity: int = Field(gt=0)
    reason: str | None = None


class IssueStockRequest(BaseModel):
    quantity: int = Field(gt=0)
    reason: str | None = None


class WastageStockRequest(BaseModel):
    quantity: int = Field(gt=0)
    reason: str


class TransferStockRequest(BaseModel):
    quantity: int = Field(gt=0)
    destination_location_id: UUID
    reason: str | None = None


class FefoIssueRequest(BaseModel):
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


class StockMovementListItemResponse(BaseModel):
    id: UUID

    item_id: UUID
    sku: str
    item_name: str

    batch_id: UUID | None
    lot_number: str | None

    location_id: UUID
    location_name: str

    performed_by: UUID | None
    performed_by_name: str | None

    movement_type: MovementType
    quantity: int
    reason: str | None

    created_at: datetime