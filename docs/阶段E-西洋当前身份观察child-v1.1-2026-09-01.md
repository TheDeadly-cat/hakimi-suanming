# 阶段 E：西洋当前身份观察 child v1.1（2026-09-01）

## 1. 本轮目标与结论

本轮在用户明确切换到 C、D 或其他体系后，选择了不依赖第三方私有材料、现实专家联络或公开发布授权的西洋独立产品化缺口：恢复“当前工程端点是谁”的 fail-closed 观察链。

新增的是 append-only 的 `v1.1` observation child，不覆盖、不改写也不晋级既有西洋 Manifest、来源 requirements、build-notice child、civil-time child 或两个四体系 registry。它只证明固定路径上一组逐文件端点在本次读取时与保存的 bytes／SHA-256／self-digest 相符；它不证明这些文件来自同一原子时刻，也不把保存工件的自摘要当作私有能力、数字签名、专家意见、权利结论或发布回执。

新 child 的机械结论保持：

- `activeAdmissionEffect = none`；
- Admission `0/8`；
- Binding `0/28`；
- 现实独立专家 `0/2`；
- 西洋产品 `productIdentity / releaseIdentity / targetSchema / migrationId = null`；
- 项目 `legacy-v13 / 13 / null` 只作背景，`inheritedByWesternProductIdentity=false`；
- mutation epoch、跨文件原子快照、区间完整性、ABA 排除全部为 `false`；
- 内容真值、专家真值、权利法律判断、发布就绪、公开部署和公开发布授权全部为 `false`。

## 2. 为什么先补这个 child

只读核验确认三条既有“current”链均继续 fail-closed：

1. `western-independent-productization-version-aware-observation-candidate.v1.0.0.json` 的专用 CLI 返回 `ARTIFACT_DRIFT`。旧候选记录的 `packages/western-astrology-contracts-draft/src/index.ts` 为 `41,394 / 3568cbe0…`，当前文件为 `39,756 / 87bf4fce…`；civil input 已拆到当前 `2,910 / e1e9cfa1…` 的 `civil-input.ts`。
2. `western-source-binding-requirements.v1.2.0.json` 的当前 loader 返回 `LEDGER_MISMATCH`。其保存文件 raw identity 与 self-digest 仍可独立复核，但当前 formal v1 依据闭包已漂移，所以不能取得 v1.2 私有 brand，也不能把它冒充 formal current。
3. `four-system-current-observation-registry.v2.json` 的专用 CLI 返回 `ARTIFACT_DRIFT`。它仍把西洋 v1.0 predecessor 和旧 Manifest 写作 current machine identity；新 child 只记录这一 stale 状态，不修改 registry。

同时，西洋 civil-time 专用 CLI 当前仍通过，返回 25 个 artifact bindings、12 个 runtime modules、21 条 import edges 和零个 apps/web reverse reference；但其结论仍明确是 `incompleteProductionReachabilityAudit=true`、`wholeRepositoryProductionUnreachableEstablished=false`、Chrome／Edge／生产浏览器证据与全部 authority 红门为 `false`。

## 3. 新工件身份

| 工件 | bytes | raw SHA-256／semantic digest |
| --- | ---: | --- |
| `content/system-admission/western-independent-productization-version-aware-observation-child.v1.1.0.json` | 12,692 | raw `140bed89a638deb970e1a60d3ffcbc96eebef509bd14bd692726b8c561d13593` |
| candidate semantic identity | — | `candidateDigest=664bdbddd48bc0205eb6dba4cf923903a78d35e6d63ab29ca8e7de3faa5975af` |
| `scripts/western-independent-productization-version-aware-observation-child-v1-1-lib.mjs` | 41,514 | `98c615dd6290875087f6a4ff6cc8357354812ec03e79669f6f8e44439601435c` |
| `scripts/verify-western-independent-productization-version-aware-observation-child-v1-1.mjs` | 863 | `4a76c96f2d37925deb327661e6e376e36ff5eabd10509861c66fabba750be95c` |
| `scripts/verify-western-independent-productization-version-aware-observation-child-v1-1.test.mjs` | 15,808 | `dc1189cb91cdddeef1156f17eded6425afb3a89ae152de0d1cdf1b388ade686c` |

Candidate 固定绑定六份历史／当前 JSON 工件、两个 registry endpoint 和两个当前 contract source endpoint。六份 JSON 包括：v1.0 predecessor、旧西洋 Manifest、formal source v1、nonformal source v1.2、Astronomy Engine build-notice child 和 civil-time browser observation child。

## 4. 信任与完整性边界

### 4.1 固定路径与逐端点读取

验证器不接受候选自报路径作为任意输入。所有 upstream 和 registry 路径均来自代码内固定常量，并通过既有 held-handle reader 完成同缓冲区读取、bytes／SHA-256、严格 JSON 解析、重复键拒绝、root containment、realpath 与端点前后身份复核；symlink／junction／hardlink 与等长摘要替换均失败关闭。

每个 JSON 的 raw identity 与 self-digest 分开核对。当前 contract 的 `index.ts` 与 `civil-input.ts` 还要命中固定源码结构；这只证明两个直接端点，不证明整个 package source closure 或输入合同正式准入。

### 4.2 不伪造 upstream capability brand

新 child 最终把 `upstreamPrivateBrandCount` 固定为 `0`：

- v1.0 predecessor 当前 loader 已 fail-closed；
- source v1.2 当前 loader 已 fail-closed；
- build-notice evidence 没有可由 child 消费的 outward result brand；
- civil-time 既有 candidate loader 在继承 setter 污染负测中暴露了写入普通 `{}` 的弱点，因此新 child 不消费或宣称该 brand。

作为替代，新 child 用自己的加固解析与摘要投影独立复核 civil-time 固定 candidate raw identity、self-digest、全部 authority 值（包括既有 loader 未单列的 `canonicalZoneIdentityEstablished=false`），并逐一重读 25 个保存 binding 的固定端点。这个结论记为“保存 candidate 与 25 个端点机械一致”，仍不是生产浏览器证据、来源冻结或 authority receipt。

新 child 自己的成功结果使用模块私有 `WeakSet` brand；spread／JSON clone 均失去 brand，结果递归冻结。`preImportIntrinsicIntegrityEstablished=false` 继续保留，不能把模块加载前的环境完整性伪装成已证明。

### 4.3 自重签不能晋级

即使攻击者修改 payload 后重新计算 `candidateDigest`，验证器仍会拒绝：

- `1/8`、`1/28`、`1/2` 等任何门提升；
- content／expert／rights／release／deployment／public authority 改为 `true`；
- Western 产品继承 `legacy-v13`、Schema 13 或任意 migration；
- mutation epoch、跨文件原子、区间完整性或 ABA 改为已建立；
- artifact path／role／raw hash／registry identity 替换；
- source v1.2 被写成有 private brand 或 formal current；
- civil `canonicalZoneIdentityEstablished=true` 或把当前 contract binding 搬到 alias path；
- predecessor 被恢复为 current、formal supersession 生效或 registry 被写成已修复。

## 5. 定向验证

### 5.1 新 child

- 专用 CLI：通过；输出 `predecessorStillCurrent=false`、`currentObservationRegistryMechanicallyCurrentForWestern=false`、`upstreamPrivateBrandCount=0`，全部发布／权利／专家字段保持 false。
- 默认 `node:test`：14/14 通过。
- `--test-concurrency=1`：14/14 通过；不得与默认并发结果混写为两份独立产品证据。
- 覆盖 canonical LF、duplicate key、BOM、CRLF、Proxy、accessor、稀疏数组、共享引用、负零、symlink／hardlink、等长 drift、固定路径替换、自重签晋级、clone／spread brand、继承 setter、ambient `Array.prototype.push`、CLI operands 与动态 import 禁止。

### 5.2 项目边界

- `check:release-governance`：通过；默认继续是 `legacy-v13 / targetSchema 13 / migrationId null`，`publicDeploymentAuthorized=false`、`expertClaimsAuthorized=false`。
- `check:web-storage-import-boundary`：通过。
- `check:system-contract-draft-boundaries`：预期红；仍列出受限文件未检查及既有未登记／动态 import 诊断。新 v1.1 文件没有出现在诊断中。受限文件未读取、未修改。
- 未运行全仓 typecheck、默认 Web build、完整应用、PWA／Service Worker、Chrome／Edge、公开主机、部署或回滚。

### 5.3 独立只读审计

独立审计与新增 predecessor basis 检查后的快速复审结论均为 P0／P1／P2／P3 = `0/0/0/0`。复审确认 formal source v1 与 source v1.2 各唯一绑定历史 `index.ts` 身份 `41,394 / 3568cbe0…`，historical Manifest 的五个同路径 component 引用也全部保持该历史 SHA-256；这些检查只证明 stale basis 的一致性，不把历史身份晋级为 current contract 或 authority。

## 6. 七账分离

| 账 | 本轮状态 |
| --- | --- |
| 工程证据 | 新 child 固定路径、raw identity、self-digest、25 个 civil binding endpoint 与攻击回归通过 |
| 浏览器／运行时证据 | 只消费保存的 Codex IAB civil observation 材料并机械复核端点；不建立 Chrome／Edge、生产运行时或完整应用证据 |
| 内容真值 | 未建立 |
| 专家真值 | 现实专家 0/2，未建立 |
| 权利／法律判断 | 未建立；build notice 不等于许可审结或再分发授权 |
| 发布就绪 | `false` |
| 公开发布授权 | `false` |

## 7. 后续边界

本 child 没有修复旧 Manifest、formal source v1、nonformal source v1.2 或两个 registry；它只把当前断链变成可复核、不可冒绿的工程事实。后续若继续西洋体系，应分开建立独立 productization requirements parent、runtime／bundle-size proposal、storage／backup／recovery／rollback 设计、高风险表达 policy、Chrome／Edge 同产物浏览器质量门和 Western 专属 Release Evidence 设计。

任何一步都不得从八字 v1.7、紫微或吠陀继承内容权威、专家权威或公开发布授权；专家分歧不得多数表决、平均或由生成模型自动选择赢家。
