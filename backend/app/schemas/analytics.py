from datetime import date
from uuid import UUID

from pydantic import BaseModel


class AnalyticsMetric(BaseModel):
    label: str
    value: float


class AnalyticsItemUsage(BaseModel):
    item_id: UUID
    sku: str
    name: str
    quantity: int


class AnalyticsDailyUsage(BaseModel):
    date: date
    quantity: int


class AnalyticsMovementSummary(BaseModel):
    receive: int
    issue: int
    wastage: int
    transfer: int


class AnalyticsExpiringItem(BaseModel):
    item_id: UUID
    sku: str
    name: str
    lot_number: str
    expiry_date: date
    quantity: int
    days_until_expiry: int


class AnalyticsSummaryResponse(BaseModel):
    total_items: int
    total_available_units: int
    low_stock_count: int
    out_of_stock_count: int

    total_received_units: int
    total_issued_units: int
    total_wastage_units: int
    total_transfer_units: int

    average_daily_usage: float
    predicted_daily_usage: float

    forecast_reorder_count: int
    forecast_reorder_units: int

    movement_summary: AnalyticsMovementSummary

    top_consumed_items: list[AnalyticsItemUsage]
    daily_usage: list[AnalyticsDailyUsage]
    expiring_items: list[AnalyticsExpiringItem]