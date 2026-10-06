from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.organization import Organization
from app.models.user import User
from app.routers import (
    alerts,
    analytics,
    audit_logs,
    auth,
    batches,
    dashboard,
    health,
    inventory_lots,
    items,
    locations,
    organizations,
    purchase_order_receiving,
    purchase_order_workflow,
    purchase_orders,
    reorder,
    stock_movements,
    suppliers,
    users,
    cost_analysis,
)
from app.services.alert_notifications import dispatch_alert_notifications
from app.services.alerts import get_inventory_alerts

logger = logging.getLogger(__name__)

ALERT_CHECK_INTERVAL_SECONDS = 300


def run_alert_notification_cycle() -> None:
    """
    Check every organization for active inventory alerts and dispatch
    notifications for alerts that have not already been delivered.
    """

    db = SessionLocal()

    try:
        organizations = db.scalars(
            select(Organization)
        ).all()

        total_email = 0
        total_telegram = 0

        for organization in organizations:
            alerts_for_org = get_inventory_alerts(
                db,
                organization_id=organization.id,
            )

            if not alerts_for_org:
                continue

            admin_email = db.scalar(
                select(User.email)
                .where(
                    User.organization_id == organization.id,
                    User.role == "ADMIN",
                )
                .order_by(User.created_at.asc())
            )

            result = dispatch_alert_notifications(
                db,
                organization_id=organization.id,
                alerts=alerts_for_org,
                email_recipient=admin_email,
            )

            total_email += result["email_sent"]
            total_telegram += result["telegram_sent"]

        logger.warning(
            "Autonomous alert cycle completed: email=%s telegram=%s",
            total_email,
            total_telegram,
        )

    except Exception:
        logger.exception(
            "Autonomous alert notification cycle failed"
        )

    finally:
        db.close()


async def alert_notification_scheduler() -> None:
    """
    Run the alert notification cycle periodically while the backend
    container is running.
    """

    logger.warning(
        "Autonomous alert scheduler started: interval=%s seconds",
        ALERT_CHECK_INTERVAL_SECONDS,
    )

    while True:
        try:
            await asyncio.to_thread(
                run_alert_notification_cycle
            )
        except asyncio.CancelledError:
            logger.info(
                "Autonomous alert scheduler stopped"
            )
            raise
        except Exception:
            logger.exception(
                "Unexpected scheduler error"
            )

        await asyncio.sleep(
            ALERT_CHECK_INTERVAL_SECONDS
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler_task = asyncio.create_task(
        alert_notification_scheduler()
    )

    try:
        yield
    finally:
        scheduler_task.cancel()

        try:
            await scheduler_task
        except asyncio.CancelledError:
            pass


app = FastAPI(
    title="StockPulse API",
    description="Inventory and reorder management API",
    version="0.1.0",
    lifespan=lifespan,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(health.router)
app.include_router(organizations.router)
app.include_router(locations.router)
app.include_router(items.router)
app.include_router(batches.router)
app.include_router(inventory_lots.router)
app.include_router(inventory_lots.organization_inventory_router)
app.include_router(stock_movements.router)
app.include_router(users.router)
app.include_router(auth.router)
app.include_router(alerts.router)
app.include_router(reorder.router)
app.include_router(dashboard.router)
app.include_router(audit_logs.router)
app.include_router(suppliers.router)
app.include_router(purchase_orders.router)
app.include_router(purchase_order_workflow.router)
app.include_router(purchase_order_receiving.router)
app.include_router(analytics.router)
app.include_router(cost_analysis.router)