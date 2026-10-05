from __future__ import annotations

import logging
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.notification_event import NotificationEvent
from app.schemas.alerts import AlertResponse
from app.services.notifications import send_email, send_telegram

logger = logging.getLogger(__name__)


def dispatch_alert_notifications(
    db: Session,
    *,
    organization_id: UUID,
    alerts: list[AlertResponse],
    email_recipient: str | None = None,
) -> dict[str, int]:
    """
    Deliver notifications for newly detected alerts.

    Each alert/channel combination is recorded in notification_events
    after a successful delivery, preventing duplicate notifications.

    Notification failures do not prevent the Alert Center from working.
    """

    email_sent = 0
    telegram_sent = 0

    for alert in alerts:
        email_body = (
            f"{alert.title}\n\n"
            f"{alert.message}\n\n"
            f"SKU: {alert.sku}\n"
            f"Item: {alert.item_name}\n"
            f"Severity: {alert.severity}\n"
        )

        telegram_message = (
            f"🚨 StockPulse Alert\n\n"
            f"{alert.title}\n"
            f"{alert.message}\n\n"
            f"SKU: {alert.sku}\n"
            f"Severity: {alert.severity}"
        )

        # Email channel
        if email_recipient:
            existing_email = db.scalar(
                select(NotificationEvent.id).where(
                    NotificationEvent.organization_id
                    == organization_id,
                    NotificationEvent.alert_id == alert.id,
                    NotificationEvent.channel == "email",
                )
            )

            if existing_email is None:
                delivered = send_email(
                    recipient=email_recipient,
                    subject=f"StockPulse Alert: {alert.title}",
                    body=email_body,
                )

                if delivered:
                    db.add(
                        NotificationEvent(
                            organization_id=organization_id,
                            alert_id=alert.id,
                            channel="email",
                        )
                    )
                    email_sent += 1

        # Telegram channel
        existing_telegram = db.scalar(
            select(NotificationEvent.id).where(
                NotificationEvent.organization_id
                == organization_id,
                NotificationEvent.alert_id == alert.id,
                NotificationEvent.channel == "telegram",
            )
        )

        if existing_telegram is None:
            delivered = send_telegram(
                message=telegram_message,
            )

            if delivered:
                db.add(
                    NotificationEvent(
                        organization_id=organization_id,
                        alert_id=alert.id,
                        channel="telegram",
                    )
                )
                telegram_sent += 1

    db.commit()

    logger.info(
        "Alert notifications dispatched: email=%s telegram=%s",
        email_sent,
        telegram_sent,
    )

    return {
        "email_sent": email_sent,
        "telegram_sent": telegram_sent,
    }