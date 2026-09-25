# CG-01 Slice 3：班表变化与统一验收

## 边界与规则

护理员只读取排班结果，不负责创建、审批或改派。经理端写流程未在本切片实现。
沿用当前 `visit.caregiver_id` 授权；历史 `visit_assignment` 不授予当前工作包权限。
保持护理计划绑定版本、家属公开投影和资质预警语义不变；不新增迁移或写 API。

| 变化 | 班表 | 工作包 |
| --- | --- | --- |
| 新增分配 | 新护理员下次查询可见 | 当前护理员可读 |
| 改期 | 按新时间排序，范围外移除 | 当前护理员可读，仍绑定原计划 |
| A 改派给 B | A 移除，B 出现 | 改派事务提交后新发起的 A 请求 403，B 可读 |
| 撤销分配 | 原护理员移除 | 原护理员 403 |
| 取消 | 当前所属护理员保留摘要 | 409 / VISIT_CANCELLED，无地址、计划、任务；他人仍为 403 |
| 其他 Visit 状态 | 保留现有行为 | 本切片不扩展历史工单权限 |

先判断当前归属，再判断取消；取消拒绝记录 DENIED 审计。不因取消而删除 Visit。
班表统计包含取消摘要，不等于待执行任务数。摘要保留已有最小身份/时间/服务类型，不提供地址或护理任务。

## 刷新与数据保护

- 手动 Refresh、窗口重新获得焦点、页面重新可见及网络恢复时重新读取；相邻自动事件在 500ms 内合并。
- 无轮询、WebSocket、推送或后台通知承诺。页面持续打开且未触发刷新时，不能保证立刻反映远端变化。
- 页面标注最近成功获取时间（SGT），不是排班修改时间。
- 同一账号、同一日期范围的连续成功响应比较新增、时间、状态和移出；首次加载、切换筛选或错误后重新建立基线不误报。
- 移出可能来自改期、改派或撤销，只给中性提示，不猜测原因。
- 比较基线仅在内存保存 ID、时间和状态，不保留老人姓名、地址或临床数据，不写 localStorage。
- 发起重新核验即隐藏旧详情；401/403/409/失败不会保留工作包。过期请求取消且晚到结果被忽略。
- 工作包成功页和错误页返回链接均保留原日期范围。

## 本地演示（需 Docker 写入授权）

脚本固定隔离项目 `carelink-caregiver-demo`，不接受生产地址或任意 ID。Docker 的镜像、容器和卷使用 Docker 自身存储。
在仓库根目录执行：

```powershell
.\scripts\start-caregiver-demo.ps1
.\scripts\set-caregiver-credential-demo.ps1 -Stage Reset
.\scripts\set-caregiver-schedule-demo.ps1 -Stage Reset
```

打开 http://localhost:8081，以 `demo-cg-a` / `Demo#2026` 登录。B 为 `demo-cg-b` / 同密码，仅为虚构演示。
日期选脚本输出的今天。两个独立场景：Demo3 Change（09:00）和 Demo3 Control（10:00）；别用首切片旧日期寻找它们。
Reset 保留前两切片数据、刷新本场景日期，并把 Change 恢复给 A；不删除数据库卷。
以下是测试数据操作，不是经理端产品功能。每组独立验收前先 Reset。

### 8 分钟小组展示

1. A 打开 Demo3 Change 工作包，确认 Version 1；即使该老人存在发布的 Version 2，也不自动切换。
2. 返回班表，执行 `-Stage Reschedule`。点击 Refresh（便于观察同页变化提示），Change 改为 11:00，排在 Control 后；显示时间变化提示，资质评估日不变。
3. 执行 `-Stage NextDay`，刷新后 Change 从今天移除；筛选脚本输出的 next_date 后出现，不把筛选切换误报为排班变化。
4. Reset，A 再打开 Change 工作包；执行 `-Stage Reassign`，切回网页。旧地址/任务被清空，显示访问受限。A 班表移除；退出后用 B 登录，B 可以打开，仍为 Version 1。
5. B 保持工作包打开，执行 `-Stage Cancel`，切回网页。显示 Visit cancelled；回班表仍有 Cancelled 摘要，但无工作包入口。直接输入相同旧链接仍拒绝。
6. Reset 后执行 `-Stage Unassign`，A 班表不再包含 Change，旧链接也不能访问。
7. 断网刷新工作包，确认旧护理详情消失；恢复网络后重新获取。不得把失败显示为“空班表”。
8. Reset 恢复标准场景，连续运行两次检查不产生额外 DEMO3 Visit 或多个 ACTIVE 分配。

命令格式：

```powershell
.\scripts\set-caregiver-schedule-demo.ps1 -Stage Reset
.\scripts\set-caregiver-schedule-demo.ps1 -Stage Reschedule
.\scripts\set-caregiver-schedule-demo.ps1 -Stage NextDay
.\scripts\set-caregiver-schedule-demo.ps1 -Stage Reassign
.\scripts\set-caregiver-schedule-demo.ps1 -Stage Cancel
.\scripts\set-caregiver-schedule-demo.ps1 -Stage Unassign
```

## CG-01 统一验收矩阵

| 验收项 | 证据 / 预期 |
| --- | --- |
| 真实登录与会话 | A/B 登录、退出、过期会话；不能跨账号复用内容 |
| 本人班表 | 默认新加坡日期、今天/7天/自选最多31天、空态、排序、错误态 |
| 分配变化 | 新分配、改派、未分配、改期跨日、取消及旧链接 |
| 最小信息与工作包 | 仅当前护理员；固定计划版本；指定任务/证据，无医疗备注 |
| 资质预警 | 过期、今天、30天边界、31天/永久排除；续证生效/未生效/拒绝/撤销/异常链 |
| 页面恢复 | 手动/返回/网络恢复；短时间重复事件去重；晚到响应不能恢复旧内容 |
| 视觉与操作 | 桌面、390px、320px；无横向溢出，取消和错误态不依赖颜色表达 |
| 自动化 | 全量前端、后端单元/架构/覆盖率、完整 MySQL 集成测试 |
| 远程 CI | 原快速流水线及独立 CG-01 full MySQL regression，分别提供最终 SHA 与运行链接 |

前两切片详细步骤见 `slice-1-demo.md` 和 `slice-2-credential-alerts.md`。
验收完成需记录实际结果、未执行项目和用户确认，不因“已有测试代码”就标为通过。

## CI 与合并顺序

新增 `.github/workflows/caregiver-acceptance.yml` 在面向 main、涉及后端/前端/演示相关改动的 PR 中运行完整 `clean verify -Pintegration`。
使用 Java 25 与 MySQL Testcontainers；只读仓库权限；上传 Surefire/Failsafe/JaCoCo 证据；30 分钟超时。没有 Sonar、生产密钥、镜像发布或 staging 部署步骤。
原流水线仍执行快速检查，不修改其门槛或深度扫描策略。独立工作流不替代 SCA/部署验收，也不自动改变分支保护规则。

本分支 `codex/cg01-schedule-changes` 基于切片 2 的 fcd071b；前置 PR #42/#43 未合并时保留依赖说明和草稿状态。
团队审查 CI 配置，完成用户人工验收后再按 #42 → #43 → 本 PR 顺序决定合并；本任务不自动合并 main。
CG-02 请假偏好、CG-03 执行、CG-04 异常、CG-05 签退、CG-06 历史自证不属于本切片。
