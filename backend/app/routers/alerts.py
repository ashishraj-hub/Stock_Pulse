from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.dependencies import get_db
from app.models.user import User
from app.schemas.alerts import AlertResponse
from app.services.alert_notifications import (
    dispatch_alert_notifications,
)
from app.services.alerts import get_inventory_alerts


router = APIRouter(
    prefix="/api/v1/organizations/{organization_id}/alerts",
    tags=["alerts"],
)


@router.get(
    "",
    response_model=list[AlertResponse],
)
def get_alerts(
    organization_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return the current inventory alerts for the organization.

    Alerts are calculated from live inventory and batch data.
    New alerts may also trigger configured notifications.
    """

    if current_user.organization_id != organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "You do not have access to this organization"
            ),
        )

    alerts = get_inventory_alerts(
        db,
        organization_id=organization_id,
    )

    try:
        dispatch_alert_notifications(
            db,
            organization_id=organization_id,
            alerts=alerts,
            email_recipient=current_user.email,
        )
    except Exception:
        # Notification delivery must never break
        # the existing Alert Center.
        db.rollback()

    return alerts