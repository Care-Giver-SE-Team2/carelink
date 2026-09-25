# Caregiver Slice 1：演示与人工验收

## 本次能展示什么

真实会话登录 → 我的班表 → 打开当前分配 Visit 的只读工作包。
数据来自 MySQL，前端不写死护理员、Visit 或工作包；沿用主干的身份认证、角色路由和数据库结构。

本切片不包括签到、任务更新、证据上传、签退、请假和通知操作。证书区只是提醒，不能据此证明已经实现排班资质校验。工作包不会自动升级为最新护理计划。

## 启动（Windows）

先启动 Docker Desktop，等待 Linux 容器引擎 Running。在仓库根目录运行：

```powershell
.\scripts\start-caregiver-demo.ps1
```

首次需要下载镜像并构建，可能数分钟。成功后打开 **http://localhost:8081**。
脚本创建独立的 `carelink-caregiver-demo` 项目、网络和数据库卷，不连接现有 staging。
端口仅绑定本机；不为小组远程访问开放公网。

| 登录账号 | 密码（仅虚构本地演示） | 预期 |
| --- | --- | --- |
| demo-cg-a | Demo#2026 | 演示日 2 个 Visit、2 个证书提醒 |
| demo-cg-b | Demo#2026 | 演示日 1 个 Visit，即已从 A 改派的 Visit |

脚本输出真实的 **demo_date、caregiver_a_morning_visit、caregiver_a_afternoon_visit、caregiver_b_reassigned_visit、empty_date**。
后文的 A1/A2/B1 分别指这三个输出 ID，切勿假定它们是 1/2/3。
首次日期是数据库的新加坡当天；重复加载不改日期、密码或现有内容，也不增加重复数据。
如果隔天演示，在 From/To 中选择脚本打印的 demo_date。证书提醒仍按当前日期计算，超过 14 天后第二张证书也会显示过期。

再次运行且代码未改可用 `-SkipBuild`。代码有改动时不要跳过构建。

停止演示（保留数据，可恢复）：

```powershell
docker compose -f deploy/caregiver-demo/compose.yml stop
```

不要运行带 `-v` 的清理命令，除非你确实决定删除本地演示数据库。

## 5 分钟小组展示顺序

1. 在登录页输入 A 账号，点击 Sign in。应进入 **My schedule**，顶栏显示 Demo Caregiver A。
2. 若不是演示当天，在 From 和 To 都填 demo_date，点击 Apply dates。显示 **Assigned visits · 2**：
   上午 09:00–10:00、下午 14:00–15:00；所有时间标明 SGT。
   向下展示过期、即将过期的证书提醒。
3. 打开上午 Visit 的 **View work pack →**：
   - Demo Elder Mei、虚构服务地址、English/Mandarin、Visit 状态；
   - **Version 1**，虽然数据库已存在 Published v2；
   - 三项任务：Assist with morning hygiene、Record blood pressure、Friendly conversation；
   - 所需证据仅 **Checklist、Reading**；不能出现 Photo 或 None；
   - 顶部明确写 Read-only；没有签到、提交任务或上传按钮。
4. 点击 **← My schedule**，之前的日期范围保持不变。
5. 注销，用 B 账号登录。班表只有 1 项；打开 B1 工作包。说明“A 的历史分配记录仍在，但只有当前护理员 B 可读”。

建议展示用语：“首个纵向切片已贯通真实登录、本人班表和当前分配工作包；后续签到和护理记录会建立在这个授权边界上。”

## 肉眼验收清单

| 场景 | 操作 | 应看到 |
| --- | --- | --- |
| 未登录 | 无痕窗口打开 /caregiver/visits/A1 | 回到登录页，不显示老人详情 |
| 登录与班表 | A 登录并选择 demo_date | 2 项，时间先后排序；无 B1 |
| 只读工作包 | A 打开 A1 | v1、3 项任务、Checklist/Reading、地址与语言 |
| 无证据任务 | A 打开 A2 | Friendly conversation；No evidence requirements recorded |
| 非本人工作包 | A 手动访问 /caregiver/visits/B1 | Access not permitted；不显示 B 的工作包详情 |
| 不存在 Visit | 访问 /caregiver/visits/9223372036854775807 | Visit not found |
| 空班表 | From/To 均选 empty_date | No assigned visits in this period，不是报错 |
| 日期校验 | 结束早于开始，或范围超过 31 天 | 日期提示，不发出新查询 |
| 返回 | 工作包点返回班表 | 原日期范围保留 |
| 深链接刷新 | 登录状态下工作包按 F5，或新标签粘贴同一网址 | 正常工作包，不是服务器 404 |
| 会话失效 | 同一浏览器另一标签注销，再回工作包点 Refresh | 旧详情消失并回到登录 |
| 网络失败与重试 | 开发者工具 Network 设 Offline 后点 Refresh | 清除旧详情，显示错误；恢复 Online 点 Try again 能恢复 |
| 切换账号 | A 注销→B 登录 | B 的 1 项，不残留 A 的 2 项 |
| 手机宽度 | 浏览器设备工具设 390px，再试 320px | 单列可读、按钮可点、无横向滚动 |
| 主管等其他角色 | 用具有非 CAREGIVER 角色的测试账号进入 /caregiver | 拒绝访问；不显示护理内容 |

深链接用真实输出 ID 替换 A1/B1；401 后登录默认回班表，不自动恢复被保护的旧工作包。
访问备注和紧急备注目前显示 Not provided：现有表没有独立的安全字段，不会拿完整 medical_notes 顶替。
页面标题中的 “care instructions” 目前来源于已分配计划节点名称，未实现独立详细护理说明字段。

## 给组员保存的四张图

1. A 的班表：账号、两项 Visit、SGT 与证书提醒。
2. A1 工作包：Version 1、任务和 Required evidence（可全页截图）。
3. A 打开 B1 的拒绝页面：证明权限隔离。
4. 手机宽度的班表：证明响应式布局。

截图应只使用本地虚构数据，不要展示真实老人资料、浏览器 Cookie 或请求认证头。

## 技术核对与主干衔接

新增的已实现 GET 契约已写入 `docs/api/openapi.yaml`：

- `/api/caregivers/me`：服务端以会话用户名解析 profile。
- `/api/caregivers/me/schedule?dateFrom=...&dateTo=...`：当前分配、时间范围、提醒。
- `/api/visits/{visitId}/work-pack`：当前分配核验、最小老人视图、绑定计划版本、任务与证据要求。

旧的主管 `GET /api/visits/{id}` 权限不放宽；未新增数据库迁移；不修改 Flyway V1–V6。
visit 通过 profile 和 careplan 的 application 只读接口取投影，不跨模块访问持久层。
工作包读取使用 shared audit 写入独立事务，结果为 OK、DENIED 或 FAILED。
未授权角色在安全层拦截；本次新增审计针对已识别护理员的工作包读取，并非整个系统的全访问审计。
页面只读不代表没有任何写入：阅读工作包会追加访问审计记录。

现有草案文件中同名接口的旧字段不作为本切片实现契约，以主契约上述三个 GET 为准。
主干合并建议检查：新增查询接口、共享静态路由放行、演示 SQL、契约和回归结果一起评审。
本切片通过功能分支提交；合并主分支前应通过 PR 审查和 CI 检查。

## 自动化验证

以下为标准环境命令。Windows 中文路径下已复现 Surefire/JaCoCo 参数编码问题，
不要直接把这些命令用于要求“仅在项目内写入”的本地验证：即使指定相对 destFile，
JaCoCo prepare-agent 仍会展开为绝对路径。应先隔离 Maven 缓存、JVM 临时目录与用户目录，
并让测试 JVM 使用 ASCII 相对路径的 JaCoCo/Mockito agent 参数；或使用功能分支的 GitHub CI。
本机 Docker 镜像、缓存及数据卷可能写入项目外，运行集成测试前需要确认授权。

```powershell
cd frontend
npm ci
npm run lint
npm run build
npm run test:coverage -- --maxWorkers=2
cd ../backend
.\mvnw.cmd verify -Pintegration
```

MySQL 集成测试需要 Docker。新测试包括真实密码会话、当前分配/历史改派、
旧计划版本、最小老人视图、证据范围、重复装载、空班表、日期输入、403/404 和独立审计。
前端覆盖直接打开、错误重试、401清理、切换Visit、迟到请求、返回日期及注销。

## 故障排查

### 本次开发验收记录（2026-09-24）

- 前端：构建成功；15 个测试文件、129 项测试通过；护理员新增代码无 lint 警告。
- 后端：452 项单元/架构测试、154 项 MySQL 集成测试通过。更正：当日“领域覆盖率门槛检查通过”缺少有效报告证据，不作为覆盖率验收依据。
- 主契约与草案：YAML 解析及内部引用检查通过；差异空白检查通过。
- 浏览器真实验证：A/B 登录与注销、A 两项/B 一项班表、A 读取 B Visit 被拒绝、
  B 可读改派 Visit、v1 工作包、页面刷新、返回日期、日期筛选及空班表。
- 响应式：390px 与 320px 宽度检查；班表和工作包无横向溢出。
- 现有主管端 CarePlan 页面仍有原来的 set-state-in-effect lint 警告，本切片未改动该模块。
- 演示数据库本次实际日期为 2026-09-24，A1=1、A2=2、B1=3；重建其他数据库时以启动脚本输出为准。

### 同步主干后的本地验证（2026-09-25）

- 同步基线：main `f38d1be`；仅处理主干兼容，不新增 CG-01 续证规则或班表功能。
- 保留主干家属端 `CaregiverDirectory` 契约；护理员内部投影改名为 `CaregiverWorkDirectory`，三个 HTTP 接口不变。
- 共享资质查询保持类型/记录 ID 排序；护理员提醒在应用层按到期日期/记录 ID 排序，增加独立回归测试。
- Visit 仓储同时保留护理员班表、长者已完成服务查询及家属查询所需能力；主干 V7/V8 迁移未改写。
- 前端：27 个测试文件、359 项测试通过；代码检查和构建通过，保留主管 CarePlan 页既有 lint 警告。
- 后端：784 项单元/架构测试通过，无失败、错误或跳过；构建成功。
- 本次 JaCoCo 数据为 `backend/target/jacoco.exec`，HTML/XML 报告为 `backend/target/site/jacoco/`；日志确认数据被加载且领域 80% 门槛实际检查通过。
- 主契约和草案均通过 YAML 重复键检查及内部引用校验，差异空白检查通过。
- 本次未在本机重跑 Docker 集成测试或浏览器人工演示；远端 CI/集成测试状态以 PR #42 对应提交的检查记录为准，不能沿用 2026-09-24 的测试数量作为本次证明。
- 本地验证缓存、临时文件和日志保存在项目内被忽略的 `reports/main-sync/`。首次重试曾再次生成乱码路径下的覆盖率文件，已停止测试并经批准清理；改用相对 agent 参数后的完整验证未再生成该目录。

### 常见问题

- Docker API 连接失败：确认 Docker Desktop 已完成启动且为 Linux containers。
- 8081 被占用：先确认占用者，不停止未知服务；选择其他端口时同时更新 compose 和展示 URL。
- 班表为空：先检查 demo_date，不要误认为数据没有加载。
- 登录失败：确认访问 8081 的独立演示环境；其他环境不一定加载了 demo-cg-a/b。
- 旧 UI：不用 -SkipBuild 重跑启动脚本，然后刷新浏览器。
- 查看本演示日志：`docker compose -f deploy/caregiver-demo/compose.yml logs --tail 100 backend`。
