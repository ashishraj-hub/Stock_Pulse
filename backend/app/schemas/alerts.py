from datetime import date
from typing import Literal
from uuid import UUID

from pydantic import BaseModel


AlertType = Literal[
    "out_of_stock",
    "low_stock",
    "expired",
    "expiring_soon",
    "expiring",
]

AlertSeverity = Literal[
    "critical",
    "warning",
    "notice",
]


class AlertResponse(BaseModel):
    id: str

    type: AlertType
    severity: AlertSeverity

    title: str
    message: str

    item_id: UUID
    sku: str
    item_name: str

    available_quantity: int
    reorder_point: int

    batch_id: UUID | None = None
    lot_number: str | None = None

    location_id: UUID | None = None
    location_name: str | None = None

    expiry_date: date | None = None
    days_until_expiry: int | None = None