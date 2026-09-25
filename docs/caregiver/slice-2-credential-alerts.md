# CG-01 Slice 2：资质预警与续证收尾

## 范围与集成

本切片在首切片的真实登录、本人班表、已分配 Visit 工作包之上完善只读资质提醒。
沿用 `/api/caregivers/me/schedule`、现有 session/角色授权和 Credential 数据；没有新增数据库迁移、上传/审批入口、排班资格判断或后台修改状态的任务。
家属公开资质接口、`Credential.publicStatusOn` 与共享仓储行为不变。证书编号仅在本人护理员投影中展示。

分支：`codex/cg01-credential-alerts`，从 PR #42 的同步后提交 `c092a68` 开始。
PR #42 未合并前，本分支依赖首切片；不得把本切片的完成等同于整个 CG-01 已全部验收。

## 业务口径

- 评估日永远是服务器当前新加坡日期，与浏览器时区、数据库时区和班表日期过滤无关。
- 到期日包含当天：昨日过期、今天到期、未来 1–30 天即将到期，默认窗口包含第 30 天；第 31 天不提醒。
- `carelink.caregiver.credential-warning-days` 可调整窗口，允许 0，不允许负数。`9999-12-31` 表示无到期提醒。
- 仅已审核发布类状态（PUBLISHED / EXPIRING / EXPIRED）参与到期提醒。SUBMITTED / REJECTED / REVOKED 本身不是到期提醒。
- `validFrom` 为空表示已发布记录没有未来生效限制；未来生效的资质不提前作为当前生效资质。
- 必须有明确 `renewsCredentialId`、同护理员和同资质类型的有效关联，才视作续证。同类型、编号相似或更新时间较新不能推断为续证。
- 只有已发布且已生效的后继清除旧证重复提醒。后继也到期时提醒后继；多级链只保留实际应提醒的末端记录。
- 待审核、被拒、撤销和已批准但未生效的续证不清除旧提醒；旧证不会因为新证撤销而“恢复有效”。
- 分叉、循环、自关联、缺失/跨护理员父记录、类型不符、矛盾日期/状态等异常保守处理：相关链不自动清除旧提醒，显示需经理核查。不会跨护理员读取或暴露对方记录。
- “没有到期提醒”不代表所有资质已批准或有排班资格；页面明确解释此边界。

查询不修改 Credential 审核状态、日期或关联。服务批量读取提醒所需的类型名称，避免逐条查询。

## API 增量（兼容旧字段）

`certificationAlerts` 保留 id/name/certificateNo/expiryDate/status/warning，新增：

| 字段 | 含义 |
| --- | --- |
| daysUntilExpiry | 服务器计算的有符号剩余天数，0 为今天到期 |
| renewalState | NONE / PENDING_REVIEW / REJECTED / APPROVED_NOT_EFFECTIVE / REVOKED / CHECK_REQUIRED |
| renewalValidFrom | 仅批准但未生效的续证提供生效日，其他为 null |

响应新增 `credentialAlertContext`：`asOfDate`、实际 `warningDays`、`reviewRequired`。
前端可读取首切片旧响应，新增字段缺失时不自行用浏览器日期猜测剩余天数。
正式契约见 `docs/api/openapi.yaml`。不扩展家属公开响应。

## 本地演示准备

Docker 会在自身存储中创建镜像、容器和卷；请在获准的环境运行。此处仅操作本机隔离项目 `carelink-caregiver-demo`，不连接 staging。
在仓库根目录运行（代码变更后必须重建）：

```powershell
.\scripts\start-caregiver-demo.ps1
.\scripts\set-caregiver-credential-demo.ps1 -Stage Reset
```

打开 http://localhost:8081，以 `demo-cg-a` / `Demo#2026` 登录。仅为虚构本地账号。
首切片的 Visit 仍保留原 `demo_date`；本切片 Reset 将列出的 DEMO2 资质日期重置到新加坡当天，不更改已有 DEMO-* 资质、Visit、真实账户或其他记录。
脚本不删除数据；不要用删除数据库卷的方法重置演示。

## 5–8 分钟人工肉眼验收

1. 登录 A，进入 My schedule，滚动到 **Credential reminders**。核对评估日是今天、窗口是 30 天，证书编号可识别场景。
2. Reset 后应有以下 **5 条 DEMO2 提醒**（首切片原有提醒仍可能同时出现，不要把总卡片数固定为 5）：

   | 编号 | 应看到 |
   | --- | --- |
   | DEMO2-EXPIRED | Expired，Expired 1 day ago |
   | DEMO2-TODAY | Expires today，Valid through today (SGT) |
   | DEMO2-BOUNDARY30 | Expiring soon，Expires in 30 days |
   | DEMO2-PENDING-OLD | 旧证过期 + Renewal pending review |
   | DEMO2-FUTURE-OLD | 旧证过期 + Renewal approved，生效日为 7 天后 |

   DEMO2-ACTIVE-OLD 已被有效新证替代，不应显示；DEMO2-OUTSIDE31 和 DEMO2-PERMANENT 不应显示。
3. 把班表日期改为过去或未来并 Apply dates。Visit 列表可以变化，但提醒评估日、剩余天数和上述场景不变。
4. 在终端依次执行以下命令，每次回页面刷新。只改变 `DEMO2-PENDING-NEW` 这一条虚构续证，不是产品审批功能：

   ```powershell
   .\scripts\set-caregiver-credential-demo.ps1 -Stage Rejected
   .\scripts\set-caregiver-credential-demo.ps1 -Stage Future
   .\scripts\set-caregiver-credential-demo.ps1 -Stage Active
   .\scripts\set-caregiver-credential-demo.ps1 -Stage Revoked
   ```

   依次核对：旧提醒显示未通过 → 7 天后生效但旧提醒保留 → 生效后旧提醒消失（4 条 DEMO2）→ 撤销后旧证过期提醒重新可见（5 条），说明文案不得宣称旧证重新有效。
5. 退出 A，以 `demo-cg-b` / `Demo#2026` 登录。不得出现 A 的任何 DEMO2 编号，空状态写 **No credential expiry reminders**，同时保留“不是审批/排班资格确认”的说明。
6. 回归首切片：A 能打开自己 Visit 的只读工作包，不能读取 B 的改派 Visit；工作包仍固定原护理计划版本，没有新增上传/审批按钮。
7. 演示结束运行 `-Stage Reset` 恢复标准样本。若跨过新加坡午夜，重新 Reset 后再核对今天/1 天/30 天。

建议截图：标准提醒、未来生效提示、Active 后卡片消失、B 空状态。只使用虚构数据；截图不是自动化测试的替代品。

## 自动化验证与 CI 边界

后端：纯领域日期/续证/异常图测试、服务投影和日期过滤测试、HTTP 契约测试、真实 MySQL 集成测试。
前端：边界倒计时、所有续证文案、异常/空/旧响应、刷新移除提醒；保留会话隔离等既有测试。
真实数据库测试使用固定跨 UTC/SG 日期的时钟与不同 MySQL 时区，并检查读取没有改写 Credential 数据、家属投影保持不变。

常规验证命令（Windows 非 ASCII 路径请使用经验证的项目内缓存与相对 Java agent 参数，避免 Maven fork 参数编码产生目录）：

```text
backend:  ./mvnw verify
backend:  ./mvnw verify -Pintegration
frontend: npm run lint && npm run test:coverage && npm run build
```

仓库现有 PR 流水线运行后端单元/架构/覆盖率与 Sonar、前端和 secret scan；真实 MySQL integration 与 SCA 在 PR 事件中会跳过。
不要把 PR 绿色当作全部深度验证通过，也不要为触发集成测试而在功能分支盲目手动运行工作流（现有 Sonar 手动触发存在 main 归属风险）。
本切片不修改 CI 门槛、不绕过失败、不合并 main；完成记录应分别标明本地单元、真实数据库、浏览器人工路径、PR CI 的实际状态。
