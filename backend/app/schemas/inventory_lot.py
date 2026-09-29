from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class InventoryLotCreate(BaseModel):
    location_id: UUID
    quantity_on_hand: int = Field(default=0, ge=0)
    reserved_quantity: int = Field(default=0, ge=0)


class InventoryLotResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    batch_id: UUID
    location_id: UUID
    quantity_on_hand: int
    reserved_quantity: int
    updated_at: datetime