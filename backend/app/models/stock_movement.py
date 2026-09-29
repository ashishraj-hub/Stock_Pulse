from datetime import datetime
from enum import Enum
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class MovementType(str, Enum):
    RECEIVE = "receive"
    ISSUE = "issue"
    ADJUSTMENT = "adjustment"
    WASTAGE = "wastage"
    TRANSFER = "transfer"


class StockMovement(Base):
    __tablename__ = "stock_movements"

    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=uuid4,
    )

    item_id: Mapped[UUID] = mapped_column(
        ForeignKey("items.id"),
        nullable=False,
        index=True,
    )

    batch_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("batches.id"),
        nullable=True,
        index=True,
    )

    location_id: Mapped[UUID] = mapped_column(
        ForeignKey("locations.id"),
        nullable=False,
        index=True,
    )

    performed_by: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id"),
        nullable=True,
        index=True,
    )

    movement_type: Mapped[MovementType] = mapped_column(
        nullable=False,
    )

    quantity: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    reason: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )