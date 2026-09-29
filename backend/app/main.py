from fastapi import FastAPI
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
)


app = FastAPI(
    title="StockPulse API",
    description="Inventory and reorder management API",
    version="0.1.0",
)

app.include_router(health.router)
app.include_router(organizations.router)
app.include_router(locations.router)
app.include_router(items.router)
app.include_router(batches.router)
app.include_router(inventory_lots.router)
app.include_router(stock_movements.router)
app.include_router(users.router)
app.include_router(auth.router)