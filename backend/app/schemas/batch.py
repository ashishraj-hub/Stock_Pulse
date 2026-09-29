from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class BatchCreate(BaseModel):
    lot_number: str = Field(min_length=1, max_length=100)
    expiry_date: date | None = None


class BatchResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    item_id: UUID
    lot_number: str
    expiry_date: date | None
    received_at: datetime