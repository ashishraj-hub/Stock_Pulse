from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.purchase_order import PurchaseOrderStatus


class ReorderStatusResponse(BaseModel):
    item_id: UUID
    sku: str
    name: str
    available_quantity: int
    reorder_point: int
    reorder_quantity: int
    lead_time_days: int
    is_low_stock: bool


class ReorderSuggestionResponse(BaseModel):
    item_id: UUID
    sku: str
    name: str
    available_quantity: int
    reorder_point: int
    suggested_quantity: int
    lead_time_days: int
    is_low_stock: bool


class ReorderRecommendationResponse(BaseModel):
    item_id: UUID
    item_name: str
    sku: str
    location_id: UUID
    available_quantity: int
    reorder_point: int
    recommended_quantity: int
    lead_time_days: int
    average_daily_usage: float
    predicted_daily_usage: float
    lead_time_demand: float
    safety_stock: float
    target_stock: float
    forecast_method: str
    confidence: str


class ReorderPurchaseOrderCreate(BaseModel):
    item_id: UUID
    location_id: UUID
    supplier_id: UUID
    quantity: int = Field(gt=0)
    expected_date: datetime | None = None
    notes: str | None = Field(
        default=None,
        max_length=1000,
    )


class ReorderPurchaseOrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    purchase_order_id: UUID
    status: PurchaseOrderStatus
    item_id: UUID
    location_id: UUID
    supplier_id: UUID
    quantity: int
    expected_date: datetime | None

class ReorderCenterItemResponse(BaseModel):
    item_id: UUID
    sku: str
    name: str
    available_quantity: int
    reorder_point: int
    suggested_quantity: int
    lead_time_days: int
    is_low_stock: bool