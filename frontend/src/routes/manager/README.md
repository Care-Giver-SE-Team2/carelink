# 主管台　Manager console

**负责人：**（待认领）

## 要覆盖的用例

- MG01 建立长者档案与照护计划
- MG02 分配护理员账户与资质录入
- MG03 编排周期访视排班
- MG04 因缺勤重新编排排班
- MG05 接管并处置照护异常
- MG06 审查护理员资质并公示状态
- MG07 生成并归档周期报告
- MG08 开展上门服务抽查

## 布局要求

桌面布局，信息密度高。表格、看板、多列并排都可以。

## 约定

- **这个文件夹只有你一个人改。** 别人不会碰这里的文件，你也不要去改别人的角色目录。
- 通用的东西放 `src/shared/`：按钮、表单、表格这类组件放 `shared/components/`，
  样式变量放 `shared/theme/theme.css`，调后端一律走 `shared/api/client.ts`。
  **要改 `shared/` 先在群里说一声**，那是五个人共用的。
- 业务逻辑放 `src/features/<模块>/`，不要堆在页面组件里。
- 老人端与其他三端的差别（字号、对比度、点击区大小）已经做在
  `shared/theme/theme.css` 的 `[data-theme="elder"]` 里，
  用 `<RoleShell theme="elder">` 就能拿到，不用自己写一套。

## 现阶段

先做能看的 mock 就行，不用接后端——后端接口还没有。
数据写死在组件里即可。等风格统一之后再重做一遍。

## 本地运行

```bash
cd frontend
npm ci
npm run dev
```

然后打开 http://localhost:5173/manager
