docker exec -it stockpulse-backend-prod python -c "exec('''from getpass import getpass
from uuid import UUID
from sqlalchemy import create_engine, text
from app.core.config import settings
from pwdlib import PasswordHash

ORG_ID = UUID("addc299a-6ab4-4399-83ab-490ce15f3faa")
USER_ID = UUID("990698c5-561e-40f1-8f47-21e642bc0878")
EMAIL = "admin@stockpulse.com"

password = getpass("Enter NEW production admin password: ")
confirm = getpass("Confirm production admin password: ")

if not password:
    raise SystemExit("Password cannot be empty.")

if password != confirm:
    raise SystemExit("Passwords do not match.")

if len(password) < 12:
    raise SystemExit("Password must be at least 12 characters.")

engine = create_engine(settings.database_url)
password_hash = PasswordHash.recommended().hash(password)

with engine.begin() as db:
    organization_exists = db.execute(
        text("SELECT 1 FROM organizations WHERE id = :id"),
        {"id": str(ORG_ID)},
    ).scalar()

    if not organization_exists:
        db.execute(
            text("""
                INSERT INTO organizations (id, name, created_at)
                VALUES (:id, :name, NOW())
            """),
            {
                "id": str(ORG_ID),
                "name": "StockPulse Organization",
            },
        )
        print("Created StockPulse organization.")
    else:
        print("StockPulse organization already exists.")

    user_exists = db.execute(
        text("SELECT 1 FROM users WHERE email = :email"),
        {"email": EMAIL},
    ).scalar()

    if user_exists:
        raise SystemExit(
            "admin@stockpulse.com already exists. No changes were made."
        )

    db.execute(
        text("""
            INSERT INTO users
                (id, organization_id, name, email, password_hash, role, created_at)
            VALUES
                (:id, :organization_id, :name, :email, :password_hash, :role, NOW())
        """),
        {
            "id": str(USER_ID),
            "organization_id": str(ORG_ID),
            "name": "System Administrator",
            "email": EMAIL,
            "password_hash": password_hash,
            "role": "admin",
        },
    )

print("")
print("Production admin created successfully.")
print("Email: admin@stockpulse.com")
print("Role: admin")
''')"