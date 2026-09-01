# CareLink

NUS-ISS SWE5006 Practice Module — Team 2 社区居家照护协作平台。

移动优先的响应式 Web 应用，服务四类角色：主管（桌面）、护理员、家属、老人（移动端）。

## 技术栈

| 层 | 选型 |
|---|---|
| 前端 | React 19 + Vite 8 + TypeScript 6 |
| 后端 | Java 25 + Spring Boot 4.1 |
| 数据库 | MySQL 8.4 LTS，Flyway 管理迁移 |
| 测试 | JUnit 5 · ArchUnit · Testcontainers · Vitest |
| CI/CD | GitHub Actions · SonarQube Cloud · OWASP Dependency-Check · gitleaks · OWASP ZAP |

## 本地起步

前置：**JDK 25**、Node 22、Docker Desktop。

```bash
# 数据库
docker compose up -d db

# 后端（http://localhost:8080）
cd backend && ./mvnw spring-boot:run

# 前端（http://localhost:5173，/api 已代理到后端）
cd frontend && npm ci && npm run dev
```

常用命令：

```bash
cd backend
./mvnw verify                    # 编译 + 单元测试 + 架构测试 + 覆盖率
./mvnw verify -Pintegration      # 追加集成测试（需要 Docker）

cd frontend
npm run lint
npm run test                     # 监听模式
npm run test:coverage            # 单次 + 覆盖率
```

## 代码结构

见 [docs/目录结构与分层规则.md](docs/目录结构与分层规则.md)。要点：

- 后端**外层按业务模块切、内层分四层**：每个模块内各有 `api` / `application` / `domain` / `infrastructure`
- **依赖朝内**：领域层不依赖表现层、持久化实现与 JPA，因此能脱离 Spring 与数据库单元测试
- 这条规则由 `LayerDependencyTest`（ArchUnit）在**构建时强制**，违反即构建失败
- 跨模块只能调对方 `application` 层暴露的接口，不得触碰对方 `domain`

## 模块归属

| 模块 | 负责人 | 设计问题 |
|---|---|---|
| `careplan` 照护计划 | Wang Ziyu | DP1 组合模式 |
| `roster` 排班 | Wang Zhili | DP2 策略模式 |
| `visit` 上门访视 | Zheng Zishan | DP3 状态模式 |
| `incident` 异常处置 | Kok Cheng Da | DP4 责任链模式 |
| `report` 周报与趋势 | Wang Chenyu | DP5 模板方法模式 |

## 流水线

| Workflow | 触发 | 内容 |
|---|---|---|
| `pr-fast` | 特性分支 push / PR | 编译、单元测试、覆盖率、ArchUnit、SAST（Sonar）、密钥扫描（gitleaks）。目标 10 分钟内 |
| `main-slow` | 合入 main / 每夜 | 集成测试（Testcontainers）、SCA（Dependency-Check，CVSS≥7 阻断）、构建并推送镜像至 GHCR |
| `deploy-staging` | main-slow 成功后 | 起环境、健康检查、DAST（ZAP 基线扫描） |
| `promote-demo` | 手动 | 指定镜像 tag 晋级到 demo 环境。构建一次，各环境部署同一镜像 |

## 分支约定

`main` 受保护，只接受 PR 合入，且快速阶段必须全绿。
特性分支命名：`feat/<模块>-<简述>`、`fix/<简述>`。
