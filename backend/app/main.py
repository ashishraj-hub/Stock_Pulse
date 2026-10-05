from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
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


app = FastAPI(
    title="StockPulse API",
    description="Inventory and reorder management API",
    version="0.1.0",
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