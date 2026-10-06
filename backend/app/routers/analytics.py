from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.dependencies import get_db
from app.models.user import User
from app.schemas.analytics import AnalyticsSummaryResponse
from app.services.analytics import get_analytics_summary


router = APIRouter(
    prefix="/api/v1/organizations/{organization_id}/analytics",
    tags=["analytics"],
)


@router.get(
    "/summary",
    response_model=AnalyticsSummaryResponse,
)
def analytics_summary(
    organization_id: UUID,
    history_days: int = Query(
        default=30,
        ge=7,
        le=365,
    ),
    expiring_days: int = Query(
        default=30,
        ge=1,
        le=365,
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.organization_id != organization_id:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=403,
            detail="You do not have access to this organization",
        )

    return get_analytics_summary(
        db,
        organization_id=organization_id,
        history_days=history_days,
        expiring_days=expiring_days,
    )