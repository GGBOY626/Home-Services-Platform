# Home Services Platform

A **full-stack, production-style** platform for on-demand home services (cleaning, maintenance, curtain installation). Four separate web apps serve **customers**, **workers**, **merchants**, and **platform admins**, with a shared Spring Boot API and a React TypeScript frontend monorepo.

---

## Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Backend** | Java 21, Spring Boot 3.x, Spring Security (JWT + Refresh Token), Spring Data JPA, Flyway, OpenAPI/Swagger |
| **Database** | MySQL 8 |
| **Payment** | Stripe API (online card + cash/offline) |
| **Maps** | Mapbox GL JS, Mapbox Geocoding API (address autocomplete) |
| **Email** | Resend API (transactional email notifications) |
| **Frontend** | React 18, TypeScript, Vite, TailwindCSS |
| **Package Manager** | pnpm 9 monorepo (4 apps + 2 shared packages) |
| **Deployment** | Docker, Docker Compose, Nginx |

---

## Prerequisites

| Tool | Version |
|------|---------|
| Java | 21 |
| Maven | 3.8+ |
| Node.js | 18+ |
| pnpm | 9 |
| Docker & Docker Compose | Any recent version |

---

## Local Startup — Step by Step

### Step 1 · Start the Database

From the project root:

```bash
docker-compose up -d
```

Wait ~10–15 seconds for MySQL to be ready.
- Database: `home_services` · User: `app` · Password: `appsecret`

---

### Step 2 · Start the Backend

```bash
cd backend
mvn spring-boot:run
```

- API base URL: **http://localhost:8080/api**
- Swagger UI: **http://localhost:8080/swagger-ui.html**

On first run, Flyway automatically applies all migrations (V1–V19) and seed data.  
All `@demo.com` accounts use password **Password123!** in the dev profile.

---

### Step 3 · Install Frontend Dependencies (first time only)

From the project root:

```bash
pnpm install
```

---

### Step 4 · Start the Frontend Apps

Run each app in a **separate terminal**:

| App | Command | URL |
|-----|---------|-----|
| User (customer) | `pnpm dev:user` | http://localhost:5173 |
| Admin dashboard | `pnpm dev:admin` | http://localhost:5174 |
| Merchant portal | `pnpm dev:merchant` | http://localhost:5175 |
| Worker app | `pnpm dev:worker` | http://localhost:5176 |

To build all apps for production:

```bash
pnpm build:all
```

---

### Demo Accounts (password for all: **Password123!**)

| Role | Email |
|------|-------|
| Admin | admin@demo.com |
| Merchant | merchant@demo.com |
| Worker 1 | worker1@demo.com |
| Worker 2 | worker2@demo.com |
| Customer | user@demo.com |

---

## Full Flow Demo (5 steps)

1. **User** (http://localhost:5173) — Log in as `user@demo.com` → Home → choose a category (e.g. Cleaning) → select a service (e.g. Basic Cleaning) → enter address, notes, and appointment time → **Place order**
2. **Admin** (http://localhost:5174) — Log in as `admin@demo.com` → Orders → open the new order → **Assign to Demo Merchant**
3. **Merchant** (http://localhost:5175) — Log in as `merchant@demo.com` → open the order → **Assign worker** (e.g. Worker One)
4. **Worker** (http://localhost:5176) — Log in as `worker1@demo.com` → open the order → **Accept** → **Mark completed**
5. **User** — Open the same order → **Confirm completion** → status becomes **CLOSED** → leave a rating

---

## Project Progress

> Last updated: 2026-06-09

### Core Order Lifecycle
- [x] Full state machine: `PLACED → MERCHANT_ASSIGNED → WORKER_ASSIGNED → ACCEPTED → COMPLETED → CLOSED`
- [x] Order creation with service snapshot (name, price, duration)
- [x] Order cancellation with reason (role-based rules per status)
- [x] Automatic timeout handling (merchant assign timeout → EXPIRED; worker accept timeout → rollback)
- [x] Appointment scheduling (`scheduledAt`): min 1 hour ahead, max 60 days, 15-minute increments
- [x] User reschedule (only while PLACED)

### Authentication & Access Control
- [x] JWT login + Refresh Token (seamless re-auth)
- [x] Role-based access control: USER / WORKER / MERCHANT / ADMIN
- [x] Worker and merchant application system (apply → admin approves)

### Service Catalog
- [x] Service category management (admin CRUD)
- [x] Service item management (base price, duration, active status)
- [x] Merchant custom pricing per service (MerchantService)
- [x] Public API: browse active services by category

### Worker Management
- [x] Worker online/offline status (ONLINE / OFFLINE)
- [x] Only ONLINE workers can be assigned to orders
- [x] Worker accept / reject flow
- [x] Completion proof upload (notes + up to 4 images)

### Payment System
- [x] Stripe online card payment (PaymentIntent create → confirm → mark paid)
- [x] **Cash payment option** — user can select offline payment to skip online checkout
- [x] Payment status tracking: `UNPAID / AWAITING / PAID / CASH_PENDING / FAILED`
- [x] Auto-refund on cancellation (PLACED + PAID → instant Stripe refund)
- [x] Admin-reviewed refund requests (MERCHANT_ASSIGNED + PAID → admin decides)
- [x] Partial refund support

### Settlement & Finance
- [x] Platform fee rules (global or per category, stored in basis points)
- [x] Automatic ledger entry on order close (platform fee + merchant net)
- [x] Merchant finance summary and ledger detail view
- [x] Admin marks merchant payouts as paid (PENDING → PAID)

### Complaints & Ratings
- [x] User raises complaints (category, subject, description, up to 4 images)
- [x] Complaint status flow: `OPEN → IN_REVIEW → RESOLVED / REJECTED → CLOSED`
- [x] Merchant and admin can reply to complaint threads
- [x] Post-service ratings (1–5 stars + optional comment)
- [x] Rating summary per merchant / service

### Audit & Logging
- [x] All key actions recorded in AuditEvent table
- [x] Structured MDC logging (requestId, actorRole, actorId, durationMs)
- [x] Admin audit log viewer

### Maps & Location
- [x] Mapbox Geocoding API address autocomplete in all frontend apps (user, worker, merchant)
- [x] Address coordinates (lat/lng) captured on orders at booking time
- [x] Worker home address with coordinates (for distance calculation)
- [x] Merchant business address with coordinates
- [x] User home address with coordinates (V19)

### Email Notifications (Resend)
- [x] Resend API integration for transactional emails
- [x] Order status notifications: placed, worker assigned, completed
- [x] Application result notifications: worker / merchant approval or rejection
- [x] Completion proof submission notification
- [x] Configurable sender email via `RESEND_FROM_EMAIL` env var

### Payment Audit
- [x] Stripe webhook event deduplication (`stripe_webhook_event` table)
- [x] Payment event log: every state transition recorded (`payment_event_log` table)
- [x] Full audit trail: INTENT_CREATED, PAID_WEBHOOK, PAID_CLIENT, PAYMENT_FAILED, REFUND_ISSUED, CASH_PAYMENT, RECONCILIATION_FIXED

### Deployment
- [x] Docker Compose for local dev (MySQL 8)
- [x] Docker Compose production stack (Nginx + 4 frontends + backend + MySQL)
- [x] Nginx port-preserving redirects behind reverse proxy
- [x] ICP filing number + Public Security filing number displayed in all footers

### Database Migrations

| Version | Description |
|---------|-------------|
| V1 | Base schema (users, orders, merchants, workers) |
| V2 | Seed data (demo accounts, demo services) |
| V3 | Cancellation / rejection / timeout fields |
| V4 | Service catalog (Category + ServiceItem) |
| V5 | Ledger settlement (PayoutLedger + PlatformFeeRule) |
| V6 | Fee rule effective window fix |
| V7 | Appointment time field (scheduledAt) |
| V8 | Worker availability (ONLINE / OFFLINE) |
| V9 | Completion proof (notes + attachments) |
| V10 | Complaint tickets (thread + attachments) |
| V11 | Order ratings |
| V12 | Audit events |
| V13 | Application system (worker / merchant join requests) |
| V14 | Stripe payment fields (PaymentIntent, PaymentStatus) |
| V15 | Refund requests |
| V16 | Cash payment (CASH_PENDING status) |
| V17 | Location fields (order/worker/merchant lat/lng) |
| V18 | Payment audit (webhook dedup + payment event log) |
| V19 | User home address |

---

## Project Structure

```
Home-Services-Platform/
├── backend/
│   └── src/main/java/com/homeservices/
│       ├── controller/          # REST controllers (User / Admin / Merchant / Worker)
│       ├── service/             # Business logic
│       ├── domain/              # JPA entities
│       ├── dto/                 # Request / response DTOs
│       ├── repository/          # Spring Data JPA repositories
│       ├── security/            # JWT filter, JwtService
│       └── config/              # Scheduling, storage, dispatch config
├── apps/
│   ├── user/                    # Customer app       (port 5173)
│   ├── admin/                   # Admin dashboard    (port 5174)
│   ├── merchant/                # Merchant portal    (port 5175)
│   └── worker/                  # Worker app         (port 5176)
├── packages/
│   ├── shared/                  # Shared TypeScript types + API client
│   └── ui/                      # Shared React component library
├── nginx/                       # Nginx production config
├── scripts/                     # Database reset scripts
├── docs/                        # Architecture diagrams, ER diagram
├── docker-compose.yml           # Local dev (MySQL only)
├── docker-compose.prod.yml      # Production (full stack)
└── pnpm-workspace.yaml
```

---

## Configuration

- **Backend:** `backend/src/main/resources/application.yml` — DB URL, JWT secret, Stripe keys, Resend API key, scheduling limits
- **Frontend API base:** `packages/shared/src/index.ts` → `API_BASE` defaults to `http://localhost:8080/api`. Override via `VITE_API_BASE` env var for production.
- **Mapbox:** Set `VITE_MAPBOX_TOKEN` in `.env.prod` (or `.env` for local dev) to enable address autocomplete in all frontend apps.
- **Email:** Set `RESEND_API_KEY` in `.env.prod` to enable email notifications via Resend.

---

## Reset the Database

To wipe all data and reapply migrations from scratch:

```bash
# Windows (PowerShell)
.\scripts\reset-database.ps1

# Linux / macOS
./scripts/reset-database.sh
```

Then restart the backend.

---

## Production Deployment (Docker)

```bash
# 1. Copy and fill in environment variables
cp .env.prod.example .env.prod
# Edit .env.prod: set MYSQL_ROOT_PASSWORD, MYSQL_PASSWORD, JWT_SECRET, STRIPE_SECRET_KEY, etc.

# 2. Build and start the full stack
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

Default access URLs (port 8088; override with `NGINX_PORT`):

| App | URL |
|-----|-----|
| Customer | http://localhost:8088/user/ |
| Admin | http://localhost:8088/admin/ |
| Merchant | http://localhost:8088/merchant/ |
| Worker | http://localhost:8088/worker/ |
| API | http://localhost:8088/api/ |

---

## License

Private / portfolio use.

---
---

# Home Services Platform（中文版）

一个**全栈、生产级**家政服务平台，支持按需预约清洁、维修、窗帘安装等上门服务。平台包含四个独立 Web 应用，分别服务**客户**、**工人**、**商家**和**平台管理员**，后端使用 Spring Boot，前端为 React TypeScript monorepo。

---

## 技术栈

| 层级 | 技术 |
|------|------|
| **后端** | Java 21、Spring Boot 3.x、Spring Security（JWT + Refresh Token）、Spring Data JPA、Flyway、OpenAPI/Swagger |
| **数据库** | MySQL 8 |
| **支付** | Stripe API（在线刷卡 + 线下现金） |
| **地图** | Mapbox GL JS、Mapbox Geocoding API（地址自动补全） |
| **邮件** | Resend API（事务邮件通知） |
| **前端** | React 18、TypeScript、Vite、TailwindCSS |
| **包管理** | pnpm 9 monorepo（4 个 app + 2 个共享包） |
| **部署** | Docker、Docker Compose、Nginx |

---

## 前置要求

| 工具 | 版本 |
|------|------|
| Java | 21 |
| Maven | 3.8+ |
| Node.js | 18+ |
| pnpm | 9 |
| Docker & Docker Compose | 任意新版 |

---

## 本地启动步骤

### 第 1 步：启动数据库

在项目根目录执行：

```bash
docker-compose up -d
```

等待约 10–15 秒让 MySQL 就绪。
- 数据库名：`home_services` · 用户：`app` · 密码：`appsecret`

---

### 第 2 步：启动后端

```bash
cd backend
mvn spring-boot:run
```

- API 地址：**http://localhost:8080/api**
- Swagger 文档：**http://localhost:8080/swagger-ui.html**

首次运行时 Flyway 自动执行所有迁移（V1–V19）并写入种子数据。
开发环境下所有 `@demo.com` 账号密码统一为 **Password123!**。

---

### 第 3 步：安装前端依赖（仅首次需要）

在项目根目录执行：

```bash
pnpm install
```

---

### 第 4 步：启动前端应用

每个 app 在**独立终端**中运行：

| 应用 | 启动命令 | 访问地址 |
|------|----------|----------|
| 用户端（客户） | `pnpm dev:user` | http://localhost:5173 |
| 管理后台 | `pnpm dev:admin` | http://localhost:5174 |
| 商家端 | `pnpm dev:merchant` | http://localhost:5175 |
| 工人端 | `pnpm dev:worker` | http://localhost:5176 |

一次性构建所有前端（生产包）：

```bash
pnpm build:all
```

---

### 测试账号（密码统一：**Password123!**）

| 角色 | 邮箱 |
|------|------|
| 管理员 | admin@demo.com |
| 商家 | merchant@demo.com |
| 工人 1 | worker1@demo.com |
| 工人 2 | worker2@demo.com |
| 普通用户（客户） | user@demo.com |

---

## 完整流程演示（5 步）

1. **用户端** (http://localhost:5173)：用 `user@demo.com` 登录 → 首页选服务类别（如 Cleaning）→ 选具体服务（如 Basic Cleaning）→ 填写地址和预约时间 → 下单
2. **管理后台** (http://localhost:5174)：用 `admin@demo.com` 登录 → Orders → 打开新订单 → 分配给 Demo Merchant
3. **商家端** (http://localhost:5175)：用 `merchant@demo.com` 登录 → 打开订单 → 分配工人（如 Worker One）
4. **工人端** (http://localhost:5176)：用 `worker1@demo.com` 登录 → 打开订单 → 接受 → 标记完成
5. **用户端**：打开同一订单 → 确认完成 → 状态变为 CLOSED → 可以留评分

---

## 当前项目进度

> 最后更新：2026-06-09

### 核心订单流程
- [x] 完整状态机：`PLACED → MERCHANT_ASSIGNED → WORKER_ASSIGNED → ACCEPTED → COMPLETED → CLOSED`
- [x] 用户下单（含服务快照：名称、价格、时长）
- [x] 订单取消（含原因，不同阶段有不同的取消权限）
- [x] 自动超时处理（商家分配超时 → EXPIRED；工人接受超时 → 回退）
- [x] 预约时间：最早 1 小时后、最晚 60 天内、15 分钟整点
- [x] 用户改期（仅 PLACED 状态）

### 身份认证与权限
- [x] JWT 登录 + Refresh Token 无感刷新
- [x] 四角色权限控制：USER / WORKER / MERCHANT / ADMIN
- [x] 工人 / 商家申请系统（申请 → 管理员审核）

### 服务目录
- [x] 服务分类管理（管理员 CRUD）
- [x] 服务项目管理（含价格、时长、启用状态）
- [x] 商家自定义服务报价（可覆盖平台基础价格）
- [x] 公开 API：按分类浏览所有启用服务

### 工人管理
- [x] 工人在线/离线状态切换（ONLINE / OFFLINE）
- [x] 仅在线工人可被分配订单
- [x] 工人接受/拒绝订单
- [x] 完工证明上传（文字 + 最多 4 张图片）

### 支付系统
- [x] Stripe 在线刷卡支付（创建 PaymentIntent → 确认 → 标记已付）
- [x] **现金支付选项**——用户可选择线下付款，直接跳过在线支付阶段
- [x] 支付状态追踪：`UNPAID / AWAITING / PAID / CASH_PENDING / FAILED`
- [x] 取消订单自动退款（PLACED + PAID → 自动退至 Stripe）
- [x] 退款申请流程（MERCHANT_ASSIGNED + PAID → 管理员审核）
- [x] 支持部分退款

### 结算与财务
- [x] 平台服务费规则（全局或按服务分类，BPS 计）
- [x] 订单关闭后自动生成账本（平台抽成 + 商家净收入）
- [x] 商家财务汇总与账本明细
- [x] 管理员标记打款（PENDING → PAID）

### 投诉与评价
- [x] 用户发起投诉（分类、主题、描述、最多 4 张图片）
- [x] 投诉状态流转：`OPEN → IN_REVIEW → RESOLVED / REJECTED → CLOSED`
- [x] 商家和管理员可回复投诉
- [x] 订单完成后评分（1–5 星 + 可选评论）
- [x] 商家/服务维度评分汇总

### 审计与日志
- [x] 所有关键操作写入审计事件表（AuditEvent）
- [x] 结构化 MDC 日志（requestId、actorRole、actorId、durationMs）
- [x] 管理员审计日志查看

### 地图与定位
- [x] Mapbox Geocoding API 地址自动补全，覆盖全部前端应用（用户端、工人端、商家端）
- [x] 下单时捕获地址经纬度坐标（lat/lng）
- [x] 工人家庭地址与坐标（用于距离计算）
- [x] 商家营业地址与坐标
- [x] 用户家庭地址与坐标（V19）

### 邮件通知（Resend）
- [x] Resend API 事务邮件集成
- [x] 订单状态通知：已下单、已分配工人、已完成
- [x] 申请结果通知：工人/商家申请通过或拒绝
- [x] 完工证明提交通知
- [x] 通过 `RESEND_FROM_EMAIL` 环境变量配置发件人

### 支付审计
- [x] Stripe Webhook 事件去重（`stripe_webhook_event` 表）
- [x] 支付事件日志：每次状态变更均记录（`payment_event_log` 表）
- [x] 完整审计追踪：INTENT_CREATED、PAID_WEBHOOK、PAID_CLIENT、PAYMENT_FAILED、REFUND_ISSUED、CASH_PAYMENT、RECONCILIATION_FIXED

### 部署
- [x] Docker Compose 本地开发（MySQL 8）
- [x] Docker Compose 生产部署（Nginx + 四前端 + 后端 + MySQL）
- [x] Nginx 反向代理端口透传（解决重定向端口丢失问题）
- [x] 全站底部展示 ICP 备案号 + 公安备案号

### 数据库迁移版本

| 版本 | 内容 |
|------|------|
| V1 | 基础 Schema（用户、订单、商家、工人） |
| V2 | 种子数据（测试账号、演示服务） |
| V3 | 取消/拒绝/超时扩展字段 |
| V4 | 服务目录（Category + ServiceItem） |
| V5 | 账本结算（PayoutLedger + PlatformFeeRule） |
| V6 | 费率规则时间窗口修复 |
| V7 | 预约时间字段（scheduledAt） |
| V8 | 工人在线状态（WorkerAvailability） |
| V9 | 完工证明（文字 + 附件） |
| V10 | 投诉工单（消息串 + 附件） |
| V11 | 订单评分 |
| V12 | 审计事件 |
| V13 | 申请系统（工人/商家入驻申请） |
| V14 | Stripe 支付字段（PaymentIntent、PaymentStatus） |
| V15 | 退款申请 |
| V16 | 现金支付（新增 CASH_PENDING 状态） |
| V17 | 位置字段（订单/工人/商家经纬度） |
| V18 | 支付审计（Webhook 去重 + 支付事件日志） |
| V19 | 用户家庭地址 |

---

## 项目结构

```
Home-Services-Platform/
├── backend/
│   └── src/main/java/com/homeservices/
│       ├── controller/          # REST 控制器（User / Admin / Merchant / Worker）
│       ├── service/             # 业务逻辑层
│       ├── domain/              # JPA 实体
│       ├── dto/                 # 请求/响应 DTO
│       ├── repository/          # Spring Data JPA 仓库
│       ├── security/            # JWT 过滤器、JwtService
│       └── config/              # 调度、存储、分发配置
├── apps/
│   ├── user/                    # 客户端       （端口 5173）
│   ├── admin/                   # 管理后台     （端口 5174）
│   ├── merchant/                # 商家端       （端口 5175）
│   └── worker/                  # 工人端       （端口 5176）
├── packages/
│   ├── shared/                  # 共享 TypeScript 类型 + API Client
│   └── ui/                      # 共享 React 组件库（Button、Card、Toast 等）
├── nginx/                       # Nginx 生产配置
├── scripts/                     # 数据库重置脚本
├── docs/                        # 架构图、ER 图
├── docker-compose.yml           # 本地开发（仅 MySQL）
├── docker-compose.prod.yml      # 生产部署（全栈）
└── pnpm-workspace.yaml
```

---

## 配置说明

- **后端：** `backend/src/main/resources/application.yml`——数据库 URL、JWT 密钥、Stripe 密钥、Resend API 密钥、调度参数
- **前端 API 地址：** `packages/shared/src/index.ts` → `API_BASE` 默认为 `http://localhost:8080/api`，生产环境通过 `VITE_API_BASE` 环境变量覆盖
- **Mapbox：** 在 `.env.prod`（或本地开发用 `.env`）中设置 `VITE_MAPBOX_TOKEN`，启用全部前端应用的地址自动补全
- **邮件：** 在 `.env.prod` 中设置 `RESEND_API_KEY`，启用 Resend 邮件通知

---

## 重置数据库

清空数据并重新执行所有迁移：

```bash
# Windows（PowerShell）
.\scripts\reset-database.ps1

# Linux / macOS
./scripts/reset-database.sh
```

执行后重启后端即可。

---

## 生产环境部署（Docker）

```bash
# 1. 复制并填写环境变量
cp .env.prod.example .env.prod
# 编辑 .env.prod：填写 MYSQL_ROOT_PASSWORD、MYSQL_PASSWORD、JWT_SECRET、STRIPE_SECRET_KEY 等

# 2. 构建并启动全栈
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

访问地址（默认端口 8088，可通过 `NGINX_PORT` 修改）：

| 应用 | URL |
|------|-----|
| 用户端 | http://localhost:8088/user/ |
| 管理后台 | http://localhost:8088/admin/ |
| 商家端 | http://localhost:8088/merchant/ |
| 工人端 | http://localhost:8088/worker/ |
| API | http://localhost:8088/api/ |

---

## 许可

私人 / 作品集用途。
