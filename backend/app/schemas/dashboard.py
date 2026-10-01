from pydantic import BaseModel


class DashboardSummaryResponse(BaseModel):
    total_items: int
    total_available_units: int
    low_stock_count: int
    out_of_stock_count: int
    pending_reorder_count: int