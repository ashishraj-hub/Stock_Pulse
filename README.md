# StockPulse

```{=html}
<p align="center">
```
`<img src="docs/assets/stockpulse-banner.gif" alt="StockPulse animated banner" width="100%">`{=html}
```{=html}
</p>
```
```{=html}
<p align="center">
```
`<strong>`{=html}Inventory intelligence for real-time stock visibility,
expiry control, forecasting, and smart replenishment.`</strong>`{=html}
```{=html}
</p>
```
```{=html}
<p align="center">
```
`<a href="https://github.com/ashishraj-hub/Stock_Pulse/actions">`{=html}`<img src="https://img.shields.io/github/actions/workflow/status/ashishraj-hub/Stock_Pulse/ci.yml?branch=main&style=for-the-badge&label=CI" alt="CI">`{=html}`</a>`{=html}
`<img src="https://img.shields.io/badge/Next.js-React-111827?style=for-the-badge&logo=next.js" alt="Next.js">`{=html}
`<img src="https://img.shields.io/badge/FastAPI-Python-0f172a?style=for-the-badge&logo=fastapi" alt="FastAPI">`{=html}
`<img src="https://img.shields.io/badge/PostgreSQL-18-0f172a?style=for-the-badge&logo=postgresql" alt="PostgreSQL">`{=html}
`<img src="https://img.shields.io/badge/Docker-Ready-0f172a?style=for-the-badge&logo=docker" alt="Docker">`{=html}
```{=html}
</p>
```
## Overview

**StockPulse** is a multi-tenant inventory management platform
connecting stock operations, expiry control, forecasting, alerts,
replenishment, purchasing, analytics, auditability, and offline
synchronization.

The production stack uses **Next.js + React + TypeScript + Tailwind
CSS**, **FastAPI + Python**, **PostgreSQL**, **SQLAlchemy + Alembic**,
**pandas + statsmodels**, **Telegram/SMTP-ready notifications**,
**IndexedDB**, **Docker Compose**, and **GitHub Actions**.

## Features

### Inventory & stock

-   Real-time inventory visibility
-   SKU, barcode, and QR support
-   Multi-location inventory
-   Batch/lot tracking
-   Available vs. reserved quantity
-   Stock issue, wastage, adjustment, transfer, and receiving workflows
-   Append-only stock movement history

### FEFO

StockPulse implements **First Expiry, First Out**. Available batches are
ordered by expiry date and consumed earliest-expiring first. Each
consumed batch creates its own movement and audit record.

### Smart alerts

-   Low-stock and out-of-stock detection
-   Expiry monitoring
-   Wastage risk visibility
-   Alert Center
-   Telegram notifications
-   Autonomous five-minute alert scheduler
-   Notification-event deduplication

### Smart reorder & forecasting

Reorder recommendations combine available inventory, reorder points,
lead time, safety stock, historical usage, and forecast demand.

Forecasting uses: - pandas - statsmodels - weighted moving average for
limited history - Holt/Exponential Smoothing when enough observations
exist

### Analytics

Operational dashboards cover inventory, consumption, stock movement, top
movers, procurement, wastage, reorder signals, and cost trends.

### Cost analysis

-   Procurement spend
-   Inventory value
-   Wastage cost
-   Cost trends
-   Top wastage items
-   Inventory breakdown

Inventory and wastage valuation use the latest known purchase price
because the current schema does not store historical unit price on every
batch/movement. These are explicitly operational estimates, not
batch-accurate accounting values.

### Purchasing

-   Suppliers
-   Purchase orders
-   Approval workflow
-   Ordering
-   Expected delivery dates
-   Partial receiving
-   Received quantities
-   Audit history

### RBAC & audit

Roles: - **Admin** - **Staff** - **Viewer**

Authorization is enforced server-side with organization/tenant
isolation. Important actions generate audit records.

### Offline mode

IndexedDB queues: - Issue - Wastage - Transfer - FEFO issue

Queued operations synchronize when connectivity returns; server-side
validation remains authoritative.

## Architecture

``` text
Next.js / React / TypeScript / Tailwind
              │
              │ REST + JWT
              ▼
       FastAPI / Python
              │
       SQLAlchemy / Alembic
              │
              ▼
          PostgreSQL
              │
       ┌──────┴────────┐
       ▼               ▼
 Forecasting       Notifications
 pandas +           Telegram /
 statsmodels        SMTP-ready
```

## Workflow

``` text
Scan / Log
    ↓
Validate
    ↓
Save Stock Movement
    ↓
Update Inventory
    ↓
Analyse Usage
    ↓
Alert
    ↓
Reorder Suggestion
    ↓
Approve Purchase Order
    ↓
Receive Stock
```

Every stock movement contributes to historical usage data used by
analytics and forecasting.

## Technology Stack

  Layer                Technology
  -------------------- ----------------------------
  Frontend             Next.js, React, TypeScript
  Styling              Tailwind CSS
  Scanner              html5-qrcode
  Backend              FastAPI, Python
  Authentication       JWT + Argon2
  ORM                  SQLAlchemy
  Migrations           Alembic
  Database             PostgreSQL
  Forecasting          pandas + statsmodels
  Notifications        Telegram, SMTP-ready
  Offline storage      IndexedDB
  Containers           Docker + Docker Compose
  CI                   GitHub Actions
  Package management   uv / npm

## Project Structure

``` text
Stock_Pulse/
├── .github/workflows/ci.yml
├── backend/
│   ├── app/
│   │   ├── core/
│   │   ├── db/
│   │   ├── models/
│   │   ├── routers/
│   │   └── services/
│   ├── alembic/
│   ├── Dockerfile
│   ├── alembic.ini
│   ├── pyproject.toml
│   └── uv.lock
├── frontend/
│   ├── src/app/
│   ├── Dockerfile
│   ├── next.config.ts
│   ├── package.json
│   └── package-lock.json
├── compose.yaml
├── compose.prod.yaml
├── requirements.txt
├── README.md
└── .gitignore
```

## Database Domain Model

``` text
Organization
├── User
├── Location
├── Item
│   └── Batch
│       └── InventoryLot
├── StockMovement
├── Supplier
│   └── PurchaseOrder
│       └── PurchaseOrderItem
├── AuditLog
└── NotificationEvent
```

Available quantity is derived as:

``` text
available = quantity_on_hand - reserved_quantity
```

## Quick Start

### Prerequisites

-   Git
-   Node.js 20+
-   Python 3.13+
-   uv
-   Docker Desktop
-   VS Code or another code editor

Verify:

``` powershell
git --version
node --version
python --version
uv --version
docker --version
```

### Clone

``` powershell
git clone https://github.com/ashishraj-hub/Stock_Pulse.git
cd Stock_Pulse
```

### Backend

``` powershell
cd backend
uv sync
```

Create `backend/.env`:

``` env
DATABASE_URL=postgresql+psycopg://stockpulse:stockpulse_dev_password@localhost:5432/stockpulse
JWT_SECRET_KEY=change-this-development-secret
```

### PostgreSQL

From the project root:

``` powershell
docker compose up -d db
docker compose ps
```

### Migrations

From `backend/`:

``` powershell
uv run python -m alembic upgrade head
```

Generate a migration after model changes:

``` powershell
uv run python -m alembic revision --autogenerate -m "describe change"
```

### Start backend

``` powershell
uv run python -m fastapi dev app/main.py
```

API: `http://127.0.0.1:8000`\
Docs: `http://127.0.0.1:8000/docs`

### Frontend

From `frontend/`:

``` powershell
npm ci
```

Create `frontend/.env.local`:

``` env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

Start:

``` powershell
npm run dev
```

Frontend: `http://localhost:3000`

## Environment Variables

### Backend

  Variable                        Purpose
  ------------------------------- ---------------------------
  `DATABASE_URL`                  PostgreSQL connection
  `JWT_SECRET_KEY`                JWT signing secret
  `JWT_ALGORITHM`                 JWT algorithm
  `ACCESS_TOKEN_EXPIRE_MINUTES`   Token lifetime
  `CORS_ORIGINS`                  Allowed frontend origins
  `SMTP_ENABLED`                  Email notification switch
  `SMTP_HOST`                     SMTP server
  `SMTP_PORT`                     SMTP port
  `SMTP_USERNAME`                 SMTP username
  `SMTP_PASSWORD`                 SMTP password
  `SMTP_FROM_EMAIL`               Sender address
  `SMTP_USE_TLS`                  SMTP TLS
  `TELEGRAM_ENABLED`              Telegram switch
  `TELEGRAM_BOT_TOKEN`            Telegram bot token
  `TELEGRAM_CHAT_ID`              Telegram destination

Never commit production secrets.

## Authentication & Authorization

``` text
Credentials
    ↓
Argon2 verification
    ↓
JWT access token
    ↓
Authenticated API request
    ↓
Organization check
    ↓
Role check
    ↓
Business operation
```

Tenant boundaries are enforced by the backend, not merely by frontend
filtering.

## FEFO Flow

``` text
Inventory lots
    ↓
Filter available stock
    ↓
Read batch expiry
    ↓
Sort earliest expiry
    ↓
Consume required quantity
    ↓
Create movement per batch
    ↓
Write audit event
```

## Forecasting Flow

``` text
Stock movements
    ↓
Historical usage
    ↓
Daily usage series
    ↓
Forecast model
    ↓
Predicted demand
    ↓
Lead-time demand
    ↓
Safety stock
    ↓
Reorder recommendation
```

## Notifications

Telegram is supported through environment configuration. The production
backend runs an autonomous alert scheduler every five minutes and
records notification events to prevent duplicate sends for the same
organization, alert, and channel.

SMTP support is implemented and can be enabled through configuration.

## Production Deployment

Production files:

``` text
compose.prod.yaml
backend/Dockerfile
frontend/Dockerfile
```

Build:

``` powershell
docker compose --env-file .env.production -f compose.prod.yaml build
```

Start:

``` powershell
docker compose --env-file .env.production -f compose.prod.yaml up -d
```

Check:

``` powershell
docker compose --env-file .env.production -f compose.prod.yaml ps
```

The backend container applies Alembic migrations before starting
Uvicorn.

## CI / GitHub Actions

The CI workflow validates:

### Backend

-   Python setup
-   uv dependency synchronization
-   Python compilation

### Frontend

-   Node.js setup
-   npm installation
-   ESLint
-   Production build

Workflow:

``` text
Push / Pull Request
        ↓
GitHub Actions
   ┌────┴────┐
   ▼         ▼
Backend    Frontend
   │         │
compile     lint
   │         │
   └────┬────┘
        ▼
      Build
```

## Security

-   JWT authentication
-   Argon2 password hashing
-   Organization-level tenant isolation
-   Server-side RBAC
-   CORS controls
-   Environment-based secrets
-   Append-only stock movement history
-   Audit logging
-   Notification deduplication
-   Dockerized production services

Never commit:

``` text
.env
.env.production
frontend/.env.local
```

## Data Integrity Principles

1.  Historical stock movements are not silently rewritten.
2.  Movement quantities are positive; movement type determines
    direction.
3.  Available stock equals on-hand minus reserved quantity.
4.  Expiry belongs to the batch/lot.
5.  Backend authorization is the security boundary.
6.  Corrections are represented by new adjustment movements.

## API Areas

``` text
/auth
/organizations
/locations
/items
/batches
/inventory-lots
/stock-movements
/users
/reorder
/dashboard
/suppliers
/purchase-orders
/analytics
/alerts
/cost-analysis
```

When the backend is running, FastAPI provides the interactive API
documentation at `/docs`.

## Application Areas

``` text
Dashboard
Inventory
Stock Movements
Stock Operations
Scanner
Suppliers
Purchase Orders
Reorder Center
Smart Reorder
Analytics
Expiry Management
Alert Center
Wastage Management
Users
Audit Logs
```

## Troubleshooting

### PostgreSQL connection failure

``` powershell
docker compose ps
```

Verify `DATABASE_URL` matches the database container.

### Migration failure

``` powershell
uv run python -m alembic current
uv run python -m alembic history
```

### Frontend cannot reach backend

Verify:

``` env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

Restart Next.js after changing environment variables.

### Production frontend has an old API URL

`NEXT_PUBLIC_API_BASE_URL` is baked into the Next.js production build.
Rebuild after changing it:

``` powershell
docker compose --env-file .env.production -f compose.prod.yaml build frontend
```

Then:

``` powershell
docker compose --env-file .env.production -f compose.prod.yaml up -d frontend
```

## Contributing

1.  Create a focused feature branch.
2.  Implement the change.
3.  Add/update tests where appropriate.
4.  Run backend checks.
5.  Run frontend lint/build.
6.  Review migrations.
7.  Open a pull request.

Example:

``` powershell
git checkout -b feature/my-feature
git status
git add .
git commit -m "Describe the change"
```

## Project Principles

### Inventory should reflect reality

Physical stock, location, batch, reservation, and movement state should
remain coherent.

### Every movement should be traceable

Inventory changes leave a historical record.

### Expiry should be managed proactively

FEFO and expiry monitoring reduce avoidable wastage.

### Data should drive replenishment

Usage history and forecasting inform reorder recommendations.

### Security belongs on the backend

Tenant isolation and authorization must not depend solely on frontend
behavior.

## Future Scope

Potential extensions include:

-   Supplier integrations
-   Automated supplier ordering
-   Advanced ML demand forecasting
-   Photo-based stock counting
-   Voice-based stock operations
-   UPI/billing integrations
-   Additional notification channels
-   Batch-level historical accounting valuation
-   Redis-backed distributed jobs and queues

## License

Add the project's chosen license before public distribution.

## Repository

**GitHub:** https://github.com/ashishraj-hub/Stock_Pulse

```{=html}
<p align="center">
```
`<sub>`{=html}StockPulse --- inventory intelligence built for
operational clarity.`</sub>`{=html}
```{=html}
</p>
```
