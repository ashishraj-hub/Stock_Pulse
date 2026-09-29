import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    name: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    users = relationship(
        "User",
        back_populates="organization",
        cascade="all, delete-orphan",
    )

    locations = relationship(
        "Location",
        back_populates="organization",
        cascade="all, delete-orphan",
    )

    items = relationship(
        "Item",
        back_populates="organization",
        cascade="all, delete-orphan",
    )