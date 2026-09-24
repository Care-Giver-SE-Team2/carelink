# 家属端　Family portal

**FM01 / FM02 负责人：** Wang Zhili。申请页面放在 `intake/`，周排程页面放在 `schedule/`；家属布局和登录放在 `components/`。

## 要覆盖的用例

- FM01 建档申请与信息初填
- FM02 排程与人员资质查阅
- FM03 实时服务动态监控
- FM04 周期白话周报查阅
- FM05 突发事件即时知情
- FM06 排班变动协同决策
- FM07 质量抽查审批
- FM08 增值服务管理与审批
- FM09 护工评价与续费决策

## 布局要求

移动优先。读为主，专业术语要转成白话。

## 约定

- 按用例使用独立子目录，新增路由时协调 `index.tsx`，避免覆盖其他成员页面。
- 通用的东西放 `src/shared/`：按钮、表单、表格这类组件放 `shared/components/`，
  样式变量放 `shared/theme/theme.css`，调后端一律走 `shared/api/client.ts`。
  **要改 `shared/` 先在群里说一声**，那是五个人共用的。
- 业务逻辑放 `src/features/<模块>/`，不要堆在页面组件里。
- 老人端与其他三端的差别（字号、对比度、点击区大小）已经做在
  `shared/theme/theme.css` 的 `[data-theme="elder"]` 里，
  用 `<RoleShell theme="elder">` 就能拿到，不用自己写一套。

## 现阶段

FM01 页面已接入现有后端接口：

- `/family` 转到 `/family/intake`：本人申请列表，按状态筛选、每页 20 条、刷新。
- `/family/intake/:id`：本人申请详情、审核状态和备注；返回列表保留筛选及页码。
- `/family/intake/new`：提交建档申请；姓名、地址、邮编必填，支持年龄、行动能力、方言、护理需求和医疗备注。提交成功后显示申请编号并进入详情。
- 未登录或 Session 失效时显示家属登录表单：先 GET `/api/auth/csrf`，再 POST `/api/auth/login`，成功后重新请求原页面。
- 两个查询接口分别为 GET `/api/intake-applications` 和 GET `/api/intake-applications/{id}`。身份由服务端 Session 确定，不发送申请人编号、角色或 JWT。
- 401、403、404、参数错误和网络故障各有提示；失败时不继续显示此前的申请数据。状态筛选和分页只放在 URL 中，申请内容不写入本地存储。
- 日期显示为新加坡时间。页面使用真实响应，测试样例仅存在于测试文件。

视觉参考 `docs/family/family.html`，采用 React 和局部 CSS Modules，支持手机窄屏；未复制原型中的固定手机外框。

FM02 周排程入口为 `/family/schedule`，也可通过家属导航进入：

- 选择当前有权查看的老人；用日期选择器选择任意一天，查看该周周一至周日的访视，也可切换本周、上一周、下一周。日期和时间均按新加坡时区显示。
- 请求先通过 GET `/api/auth/me` 确认家属身份，再复用 GET `/api/elders` 数组选择老人，使用 GET `/api/visits?elderId=...&dateFrom=...&dateTo=...&page=...&size=20` 读取排程。资源授权仍由后端执行。
- 每页最多 20 条，显示整周总数、当前显示范围及翻页按钮；切换老人或周次回到第一页。刷新重新检查当前身份和可访问老人。
- 分别显示无有效绑定、本周无访视、加载中和请求失败。401 提供原页登录；403 清除受保护内容并提供重新查询老人或更换账号。切换或刷新时取消旧请求，迟到响应不会覆盖新选择。
- 卡片显示服务、计划时间、访视状态和护理员分配情况；结束时间为空时显示待确认。护理员姓名、公开资料和资质详情尚未接入页面。
- `features/schedule/` 管理 API 参数、类型、请求生命周期和日期展示；`schedule/` 管理页面与 CSS Modules。页面不写入绑定、排班、护理员分配或访视状态，也不在浏览器持久保存排程数据。

提交行为：

- 调用 POST `/api/intake-applications` 前初始化 CSRF；Session Cookie 随请求发送，申请人和审核字段由后端确定。
- 必填内容去除首尾空白后校验；姓名、地址、邮编和方言分别最多 100、255、10、100 个 Unicode 码点。年龄可留空，填写时为后端支持的非负整数；邮编保持字符串，不限制为六位数字。
- 护理需求可多选并逐行补充，去除重复项；空的可选内容不发送 `null`。不发送客户端指定的申请人、角色、状态或审核信息。
- 从 CSRF 初始化开始禁用表单和提交按钮，避免重复点击。失败时保留当前页输入；401 提供原页登录，登录成功后由用户明确再次提交。403 提示检查会话保护或家属权限。
- POST 结果不明时不自动重发；提示在新标签页查看本人申请，保留原表单。POST 已确认成功而详情读取失败时仍显示保存的申请编号。
- 表单输入只保存在当前页面内存中；刷新或离开表单不保留草稿。提交仅创建待审核申请，不执行审批或创建正式老人档案。

代码位置：

- `routes/family/intake/`：页面、表单交互与样式；浏览器 URL 的分页和筛选状态留在页面中管理。
- `features/intake/api.ts`：申请提交、列表、详情接口的路径、参数编码和返回类型。
- `features/intake/intakeForm.ts`：表单类型、字段校验和提交参数转换。
- `features/intake/useIntakeSubmission.ts`：CSRF 初始化、提交状态、防重复点击和请求取消。
- `features/intake/useIntakeQueries.ts`：`useIntakeApplications` 与 `useIntakeApplication` 管理查询、刷新、错误和取消；页面只传业务参数。
- `features/intake/types.ts`、`presentation.ts`：请求/响应类型和展示转换。
- `features/auth/api.ts`、`types.ts`：`initialiseCsrf` 初始化 CSRF，`signInWithSession` 封装 Session 登录，并声明登录参数和返回用户类型。表单输入、忙碌状态和错误文案由登录组件负责。

共用 `shared/api/client.ts` 增加 `ApiError.status` 并支持空成功响应；原有调用方式、错误 message、Session 和 CSRF 行为保留。合并时请同步这一公共改动。

## 本地运行

```bash
cd frontend
npm ci
npm run dev
```

然后打开 http://localhost:5173/family

需要先启动后端（8080）及其数据库，使用已有 FAMILY 账号登录；账号还需对应 `family_member` 记录。
前端通过 Vite 的 `/api` 代理访问后端。浏览器和 Apifox 不共享登录 Cookie，需要在网页内登录。

手机实机预览：执行 `npm run dev -- --host 0.0.0.0`，手机连接同一局域网后访问 `http://电脑局域网IP:Vite实际端口/family`。
若 5173 已占用，使用终端显示的实际端口，不需要调整后端代理地址。

## 验证

```bash
npm run lint
npm run test:coverage
npm run build
```

`FamilyHome.test.tsx` 从页面入口验证列表、分页、筛选、详情、登录、权限失效、请求取消和失败恢复；
`IntakeCreatePage.test.tsx` 验证提交、校验边界、防重复点击、登录恢复和不确定结果处理；
`shared/api/client.test.ts` 验证 Cookie/CSRF 请求、空响应和 HTTP 错误状态。测试仅替换网络边界，不依赖本地数据库。

`FamilySchedulePage.test.tsx` 验证周排程路由、选择与分页、权限失效、登录恢复和旧请求取消；
`features/schedule/api.test.ts` 和 `presentation.test.ts` 验证 API 参数、新加坡周界、跨月跨年及可空字段展示。
