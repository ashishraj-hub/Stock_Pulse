from fastapi import FastAPI

app = FastAPI(
    title="StockPulse API",
    description="Inventory and reorder management API",
    version="0.1.0",
)


@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "stockpulse-api",
    }