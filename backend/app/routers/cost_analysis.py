from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.dependencies import get_db
from app.models.user import User
from app.schemas.cost_analysis import CostAnalysisResponse
from app.services.cost_analysis import get_cost_analysis


router = APIRouter(
    prefix="/api/v1/organizations/{organization_id}/cost-analysis",
    tags=["cost-analysis"],
)


@router.get(
    "/summary",
    response_model=CostAnalysisResponse,
)
def cost_analysis_summary(
    organization_id: UUID,
    history_days: int = Query(
        default=30,
        ge=7,
        le=365,
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.organization_id != organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this organization",
        )

    return get_cost_analysis(
        db,
        organization_id=organization_id,
        history_days=history_days,
    )