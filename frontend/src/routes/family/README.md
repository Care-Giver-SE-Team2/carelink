# 家属端　Family portal

**FM01 负责人：** Wang Zhili。FM01 页面放在 `intake/`；其他家属用例按团队分工在各自子目录扩展。

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

FM01 第 5 批已接入实际后端：

- `/family` 转到 `/family/intake`：本人申请列表，按状态筛选、每页 20 条、刷新。
- `/family/intake/:id`：本人申请详情、审核状态和备注；返回列表保留筛选及页码。
- 未登录或 Session 失效时显示家属登录表单：先 GET `/api/auth/csrf`，再 POST `/api/auth/login`，成功后重新请求原页面。
- 两个查询接口分别为 GET `/api/intake-applications` 和 GET `/api/intake-applications/{id}`。身份由服务端 Session 确定，不发送申请人编号、角色或 JWT。
- 401、403、404、参数错误和网络故障各有提示；失败时不继续显示此前的申请数据。状态筛选和分页只放在 URL 中，申请内容不写入本地存储。
- 日期显示为新加坡时间。页面使用真实响应，测试样例仅存在于测试文件。

视觉参考 `docs/family/family.html`，采用 React 和局部 CSS Modules，支持手机窄屏；未复制原型中的固定手机外框。
本批只提供列表和详情，提交申请表单属于后续批次。其他家属用例尚未由这些页面实现。

代码位置：`routes/family/intake/` 放页面与样式，`features/intake/` 放响应类型、展示转换和请求状态逻辑。
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
`shared/api/client.test.ts` 验证 Cookie/CSRF 请求、空响应和 HTTP 错误状态。测试仅替换网络边界，不依赖本地数据库。
