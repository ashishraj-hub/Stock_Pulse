from app.core.config import settings
from app.db.session import SessionLocal
from app.services.reorder import get_reorder_status
from uuid import UUID


ORGANIZATION_ID = UUID(
    "addc299a-6ab4-4399-83ab-490ce15f3faa"
)

ITEM_ID = UUID(
    "11543fb9-4ba4-4d25-a98d-65f3512c103c"
)


db = SessionLocal()

try:
    result = get_reorder_status(
        db,
        organization_id=ORGANIZATION_ID,
        item_id=ITEM_ID,
    )

    print("REORDER TEST")
    print("--------------------")
    print("Item ID:", result.item_id)
    print("SKU:", result.sku)
    print("Name:", result.name)
    print("Available:", result.available_quantity)
    print("Reorder point:", result.reorder_point)
    print("Reorder quantity:", result.reorder_quantity)
    print("Lead time:", result.lead_time_days)
    print("Low stock:", result.is_low_stock)

finally:
    db.close()