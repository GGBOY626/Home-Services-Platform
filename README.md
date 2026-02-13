# On-Demand Home Services Platform (MVP – Phase 1)

A production-style MVP with four separate frontends (User, Admin, Merchant, Worker), Spring Boot backend, and MySQL. Built for job applications (Seek NZ/AU) and freelance portfolios (Upwork).

## Tech Stack

- **Backend:** Java 21, Spring Boot 3.x, Spring Security (JWT + Refresh Token), Spring Data JPA, Flyway, OpenAPI/Swagger, Logback
- **Database:** MySQL 8 (Docker Compose)
- **Frontend:** React 18, TypeScript, Vite, TailwindCSS, pnpm monorepo (4 apps + shared UI)

## Prerequisites

- **Java 21**
- **Node.js 18+** and **pnpm 9**
- **Docker** and **Docker Compose** (for MySQL)
- **Maven 3.8+** (for backend)

## Quick Start

### 1. Start the database

From the project root:

```bash
docker-compose up -d
```

Wait until MySQL is healthy (e.g. 10–15 seconds). The app uses database `home_services`, user `app`, password `appsecret`.

### 2. Run the backend

```bash
cd backend
mvn spring-boot:run
```

- API: **http://localhost:8080**
- Swagger UI: **http://localhost:8080/swagger-ui.html**

On first run, Flyway applies migrations and seed data. In the `dev` profile, seed user passwords are set to **Password123!** for all `@demo.com` accounts.

### 3. Install frontend dependencies and run apps

From the project root:

```bash
pnpm install
```

Then run each app in a separate terminal (or use multiple terminals):

| App      | Command        | URL                    |
|----------|----------------|------------------------|
| User     | `pnpm dev:user`     | http://localhost:5173 |
| Admin    | `pnpm dev:admin`    | http://localhost:5174 |
| Merchant | `pnpm dev:merchant` | http://localhost:5175 |
| Worker   | `pnpm dev:worker`   | http://localhost:5176 |

### 4. Demo credentials (all passwords: **Password123!**)

| Role     | Email             |
|----------|-------------------|
| Admin    | admin@demo.com    |
| Merchant | merchant@demo.com |
| Worker 1 | worker1@demo.com  |
| Worker 2 | worker2@demo.com  |
| User     | user@demo.com     |

## End-to-end flow (manual test)

1. **User** (http://localhost:5173): Log in as `user@demo.com` → create a new cleaning order (address + optional notes).
2. **Admin** (http://localhost:5174): Log in as `admin@demo.com` → open **All Orders** → open the new order → **Assign to Demo Merchant**.
3. **Merchant** (http://localhost:5175): Log in as `merchant@demo.com` → open the assigned order → **Assign worker** (e.g. Worker One).
4. **Worker** (http://localhost:5176): Log in as `worker1@demo.com` → open the order → **Accept order** → then **Mark completed**.
5. **User** (http://localhost:5173): Open the same order → **Confirm completion** → order status becomes **CLOSED**.

See **MANUAL_TEST_REPORT.md** for a step-by-step test report and example log snippets.

## Project structure

```
Home-Services-Platform/
├── backend/                    # Spring Boot API
│   ├── src/main/java/com/homeservices/
│   │   ├── config/             # Security, CORS, RequestId, Audit, Seed
│   │   ├── controller/         # Auth, User, Admin, Merchant, Worker
│   │   ├── domain/             # Entities, enums
│   │   ├── dto/
│   │   ├── exception/          # GlobalExceptionHandler
│   │   ├── repository/
│   │   ├── security/           # JWT, JwtPrincipal
│   │   └── service/
│   └── src/main/resources/
│       ├── application.yml
│       ├── application-dev.yml
│       ├── logback-spring.xml
│       └── db/migration/        # Flyway V1 schema, V2 seed
├── apps/
│   ├── admin/                  # Platform admin app (port 5174)
│   ├── merchant/               # Merchant app (port 5175)
│   ├── user/                   # End-user app (port 5173)
│   └── worker/                 # Worker app (port 5176)
├── packages/
│   ├── shared/                 # API client, types
│   └── ui/                     # Shared React components (Button, Card, Input, Toast)
├── docker-compose.yml          # MySQL 8
├── pnpm-workspace.yaml
├── README.md
└── MANUAL_TEST_REPORT.md
```

## Configuration

- **Backend:** `backend/src/main/resources/application.yml` and `application-dev.yml` (DB URL, JWT secret, logging).
- **Frontend API base:** `packages/shared/src/index.ts` → `API_BASE = 'http://localhost:8080/api'`. Change for production.

## Phase 1 scope (no payments, maps, chat, reviews, refunds, auto-dispatch, or file uploads)

- Orders are considered paid by default.
- Only **CLEANING** service type is supported.
- Authorization: USER (create/view/confirm), ADMIN (view all, assign merchant), MERCHANT (view assigned, assign worker), WORKER (view assigned, accept, complete).

## License

Private / portfolio use.
