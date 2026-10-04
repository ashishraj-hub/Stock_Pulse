from datetime import date
from uuid import UUID

from pydantic import BaseModel, Field


class ForecastPoint(BaseModel):
    date: date
    predicted_quantity: float


class ForecastResponse(BaseModel):
    item_id: UUID
    historical_days: int
    forecast_days: int
    average_daily_usage: float
    predicted_daily_usage: float
    forecast: list[ForecastPoint]
    method: str
    confidence: str