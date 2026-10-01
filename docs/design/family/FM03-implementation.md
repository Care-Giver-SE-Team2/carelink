# FM03 实时服务动态：当前实现与设计差异

本页及 [活动图](UC-FM03-activity.puml)、[顺序图](UC-FM03-sequence.puml) 对齐家属读取实现；PNG 由同名 PlantUML 源码生成。它们记录已实现的查询行为，不代表护理员写入流程已完成。

## 入口与复用

FM02 周排程的 `View progress` 进入 `/family/visits/:visitId`。`FamilyVisitProgressPage` 和 `useFamilyVisitProgress` 先检查当前会话，再独立读取三个端点：

| HTTP（前缀 `/api`） | 应用服务 | 数据来源与家属字段 |
|---|---|---|
| `GET /visits/{id}` | `FamilyVisitDetailService` | `VisitRepository`；实际状态、计划/签到/结束时间和服务信息、服务端 `asOf` |
| `GET /visits/{visitId}/timeline` | `FamilyVisitTimelineService` | `VisitStateTransitionRepository.findAppliedByVisitId`；仅 APPLIED，按 occurredAt、id 排序；不含操作人或拒绝原因 |
| `GET /visits/{visitId}/tasks` | `FamilyVisitTaskService` | `VisitTaskRepository.findByVisitId`；按 id 排序；仅 id、visitId、name、status、completedAt |

`VisitController` 使用家属专属 DTO；主管详情仍走原有分支。跨模块复用 `FamilyAccessQuery.requireReadableElder` 与 `FamilyReadAudit.read`，不穿透其他模块的 repository。每次查询从 Session 用户名解析当前账户和家属档案，再校验服务实际所属老人的有效绑定；FULL 与 READ_ONLY 均可读。即使时间线或任务为空，也先检查父访视权限。

读取服务不修改 visit、visit_task、visit_state_transition；成功、拒绝及查询失败记录操作编号、账户、资源、结果和访问时间，不记录照护正文。审计无法持久化时返回 503，不返回该次照护内容。未进入业务查询的会话/角色拒绝由 Spring Security 处理。

## 与早期课程设计的对应

| 早期 FM03-AS1 / DS1 / AC / DC 提案 | 本轮采用的实际方案 |
|---|---|
| 按老人查询聚合 `/api/family/elders/{elderId}/activity` | 使用上方已有的三个访视级接口；没有新增 aggregate endpoint |
| `ViewFamilyActivityService`、`VisitQuery.activityForElder`、`VisitActivitySnapshot`、`FamilyActivityProjection` | 对应三个 `FamilyVisit*Service` 和三个 DTO；这些提案类没有加入生产代码 |
| `DelegationQuery.requireActive`、`AuditTrail` | 复用实际存在的 `FamilyAccessQuery`、`FamilyReadAudit` / `AccessAudit` |
| 一个快照/统一 fetchedAt | 三个独立读取，无跨接口原子快照；详情显示服务端 asOf，时间线和任务分别显示客户端接收时间 |
| 建议可配置 30 秒轮询 | 可见且联网时，一轮全部结束后 15 秒刷新；故障 30/60 秒退避，成功恢复 15 秒；没有新增配置入口 |
| 证据/照片/体征或护理员备注投影 | 首轮仅服务、APPLIED 时间线和任务白名单；额外字段的家属可见权限仍待单独确认 |

原课程提案保留为历史分析材料。本目录是代码现状的实现视图；AC 是分析类图，不能把它当作活动图。新活动图描述 FM03 家属读取流程，CG03/CG05 状态机活动图描述上游写入职责，两者不互相替代。

## 页面行为与一致性边界

同一访视、同一账户的成功分区仅保留在内存；失败保留原值、原时间并标记可能过期。初次失败没有内容时显示错误，不假装为空数据。离线/隐藏取消请求和定时器，恢复可见且联网时立即重读；慢请求不启动重叠轮次。

任意读取返回 400/401/403/404 时取消其他请求、清空保护内容、停止轮询；可见/联网事件不解除停止，原页登录或主动重试才重新授权。切换访视、账户或卸载时旧响应不能恢复旧数据。服务器会在每次查询时重新授权；页面在下一次请求发现失权后清理，当前轮询方案不承诺撤销发生瞬间的推送清理。

只展示已保存状态，不按时间推断签到/完成，不按当前状态补造历史。只有 DONE 计入完成任务；SKIPPED/REFUSED 单独显示，空任务不代表完成。任务名以纯文本显示。

## 验证与待补联调

`FamilyVisitWorkflowIT` 使用真实 TCP HTTP、Session/CSRF 和隔离 Testcontainers MySQL，覆盖排程到进度、事实变化、分区间撤销/精确到期、READ_ONLY/跨家属隔离、退出后旧 Cookie、审计故障与恢复，以及主管详情/护理员工作包/FM01/FM02/FM04 读取兼容。SQL 只准备上游事实并核对 GET 没有写入业务表，不替代 CG03/CG05 API。各端点细节由 `FamilyVisitDetailIT`、`FamilyVisitTimelineIT`、`FamilyVisitTaskIT` 验证；前端 76 个路由场景覆盖调度、失权清理、取消竞态和展示。

```sh
cd backend
./mvnw verify -Pintegration -Dit.test=FamilyVisitWorkflowIT -Duser.timezone=UTC
```

完整后端回归运行 `./mvnw clean verify -Pintegration`；前端运行 `npm run lint`、`npm run test:coverage`、`npm run build`。PR 流水线运行完整 MySQL 测试并上传 JaCoCo；前端上传独立 `frontend-coverage`（含 LCOV），均保留 7 天。当前 Sonar 配置统计后端，不能用它的覆盖率代替前端结果。

| 待补依赖 | 关闭所需证据 |
|---|---|
| CG03/CG05 签到、任务更新、结束服务及状态转换 | 通过真实护理员操作落库，家属自动读取变化；同时核对 APPLIED/REJECTED 一致性 |
| 计划/排班产生具体 visit 和 visit_task | 真实计划与排班流程产生可读的服务/任务 |
| 异常、核验、自动关闭扩展链 | 真实业务操作或调度落库后正确读取对应状态及历史 |
| 绑定邀请/家属确认/撤销/到期完整链 | 真实授权流程赋权及失权；现有读取授权与夹具测试已完成 |
| 通知推送、额外临床/证据字段 | 后续范围与可见权限确定后另行开发；不阻塞本轮读取 |

家属读取验收完成后，上述真实上游联调仍需分别记录，不能以 SQL 夹具的成功结果关闭。
