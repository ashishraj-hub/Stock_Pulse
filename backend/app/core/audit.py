import json
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


def create_audit_log(
    db: Session,
    *,
    organization_id: UUID,
    user_id: UUID | None,
    action: str,
    entity_type: str,
    entity_id: UUID | str | None,
    details: dict | None = None,
) -> AuditLog:

    print("DEBUG audit entity_id =", entity_id)
    
    audit_log = AuditLog(
        organization_id=organization_id,
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id is not None else "",
        details=json.dumps(details) if details is not None else None,
    )

    db.add(audit_log)
    return audit_log