<!-- markdownlint-disable MD033 MD041 -->

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:0f172a,50:0e7490,100:06b6d4&height=230&section=header&text=StockPulse&fontSize=72&fontColor=ffffff&animation=fadeIn&fontAlignY=38&desc=Inventory%20Intelligence%20Platform&descSize=22&descAlignY=60" alt="StockPulse header" width="100%"/>

<img src="docs/assets/stockpulse-banner.gif" alt="StockPulse animated banner" width="100%"/>

<a href="https://github.com/ashishraj-hub/Stock_Pulse">
  <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=22&duration=3000&pause=900&color=22D3EE&center=true&vCenter=true&width=820&lines=Real-time+stock+visibility;FEFO+expiry+control+%E2%80%94+First+Expiry%2C+First+Out;Forecast-driven+smart+replenishment;Multi-tenant+%7C+RBAC+%7C+Audit+trail+%7C+Offline+sync;Built+with+Next.js+%2B+FastAPI+%2B+PostgreSQL" alt="Typing animation" />
</a>

<br/>

<a href="https://github.com/ashishraj-hub/Stock_Pulse/actions"><img src="https://img.shields.io/github/actions/workflow/status/ashishraj-hub/Stock_Pulse/ci.yml?branch=main&style=for-the-badge&label=CI&logo=githubactions&logoColor=white" alt="CI"></a>
<img src="https://img.shields.io/badge/Next.js-React-111827?style=for-the-badge&logo=next.js" alt="Next.js">
<img src="https://img.shields.io/badge/TypeScript-Strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
<img src="https://img.shields.io/badge/Tailwind-CSS-0ea5e9?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS">
<img src="https://img.shields.io/badge/FastAPI-Python-0f172a?style=for-the-badge&logo=fastapi" alt="FastAPI">
<img src="https://img.shields.io/badge/PostgreSQL-18-0f172a?style=for-the-badge&logo=postgresql" alt="PostgreSQL">
<img src="https://img.shields.io/badge/Docker-Ready-0f172a?style=for-the-badge&logo=docker" alt="Docker">

<br/>

<img src="https://img.shields.io/github/stars/ashishraj-hub/Stock_Pulse?style=social" alt="Stars">
<img src="https://img.shields.io/github/forks/ashishraj-hub/Stock_Pulse?style=social" alt="Forks">
<img src="https://img.shields.io/github/last-commit/ashishraj-hub/Stock_Pulse?style=flat-square&color=06b6d4" alt="Last commit">
<img src="https://img.shields.io/github/repo-size/ashishraj-hub/Stock_Pulse?style=flat-square&color=06b6d4" alt="Repo size">
<img src="https://img.shields.io/badge/PRs-welcome-22c55e?style=flat-square" alt="PRs welcome">

<br/><br/>

**[Overview](#-overview) • [Features](#-features) • [Architecture](#-architecture) • [Tech Stack](#-technology-stack) • [Quick Start](#-quick-start) • [API](#-api-areas) • [Deployment](#-production-deployment) • [Roadmap](#-roadmap) • [Author](#-author)**

</div>

---

## 🚀 Overview

**StockPulse** is a **multi-tenant inventory management platform** that connects stock operations, expiry control, forecasting, alerts, replenishment, purchasing, analytics, auditability, and offline synchronization into a single, coherent workflow.

Most small businesses, campuses, labs, and stores track stock in spreadsheets, discover expiry too late, and reorder by gut feeling. StockPulse replaces that with a system where **every stock movement is recorded, every decision is traceable, and every reorder is data-driven.**

> **Scan → Validate → Move → Analyse → Alert → Reorder → Approve → Receive.**

### 🎯 Why StockPulse?

| Problem | StockPulse's answer |
| :-- | :-- |
| Stock levels are outdated or wrong | Append-only movement ledger keeps inventory coherent in real time |
| Perishables expire on the shelf | **FEFO** consumption + expiry monitoring + proactive alerts |
| Reordering is guesswork | Forecast-based recommendations using lead time and safety stock |
| No accountability | Full **audit log** and role-based access control |
| Poor connectivity on the floor | **Offline mode** with IndexedDB queue and server-side reconciliation |
| One deployment per customer | **Multi-tenant** isolation enforced on the backend |

---

## ✨ Features

### 📦 Inventory & Stock

- Real-time inventory visibility
- SKU, **barcode**, and **QR** support
- Multi-location inventory
- Batch / lot tracking
- Available vs. reserved quantity
- Stock **issue, wastage, adjustment, transfer, and receiving** workflows
- Append-only stock movement history

### ⏳ FEFO — First Expiry, First Out

Available batches are ordered by expiry date and consumed earliest-expiring first. **Each consumed batch creates its own movement and audit record**, so traceability is preserved down to the lot.

```mermaid
flowchart LR
    A[Inventory lots] --> B[Filter available stock]
    B --> C[Read batch expiry]
    C --> D[Sort earliest expiry]
    D --> E[Consume required quantity]
    E --> F[Create movement per batch]
    F --> G[Write audit event]
```

### 🔔 Smart Alerts

- Low-stock and out-of-stock detection
- Expiry monitoring and wastage-risk visibility
- Central **Alert Center**
- **Telegram** notifications
- Autonomous **five-minute alert scheduler**
- Notification-event **deduplication** (per organization, alert, and channel)

### 🧠 Smart Reorder & Forecasting

Recommendations combine **available inventory, reorder points, lead time, safety stock, historical usage, and forecast demand.**

- Built with **pandas** and **statsmodels**
- **Weighted moving average** when history is limited
- **Holt / Exponential Smoothing** once enough observations exist

```mermaid
flowchart LR
    A[Stock movements] --> B[Historical usage]
    B --> C[Daily usage series]
    C --> D[Forecast model]
    D --> E[Predicted demand]
    E --> F[Lead-time demand]
    F --> G[Safety stock]
    G --> H[Reorder recommendation]
```

### 📊 Analytics

Operational dashboards covering inventory, consumption, stock movement, top movers, procurement, wastage, reorder signals, and cost trends.

### 💰 Cost Analysis

- Procurement spend
- Inventory value
- Wastage cost
- Cost trends
- Top wastage items
- Inventory breakdown

> ℹ️ **Valuation note:** inventory and wastage valuation use the **latest known purchase price**, because the current schema does not store historical unit price on every batch or movement. These figures are explicitly **operational estimates**, not batch-accurate accounting values.

### 🛒 Purchasing

- Suppliers and purchase orders
- Approval workflow
- Ordering with expected delivery dates
- **Partial receiving** and received-quantity tracking
- Full audit history

### 🔐 RBAC & Audit

| Role | Intended use |
| :-- | :-- |
| **Admin** | Full control of organization, users, and approvals |
| **Staff** | Day-to-day stock operations |
| **Viewer** | Read-only visibility |

Authorization is enforced **server-side** with organization/tenant isolation. Important actions generate audit records.

### 📴 Offline Mode

IndexedDB queues the following operations when connectivity drops:

`Issue` · `Wastage` · `Transfer` · `FEFO Issue`

Queued operations synchronize when connectivity returns, and **server-side validation remains authoritative.**

---

## 🏗️ Architecture

```mermaid
flowchart TB
    UI["Next.js · React · TypeScript · Tailwind"]
    API["FastAPI · Python"]
    ORM["SQLAlchemy · Alembic"]
    DB[("PostgreSQL")]
    FC["Forecasting<br/>pandas + statsmodels"]
    NT["Notifications<br/>Telegram / SMTP-ready"]

    UI -- "REST + JWT" --> API
    API --> ORM --> DB
    DB --> FC
    DB --> NT
```

### 🔁 End-to-End Workflow

```mermaid
flowchart LR
    A[Scan / Log] --> B[Validate]
    B --> C[Save Stock Movement]
    C --> D[Update Inventory]
    D --> E[Analyse Usage]
    E --> F[Alert]
    F --> G[Reorder Suggestion]
    G --> H[Approve Purchase Order]
    H --> I[Receive Stock]
```

Every stock movement contributes to the historical usage data that powers analytics and forecasting.

### 🔑 Authentication & Authorization

```mermaid
flowchart LR
    A[Credentials] --> B[Argon2 verification]
    B --> C[JWT access token]
    C --> D[Authenticated API request]
    D --> E[Organization check]
    E --> F[Role check]
    F --> G[Business operation]
```

Tenant boundaries are enforced by the backend, **not merely by frontend filtering.**

### 🗄️ Database Domain Model

```text
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

```text
available = quantity_on_hand - reserved_quantity
```

---

## 🧰 Technology Stack

| Layer | Technology |
| :-- | :-- |
| Frontend | Next.js, React, TypeScript |
| Styling | Tailwind CSS |
| Scanner | html5-qrcode |
| Backend | FastAPI, Python |
| Authentication | JWT + Argon2 |
| ORM | SQLAlchemy |
| Migrations | Alembic |
| Database | PostgreSQL |
| Forecasting | pandas + statsmodels |
| Notifications | Telegram, SMTP-ready |
| Offline storage | IndexedDB |
| Containers | Docker + Docker Compose |
| CI | GitHub Actions |
| Package management | uv / npm |

<div align="center">

<img src="https://skillicons.dev/icons?i=nextjs,react,ts,tailwind,python,fastapi,postgres,docker,githubactions&perline=9" alt="Tech stack icons" />

</div>

---

## 📁 Project Structure

```text
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

---

## ⚡ Quick Start

### Prerequisites

- Git
- Node.js 20+
- Python 3.13+
- [uv](https://docs.astral.sh/uv/)
- Docker Desktop
- VS Code or another code editor

Verify your setup:

```powershell
git --version
node --version
python --version
uv --version
docker --version
```

### 1️⃣ Clone

```powershell
git clone https://github.com/ashishraj-hub/Stock_Pulse.git
cd Stock_Pulse
```

### 2️⃣ Backend

```powershell
cd backend
uv sync
```

Create `backend/.env`:

```env
DATABASE_URL=postgresql+psycopg://stockpulse:stockpulse_dev_password@localhost:5432/stockpulse
JWT_SECRET_KEY=change-this-development-secret
```

### 3️⃣ PostgreSQL

From the project root:

```powershell
docker compose up -d db
docker compose ps
```

### 4️⃣ Migrations

From `backend/`:

```powershell
uv run python -m alembic upgrade head
```

After changing models, generate a new migration:

```powershell
uv run python -m alembic revision --autogenerate -m "describe change"
```

### 5️⃣ Start the backend

```powershell
uv run python -m fastapi dev app/main.py
```

| Service | URL |
| :-- | :-- |
| API | `http://127.0.0.1:8000` |
| Interactive docs | `http://127.0.0.1:8000/docs` |

### 6️⃣ Frontend

From `frontend/`:

```powershell
npm ci
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

Start the dev server:

```powershell
npm run dev
```

Frontend: **`http://localhost:3000`**

---

## ⚙️ Environment Variables

<details>
<summary><b>Backend configuration (click to expand)</b></summary>

<br/>

| Variable | Purpose |
| :-- | :-- |
| `DATABASE_URL` | PostgreSQL connection |
| `JWT_SECRET_KEY` | JWT signing secret |
| `JWT_ALGORITHM` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token lifetime |
| `CORS_ORIGINS` | Allowed frontend origins |
| `SMTP_ENABLED` | Email notification switch |
| `SMTP_HOST` | SMTP server |
| `SMTP_PORT` | SMTP port |
| `SMTP_USERNAME` | SMTP username |
| `SMTP_PASSWORD` | SMTP password |
| `SMTP_FROM_EMAIL` | Sender address |
| `SMTP_USE_TLS` | SMTP TLS |
| `TELEGRAM_ENABLED` | Telegram switch |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token |
| `TELEGRAM_CHAT_ID` | Telegram destination |

</details>

> ⚠️ **Never commit production secrets.**

---

## 🔔 Notifications

Telegram is supported through environment configuration. The production backend runs an **autonomous alert scheduler every five minutes** and records notification events to prevent duplicate sends for the same organization, alert, and channel.

SMTP support is implemented and can be enabled through configuration.

---

## 🐳 Production Deployment

Production files:

```text
compose.prod.yaml
backend/Dockerfile
frontend/Dockerfile
```

**Build**

```powershell
docker compose --env-file .env.production -f compose.prod.yaml build
```

**Start**

```powershell
docker compose --env-file .env.production -f compose.prod.yaml up -d
```

**Check**

```powershell
docker compose --env-file .env.production -f compose.prod.yaml ps
```

The backend container applies Alembic migrations before starting Uvicorn.

---

## 🔄 CI / GitHub Actions

```mermaid
flowchart TB
    A[Push / Pull Request] --> B[GitHub Actions]
    B --> C[Backend job]
    B --> D[Frontend job]
    C --> C1[Python setup] --> C2[uv sync] --> C3[Python compilation]
    D --> D1[Node.js setup] --> D2[npm install] --> D3[ESLint] --> D4[Production build]
    C3 --> E[Build validated]
    D4 --> E
```

---

## 🛡️ Security

- JWT authentication
- Argon2 password hashing
- Organization-level tenant isolation
- Server-side RBAC
- CORS controls
- Environment-based secrets
- Append-only stock movement history
- Audit logging
- Notification deduplication
- Dockerized production services

Never commit:

```text
.env
.env.production
frontend/.env.local
```

---

## 🧱 Data Integrity Principles

1. Historical stock movements are **never silently rewritten**.
2. Movement quantities are positive; **movement type determines direction**.
3. Available stock equals on-hand minus reserved quantity.
4. Expiry belongs to the **batch / lot**.
5. **Backend authorization is the security boundary.**
6. Corrections are represented by **new adjustment movements**.

---

## 🔌 API Areas

```text
/auth             /organizations     /locations
/items            /batches           /inventory-lots
/stock-movements  /users             /reorder
/dashboard        /suppliers         /purchase-orders
/analytics        /alerts            /cost-analysis
```

With the backend running, explore everything interactively at **`/docs`** (Swagger UI).

## 🖥️ Application Areas

| | | |
| :-- | :-- | :-- |
| Dashboard | Inventory | Stock Movements |
| Stock Operations | Scanner | Suppliers |
| Purchase Orders | Reorder Center | Smart Reorder |
| Analytics | Expiry Management | Alert Center |
| Wastage Management | Users | Audit Logs |

---

## 📸 Screenshots

> Add screenshots or GIFs under `docs/assets/` and reference them here. Recruiters and developers love seeing the product in action.

<!--
<div align="center">
  <img src="docs/assets/dashboard.png" width="48%" alt="Dashboard"/>
  <img src="docs/assets/alert-center.png" width="48%" alt="Alert Center"/>
  <img src="docs/assets/smart-reorder.png" width="48%" alt="Smart Reorder"/>
  <img src="docs/assets/scanner.png" width="48%" alt="Scanner"/>
</div>
-->

---

## 🧯 Troubleshooting

<details>
<summary><b>PostgreSQL connection failure</b></summary>

```powershell
docker compose ps
```

Verify that `DATABASE_URL` matches the database container.

</details>

<details>
<summary><b>Migration failure</b></summary>

```powershell
uv run python -m alembic current
uv run python -m alembic history
```

</details>

<details>
<summary><b>Frontend cannot reach backend</b></summary>

Verify:

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

Restart Next.js after changing environment variables.

</details>

<details>
<summary><b>Production frontend has an old API URL</b></summary>

`NEXT_PUBLIC_API_BASE_URL` is baked into the Next.js production build, so rebuild after changing it:

```powershell
docker compose --env-file .env.production -f compose.prod.yaml build frontend
docker compose --env-file .env.production -f compose.prod.yaml up -d frontend
```

</details>

---

## 🗺️ Roadmap

- [x] Multi-tenant inventory with batch/lot tracking
- [x] FEFO consumption with per-batch audit
- [x] Forecast-driven smart reorder
- [x] Purchase order approval and partial receiving
- [x] Telegram alerts with autonomous scheduler
- [x] Offline queue with IndexedDB
- [x] Dockerized production deployment and CI
- [ ] Supplier integrations
- [ ] Automated supplier ordering
- [ ] Advanced ML demand forecasting
- [ ] Photo-based stock counting
- [ ] Voice-based stock operations
- [ ] UPI / billing integrations
- [ ] Additional notification channels
- [ ] Batch-level historical accounting valuation
- [ ] Redis-backed distributed jobs and queues

---

## 🤝 Contributing

Contributions are welcome!

1. Create a focused feature branch.
2. Implement the change.
3. Add or update tests where appropriate.
4. Run backend checks.
5. Run frontend lint and build.
6. Review migrations.
7. Open a pull request.

```powershell
git checkout -b feature/my-feature
git status
git add .
git commit -m "Describe the change"
```

---

## 🧭 Project Principles

- **Inventory should reflect reality.** Physical stock, location, batch, reservation, and movement state stay coherent.
- **Every movement should be traceable.** Inventory changes leave a historical record.
- **Expiry should be managed proactively.** FEFO and expiry monitoring reduce avoidable wastage.
- **Data should drive replenishment.** Usage history and forecasting inform reorder recommendations.
- **Security belongs on the backend.** Tenant isolation and authorization never depend solely on frontend behavior.

---

## 👨‍💻 Author

<div align="center">

<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&size=20&pause=1200&color=A78BFA&center=true&vCenter=true&width=600&lines=Hi%2C+I'm+Ashish+Raj+%F0%9F%91%8B;B.Tech+CSE+%40+VIT-AP;AI%2FML+%26+Data+Builder;Open+to+internship+opportunities" alt="Author typing animation" />

### **Ashish Raj**

B.Tech Computer Science and Engineering student at **VIT-AP**, building AI/ML and data projects and looking for internship opportunities.

🔹 Microsoft Student Chapter (MSIT), VIT-AP
🔹 Google Developers Group on Campus
🔹 Edunet Foundation × IBM SkillsBuild internship (Agentic AI, Cyber Security, Quantum Computing)

<br/>

<a href="https://github.com/ashishraj-hub"><img src="https://img.shields.io/badge/GitHub-ashishraj--hub-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub"></a>
<a href="https://www.linkedin.com/in/YOUR-LINKEDIN-USERNAME/"><img src="https://img.shields.io/badge/LinkedIn-Connect-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn"></a>

<br/><br/>

<img src="https://github-readme-stats.vercel.app/api?username=ashishraj-hub&show_icons=true&theme=tokyonight&hide_border=true&count_private=true" alt="GitHub stats" height="165"/>
<img src="https://github-readme-streak-stats.herokuapp.com/?user=ashishraj-hub&theme=tokyonight&hide_border=true" alt="GitHub streak" height="165"/>

</div>

---

## 📄 License

Add the project's chosen license before public distribution (for example, [MIT](https://choosealicense.com/licenses/mit/)), then reference the `LICENSE` file here.

---

<div align="center">

### ⭐ If StockPulse helped or inspired you, please star the repository!

**[⭐ Star](https://github.com/ashishraj-hub/Stock_Pulse) · [🍴 Fork](https://github.com/ashishraj-hub/Stock_Pulse/fork) · [🐛 Report an issue](https://github.com/ashishraj-hub/Stock_Pulse/issues)**

<sub>StockPulse — inventory intelligence built for operational clarity.</sub>

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:06b6d4,50:0e7490,100:0f172a&height=120&section=footer" alt="footer" width="100%"/>

</div>
