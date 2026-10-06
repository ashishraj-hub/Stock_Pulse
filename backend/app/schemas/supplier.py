from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class SupplierCreate(BaseModel):
    name: str = Field(
        min_length=1,
        max_length=255,
    )

    contact_name: str | None = Field(
        default=None,
        max_length=255,
    )

    email: str | None = Field(
        default=None,
        max_length=255,
    )

    phone: str | None = Field(
        default=None,
        max_length=50,
    )

    address: str | None = Field(
        default=None,
        max_length=500,
    )


class SupplierResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: UUID
    organization_id: UUID
    name: str
    contact_name: str | None
    email: str | None
    phone: str | None
    address: str | None
    created_at: datetime