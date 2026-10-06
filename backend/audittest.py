from app.db.session import SessionLocal
from app.models.audit_log import AuditLog

db = SessionLocal()

logs = (
    db.query(AuditLog)
    .order_by(AuditLog.created_at.desc())
    .limit(5)
    .all()
)

for log in logs:
    print("ACTION:", log.action)
    print("ENTITY:", log.entity_type)
    print("ENTITY ID:", log.entity_id)
    print("USER:", log.user_id)
    print("DETAILS:", log.details)
    print("---")

db.close()