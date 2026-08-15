# Cross-System Readonly Comparison Draft

私有、隔离的“只读跨体系并列”契约草案。它不属于生产 Web 图，不进入 `apps/web`，
不创建体系切换器，也不生成“一致率/准确率”或综合评分。

用途：在紫微、西洋都还没有成为正式 active 体系之前，先把未来共同工作台的
“只读并列”数据形状和失败关闭验真器冻结下来：

- 每个体系只允许提交冻结事实摘要（不是完整数据库、Revision Schema 或备份）；
- 强制 `factsFrozen`、`noScoring`、`noAutoPersonMerge`；
- 人物关联只能是用户显式确认、可删除的 `explicitSubjectLink`，绝不按姓名或出生时间自动合并；
- 每个摘要必须携带规则身份、来源引用和 `productionEligible=false`、
  `expertTruthClaimed=false`、`successReceiptIssued=false` 边界；
- 内容地址固定为 canonical JSON 的 SHA-256；任何未知体系、重复体系、伪造评分、
  未确认人物关联、边界提权或摘要失配都失败关闭。

运行定向测试：

```powershell
npm run test:system-contract-drafts -- --run packages/cross-system-comparison-draft/src/index.test.ts
```

## 隔离 4220 浏览器预览（2026-08-11 新增）

`npm run preview:cross-system-browser-preview` 在 `http://127.0.0.1:4220/` 提供只读并列预览：

- 页面内直接调用同一契约验证器，接受完整并列 JSON（含 `contentSha256`），通过后按体系渲染冻结事实表、规则身份与来源，并固定显示
  `productionEligible=false / expertTruthClaimed=false / successReceiptIssued=false` 边界；
- 摘要失配、边界提权、未知/重复体系等一律失败关闭并列出原因，不渲染任何事实表；
- CSP `connect-src 'none'`，不写 localStorage/sessionStorage/IndexedDB/Cache，不进入 `apps/web`，不创建体系切换器；
- 自动化门 `npm run test:e2e:cross-system-preview`：Edge 与 Chrome 各 3/3、共 **6/6**（默认八字+紫微并列通过 + 零持久化、摘要失配失败关闭、边界提权失败关闭），控制台 0 问题。

该预览仍是隔离工程草案；第二体系正式 active 之前，主应用不会显示可点击体系切换器。
