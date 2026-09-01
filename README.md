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

- 每个功能模块内部分四层：`api` / `application` / `domain` / `infrastructure`
- **依赖朝内**：领域层不依赖表现层、持久化实现与 JPA，因此能脱离 Spring 与数据库单元测试
- 这条规则由 `LayerDependencyTest`（ArchUnit）在**构建时强制**，违反即构建失败
- 跨模块只能调对方 `application` 层暴露的接口，不得触碰对方 `domain`
- `identity` 是四层写法的**参照实现**，新模块照它的骨架搭

> **功能模块如何划分尚未敲定**，因此仓库里暂时只有 `shared`（公共层）与
> `identity`（认证，各模块共用）。模块边界定下来后再按上述分层规则建包。
> 分层方式与模块划分是两件独立的事：无论最后按业务领域切还是按角色切，
> 四层结构与依赖方向都不变。

## 流水线

一条完整的流水线 `cicd-pipeline.yml`，九个作业。**能并行的一律并行，
`needs` 只用来表达真实依赖与质量门禁**，不制造无谓等待。

```
        ┌─ 后端构建·单元测试·架构测试·SAST ─┐
push ───┼─ 前端检查·单元测试·构建          ─┼──→ 质量门禁 ──┐
  PR    └─ 密钥扫描（gitleaks）            ─┘   约 5-8 分钟 │
                                                            │ 仅非 PR
                          ┌─ 集成测试（Testcontainers+MySQL）┴┐
                          └─ 依赖漏洞扫描（SCA）              ┴──→ 构建并发布镜像
                                                                       │ 仅 main
                                                                       ▼
                                                    部署预发布 · 冒烟 · DAST（ZAP）
                                                                       │
                                                                       ▼
                                                                 流水线汇总
```

| 阶段 | 作业 | 何时执行 |
|---|---|---|
| 快速反馈 | 后端（含 ArchUnit、JaCoCo、Sonar 质量门禁） | 每次 PR 与主干推送 |
| 快速反馈 | 前端（lint、Vitest 覆盖率、构建） | 同上 |
| 快速反馈 | 密钥扫描 gitleaks（扫全部历史提交） | 同上 |
| 门禁 | 质量门禁——三条全绿才放行 | 分支保护勾这一个即可 |
| 深度验证 | 集成测试、依赖漏洞扫描（CVSS≥7 阻断） | 主干 / 每夜 / 手动，PR 跳过 |
| 交付 | 构建镜像推送 GHCR，打 SHA 与 latest | 仅主干推送 |
| 部署 | 起环境、冒烟测试、ZAP 基线扫描 | 仅主干推送 |
| 晋级 | `promote-demo.yml`，人工触发 + 具名审批 | 手动 |

**构建一次，部署多次**：镜像只在交付阶段构建一次，预发布与演示环境部署的
都是同一个二进制，绝不在部署时重建。

## 分支约定

`main` 受保护，只接受 PR 合入，且快速阶段必须全绿。
特性分支命名：`feat/<模块>-<简述>`、`fix/<简述>`。
