from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.core.dependencies import require_roles
from app.db.dependencies import get_db
from app.models.audit_log import AuditLog
from app.models.user import User, UserRole
from app.schemas.audit_log import AuditLogListResponse


router = APIRouter(
    prefix="/api/v1/organizations/{organization_id}/audit-logs",
    tags=["Audit Logs"],
)


@router.get(
    "",
    response_model=AuditLogListResponse,
)
def list_audit_logs(
    organization_id: UUID,
    page: int = 1,
    page_size: int = 20,
    action: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.ADMIN)
    ),
):
    if current_user.organization_id != organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this organization",
        )

    if page < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Page must be greater than or equal to 1",
        )

    if page_size < 1 or page_size > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Page size must be between 1 and 100",
        )

    count_query = (
    select(func.count())
    .select_from(AuditLog)
    .where(
        AuditLog.organization_id == organization_id
    )
    )

    if action is not None:
        count_query = count_query.where(
            AuditLog.action == action
        )

    total = db.scalar(count_query) or 0

    offset = (page - 1) * page_size

    logs_query = (
    select(AuditLog)
    .where(
        AuditLog.organization_id == organization_id
    )
    )

    if action is not None:
        logs_query = logs_query.where(
            AuditLog.action == action
        )

    audit_logs = db.scalars(
        logs_query
        .order_by(AuditLog.created_at.desc())
        .offset(offset)
        .limit(page_size)
    ).all()

    return {
        "items": audit_logs,
        "page": page,
        "page_size": page_size,
        "total": total or 0,
    }