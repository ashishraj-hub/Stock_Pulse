from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class AuditLogResponse(BaseModel):
    id: UUID
    organization_id: UUID
    user_id: UUID | None
    action: str
    entity_type: str
    entity_id: str
    details: str | None
    created_at: datetime


class AuditLogListResponse(BaseModel):
    items: list[AuditLogResponse]
    page: int
    page_size: int
    total: int