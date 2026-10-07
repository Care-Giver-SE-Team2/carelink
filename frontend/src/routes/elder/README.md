# 老人端　Elder client

**负责人：**（待认领）

## 要覆盖的用例

- EL01 确认服务完成并即时反馈
- EL02 申请增值服务
- EL03 一键紧急呼救
- EL04 绑定家属

## 布局要求

大字号、高对比、大点击区。不假设识字能力与稳定的手部动作，尽量图标化，一屏一件事，不用表格。

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

然后打开 http://localhost:5173/elder
