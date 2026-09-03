# 阶段 F：紫微 76 路径 Manifest v3 与四体系 v2.8（2026-09-01）

## 1. 结论

本阶段只完成两项追加式工程身份工作：

1. 为紫微建立一个固定路径、严格 JSON、canonical LF、full-loader 私有品牌可复验的 Manifest v3。它只绑定旧 schema definition 当前投影声明的 46 条 unique path 与 same-artifact browser child v1.1 声明的 50 条 authored-build path；两集合重叠 20 条，union 精确为 `46 + 50 - 20 = 76` 条 selected engineering path。
2. 以四体系 v2.7 为唯一父级建立 v2.8。v2.8 只在紫微原有 receipt/browser 两端点之后追加 Manifest v3 端点，并把紫微 `currentEngineeringManifestMechanicallyVerified` 从 false 改为 true；Bazi、Western、Vedic 保持父级 canonical exact。

这不是紫微四个 package root 的目录闭包、紫微全工程、紫微 full-domain Manifest、正式产品身份、内容真值、专家审定、来源或许可结论、发布就绪或公开发布授权。

必须继续分开以下证据账：

| 证据账 | 本阶段能说什么 | 本阶段不能说什么 |
|---|---|---|
| selected engineering identity | 76 条明确 selected path 在一次 fixed-path loader 复验时与冻结 bytes/hash 相符 | 目录完整、没有额外文件、组件语义完整、紫微全工程或 full-domain |
| browser/runtime | 上游 child issuance 曾记录 isolated loopback Chrome 14 + Edge 14，共 28/28 | 本阶段重跑、Web 主应用、PWA、Service Worker、公开主机或 production runtime |
| content truth | 0/27 binding 被冻结并验证 | 紫微规则、断语或来源正文已成为内容权威 |
| expert truth | 0/2 独立专家审查被验证 | 真实专家身份、资质、独立性、意见或专家真值 |
| rights/legal | source/rights bundle 仍 incomplete，法律结论为 false | 作品层、载体层许可、再分发权或法律清关 |
| release readiness | 0/8 admission gates，Release Evidence 不完整 | 部署、回滚或发布就绪 |
| public authorization | publicDeploymentAuthorized=false，publicReleaseAuthorized=false | 公开部署或公开发布授权 |

发布治理继续固定为项目上下文 `legacy-v13 / targetSchema 13 / migrationId null`。紫微自己的 productIdentity / releaseIdentity / targetSchema / migrationId 均为 null，项目默认 legacy 上下文没有继承为紫微产品身份。

## 2. 新增端点与保留父级

紫微 Manifest v3：

- [artifact](../content/domain-release/ziwei-doushu.engineering-draft.v0.1.0.manifest.v3.json)
- [loader](../scripts/ziwei-independent-engineering-manifest-v3-lib.mjs)
- [CLI](../scripts/verify-ziwei-independent-engineering-manifest-v3.mjs)
- [tests](../scripts/verify-ziwei-independent-engineering-manifest-v3.test.mjs)

四体系 v2.8：

- [artifact](../content/system-admission/four-system-current-status-observation-child.v2.8.0.json)
- [loader](../scripts/four-system-current-status-observation-child-v2-8-lib.mjs)
- [CLI](../scripts/verify-four-system-current-status-observation-child-v2-8.mjs)
- [tests](../scripts/verify-four-system-current-status-observation-child-v2-8.test.mjs)

既有上游和父级没有被覆盖：

- [stale Ziwei Manifest v2](../content/domain-release/ziwei-doushu.engineering-draft.v0.1.0.manifest.v2.json)
- [Ziwei identity-drift receipt candidate](../content/system-admission/ziwei-expert-promotion-boundary-identity-drift-receipt-candidate.v1.0.0.json)
- [Ziwei same-artifact browser child v1.1](../content/system-admission/ziwei-same-artifact-browser-observation-child.v1.1.0.json)
- [four-system v2.7](../content/system-admission/four-system-current-status-observation-child.v2.7.0.json)

## 3. Ziwei Manifest v3 的准确工程范围

### 3.1 76 是两个上游声明集合的 union，不是目录枚举

selected closure 精确为：

- current old-schema definition projection：46 unique paths；
- browser child v1.1 declared authored-build graph：50 paths；
- overlap：20 paths；
- selected unique paths：76。

Manifest v3 逐条固定 76 条 path 的 bytes 与 SHA-256，并按 canonical path order 计算 selected path-set digest。loader 还要求以下三个 artifact binding 的 raw/self identity 精确成立：

1. 历史 Ziwei Manifest v2：fixed raw/self identity + strict read，不声称 private brand；
2. identity-drift receipt candidate：fixed-path full-loader 私有品牌；
3. same-artifact browser child v1.1：fixed-path full-loader 私有品牌。

这仍只是 selected-path endpoint snapshot。固定失败关闭字段包括：

- recursiveDirectoryEnumerationPerformed=false；
- extraFileAbsenceEstablished=false；
- 四个 entire package-root closure 全为 false；
- entireZiweiEngineeringClosureEstablished=false；
- currentFullDomainManifestMechanicallyVerified=false。

### 3.2 59 / 46 / 30 的组件与附件分账

旧 definition 的 9 个组件槽位保留其声明成员关系：

- component file references：59；
- definition-mapped unique physical paths：46；
- browser-child-only engineering attachments：30；
- 46 mapped + 30 attachments = selected 76。

9 个组件都固定：

- classificationBasis=historical_v2_fixed_definition_membership_only；
- semanticMembershipEstablished=false；
- componentComplete=false；
- domainTruthEstablished=false。

child-only 30 条只记为 engineering attachments，不硬分配到执行、解释、输入、事实、来源、权利、专家、高风险或报告组件。因此，59 次 definition component reference 不能被误读为 59 个 unique file，也不能被误读为组件已经语义完整。

### 3.3 四个 root 的 91 / 58 / 33 只是制作时反例账

制作 Manifest v3 时，四个非 runtime package root 的普通文件观察为：

| root | 制作时可见 | 进入 selected 76 | omission counterexamples |
|---|---:|---:|---:|
| packages/ziwei-doushu-contracts-draft | 5 | 4 | 1 |
| packages/ziwei-iztro-adapter-draft | 52 | 38 | 14 |
| packages/ziwei-fortel-differential-draft | 10 | 3 | 7 |
| packages/ziwei-workspace-artifact-draft | 24 | 13 | 11 |
| 合计 | 91 | 58 | 33 |

33 条 omission 清单的用途只是 authoring-time counterexamples：证明不能把 selected 76 洗白为四个 root 或整个紫微工程的完整闭包。Manifest loader 不递归重枚举这四个 root，也不机械复验 omission 清单在未来仍是完整目录清单。

以下 runtime 目录也明确在 selected identity 之外，其内容没有被绑定：

- packages/ziwei-iztro-adapter-draft/dist；
- packages/ziwei-workspace-artifact-draft/dist；
- packages/ziwei-workspace-artifact-draft/node_modules。

### 3.4 旧 v2 漂移只证明旧固定定义已 stale

历史 Manifest v2 的冻结身份继续原样保存。以其历史 `createdAt=2026-08-31T06:00:00.000Z` 重建当前 old-schema projection，得到 candidate digest：

`24ddffd0caebbce4f800154ad70fb24e441e67b3580785b798044b0393d70b66`

当前与历史差异来自同一个 physical source：

- packages/ziwei-doushu-contracts-draft/src/index.ts；
- persisted：45,329 bytes / `0474abe7170f17352efd9b0d0f2735f2edbec049bb331441b7bd77ff2b79acc0`；
- current：46,181 bytes / `2a9555dba509873e6c436dcdc9121fcd90e943d880984581fbff865feca15685`。

这个单一文件同时出现在 5 个组件声明中，所以形成 5 个 changed component digest；另有 4 个组件 digest unchanged。这是 one physical source fanout，不是 5 个彼此独立的语义变更，也不建立内容正确性。

Manifest v3 是 append-only successor；它没有覆盖、回签或伪装旧 v2。旧 aggregate checker 仍固定读取 stale v2，因此 [verify-independent-domain-release-manifests](../scripts/verify-independent-domain-release-manifests.mjs) 继续按预期报告 `MANIFEST_MISMATCH`。这条红线不能由 v3 独立 CLI 通过所替代。

### 3.5 createdAt 只是未认证本机时钟标签

Manifest v3 的 `createdAt=2026-09-01T11:44:00.000Z` 只固定为不晚于首次生成的本机时钟标签。它不是可信时间戳、外部 timestamp authority、签名、notary receipt 或跨文件 atomic epoch；不得用于证明先后顺序、无回拨、区间完整性或 ABA 排除。

## 4. 历史浏览器证据单独记账

Manifest v3 消费 browser child v1.1 的 full-loader 私有品牌，但没有重新运行浏览器：

- browserRuntimeEvidenceEstablishedByThisManifest=false；
- runtimeObservationRerunByThisManifest=false；
- child issuance Chrome scenario outcomes：14；
- child issuance Edge scenario outcomes：14；
- 历史合计：28/28。

child issuance 是 isolated loopback 的紫微 workspace draft，不是 Web 主应用或正式产品。历史 output tree 有 8 个文件，但 Chrome 和 Edge 场景实际服务/请求的 required runtime path 只有 4 个；不能把 output-tree identity 扩张成“8 个输出都被两浏览器实际服务”。

本阶段没有建立：

- 当前浏览器重跑；
- 固定物理设备；
- Chrome/Edge 正式跨浏览器产品验收；
- Web 主应用、PWA 或 Service Worker；
- public host 或 production browser receipt。

## 5. 内容、专家、权利与高风险账继续全红

Manifest v3 的机械计数为：

- binding/source frozen verified：0/27；
- independent expert reviews verified：0/2；
- admission gates satisfied：0/8。

source bundle、rights bundle、high-risk policy 与 report contract 均保持 incomplete；expert review bundle 保持 absent。工程文件中出现来源要求、权利要求、专家计划、断语或风险策略，不等于来源正文、exact quote、真实专家意见、作品层或载体层许可证据、法律判断、内容权威或高风险表达已获授权。

真实专家的身份、资质与彼此独立性尚未核验，至少两份意见也尚未取得。未来意见若有分歧，仍不得多数表决、平均、打分加权或由生成模型自动选赢家。

## 6. 四体系 v2.8 的唯一工程变化

v2.8 的 direct bindings 恰为：

1. four-system v2.7 fixed-path full-loader 私有品牌；
2. Ziwei Manifest v3 fixed-path full-loader 私有品牌。

相对 v2.7，紫微投影只允许：

- receipt endpoint 保持 index 0 canonical exact；
- browser child endpoint 保持 index 1 canonical exact；
- Manifest v3 作为 index 2 追加；
- currentEngineeringManifestMechanicallyVerified：false -> true；
- currentFullDomainManifestMechanicallyVerified 仍为 false；
- isolated browser 28/28 文本和计数保持不变。

Bazi、Western、Vedic 三个 system object 必须与 v2.7 canonical exact。四体系总账继续：

- total admission gates：32 required / 0 satisfied；
- systems formally admitted：0；
- systems domain authority authorized：0；
- systems release ready：0；
- systems public release authorized：0。

项目上下文继续为 `legacy-v13 / targetSchema 13 / migrationId null`，但 Ziwei product release/schema/migration 仍全部为 null。legacy 上下文没有向 Ziwei、Western 或 Vedic 的产品身份继承，也没有把 Bazi v1.7 权威外推给其他体系。

## 7. 冻结身份

### 7.1 Ziwei Manifest v3

| 文件 | bytes | SHA-256 |
|---|---:|---|
| artifact | 68,696 | 6a95c2eca3524763c20b03d389c4d7d14d0639bafb6db31c361b384946430396 |
| loader | 49,936 | c4be0c71a9a848d779002b958d2a9442485ce00b2cdffd708d8306abdf85b7ea |
| CLI | 3,084 | 930707a5df1faaf9a7a02c0494cf893e5ca2a6792cf80f9e470960ed13def308 |
| tests | 21,966 | 4a26f9ea5de11549845df1a48b3aa8b0ccd53c97fc6ff2d6e952d62864743521 |

- manifestId=hakimi.ziwei-doushu.definition-and-browser-child-selected-path-machine-identity-manifest/3.0.0
- manifestDigest=7018bf1df4bec8f6c753a11f72bcb2f3f2d63f3d46b194ef27fc2991dd06cb60
- selectedPathSetDigest=541b1e00f56fbbfd9a3c82ce250d68d26a44fc14ac253a4616d6f6bd84f6a9cd

### 7.2 four-system v2.8

| 文件 | bytes | SHA-256 |
|---|---:|---|
| artifact | 19,327 | 3e5181c53fbc8eddc6e57fce7c7c6bfb94a05ae5498c408b52198851f7580dea |
| loader | 39,163 | 79bef6e511eecd715629f0fd9083726497d100a1f4ada9216bac75b4d6a24550 |
| CLI | 3,331 | 6927c20b6725e2407040f0e52c15ff0de09a9df140301c575b645946d05595d6 |
| tests | 21,094 | 3d19ec56a01ac809ae81ed56de21f39c808452c5e494b345cf610626f9c90f07 |

- childId=hakimi.system-admission/four-system-current-status-observation-child/2.8.0
- childDigest=a3057d564024e6e5c52a01ab82b4bcc74cc863aea127b6556849b5dd7a2ee792
- createdAt=2026-09-01T11:54:00.000Z

这里的 createdAt 与 Ziwei v3 一样，只是本机未认证时钟标签，不是可信时间戳或时间权威。

## 8. 验证账与红队闭环

### 8.1 已完成的 Ziwei v3 聚焦验证

最终 Ziwei v3 文件状态上：

- default focused tests：27/27；
- serial focused tests：27/27；
- 3 个新增 `.mjs`：node --check 3/3；
- CLI：exit 0；
- exact `.some()` sabotage preload PoC：exit 1 / `PRELOAD_ENVIRONMENT_FORBIDDEN`。

这些结果证明的是当前 selected engineering manifest、loader、CLI 和测试的聚焦机械性质；不证明内容真值、专家真值、许可或法律结论、浏览器产品验收、发布就绪或公开授权。

### 8.2 P1：`.some()` preload 绕过如何关闭

初稿 CLI 在 preload 已经执行后调用可被污染的 `Array.prototype.some` 检查 `process.execArgv`。红队保持可见 `--import` 不变，只让第一次 `.some()` 返回 false 后恢复原方法，即可让旧 CLI 错误 exit 0。

修复后，可见 preload guard 在任何 Array/String prototype 搜索方法之前使用 index loop 与逐字符精确比较，不再依赖 `.some()`。原 exact PoC 已进入 focused regression，当前以 `PRELOAD_ENVIRONMENT_FORBIDDEN` 失败关闭。

### 8.3 P2：未绑定的正向断言如何关闭

初稿 artifact 曾写 `visibleCliLoaderInjectionRejected=true`，但 selected 76 与三个上游 artifact binding 都没有绑定本阶段 CLI、loader 或 tests。P1 修复前后 artifact identity 不变，直接反证该正向断言不能由 selected identity 支撑。

最终 artifact 改为 `visibleCliLoaderInjectionRejectedBySelectedIdentity=false`。CLI PoC 的通过只进入本节的外部工程测试证据账，不回填或抬高 selected manifest identity。

### 8.4 时间标签红队

初稿 `createdAt` 晚于首次生成，不能作为当时已经存在的时间证据。最终改为 `2026-09-01T11:44:00.000Z` 并重新 materialize、重冻 raw/self/lib/tests；字段语义继续明确为本机未认证时钟标签，不新增任何正向时间权威声明。

### 8.5 four-system v2.8 最终验证

最终 v2.8 已对最终 Ziwei v3 identity 重绑并冻结。在同一最终文件状态上：

- v2.8 default：25/25；
- v2.8 serial：25/25；
- Ziwei v3 + v2.8 default combined：52/52；
- v2.7 + Ziwei v3 + v2.8 serial combined：82/82；
- Ziwei v3 与 v2.8 共 6 个新增 `.mjs`：node --check 6/6；
- 两个 CLI：exit 0；
- npm run check:release-governance：exit 0；
  - default release line：legacy-v13；
  - target schema：13；
  - migration id：null；
  - publicDeploymentAuthorized=false；
  - expertClaimsAuthorized=false。

v2.8 可见 preload、`.some()` sabotage 与 argv rewrite 均保持失败关闭。独立红队最终复核 direct bindings、Ziwei endpoint append、非 Ziwei canonical exact、private brand/raw/self/canonical/unknown-field 边界、历史 browser 28/28 不抬高、authority/legacy/epoch/atomic/ABA 边界，未发现剩余 P1/P2。

本阶段没有重跑 Chrome/Edge，也没有运行全仓 typecheck、默认 Web build、完整应用、PWA、Service Worker 或公开主机验证。上述测试与 CLI 只进入工程验证账。

## 9. mutation epoch、atomicity 与 ABA 边界

Ziwei Manifest v3 与 four-system v2.8 都只是 point-in-time / endpoint snapshot。固定边界继续为：

- mutationEpochReceipt=null；
- mutation epoch available=false；
- cross-file atomic snapshot=false；
- interval mutation excluded=false；
- ABA excluded=false。

同一 held buffer 的 hash-and-parse、canonical JSON、raw SHA-256 或 self digest 都不是跨文件事务、签名或区间不变性证明。

## 10. 仍保持红色的仓库级检查

[verify-independent-domain-release-manifests](../scripts/verify-independent-domain-release-manifests.mjs) 继续按预期 exit 1：

- `MANIFEST_MISMATCH`；
- 首个报告对象仍是 stale Ziwei Manifest v2。

这说明旧 aggregate fixed definition 尚未切换到 append-only v3；不能把 v3 独立 CLI 或 v2.8 聚合 child 冒充旧 aggregate 已通过、全域 Manifest 已完成或 release gate 已闭合。

全仓 typecheck 与默认 Web build 没有运行。已知受限阻塞文件继续未读、未改。

## 11. 未建立事项

本阶段明确没有建立：

- 四个 package root 的递归目录闭包、extra-file absence、整个 Ziwei engineering closure 或 full-domain manifest；
- 正式 Ziwei 输入、事实、规则版本、来源、权利、高风险或报告契约；
- 内容真值、来源正文/exact quote 冻结、作品层或载体层许可依据、再分发授权或法律结论；
- 真实专家身份、资质、独立性、两份意见、分歧处理完成或专家真值；
- 当前浏览器重跑、完整应用、Web/PWA/Service Worker、公开主机或 production runtime evidence；
- productIdentity、releaseIdentity、Ziwei targetSchema 或 migrationId；
- mutation epoch、跨文件原子快照、区间完整性或 ABA 排除；
- Release Evidence、部署与回滚确认、release readiness、公开部署或公开发布授权；
- Bazi v1.7、legacy-v13 或其他体系权威向 Ziwei 继承。

## 12. 后续独立通过线

后续若继续紫微，至少仍需分别完成：

1. owner 明确的产品身份、正式输入、事实与规则版本；
2. 27 条 binding 的可靠底本、来源正文、exact quote、作品层与载体层许可依据；
3. 不可再分发材料的 private/link-only 边界；
4. 两名真实、独立、资质可核验的紫微专家意见，并列保留分歧；
5. 正式高风险表达与报告输出边界；
6. 当前正式源图上的 Chrome/Edge/PWA/Service Worker/公开主机证据；
7. mutation epoch 与跨文件一致性机制；
8. Release Evidence、部署与回滚确认；
9. owner admission decision 与公开发布授权。

这些通过线彼此独立，不能由本次 hash、测试、历史浏览器 28/28 或四体系聚合观察相互兑换。
