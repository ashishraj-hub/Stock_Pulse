from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import (
    auth,
    batches,
    health,
    inventory_lots,
    items,
    locations,
    organizations,
    stock_movements,
    users,
    reorder,
    dashboard,
    audit_logs,
)


app = FastAPI(
    title="StockPulse API",
    description="Inventory and reorder management API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
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
app.include_router(reorder.router)
app.include_router(dashboard.router)
app.include_router(audit_logs.router)