from datetime import datetime, date
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class InventoryLotCreate(BaseModel):
    location_id: UUID
    quantity_on_hand: int = Field(default=0, ge=0)
    reserved_quantity: int = Field(default=0, ge=0)



class InventoryLotResponse(BaseModel):
    id: UUID
    batch_id: UUID
    location_id: UUID
    quantity_on_hand: int
    reserved_quantity: int
    available_quantity: int
    updated_at: datetime


class InventoryListItemResponse(BaseModel):
    inventory_lot_id: UUID
    item_id: UUID
    sku: str
    item_name: str

    batch_id: UUID
    lot_number: str
    expiry_date: date | None

    location_id: UUID
    location_name: str

    quantity_on_hand: int
    reserved_quantity: int
    available_quantity: int

    updated_at: datetime