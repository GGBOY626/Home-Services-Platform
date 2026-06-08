# HomeServices 项目提升计划：第九周 ~ 第十二周

## 概述

目前项目已完成核心功能（用户下单、工人接单、商家管理、管理员审批、Stripe 支付、邮件通知），但距离**生产级别标准**仍有差距。以下计划按 **安全 → 质量 → 体验 → 自动化** 的顺序，用四周时间将项目提升至接近上线水平。

---

## 第九周：安全与运维基础 🔒

> **当前状态：项目"能跑"，但存在多处安全隐患。本周目标是消除最严重的安全风险，并建立基本的运维监控能力。**

---

### 9.1 配置 HTTPS / SSL 证书

**当前问题：**

`nginx/nginx.conf` 只监听 80 端口（HTTP），所有流量——包括登录密码、JWT Token、支付信息——都以明文传输，任何一个中间节点都能窃取用户凭证。

```
server {
    listen 80;                    # ← 只有 HTTP
    server_name zhengwei.tech;
    ...
}
```

**为什么需要做：**

- HTTP 明文传输是 Web 应用最致命的安全漏洞。攻击者在公共 WiFi 下可以轻易嗅探到 JWT Token，进而冒充用户身份。
- 浏览器会对 HTTP 站点标记"不安全"（🔒 Not Secure），严重影响用户信任。
- 这是工业界任何一个上线项目必须满足的底线。

**实现方案：**

使用 Let’s Encrypt 免费证书 + Nginx SSL 终止，将 80 端口重定向到 443：

```nginx
server {
    listen 443 ssl;
    server_name zhengwei.tech;
    ssl_certificate     /etc/letsencrypt/live/zhengwei.tech/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/zhengwei.tech/privkey.pem;
    ...
}
server {
    listen 80;
    server_name zhengwei.tech;
    return 301 https://$host$request_uri;   # HTTP → HTTPS 强制跳转
}
```

**预期成果：** 全站 HTTPS，浏览器显示 🔒 安全锁，密码和 Token 不再明文传输。

**预估工时：** 2 小时

---

### 9.2 登录接口限流（Brute Force Protection）

**当前问题：**

登录接口 `/api/auth/login` 没有任何调用频率限制。攻击者可以在一秒内发送数百次请求，暴力枚举密码。由于项目使用的是弱加密（HMAC-SHA256 JWT），一旦密码被猜中，攻击者能获取完整的身份凭证。

**为什么需要做：**

- OWASP Top 10 中，失效的访问控制（Broken Authentication）常年排在第二位。
- 没有限流的登录接口等同于把大门敞开。哪怕密码强度足够，定时攻击（timing attack）和字典攻击依然有效。
- 这是一个用一个小时就能极大提升安全水平的改进——投入产出比最高的安全措施之一。

**实现方案：**

使用 Bucket4j 令牌桶算法，在 Spring Interceptor 层做 IP 级别限流——同一 IP 每分钟最多 5 次登录尝试，超限返回 429 Too Many Requests：

```
用户 ──→ Nginx ──→ RateLimitInterceptor ──→ AuthController
                         │
                    每分钟 5 次登录
                    超出 → 429 + 15 分钟冷却
```

```java
@Component
public class RateLimitInterceptor implements HandlerInterceptor {
    // IP → token bucket (5 requests per minute)
    private final LoadingCache<String, Bucket> buckets = ...

    @Override
    public boolean preHandle(HttpServletRequest request, ...) {
        Bucket bucket = buckets.get(clientIP);
        if (bucket.tryConsume(1)) return true;   // 放行
        response.setStatus(429);                  // 拒绝
        return false;
    }
}
```

**预期成果：** 单个 IP 每分钟最多尝试 5 次登录，暴力破解从"秒破"变为"不可行"。

**预估工时：** 3 小时

---

### 9.3 Stripe Webhook 强制签名验证

**当前问题：**

`StripeService.java` 中，当 `webhook-secret` 配置为空时，Webhook 回调**跳过签名验证，直接解析原始 JSON**（第 122-130 行）：

```java
// 当前代码 —— 有安全隐患
if (webhookSecret != null && !webhookSecret.isBlank()) {
    event = Webhook.constructEvent(payload, sigHeader, webhookSecret);  // ✅ 安全路径
} else {
    event = Event.GSON.fromJson(payload, Event.class);                  // ❌ 危险回退
}
```

**为什么需要做：**

- Stripe Webhook 的 URL 是公开的（必须是公开的，因为 Stripe 服务器需要回调）。任何人都可以向这个端点发送伪造的 `payment_intent.succeeded` 事件，模拟支付成功。
- 签名验证是 Stripe 用来验证"这个回调确实来自 Stripe"的唯一手段。跳过它意味着放弃这层保障。
- 在生产环境中，`webhook-secret` 应该**必须**配置，不存在"跳过验证"的场景。

**实现方案：**

1. 在应用中**强制要求** `webhook-secret` 非空（prod profile 下启动即校验）。
2. 移除 `Event.GSON.fromJson` 的 fallback 路径，只保留签名验证路径。
3. `.env.prod` 中添加 `STRIPE_WEBHOOK_SECRET`，从 Stripe Dashboard 获取真实密钥。

**预期成果：** 无法伪造支付回调。支付系统达到生产安全标准。

**预估工时：** 1 小时

---

### 9.4 Spring Boot Actuator 健康检查

**当前问题：**

项目没有任何健康检查端点。Docker 容器是否正常运行、数据库连接是否存活、应用是否处于就绪状态——这些信息全部获取不到。

- `docker-compose.prod.yml` 中 MySQL 有 `healthcheck`，但后端应用没有
- `pom.xml` 中没有 `spring-boot-starter-actuator` 依赖
- 没有 `/actuator/health` 端点

**为什么需要做：**

- 健康检查是运维的"眼睛"。没有它，应用挂了你都不知道。
- Actuator 不仅能提供健康状态，还能暴露 JVM 堆内存使用率、GC 频率、线程数等关键指标，用于性能诊断。
- Docker / Kubernetes 依赖健康检查端点来判断容器是否需要重启（readiness / liveness probe）。

**实现方案：**

1. `pom.xml` 添加 `spring-boot-starter-actuator`。
2. 在 `application.yml` 中暴露 `/actuator/health` 端点。
3. 在 `docker-compose.prod.yml` 的 `backend` 服务上添加健康检查：

```yaml
backend:
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:8080/actuator/health"]
    interval: 30s
    timeout: 5s
    retries: 3
```

**预期成果：** 可以实时监控应用状态，Docker 在应用异常时能自动重启。

**预估工时：** 0.5 小时

---

### 9.5 过期 Refresh Token 定时清理

**当前问题：**

`RefreshTokenRepository` 中定义了 `deleteByExpiresAtBefore(Instant now)` 方法，但**没有任何地方调用它**。已经过期的 Refresh Token 会永久留在 `refresh_token` 表中，数据库表无限增长。

**为什么需要做：**

- 随业务运行，Refresh Token 表会越积越多（每次登录/刷新都写入一条），影响查询性能。
- 这是一个用 5 分钟就能解决的运维问题，体现了对数据库生命周期管理的关注。
- 清理逻辑极为简单：一条 `@Scheduled` 注解搞定。

**实现方案：**

在 `RefreshTokenRepository` 上新建一个 Scheduled Service，每天凌晨 3 点执行清理：

```java
@Scheduled(cron = "0 0 3 * * *")
public void cleanExpiredTokens() {
    int deleted = refreshTokenRepository.deleteByExpiresAtBefore(Instant.now());
    log.info("Cleaned {} expired refresh tokens", deleted);
}
```

**预期成果：** 数据库 Refresh Token 表不会无限膨胀，每天自动清理过期数据。

**预估工时：** 0.5 小时

---

### 第九周小结

| 任务 | 工时 | 安全影响 |
|------|------|----------|
| HTTPS / SSL | 2h | 🔴 高——消除明文传输 |
| 登录限流 | 3h | 🔴 高——防止暴力破解 |
| Webhook 签名 | 1h | 🔴 高——防止伪造支付 |
| Actuator 健康检查 | 0.5h | 🟡 中——运维可见性 |
| Token 定时清理 | 0.5h | 🟡 中——数据库健康 |
| **合计** | **7h** | |

**周主题：让项目从不安全变安全。**

---

## 第十周：质量与测试 🧪

> **当前状态：整个项目测试覆盖率为 0%。本周目标是给核心业务流程加上自动化测试——这是"学生项目"和"工程级项目"的分界线。**

---

### 10.1 核心业务流程集成测试

**当前问题：**

`backend/src/test/` 目录完全为空。项目依赖中存在 `spring-boot-starter-test` 和 `spring-security-test`，但没有写任何测试类。

这意味着：
- 每次改了代码，你只能手动点浏览器来验证"功能有没有坏"
- 没有回归测试——今天修一个 Bug，不知道会不会引发三个新 Bug
- 老师会问："你做了这么多功能，怎么保证改支付逻辑不会影响订单系统？"

**为什么需要做：**

- 集成测试是软件工程中最重要的质量保障手段。没有测试的项目就是"黑盒"——只能靠运气保证正确性。
- 对于涉及支付（Stripe）、认证（JWT）、多角色（User / Worker / Merchant / Admin）的复杂系统，手动测试根本覆盖不了所有场景。
- 这是汇报时最能体现工程素养的任务——**从 0 到 1，比从 80 到 100 更有说服力**。

**实现方案：**

使用 Spring Boot Test + TestContainers（真实 MySQL 容器）编写全链路集成测试：

1. **认证流程测试**：注册 → 登录 → Token 刷新 → 角色授权 → 401 未授权返回
2. **订单生命周期测试**：创建订单 → 商家分配工人 → 工人接单 → 工人提交完工凭证 → 用户确认 → 订单关闭
3. **支付流程测试**：创建 Payment Intent → 模拟 Webhook 回调 → 支付状态同步 → 退款处理
4. **审批流程测试**：商家/工人申请 → 管理员审批 → 账户激活 → 邮件通知触发

```java
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@Testcontainers
class OrderLifecycleIntegrationTest {

    @Container
    static MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.0");

    @Test
    void shouldCompleteFullOrderLifecycle() {
        // 1. 用户登录
        // 2. 创建订单
        // 3. 商家分配工人
        // 4. 工人接单
        // 5. 工人提完工凭证
        // 6. 用户确认完成
        // 7. 订单状态 → CLOSED
    }
}
```

**预期成果：** 至少 4 个集成测试类，覆盖认证、订单、支付、审批 4 条核心链路。

**预估工时：** 6 小时

---

### 10.2 修复 N+1 查询问题

**当前问题：**

`RatingService.java` 的 `listForMerchant` 方法（第 106-116 行），分页查出评分记录后，在 for 循环中逐条调用 `orderRepository.findById()` 来获取 `serviceNameSnapshot`：

```java
// 当前逻辑 —— 每页 20 条评分 = 1 + 20 = 21 次 SQL 查询
Page<OrderRating> page = ratingRepository.findAllByTargetMerchantId(...);
for (OrderRating rating : page.getContent()) {
    Order order = orderRepository.findById(rating.getOrderId()).orElse(null);  // ❌ N+1
    dto.setServiceName(order.getServiceNameSnapshot());
}
```

**为什么需要做：**

- N+1 查询是最常见的数据库性能反模式。当前代码中，分页查询 20 条评分需要执行 **21 条 SQL**，而不是 1 条。
- 在高并发场景下，这个问题会迅速耗尽数据库连接池，导致雪崩。
- 在公司代码审查中，**N+1 一定是会被打回的**——修掉它说明你懂得审视自己的代码。

**实现方案：**

一次性批量查询所有需要的 Order：

```java
// 优化后 —— 2 条 SQL，无论页大小
Page<OrderRating> page = ratingRepository.findAllByTargetMerchantId(...);
Set<UUID> orderIds = page.map(OrderRating::getOrderId).toSet();
Map<UUID, Order> orderMap = orderRepository.findAllById(orderIds)
    .stream().collect(toMap(Order::getId, o -> o));

for (OrderRating rating : page.getContent()) {
    Order order = orderMap.get(rating.getOrderId());
    dto.setServiceName(order.getServiceNameSnapshot());
}
```

**预期成果：** 评分列表查询从 21 次 SQL 降到 2 次，分页越大优化越明显。

**预估工时：** 0.5 小时

---

### 10.3 清理废弃代码

**当前问题：**

- `WorkerOrderController.java` 中 `/orders/{id}/complete` 端点已废弃，代码里直接抛出异常让客户端改用 `/orders/{id}/complete-with-proof`，但仍保留在代码库中。
- `PaymentEventLog.java` 实体类中 `orderId` 字段标注了 `// TODO`，使用了 `String` 而非 `UUID` 类型。
- 代码中有若干不一致的命名和注释。

**为什么需要做：**

- 废弃代码是技术债务，会让新加入的开发者困惑。
- 这是一个"代码洁癖"的提升——表明你不仅关注功能，也在意代码质量。

**预估工时：** 0.5 小时

---

### 第十周小结

| 任务 | 工时 | 质量影响 |
|------|------|----------|
| 核心流程集成测试 | 6h | 🔴 高——0→1 质变 |
| 修复 N+1 查询 | 0.5h | 🟡 中——性能 |
| 清理废弃代码 | 0.5h | 🟢 低——整洁度 |
| **合计** | **7h** | |

**周主题：从"没有测试"到"核心链路过测"，这是学生项目到工程项目的分界线。**

---

## 第十一周：性能与用户体验 ⚡

> **当前状态：项目功能完整，但体验上存在明显短板——管理端手机不可用、API 无缓存、无障碍缺失。本周目标是提升用户端到端的体验质量。**

---

### 11.1 公共接口缓存

**当前问题：**

首页品类列表 `/api/public/categories` 和城市列表 `/api/public/locations` 是访问最频繁的接口（每个用户打开首页都会请求），但每次都直接查询数据库。这些数据很少变动（品类可能数周不变），却白白消耗数据库资源。

**为什么需要做：**

- 高频 + 不常变 = 缓存的最佳场景。这是一个非常典型的性能优化点。
- 在没有任何缓存的系统中，每次首页加载都至少命中 3-5 次数据库查询。加上缓存后，这些请求可以在应用层直接返回。
- Spring Cache + Caffeine（高性能本地缓存）集成非常简单，改动量极小。

**实现方案：**

1. `pom.xml` 添加 `spring-boot-starter-cache` + `caffeine` 依赖。
2. 在 `@Configuration` 类上启用 `@EnableCaching`。
3. 给查询接口加 `@Cacheable`：

```java
@Cacheable(value = "categories", unless = "#result.isEmpty()")
public List<CategoryDto> getCategories() {
    log.debug("Cache miss — querying database");
    return categoryRepository.findAll().stream()
        .map(CategoryDto::fromEntity).toList();
}
```

缓存策略：5 分钟过期（TTL），空结果不缓存。

**预期成果：** 品类/城市查询首次查库后 5 分钟内直接走缓存，首页响应延迟显著降低。

**预估工时：** 1 小时

---

### 11.2 管理端 + 商家端移动适配

**当前问题：**

- 管理端 `AdminSidebarLayout.tsx` 使用固定宽度 `w-52` 侧边栏，没有任何响应式断点。在手机上，侧边栏占据 208px（约一半屏幕宽度），剩余内容区几乎无法使用。
- 商家端 `SidebarLayout.tsx` 同理，固定侧边栏，没有移动端降级方案。
- 对比之下，用户端 `MobileShell.tsx` 和工人端却采用了移动优先的底部导航设计——这造成了体验上的**严重不一致**。

**为什么需要做：**

- 在中国（你的目标市场），**超过 60% 的用户通过手机访问 Web 应用**。管理端和商家端在手机上完全不可用，这意味着管理员和商家老板无法在外出时处理紧急事务。
- 响应式设计是 2026 年 Web 开发的基本要求，不是一个"可选"功能。
- 这是用户体验方面最明显的短板——让老师用手机打开管理端，他立刻就会发现问题。

**实现方案：**

借鉴用户端和工人端的移动优先模式，给管理端和商家端添加响应式导航：

- `md:` 及以上宽屏 → 保持现有侧边栏布局
- `< md:` 移动端 → 侧边栏折叠为顶部汉堡菜单 + 底部导航栏（类似用户端）

```tsx
// AdminSidebarLayout.tsx 改造思路
<>
  {/* 桌面端：固定侧边栏 */}
  <aside className="hidden md:flex md:w-52 ...">
    <AdminSidebar />
  </aside>

  {/* 移动端：底部导航 + 顶部汉堡菜单 */}
  <MobileHeader className="md:hidden" onMenuClick={openDrawer} />
  <BottomNav className="md:hidden" items={navItems} />

  {/* 右侧内容区，响应式宽度 */}
  <main className="flex-1 md:ml-52">
    <Outlet />
  </main>
</>
```

**预期成果：** 四个端（用户、工人、商家、管理）全部在手机上可用，导航方式统一。

**预估工时：** 4 小时

---

### 11.3 无障碍访问改进（A11y）

**当前问题：**

- 导航图标使用纯 Emoji（`'🏠'`, `'📋'`, `'👤'`），屏幕阅读器读取为"house emoji"而非"首页"
- `AddressAutocomplete.tsx` 地址建议下拉框只支持鼠标点击（`onMouseDown`），不支持键盘上下箭头选择、不支持 Enter 确认
- 图片 Modal 的 `alt` 文本是 `"Enlarged"`——毫无意义
- 自定义弹窗（如投诉弹窗）没有焦点锁定（focus trapping）——Tab 键可以跳到弹窗后面的元素
- 表单验证错误通过 Toast 展示，但没有用 `aria-describedby` 关联到具体的错误字段
- 没有 `aria-live` 区域——屏幕阅读器用户不知道动态变化（如加载状态、错误提示）

**为什么需要做：**

- **Web 无障碍（WCAG 2.1）是国际标准**，也是现代 Web 开发必须关注的维度。
- 在学校项目中，几乎没有人做无障碍——你做了就是绝对的差异化亮点。
- 很多改进非常简单（加 `aria-label`、加键盘事件），投入产出比极高。
- 在中国，"信息无障碍"已被写入国家标准（GB/T 37668-2019），盲人、老年人群体同样需要使用互联网服务。

**实现方案：**

1. **键盘导航**：给 `AddressAutocomplete` 添加 `onKeyDown` 处理——上下箭头高亮选项、Enter 选择、Escape 关闭
2. **无障碍标签**：所有 Emoji 导航加上 `aria-label`：

```tsx
<Link to="/" aria-label="Home">🏠</Link>
<Link to="/orders" aria-label="My Orders">📋</Link>
```

3. **焦点管理**：给 Dialog / Drawer 组件添加 `useEffect(() => firstInputRef.current?.focus(), [])`，并在关闭后恢复焦点
4. **实时区域**：Toast 容器添加 `aria-live="polite"`，错误提示添加 `aria-live="assertive"`
5. **表单关联**：错误信息通过 `aria-describedby` 关联到对应的 `<input>`

**预期成果：** 核心交互的 WCAG 2.1 基本合规，可正确被屏幕阅读器解读。

**预估工时：** 3 小时

---

### 第十一周小结

| 任务 | 工时 | 体验影响 |
|------|------|----------|
| 公共接口缓存 | 1h | ⚡ 首页加载加速 |
| 移动端适配 | 4h | 📱 四端全平台可用 |
| 无障碍改进 | 3h | ♿ 差异化亮点 |
| **合计** | **8h** | |

**周主题：让项目不光能用，而且好用、谁都能用。**

---

## 第十二周：DevOps 与收尾 🚀

> **当前状态：部署是手动操作，API 文档简陋，邮件功能是"半成品"。本周完成自动化、文档化、以及功能收尾。**

---

### 12.1 GitHub Actions CI/CD 流水线

**当前问题：**

部署流程完全是手动的：SSH 到服务器 → git pull → docker compose build → docker compose up -d。没有任何自动化检查环节——代码 push 之后会不会构建失败、会不会破坏现有功能，完全不知道。

**为什么需要做：**

- CI/CD 是现代软件工程的"标配"。任何一个正规公司，代码 push 后一定有自动化流水线。
- 对于你这个项目，CI/CD 的价值在于：**让老师看到你懂得软件工程不只是写代码，还包括交付流程**。
- 汇报时展示一个绿勾的 GitHub Actions Pipeline 远比"我手动部署了"有说服力。

**实现方案：**

创建 `.github/workflows/deploy.yml`，包含三个阶段：

```yaml
name: Build & Deploy

on:
  push:
    branches: [main]

jobs:
  test:                         # 阶段 1: 运行测试
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { java-version: 21 }
      - run: mvn test -pl backend

  build:                        # 阶段 2: 构建镜像
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Build Docker images
        run: docker compose -f docker-compose.prod.yml build

  deploy:                       # 阶段 3: 部署到服务器
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SERVER_SSH_KEY }}
          script: |
            cd /opt/home-services
            git pull
            docker compose -f docker-compose.prod.yml up -d --build
```

**预期成果：** Push → 自动跑测试 → 自动构建 → 自动部署。失败的 push 不会到达服务器。

**预估工时：** 3 小时

---

### 12.2 API 文档完善

**当前问题：**

Swagger 已配置（`/swagger-ui.html` 可访问），但文档质量极低：
- 所有 `@Operation` 注解只有 `summary`，没有 `description`、没有响应示例
- DTO 类上没有 `@Schema` 注解——字段含义、约束条件、示例值全部缺失
- 没有定义 Security Scheme——Swagger 页面上看不到 JWT 鉴权的配置方式
- 错误响应格式没有文档化——调用方不知道 400/401/403/409/500 分别返回什么结构

**为什么需要做：**

- API 文档是前后端协作的桥梁。如果这个项目要交给别人继续开发（或接入第三方），没有文档是不可能完成的任务。
- 一个好的 Swagger 页面可以在汇报时直接展示——比写 README 更有说服力。
- SpringDoc + `@Schema` 注解可以自动生成字段级别的示例，改动量不大但视觉效果显著。

**实现方案：**

1. 给所有 DTO 加 `@Schema(description = "...", example = "...")` 注解
2. 给所有 `@Operation` 添加 `description` 和 `responses`
3. 配置 OpenAPI Security Scheme（JWT Bearer Token）
4. 添加 `@ApiResponses` 注解说明各状态码的含义

```java
@Schema(description = "User registration request")
public record RegisterRequest(
    @Schema(description = "Email address", example = "john@example.com")
    @NotBlank @Email
    String email,

    @Schema(description = "Password (min 8 characters)", example = "MyP@ssw0rd!")
    @NotBlank @Size(min = 8)
    String password,

    @Schema(description = "Account type", example = "USER",
            allowableValues = {"USER", "WORKER", "MERCHANT"})
    @NotNull
    AccountType accountType
) {}
```

**预期成果：** Swagger 页面从"只有方法名"升级为"有完整的请求/响应示例+字段约束说明"。

**预估工时：** 2 小时

---

### 12.3 邮件收件人动态化

**当前问题：**

`EmailService.java` 第 30 行，所有邮件的收件人硬编码为 `z1596761805@gmail.com`：

```java
private static final String FIXED_RECIPIENT = "z1596761805@gmail.com";
```

这导致：
- 用户 A 下单 → 邮件发到你自己的邮箱
- 商家 B 被审批 → 邮件还是发到你自己的邮箱
- 工人 C 接单完成 → 邮件依然是发到你自己的邮箱

虽然代码注释中说明了这是临时措施，但目前它仍然是一个"半成品"功能——**邮件系统能发出邮件，但收件人永远是错的**。

**为什么需要做：**

- 这是"功能已完成但尚未连接"的最后一环。打通之后，整个订单通知链就真正闭环了。
- 邮件是真实用户场景中非常重要的一环——用户需要知道工人有没有接单、商家需要知道有没有新申请。
- 需要改动的地方非常集中：只需要在调用 `sendEmail` 时从 `UserAccount` 查用户的真实邮箱，而不是用固定值。

**实现方案：**

1. 在 `EmailService` 中新增方法 `sendEmailToUser(UUID userId, String subject, String htmlBody)`，内部查 `UserAccountRepository` 获取真实邮箱
2. 替换所有调用方（`OrderService`、`WorkerApplicationService`、`MerchantApplicationService`）中 `emailService.sendEmail(subject, body)` 为 `emailService.sendEmailToUser(userId, subject, body)`
3. 保留 `FIXED_RECIPIENT` 仅作为 dev profile 下的回退（通过 `@Profile("dev")` 控制）

**预期成果：** 邮件收件人是真实用户邮箱，通知链完整闭环。

**预估工时：** 3 小时

---

### 12.4 汇报准备

**当前问题：**

项目代码完成度高，但没有整理成展示材料。老师评估的不只是代码本身，更是你能不能清晰地表达"我做了什么"、"为什么这么做"、"遇到什么问题"、"如何解决"、"还有什么不足"。

**为什么需要做：**

- 一个再好的项目，如果说不清楚，在老师眼里也只是"一堆能跑的代码"。
- 汇报 PPT 的框架应该在代码工作**同时**准备——因为写 PPT 的过程中会发现自己遗漏了什么，还能补。
- 代码是给机器看的，PPT 是给人看的——两者同样重要。

**准备内容：**

1. **架构图**：Nginx → 4 个 SPA → Spring Boot → MySQL / Stripe / Resend
2. **功能演示 Demo 流程**：注册 → 登录 → 下单 → 支付 → 工人接单 → 完工 → 确认 → 评价
3. **技术亮点清单**：JWT 双 Token、Stripe 支付+退款、Resend 邮件通知、Flyway 数据库迁移、Docker 部署
4. **4 周改进总结**：安全 → 质量 → 体验 → DevOps
5. **已知不足 & 后续计划**：负载均衡、Redis 分布式缓存、WebSocket 实时推送

**预估工时：** 2 小时

---

### 第十二周小结

| 任务 | 工时 | 影响 |
|------|------|------|
| GitHub Actions CI/CD | 3h | 🚀 交付自动化 |
| API 文档完善 | 2h | 📄 可展示性 |
| 邮件收件人动态化 | 3h | ✉️ 功能闭环 |
| 汇报 PPT + Demo | 2h | 🎤 表达力 |
| **合计** | **10h** | |

**周主题：把项目包装成一个可以展示、可以交付的完整产品。**

---

## 四周总览

```
第九周        第十周        第十一周        第十二周
  🔒            🧪            ⚡             🚀
 安全          测试          体验          DevOps
  │             │             │              │
  ├ 9.1 HTTPS  ├ 10.1 测试   ├ 11.1 缓存    ├ 12.1 CI/CD
  ├ 9.2 限流   ├ 10.2 N+1    ├ 11.2 移动    ├ 12.2 API文档
  ├ 9.3 签名   ├ 10.3 清理   ├ 11.3 A11y   ├ 12.3 邮件
  ├ 9.4 监控   │             │              ├ 12.4 PPT
  └ 9.5 清理   │             │              │
  ──────────────────────────────────────────────────────
  7h          7h           8h            10h
```

**逻辑链：**

> 先把最致命的安全问题修掉（第 9 周，因为是底线）  
> → 再用测试把正确性锁死（第 10 周，有了安全+测试，项目就有了"底气"）  
> → 然后优化体验——让所有人、所有设备都能流畅使用（第 11 周，体验是上限）  
> → 最后自动化交付、完善文档、准备汇报（第 12 周，把项目"打包"成可展示的成品）

---

## 汇报时的一句话总结

> "我从第九周开始，按**安全 → 质量 → 体验 → DevOps**的顺序对项目进行了系统性的提升。最初的版本'能跑'，但存在 HTTP 明文传输、登录无防护、零测试覆盖、管理端移动端不可用等问题。经过四周优化，项目达到了接近生产级别的标准——全站 HTTPS、核心链路过测、四端全平台适配、CI/CD 自动化部署。"
