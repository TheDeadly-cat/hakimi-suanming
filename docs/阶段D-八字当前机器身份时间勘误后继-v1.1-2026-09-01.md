# 阶段 D：八字当前机器身份时间勘误后继 v1.1（2026-09-01）

## 0. 结论

本轮只新增 append-only 的 `hakimi.bazi.current-machine-identity-successor/1.1.0` 及其固定验证链。它直接消费新 expert zero-instance child v1.1 的 exact full-loader private brand，但 expert overlay 仍不进入 machine identity digest。

当前 28 个 machine-identity 路径已逐条重新观察并验证。实测投影与旧 successor v1.0 中的当前投影相同，因此 machine digest 仍为 `58c82e1bbe601638130c0fefe6341d680e7d018f0a72ea44ca5704d83792ee78`。这个结论是本轮的工程身份观察，不是 formal Manifest currentness、跨文件原子性、内容真值、专家真值或发布授权。

旧 successor v1.0 仅作 exact raw+self historical predecessor。新链没有 import 或 invoke 旧 full loader，也没有消费它的 private brand。formal Bazi Manifest v2.2 仍是 historical/not current，没有修改任何旧 artifact、Manifest、registry 或 endpoint。

## 1. 四件套与机械身份

| 文件 | bytes | SHA-256 |
|---|---:|---|
| [successor artifact](../content/system-admission/bazi-current-machine-identity-successor.v1.1.0.json) | 32,806 | `787c5cd5994923805ca37b096be5ae36a94cf5f809c6892ce854e9b193ddff7b` |
| [loader library](../scripts/bazi-current-machine-identity-successor-v1-1-lib.mjs) | 47,833 | `ba339389598ac2581ffd7ecba168a362a91a3aeb22288b7c48bf03b676502511` |
| [fixed-path CLI](../scripts/verify-bazi-current-machine-identity-successor-v1-1.mjs) | 1,807 | `d5f4d7b043cfe001ceaf517b52ebb9e902c40bf83102c2256b47c22d4d9cce70` |
| [adversarial tests](../scripts/verify-bazi-current-machine-identity-successor-v1-1.test.mjs) | 21,681 | `7251843a6a1eaa25ae25662ec974c82c4db860a0b92621109528ec31610dd165` |

身份：

- `successorId = hakimi.bazi.current-machine-identity-successor/1.1.0`；
- `receiptDigest = 589e7157fb4cd4943ceea7b44d27ed2fc7b32cd6f21b788ca3b59b92973e54bf`；
- receipt digest domain = `hakimi.bazi.current-machine-identity-successor.receipt/1.1.0`；
- machine digest domain 仍为 `hakimi.bazi.current-machine-identity/1.0.0`；
- `status = append_only_current_machine_identity_observation_successor_no_manifest_or_release_authority`。

## 2. 当前 parent 与历史 predecessor

两份当前 private-brand parent：

| role | artifact | raw identity | semantic identity |
|---|---|---|---|
| current report component drift parent | `bazi-single-chart-report-component-identity-drift-receipt-candidate.v1.0.0.json` | 5,419 / `c797aa7851d6f2ff64518abae42d25143307936bc63263e37f5000383511a9cf` | receipt `95e5a1b99d0a021a0fabf6c42e1cc8de432b9565459a091e577d57abbcea5fc8` |
| current expert zero-instance overlay parent | `bazi-expert-current-line-zero-instance-observation-child.v1.1.0.json` | 9,765 / `598b662c7c58913fe9326290d08a1559f46f91909e5d040f9e335ad23562f9e2` | child `88044983de8b32fb68da7075224b5799528aa2ce63970d7c4eae0a0a92fae647` |

旧 successor v1.0 历史绑定：

- path：`content/system-admission/bazi-current-machine-identity-successor.v1.0.0.json`；
- raw identity：30,801 / `9360655d17b23ea8c7c68e44af3177f8ccc72b350046d4f7dca5f8a8c83b717d`；
- receipt digest：`f7ae6009bea62156a82de86ee0be3c353b022035194881001a913066ed8c4b05`；
- `rawAndSelfDigestVerified = true`；
- `fullLoaderImportedByThisSuccessor = false`，`fullLoaderInvokedByThisSuccessor = false`；
- `privateBrandConsumed = false`，`brandCurrent = false`，`currentEndpointClaimed = false`。

该历史验证使用 stable held-handle reader、duplicate-key rejecting strict parser 和本地重算的 v1.0 receipt domain，不 import `bazi-current-machine-identity-successor-lib.mjs`，也不调用 `loadBaziCurrentMachineIdentitySuccessor`。

## 3. 28-path 实测与 digest 边界

historical formal baseline 仍是 `bazi.single-chart-report.v1.7.0.manifest.v2.2.0.json`（23,399 / `6481d5edfa9f9819af035ad9d208ea526fa7b29f12ccd6e072ad31f625e7f86d`，manifest digest `a95e722674c0b09a2d564b4090396fbfc25fdfc2f5f2fff9aedc92aa2468f68e`）。它只作 held-handle raw+self 基线，`formalManifestCurrent = false`。

观察器按 10 个 component 和其 files 的首次出现顺序重建恰好 28 个唯一路径，对每一路径单独使用 stable held handle 读取。实测结果：

- 与 formal v2.2 基线相比，仍只有 `packages/research-export/src/single-chart-report.ts` 一个 file drift；
- 仍只有 `report_contract` 一个 component drift；
- v1.7 frozen golden 仍为 60,900 bytes / `aba357d98a99271cc9a9b2727ad1c7c516424c94b7cf34f765cb38b0e9a74b29`；
- 完整 `currentMachineIdentity` 投影与旧 successor v1.0 字节语义等价；
- machine digest 仍为 `58c82e1bbe601638130c0fefe6341d680e7d018f0a72ea44ca5704d83792ee78`。

expert child v1.1 只进入 `expertOverlay`，`outsideFormalManifestComponents = true` 且 `includedInCurrentMachineIdentityDigest = false`。现实 reviewer 与独立意见仍为 `0/2`，不得因 machine digest 没变而外推专家真值。

## 4. 时间与 mutation epoch 边界

- `createdAt = 2026-09-01T13:52:00.000Z`；
- 固定 same-untrusted-local-clock upper bound = `2026-09-01T13:52:10.982Z`；
- `trustedTimestampEstablished = false`；
- `externalTimeAuthorityEstablished = false`；
- `crossArtifactTemporalOrderEstablished = false`；
- monotonic clock、notary receipt 和 filesystem timestamp authority 均为 `false`；
- predecessor v1 `correctedCreatedAt = null`，历史 chronology authority 未建立。

这两个时间值只支持同一未认证本机时钟上 `createdAt < fixed upper bound` 的局部检查，不支持跨工件 chronology。

Schema 13 仍没有 mutation epoch receipt；`crossFileAtomicSnapshot`、`intervalMutationExcludedAcrossFiles`、`abaExcluded` 和 `replayExcluded` 均为 `false`。28 个文件各自的 held-handle 稳定性不是跨 28 文件的原子 snapshot。

## 5. formal/current 与权威分账

本 successor 明确不：

- 修改 formal Bazi Manifest v2.2、central Manifest 或 central registry；
- 增加 predecessor backlink；
- 修改 global current endpoint registration；
- 自称替换 Bazi current endpoint 或 four-system status endpoint；
- 接入 default/runtime 或建立 formal admission。

发布治理仍为 `legacy-v13 / targetSchema 13 / migrationId null`。

| 分账 | 当前结论 |
|---|---|
| 工程证据 | 当前 28-path、10 component、新 expert parent private brand、旧 successor raw+self 已机械验证 |
| 浏览器／运行时证据 | 未建立；CLI 不是 Node、loader、launcher、OS 或 hidden preload attestation |
| binding/source/rights 闭环 | 均为 `false`；12 条 binding frozen 仍为 0 |
| 内容真值 | `false` |
| 专家真值 | `false`；现实 reviewer `0`，独立意见 `0/2` |
| 权利／法律判断 | `false` |
| 发布就绪 | `false`；Release Evidence、部署和回滚未建立 |
| 公开发布／专家声明 | public release、public deployment、expert claims 全部未授权 |

## 6. 定向验证

| 验证 | 结果 | 边界 |
|---|---:|---|
| adversarial tests（默认） | 25/25 | 默认调度下的同一窄合同 |
| adversarial tests（串行） | 25/25 | raw/self、private brand、old-loader 禁用、28-path digest、formal/current 红门、future/upper-bound、unknown/duplicate、CLI |
| fixed-path CLI | exit 0 | 从非项目 cwd 运行，只输出机械摘要 |
| `node --check` | 3/3 | lib、CLI、test 语法闭合 |
| `check:release-governance` | exit 0 | 默认仍为 `legacy-v13 / 13 / null`，public deployment 与 expert claims 仍未授权 |

负例覆盖：

- new artifact 或 old predecessor raw/self 漂移；
- clone/reseal 伪装 private brand，或 import/invoke 旧 successor full loader；
- 28-path 数量、顺序、唯一 drift 路径、component drift 或 golden 身份改变；
- expert overlay 进入 formal component 或 machine digest；
- `createdAt` 晚于上界，或 upper bound 早于 `createdAt`；
- 提升 trusted/external/cross-artifact time、atomic/epoch/interval/ABA/replay 边界；
- 提升 binding/source/rights/expert/legal/runtime/release/public authority；
- 修改 formal/current/registry/endpoint 或 owner decision；
- unknown field、duplicate JSON key、CLI operands 或可见 preload 选项。

本轮没有建立 four-system v2.9，因此 four-system v2.8 仍是原有历史聚合关系。没有运行全仓 typecheck、默认 Web build、完整应用、PWA／Service Worker、浏览器、公开主机、部署或回滚验证；没有读取受限的 `apps/web/src/lib/local-user-data-cleanup.ts`，也没有执行任何 Git 操作。
