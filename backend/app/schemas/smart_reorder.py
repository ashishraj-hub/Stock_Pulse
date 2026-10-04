from uuid import UUID

from pydantic import BaseModel


class SmartReorderResponse(BaseModel):
    item_id: UUID
    sku: str
    name: str

    available_quantity: int
    reorder_point: int
    lead_time_days: int

    safety_stock_days: int

    average_daily_usage: float
    predicted_daily_usage: float

    lead_time_demand: float
    safety_stock: float
    target_stock: float

    recommended_quantity: int

    forecast_method: str
    forecast_confidence: str

    is_low_stock: bool