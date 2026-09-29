from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ItemCreate(BaseModel):
    sku: str = Field(min_length=1, max_length=100)
    name: str = Field(min_length=1, max_length=255)
    barcode: str | None = Field(default=None, max_length=100)
    unit: str = Field(min_length=1, max_length=50)

    reorder_point: int = Field(default=0, ge=0)
    reorder_quantity: int = Field(default=0, ge=0)
    lead_time_days: int = Field(default=0, ge=0)


class ItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    organization_id: UUID
    sku: str
    name: str
    barcode: str | None
    unit: str
    reorder_point: int
    reorder_quantity: int
    lead_time_days: int
    created_at: datetime