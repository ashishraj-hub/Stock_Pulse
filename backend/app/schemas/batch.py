from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class BatchCreate(BaseModel):
    lot_number: str
    expiry_date: date | None = None


class BatchResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    item_id: UUID
    lot_number: str
    expiry_date: date | None
    received_at: datetime
    is_archived: bool


class BatchArchiveResponse(BaseModel):
    id: UUID
    lot_number: str
    is_archived: bool