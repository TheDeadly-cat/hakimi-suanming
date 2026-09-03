# 阶段 D：八字 v1.7 `report_contract` 机器身份漂移候选收据（2026-09-01）

## 0. 结论

Stage C 收紧了 `packages/research-export/src/single-chart-report.ts`，但没有改变 frozen v1.7 golden。这使既有正式 `bazi.single-chart-report.v1.7.0.manifest.v2.2.0` 按设计失败关闭：它保存的 `report_contract` 源文件 identity 已不等于当前字节。

本增量新增一个**窄、候选态、只追加的漂移收据**，只证明这一个 mismatch 足以阻断“v2.2 仍是当前机器身份”的表述。它不是 v2.3，不重绑、不重签、不替代正式 manifest，也不声称这是其他正式组件中的唯一漂移。

## 1. 为什么不复制旧 v1.2 观察为 v1.3

既有 `bazi-domain-release-manifest-version-aware-observation-candidate.v1.2.0` 会动态读取旧组件规格，但随后硬钉 2026-08-31 的 preview digest 与固定计数。当前精确执行结果为：

| 命令 | 结果 | 解释 |
|---|---:|---|
| `node --test scripts/verify-bazi-domain-release-manifest-version-aware-observation-candidate-v1-2.test.mjs` | `3/14` 通过、`11/14` 失败 | 11 个失败均级联自同一 `CURRENT_PREVIEW_CHANGED`；不是 11 个独立缺陷 |
| `node scripts/verify-bazi-domain-release-manifest-version-aware-observation-candidate-v1-2.mjs` | exit `1` | 只输出固定、去路径的 `CURRENT_PREVIEW_CHANGED`，不会持久化新 drift entries，也不会取得 private candidate brand |

旧 v1.2 以更早的 manifest 和 34 文件 preview 为基线，还会混入 knowledge-core、source／rights 等不属于本切片的变化。复制它会扩大审查与归因面，且不能精确回答正式 v2.2 当前性。因此本次只锚定正式 v2.2、目标 report source 和 frozen golden 三个固定端点。

## 2. 精确 identity 观察

### 2.1 正式 v2.2 历史基线

| 项目 | 值 |
|---|---|
| artifact | `content/domain-release/bazi.single-chart-report.v1.7.0.manifest.v2.2.0.json` |
| raw bytes | `23399` |
| raw SHA-256 | `6481d5edfa9f9819af035ad9d208ea526fa7b29f12ccd6e072ad31f625e7f86d` |
| manifest ID | `hakimi.bazi.single-chart-report.domain-release-manifest/2.2.0` |
| manifest digest | `a95e722674c0b09a2d564b4090396fbfc25fdfc2f5f2fff9aedc92aa2468f68e` |
| persisted `report_contract` digest | `621cb0422729a3e5e12434f5c1c9ff5bf0f06e2d7bd2493deb5b5387f4957268` |

### 2.2 当前目标端点

| 文件 | v2.2 pin | 当前观察 | 结论 |
|---|---|---|---|
| `single-chart-report.ts` | `161365` bytes / `215a470…5082` | `164210` bytes / `43da8ce…d2dc` | `COMPONENT_FILE_IDENTITY_DRIFT` |
| frozen v1.7 golden | `60900` bytes / `aba357d…4b29` | `60900` bytes / `aba357d…4b29` | 未变 |

使用 v2.2 的 component canonical tuple，只把 report source 更新为当前 held-buffer identity 后，候选 `report_contract` digest 为：

```text
6dd730cabb3035567694599692439a1b27f48e89ea0ee0970bbb33f5f7ee95f2
```

这不同于正式 v2.2 pin，足以阻断当前 component closure；本窄收据没有读取或比较其他正式组件文件，因此 `uniqueBlockerClaimed=false`、`otherFormalComponentIdentitiesAssessedByThisReceipt=false`。

## 3. 候选收据

新增：

- `content/system-admission/bazi-single-chart-report-component-identity-drift-receipt-candidate.v1.0.0.json`
- `scripts/bazi-single-chart-report-component-identity-drift-receipt-candidate-lib.mjs`
- `scripts/verify-bazi-single-chart-report-component-identity-drift-receipt-candidate.mjs`
- `scripts/verify-bazi-single-chart-report-component-identity-drift-receipt-candidate.test.mjs`

收据自摘要：

```text
95e5a1b99d0a021a0fabf6c42e1cc8de432b9565459a091e577d57abbcea5fc8
```

固定落盘 identity 为 `5419` bytes、raw SHA-256 `c797aa7851d6f2ff64518abae42d25143307936bc63263e37f5000383511a9cf`。prospective builder 结果不取得 private candidate brand；只有 loader 同时通过固定 raw tuple、确定性序列化、自摘要和当前窄观察 exact compare 后才授予品牌。原生 `WeakSet.prototype.add／has` 与 `Reflect.apply` 在模块初始化时捕获，导入后的 WeakSet prototype 污染不能伪造或压掉品牌。

机械边界：

| 账户 | 候选收据状态 |
|---|---|
| persisted as domain manifest | `false` |
| active admission effect | `none` |
| formal v2.2 current | `false` |
| current full domain manifest established | `false` |
| full formal component set observed | `false` |
| owner decisions | `0` |
| manifest rebind／resign authorized | `false / false` |
| Binding／expert 基线 | 历史 v2.2 红账 `0/12`、`0/2`；本收据不重演当前 admission |
| content／expert／legal truth | 全部 `false` |
| browser／runtime／release evidence | 全部未建立 |
| release ready／public deployment／expert claims | 全部 `false` |
| cross-system authority inheritance | `false` |
| governance | `legacy-v13 / targetSchema 13 / migrationId null` |

## 4. 快照与运行时边界

- 每个文件的 bytes、长度和 SHA-256 来自同一 held buffer；读取前后核对普通文件 identity、大小和修改时间。
- 三个文件是顺序端点观察，不是跨文件原子快照。
- Schema 13 没有 mutation epoch receipt；跨文件 interval mutation 与 ABA 均未排除。
- CLI 会拒绝 operands、`NODE_OPTIONS` 和可见 preload 参数，但 preload 可在 guard 之前执行，因此该 guard 不是安全边界。
- Node、loader、launcher 与 CLI 输出均没有可信运行时 attestation；机械结果假设不存在任意 pre-evaluation code execution。

## 5. 聚焦验证

| 验证 | 结果 | 能证明的范围 |
|---|---:|---|
| 新候选收据 exact tests | `16/16` 通过 | unbranded builder／exact persisted loader、固定 raw tuple、确定性字节、自摘要、当前 source 与 golden pin、重摘要篡改、clone／WeakSet poisoning brand、路径端点、CLI 与红门 |
| 新候选收据 CLI | exit `0` | 只输出一个 candidate-only drift summary；`persistedAsDomainManifest=false`、`activeAdmissionEffect=none`、authority 全红 |
| 正式 v2.2 exact tests | `5/25` 通过、`20/25` 失败 | 20 个失败均级联自同一 `single-chart-report.ts` 前置 identity mismatch；不是 20 个独立缺陷 |
| Stage C focused Vitest | `2 files / 103 tests` 通过 | Citation 合取、SourceCarrier material gate、匿名成功／失败隐私与 Web 投影 |
| Stage C strict TypeScript slice | 通过 | 四个受影响生产／测试文件及依赖的静态类型闭合 |
| Binding readiness v1.9 | CLI 通过、tests `32/32` | 当前独立红账仍为 binding `0/12`、formal records `0`、authority 全红；不是本收据的一部分 |

## 6. 未建立与 owner 决策点

本收据没有修改正式 v2.2、旧 v1.2、registry、package scripts、prebuild 或默认 Web 路径。没有执行全仓 typecheck、默认 Web build、完整应用、PWA／Service Worker、浏览器、公开主机、部署或回滚。受限文件 `apps/web/src/lib/local-user-data-cleanup.ts` 未读取或修改。

下一步若要恢复“当前八字 v1.7 机器 manifest”表述，需要 owner 明确决定是否创建新的正式 manifest revision，并独立审查完整 component set、父账、source／rights／expert 计数与治理语义。当前 `manifestRebindAuthorized=false`、`manifestResignAuthorized=false`，所以不得由候选收据自动晋级。

现实专家身份、资质、独立性、两份原始意见和分歧处理仍没有实例；机器 identity 收据不能代替专家真值。八字工程观察也不能向紫微、西洋或吠陀继承权威。
