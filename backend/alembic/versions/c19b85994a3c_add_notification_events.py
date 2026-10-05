"""add notification events

Revision ID: c19b85994a3c
Revises: 76999b2f5b69
Create Date: 2026-10-04 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "c19b85994a3c"
down_revision: Union[str, Sequence[str], None] = "76999b2f5b69"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table("notification_events",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.UUID(), nullable=False),
        sa.Column("alert_id", sa.String(length=255), nullable=False),
        sa.Column("channel", sa.String(length=50), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "alert_id", "channel", name="uq_notification_event_alert_channel"),
    )

    op.create_index("ix_notification_events_organization_id", "notification_events", ["organization_id"], unique=False)

def downgrade() -> None:
    op.drop_index("ix_notification_events_organization_id", table_name="notification_events")
    op.drop_table("notification_events")
