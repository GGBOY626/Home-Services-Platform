# Home Services Platform

A **full-stack, production-style** platform for on-demand home services (cleaning, maintenance, curtain installation). Four separate web apps serve **customers**, **workers**, **merchants**, and **platform admins**, with a shared Spring Boot API and a modern React frontend. Built as a portfolio piece and for job applications (e.g. Seek NZ/AU).

---

## What This Project Is

- **For clients / interviewers:** A working demo you can run locally. It shows end-to-end flows: a customer books a service, an admin assigns it to a merchant, the merchant assigns a worker, the worker completes the job, and the customer confirms. No real payments—orders are treated as paid for demo purposes.
- **For developers:** A monorepo with a Java 21 + Spring Boot backend, MySQL, and four React (TypeScript + Vite) apps sharing UI and API client code. Includes auth (JWT), service catalog, scheduling, worker availability, and a ledger-based settlement model for platform fees.

---

## Features at a Glance

| Role | What they can do |
|------|-------------------|
| **Customer (User)** | Browse services by category, book with address and appointment time, view orders, confirm completion, submit complaints, view ratings. |
| **Worker** | See assigned tasks, accept or reject, set ONLINE/OFFLINE, mark orders complete, view ratings. |
| **Merchant** | View orders assigned to their business, assign workers (online only), manage service offerings and prices, view finance summary and ledgers. |
| **Admin** | View all orders, assign orders to merchants, manage service catalog (categories and items), manage fee rules and view ledgers, mark payouts as paid, handle worker/merchant applications, audit logs. |

**Cross-cutting:** JWT-based login and refresh tokens, role-based access, scheduled appointment times (with validation), and automatic ledger entries when orders are closed (platform fee and merchant net).

---

## Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Backend** | Java 21, Spring Boot 3.x, Spring Security (JWT + refresh token), Spring Data JPA, Flyway, OpenAPI/Swagger, Logback |
| **Database** | MySQL 8 (Docker Compose) |
| **Frontend** | React 18, TypeScript, Vite, TailwindCSS; pnpm monorepo with 4 apps + shared UI package |

---

## Quick Start

**Prerequisites:** Java 21, Node.js 18+, pnpm 9, Docker & Docker Compose, Maven 3.8+

### 1. Start the database

From the project root:

```bash
docker-compose up -d
```

Wait ~10–15 seconds for MySQL. Database: `home_services`, user: `app`, password: `appsecret`.

### 2. Run the backend

```bash
cd backend
mvn spring-boot:run
```

- API: **http://localhost:8080**
- Swagger UI: **http://localhost:8080/swagger-ui.html**

On first run, Flyway applies migrations and seed data. In the `dev` profile, all `@demo.com` accounts use password **Password123!**.

### 3. Install frontend dependencies and run the apps

From the project root:

```bash
pnpm install
```

Run each app in a separate terminal:

| App | Command | URL |
|-----|---------|-----|
| User (customer) | `pnpm dev:user` | http://localhost:5173 |
| Admin | `pnpm dev:admin` | http://localhost:5174 |
| Merchant | `pnpm dev:merchant` | http://localhost:5175 |
| Worker | `pnpm dev:worker` | http://localhost:5176 |

### 4. Demo credentials (password for all: **Password123!**)

| Role | Email |
|------|--------|
| Admin | admin@demo.com |
| Merchant | merchant@demo.com |
| Worker 1 | worker1@demo.com |
| Worker 2 | worker2@demo.com |
| User (customer) | user@demo.com |

---

## Try the Full Flow (5 steps)

1. **User** (http://localhost:5173): Log in as `user@demo.com` → Home → choose **Cleaning** → in the booking modal pick a service (e.g. Basic Cleaning), enter address and notes → set appointment time → **Place order**.
2. **Admin** (http://localhost:5174): Log in as `admin@demo.com` → **Orders** → open the new order → **Assign to Demo Merchant**.
3. **Merchant** (http://localhost:5175): Log in as `merchant@demo.com` → open the assigned order → **Assign worker** (e.g. Worker One).
4. **Worker** (http://localhost:5176): Log in as `worker1@demo.com` → open the order → **Accept order** → **Mark completed**.
5. **User** (http://localhost:5173): Open the same order → **Confirm completion** → status becomes **CLOSED**.

More detail: **MANUAL_TEST_REPORT.md**.

---

## Project Structure (high level)

```
Home-Services-Platform/
├── backend/                 # Spring Boot API (auth, orders, catalog, finance, audit)
├── apps/
│   ├── user/                # Customer app (port 5173)
│   ├── admin/               # Platform admin (port 5174)
│   ├── merchant/            # Merchant dashboard (port 5175)
│   └── worker/              # Worker app (port 5176)
├── packages/
│   ├── shared/              # API client, shared TypeScript types
│   └── ui/                  # Shared React components (Button, Card, Input, Toast, etc.)
├── docker-compose.yml       # MySQL 8
├── pnpm-workspace.yaml
└── README.md
```

---

## Configuration

- **Backend:** `backend/src/main/resources/application.yml` and `application-dev.yml` (DB URL, JWT secret, logging, scheduling limits).
- **Frontend API base:** `packages/shared/src/index.ts` → `API_BASE = 'http://localhost:8080/api'`. Change for production.

---

## Resetting the database

To wipe the database and reapply all migrations (e.g. after schema or seed changes):

- **Windows (PowerShell):** `.\scripts\reset-database.ps1`
- **Linux/macOS:** `./scripts/reset-database.sh`

Then restart the backend.

---

## Scope (what’s in and what’s not)

**In scope for this phase:** Orders with service snapshot (name, price, duration), scheduling (required appointment time with validation), worker availability (ONLINE/OFFLINE), catalog management, ledger-based settlement (platform fee and merchant net when order is closed), complaints, ratings, audit events. No real payments, maps, chat, reviews/refunds, auto-dispatch, or file uploads in the core flow described above.

**Scheduling rules:** New orders require `scheduledAt` (e.g. ISO 8601). It must be at least 1 hour ahead, within the next 60 days (configurable), and on 15-minute increments. Users can reschedule only while status is **PLACED**.

---

## Production-style deployment (Docker)

A single Docker Compose setup can run the full stack with Nginx serving the four frontends and proxying the API.

1. Copy env: `cp .env.prod.example .env.prod` and set `MYSQL_ROOT_PASSWORD`, `MYSQL_PASSWORD`, `JWT_SECRET`, and optionally `APP_PUBLIC_BASE_URL`, `NGINX_PORT`, `CORS_ALLOWED_ORIGINS`. Do not commit `.env.prod`.
2. Start: `docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build`
3. Access: User http://localhost:8088/user/, Admin http://localhost:8088/admin/, Merchant http://localhost:8088/merchant/, Worker http://localhost:8088/worker/ (default port 8088; override with `NGINX_PORT`).

See **DEPLOYMENT.md** (and **DEPLOYMENT_ZH_LOCAL.md** for a Chinese local-run guide) for full steps. **MANUAL_TEST_REPORT_ZH_PHASE2_2.md** has a Chinese test guide for the deployed stack.

---

## License

Private / portfolio use.
