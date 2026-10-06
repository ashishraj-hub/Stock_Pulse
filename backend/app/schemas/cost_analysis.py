from datetime import date
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class CostTrendPoint(BaseModel):
    date: date
    procurement_spend: Decimal
    wastage_cost: Decimal


class CostItemBreakdown(BaseModel):
    item_id: UUID
    sku: str
    item_name: str
    quantity: int
    unit_cost: Decimal
    estimated_cost: Decimal


class CostAnalysisResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    period_start: date
    period_end: date

    procurement_spend: Decimal
    estimated_wastage_cost: Decimal
    estimated_inventory_value: Decimal

    received_units: int
    wasted_units: int
    available_units: int

    top_wastage_items: list[CostItemBreakdown]
    inventory_by_item: list[CostItemBreakdown]
    trend: list[CostTrendPoint]