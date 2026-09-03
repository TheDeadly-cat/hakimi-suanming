# Cross-System Readonly Comparison Draft

私有、隔离的“只读跨体系并列”契约草案。它不属于生产 Web 图，不进入 `apps/web`，
不创建体系切换器，也不生成“一致率/准确率”、综合评分或赢家。

## 当前 v0.3 边界

v0.3 不再接受调用方自行填写事实、来源和规则后仅重算 `contentSha256` 的摘要。
每个体系摘要必须与 bundled `generated-engineering-fact-receipts.v1.json` 中的精确工程回执一致；
该 registry 由独立 Node 证据层从当前 producer、体系自有 projector、已验证独立 manifest 和
来源 requirement ledger 重新计算。

当前只存在两份候选工程回执：

- 紫微：固定合成输入经过当前 iztro 2.5.8 隔离 producer，再经过紫微自有七字段 projector；
- 西洋：固定合成 UTC 输入经过当前 Astronomy Engine 2.1.19 diagnostic producer，
  再经过西洋自有五字段 projector。

八字因保存 manifest 已漂移而继续排除，不能签发回执；吠陀仍无产品、无事实 producer，
`bindingRequired=null`。因此 registry 固定为 `fail_closed_partial_two_of_four`，
`formalComparisonAuthorized=false`。

这里的 `factsFrozen=true` 只表示：通过验证后，当前对象中的事实与固定工程回执完全一致，
并以脱离调用方的递归冻结副本返回。它不表示领域事实、历史执行真实性、来源正文、exact quote、
许可、专家真值、正式体系准入、发布就绪或公开发布授权已经成立。

验证器还固定要求：

- `factEvidenceState=registry_bound_offline_engineering_replay_not_domain_truth`；
- `productionEligible=false`、`expertTruthClaimed=false`、`successReceiptIssued=false`；
- `noScoring`、`noWeighting`、`noMajorityVote`、`noModelArbitration`、
  `noAutoPersonMerge`、`noConceptEquivalenceInference` 全部为 `true`；
- 人物关联只能是用户显式确认且可删除的 `explicitSubjectLink`，默认允许为 `null`；
- 观察只能进入七个精确分区：`convergences`、`divergences`、
  `inputSemanticConflicts`、`schoolConflicts`、`evidenceQualityDifferences`、
  `nonComparableConcepts`、`unresolvedQuestions`；空数组不表示体系一致；
- 每条观察仍是人工显式录入、未经审定，并必须引用已包含体系的精确事实、规则身份、
  工程回执或显式不可比概念；
- 输入先做 descriptor-safe 的有界被动 JSON 快照；accessor、Symbol、自定义 prototype、
  稀疏数组、循环、非有限数与超限输入失败关闭；成功值不与调用方别名并递归冻结；
- `contentSha256` 只承担 envelope 的 canonical JSON 内容完整性；即使重算它，
  伪造事实、复制其他体系回执、registry 漂移或边界提权仍会失败。

## 定向验证

```powershell
node scripts/verify-cross-system-engineering-fact-receipts.mjs
node --test scripts/verify-cross-system-engineering-fact-receipts.test.mjs
node node_modules/vitest/vitest.mjs run --config apps/web/vitest.config.ts `
  packages/ziwei-iztro-adapter-draft/src/cross-system-engineering-fact-projection.test.ts `
  packages/western-astronomy-engine-adapter-draft/src/cross-system-engineering-fact-projection.test.ts `
  packages/cross-system-comparison-draft/src/index.test.ts
```

## 隔离浏览器预览

`npm run preview:cross-system-browser-preview` 在 `http://127.0.0.1:4220/` 提供隔离预览。
页面使用 bundled 紫微/西洋工程回执生成默认候选，只渲染通过同一 v0.3 验证器的内容；
CSP 固定 `connect-src 'none'`，不写 localStorage、sessionStorage、IndexedDB 或 Cache，
也不进入 `apps/web`。

2026-08-26 的 Edge/Chrome 8/8 和应用内桌面/`390×844` 记录属于旧 v0.2
（当时默认八字+紫微、自签摘要）历史证据，不能复用为 v0.3 浏览器通过证据。
本轮离线 Node 回放、单元测试或隔离构建同样不能冒充真实浏览器、完整应用、PWA、
正式仓储边界、公开主机、Release Evidence、部署或回滚确认。
