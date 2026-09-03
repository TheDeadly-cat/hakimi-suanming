# 阶段 D：八字 v1.7 领域 Manifest 版本感知观察候选 v1

日期：2026-08-30  
状态：只读观察候选；不重签、不重绑、不接入正式准入或发布消费者

## 结论先行

本 tranche 只建立一个版本感知、失败关闭、无 admission effect 的 Bazi `single-chart-report@1.7.0` manifest 观察候选。它区分保存 manifest、当前非权威 expected preview、旧 D0、中央 system registry、跨体系工程回执与紫微／西洋独立 manifest；不会把任何历史点位改写成当前权威身份。

默认治理继续固定为 `legacy-v13 / targetSchema 13 / migrationId null`。保存 manifest 当前 verifier 结果仍是 `MANIFEST_MISMATCH`，owner decisions 为 0，rebind／resign 均未授权。候选不得接入旧 manifest、D0、默认 Web、运行时、prebuild、system registry 或跨体系 receipt。

## 候选机器身份

以下值已按 full loader 与 private WeakSet brand 的实际结果冻结：

- candidate ID：`hakimi.bazi.domain-release-manifest.version-aware-observation-candidate/1.1.0`；
- candidate semantic digest：`be41925d72904e8eb90eea2b77f7de553f7c743d87fd975ae33fa99040571dc2`；
- persisted artifact：`content/system-admission/bazi-domain-release-manifest-version-aware-observation-candidate.v1.1.0.json`；
- raw bytes／SHA-256：`21859 / 7768590bc117a229919bcd119a2bfada97d7e77712677947a2a650d6f518233d`。

摘要只证明确定字节与允许的机械观察投影一致；不是数字签名、owner acceptance、重签授权、内容权威、专家真值、许可法律结论或发布授权。

## Saved manifest 与当前 preview

保存 manifest：

- 路径：`content/domain-release/bazi.single-chart-report.v1.7.0.json`；
- createdAt：`2026-08-25T14:30:00.000Z`；
- raw identity：`12777 bytes / d63d80502c6186a66f2eabc4bd2749687978a8cfb22d420842aa4a9d6e0eccd6`；
- semantic digest：`60711da42ebc71e1f23ec300dffd5ed44f418c9bcc83ee394bf106f7354dc932`；
- current verifier：`MANIFEST_MISMATCH`；
- `savedManifestCurrent=false`。

以保存 manifest 的 `createdAt` 重建的当前 expected preview 仅为非权威工程观察，其 digest 为：

`85e0a454c76bead4eac239a98a56b55fb662bcc77ff6f1e49e52ee2a6e65ea68`

该字段只能命名为 `nonAuthoritativeCurrentExpectedPreviewDigest` 或同等明确名称，不能含混输出为当前 `manifestDigest`。preview 没有 owner acceptance，也没有 mutation epoch 或跨文件原子快照。

## 4／11／8 漂移分账

| component | 条目数 | saved component digest | current preview component digest |
|---|---:|---|---|
| `fact_contract` | 1 | `1520a68a0974376afb61be2dc4b4d37392037659967085ebf6ed67ad4f8a09f9` | `bcd1ad4af3eb9532ac91b1a7f07e2dfbd28f745187dc9c16aded473643305e91` |
| `source_bundle` | 4 | `ebfceb4cf6f96ca88637ab6d06febc87489afd8ca4dfdb1f023a37ddaf7b948b` | `091f9065d0cf37b5c4964a02917aab6e3c4778eb5248836ad4b15a254b872b51` |
| `rights_bundle` | 5 | `495f6ab72764320847b852a847cd6a3db1cbcf33833cea723745f64406629546` | `c2e35cf80b8b754d9701f75af727983d442358ce60a1f7c46758d30a197aad8c` |
| `high_risk_policy` | 1 | `4d5b4e1f925c296b633d0002d3aabdfa43f87fe814d553a303d2ecb41134a3e4` | `666bffc377e59e220b4a7ca1930a7a519b046a89af7dbaaf186d2bec68b83c3c` |

总计：`4` 个组件、`11` 个 component-file 漂移条目、`8` 条唯一相对路径：

1. `apps/web/bundled-knowledge-audit.ts`
2. `content/system-admission/bazi-binding-freeze-requirements.v1.json`
3. `package.json`
4. `packages/bazi-core/src/index.ts`
5. `scripts/audit-bazi-source-binding-candidates-live.ps1`
6. `scripts/bazi-binding-freeze-requirements-lib.mjs`
7. `scripts/bazi-expert-review-packet-lib.mjs`
8. `scripts/verify-bazi-binding-freeze-requirements.mjs`

CLI 只输出 `9` 个总组件、`5` 个未变组件、`4/11/8` 漂移计数与四个 component ID；不输出上述路径或逐文件 hash 表。完整路径与逐文件 hash 保存在候选 artifact 的 `currentPreviewObservation.driftEntries` 和本审计文档中。

## D0 分账

旧 `bazi-v17-manifest-drift-decisions.v1.json` 仍是历史失败关闭账：

- raw：`11291 bytes / 91e6cda96190b43f65018c913ffa31f5346500d82842f6ebbd4e8af543734486`；
- ledger digest：`5b82b545a2c5b0cd5714342c1bdaca742f4de44e196cc32817e8310926850d0f`；
- 账内 preview：`be637b1e37ae92a9fd047af28d0117334405a39408dc470c766b7ddb8ab96954`；
- 当前实时 preview：`85e0a454c76bead4eac239a98a56b55fb662bcc77ff6f1e49e52ee2a6e65ea68`；
- owner decisions：`0`；
- 当前结果：`CURRENT_EXPECTED_MANIFEST_CHANGED`。

观察候选不得自动刷新 D0、伪造 owner decision、接受 4／11／8 漂移或生成新的 manifest authority。

## 中央 system registry 分账

保存 registry：

- raw：`19093 bytes / a81550320e25b5dc696eaa1e2490f93aaf3ccfc0e41a9fb1fa088ceddf434959`；
- registry digest：`a992d58ce2c98b5282ffafafb38e05c20c1d294e99b150674fdf01684f86097a`；
- 直接把保存 Bazi manifest 登记为 `current_domain_release_manifest`，但 builder 会先调用 Bazi current verifier，因此当前首先以 `MANIFEST_MISMATCH` 失败；
- 保存的 21 个 artifact lock 中另有 8 个 raw identity 已漂移；
- `authorityInheritanceAllowed=false`、`formalComparisonAuthorized=false`；
- 四体系正式准入、领域权威、release-ready 与公开授权均为 0。

registry 中的角色名 `current_domain_release_manifest` 只是历史记录字段，不得解释为保存 Bazi manifest 当前闭合。观察候选可输出 `21/8` 计数与当前失败码，不输出完整 registry、systems、artifact locks 或逐路径明细，也不得把 registry 作为 release parent brand。

## 独立体系与跨体系 receipt 分账

紫微与西洋独立 manifest 当前仍可分别通过其独立 verifier：

- 紫微 digest `ac8d05dbfe45846e1edbb277ce2e34f076a8e2c7e6adb8c57b75366d04c8eed7`，binding `0/27`；
- 西洋 digest `5c44fce96357ed80c4274f1f225151764ffe5998956e7e823764499ee45f993e`，binding `0/28`；
- 两个 manifest 的 JSON 与组件路径对 Bazi 的直接引用均为 0；
- 两者都是 `draft`，专家均 `0/2`，source／rights／expert／release gate 全红；
- 独立 verifier 通过不继承 Bazi 权威。

跨体系工程回执中的 Bazi `receipt=null`，状态为 `blocked_saved_manifest_not_current`。保存回执记录的 preview `8d1a11a1cf3c41f504777f4c7315dadbc6dfabb6df5731becf093d81f052e769`、当前 D0 账内 preview `be637b1e…` 与本轮实时 preview `85e0a454…` 是三个不同历史点位；当前回执 CLI 先因 D0 的 `CURRENT_EXPECTED_MANIFEST_CHANGED` 失败。观察候选可以输出这些关系的红态计数，不得把 registry、独立 manifest 或 receipt 导入为 release parent，也不得继承任何体系 authority。

## 五项 context capability 与零 parent authority

候选只允许登记五项 direct mechanical context／evidence private brand：DTT supersession（内部精确绑定 source `1.6`、rights `1.2` 与 supporting receipt）、readiness `1.7`、policy `1.1`、C-M1 `1.1`、D-intake `1.1`。PR10BC `1.1` 与 engineering-gap `1.1` 只作为 policy 链内的 transitive exact identity，不另计 direct brand／context capability。保存 manifest、preview、D0、registry、独立 manifest 与跨体系 receipt 是当前观察分账，不得被伪装成这五个品牌，也不等于 release parent。full loader 的最终公开投影必须保持：

- `verifiedMechanicalContextBrandCount=5`；
- `directLogicalParentArtifactCount=6`、`supportingReceiptArtifactCount=1`；
- `transitivePolicyClosureArtifactCount=2`，但两条 transitive identity 不另计 direct brand；
- `verifiedReleaseParentBrandCount=0`；
- `authorityInherited=false`；
- `activeAdmissionEffect=none`。

context capability 不能被调用方克隆、自重签或拼装成 private brand，也不能绕过保存 manifest 的 current verifier。

## CLI 窄输出与禁止项

CLI 从自身模块位置推导固定项目根，拒绝额外参数、可见 `NODE_OPTIONS` 与 loader／require 注入。成功只输出：

- 候选 identity 与相对 artifact tuple；
- `legacy-v13 / 13 / null`；
- saved current=false／`MANIFEST_MISMATCH`；
- 明确标注非权威的 current expected preview digest；
- `9` 个总组件、`5` 个未变组件、`4/11/8` 与四个 component ID；
- `5 context / 0 release parent brands / authorityInherited=false`；
- owner `0`、rebind／resign false；
- binding `0/12`、专家 `0/2`；
- content／expert／rights／release／public／expert-claims 全红；
- cross-file atomic、Schema 13 epoch、interval mutation 与 ABA 全红。

CLI 禁止输出完整 saved manifest、preview、D0、registry、独立 manifest、跨体系 receipt、组件文件表、逐文件 hash、来源／权利／专家账正文、exact quote、权重、物化内容、专家 PII／意见、绝对路径、cwd、stack 或 cause。失败只输出固定失败前缀与受限 code。

## 七账分离

| 账本 | 当前精确结论 |
|---|---|
| 工程证据 | 保存字节、非权威 preview、4／11／8 漂移和上下文红门可机械观察；不产生 rebind 或 release effect |
| 浏览器／运行时证据 | 未建立；未运行产品浏览器、PWA、Service Worker、正式仓储或公开主机 |
| 内容真值 | `not_established` |
| 专家真值 | `not_established`；现实专家 `0/2` |
| 来源／权利法律判断 | `not_established`；不证明作品层、版本层或载体层许可 |
| 发布就绪 | `false` |
| 公开发布授权 | `false`；`publicDeploymentAuthorized=false`、`expertClaimsAuthorized=false` |

观察端点不建立跨文件原子快照、Schema 13 mutation epoch、区间 mutation 排除或 ABA 排除。工程 candidate 通过不得外推成 manifest 当前、D0 owner acceptance、registry 闭合、跨体系准入、内容权威或公开发布授权。

## Owner 决策工作表（待填；不是授权）

本表锚定候选 `hakimi.bazi.domain-release-manifest.version-aware-observation-candidate/1.1.0`、candidate digest `be41925d72904e8eb90eea2b77f7de553f7c743d87fd975ae33fa99040571dc2`、raw SHA-256 `7768590bc117a229919bcd119a2bfada97d7e77712677947a2a650d6f518233d` 与非权威 preview digest `85e0a454c76bead4eac239a98a56b55fb662bcc77ff6f1e49e52ee2a6e65ea68`。当前所有行均为 `ownerDecision=null`；空白不是 `defer`，也不得由模型、自动规则或多数表决补值。若任一所列路径的字节再次变化，必须重新观察，不得沿用本表。

下表与上一节的四组 saved／current component digest 合并后，才构成每个槽位的完整 `(componentId, path, saved/current SHA-256, saved/current component digest)` 防错身份。它只证明保存 Manifest 已登记的同一路径具有不同的 saved／current SHA-256；不证明新增、删除、重命名、变化作者、归属或语义正确性。`D01`—`D11` 只是本文档的交互标签，不是候选中已经存在的正式 decision ID。

允许的 owner 决策只有：

- `accept_current_bytes_for_new_engineering_candidate_binding`：只接受该 component-file 当前字节进入一个新的 `engineering_candidate` 绑定；不接受领域语义、内容真值、来源可靠性、许可法律结论、专家真值或发布授权；
- `replace_or_restore_under_explicit_scope`：要求另行给出明确目标字节／hash、修改范围与执行授权；选择名称本身不授权模型猜测恢复源或直接覆盖文件；
- `defer`：显式保持该条不重绑，相关 current closure 继续失败关闭。

同一物理路径在不同组件中出现时仍是不同绑定槽位，必须分别作出决定。可使用 `D02,D07=...` 这种写法表达两个槽位的同一决定。

| ID | component | 相对路径 | saved SHA-256 | current SHA-256 | owner decision |
|---|---|---|---|---|---|
| `D01` | `fact_contract` | `packages/bazi-core/src/index.ts` | `73e0be8dbb2f40132158ee5dba26e493e18b686f9c888552c3e596c713301b2f` | `4c9b7fc5a16cbd3e3f5ca0bed90cd950b8ef3750f204427a332a6c1a1b4e7e7f` | `null` |
| `D02` | `source_bundle` | `content/system-admission/bazi-binding-freeze-requirements.v1.json` | `662c91e6269d5e860a0d207185680ea7c7b752f24e313859c0d987cb5b446201` | `1db59e2f7d3c5448f27b32d96bc8cf5a75968e8470dd0592d70594b44b3ec809` | `null` |
| `D03` | `source_bundle` | `scripts/audit-bazi-source-binding-candidates-live.ps1` | `36d6bd96467c345782d9c4d5862f0f9ef908c90feafc12490595b59e945fa6ae` | `fe15feff99df887e5810fce508cec4158edd9b19278797ff1943dd9300f0dd3d` | `null` |
| `D04` | `source_bundle` | `scripts/bazi-binding-freeze-requirements-lib.mjs` | `5c1292f18dd2ebdfe09dc2173f974cb38a6cbe888a783cd61c5e68d8dba9b4d5` | `ae56d0015f944a67eae3adf56186625568a32d090d5cfd18ca6eea5615402b59` | `null` |
| `D05` | `source_bundle` | `scripts/verify-bazi-binding-freeze-requirements.mjs` | `ed95324d1c973b0cc04391de5d75b200939cc636c80a1c7bdb106d3bc4aeaca1` | `e840e37febffae2f7e04b6d1722f1717b16e7410297410b459ceb308cf4eb681` | `null` |
| `D06` | `rights_bundle` | `apps/web/bundled-knowledge-audit.ts` | `8d38e0cbaebe477d5b66784b2814ea845c910962e29fdf9c52354b1fd3e9cd8e` | `13eb497173611862276fce6c16a9ff207778fa70e3a3eadd60296ae09a0503cb` | `null` |
| `D07` | `rights_bundle` | `content/system-admission/bazi-binding-freeze-requirements.v1.json` | `662c91e6269d5e860a0d207185680ea7c7b752f24e313859c0d987cb5b446201` | `1db59e2f7d3c5448f27b32d96bc8cf5a75968e8470dd0592d70594b44b3ec809` | `null` |
| `D08` | `rights_bundle` | `package.json` | `b8d8a31c3c4ae3669e196f0398288bf44284fdc1093ccbf6e510f8fcde0ca62c` | `cbce00529450c2c10086c2bac6749c0b7de79b69e2fcbe7bd14b940e030680ef` | `null` |
| `D09` | `rights_bundle` | `scripts/bazi-binding-freeze-requirements-lib.mjs` | `5c1292f18dd2ebdfe09dc2173f974cb38a6cbe888a783cd61c5e68d8dba9b4d5` | `ae56d0015f944a67eae3adf56186625568a32d090d5cfd18ca6eea5615402b59` | `null` |
| `D10` | `rights_bundle` | `scripts/verify-bazi-binding-freeze-requirements.mjs` | `ed95324d1c973b0cc04391de5d75b200939cc636c80a1c7bdb106d3bc4aeaca1` | `e840e37febffae2f7e04b6d1722f1717b16e7410297410b459ceb308cf4eb681` | `null` |
| `D11` | `high_risk_policy` | `scripts/bazi-expert-review-packet-lib.mjs` | `f8165c3b97e5a61bea333970c6f633a7b77418846458146442486b984af20812` | `76046086e4d4b49cd7166b548f4b6999fb208db020ed9b06e1cdefa90c2cd669` | `null` |

回复格式示例：

```text
D01=accept_current_bytes_for_new_engineering_candidate_binding
D02,D07=defer
D03=replace_or_restore_under_explicit_scope; target=<精确目标或 SHA-256>; scope=<明确范围>
```

只有在 11 个绑定槽位都取得可归属的显式 owner 决策，并且任何 restore 目标都已明确后，才可以另开独立阶段更新决策账。即使全部接受，也只可能重建一个仍为 `engineering_candidate` 的 Manifest；binding `0/12`、专家 `0/2`、权利／内容／专家／Release Evidence 红门及 `publicDeploymentAuthorized=false`、`expertClaimsAuthorized=false` 必须保持不变。

聊天中给出的逐项选择可作为决策输入和消息证据，但不能自动把现实 owner 身份、归属或签署权限标为已核验。后续新版本决策账必须把“收到自称 owner 的明确输入”“现实身份／权限已核验”“该字节语义已接受”分开记录。Manifest／专家包的 `manifestDigest`／`packetDigest` 只是 canonical JSON SHA-256；旧字段名中的 `resign` 不等于密码学签名或人的签章，后续动作应表述为重建并重算摘要。

## 定向验证

本轮已完成以下窄机械检查：

- full loader 对冻结 artifact 的 raw／semantic identity 校验通过，返回值具有本模块 private WeakSet brand；
- `node --check scripts/verify-bazi-domain-release-manifest-version-aware-observation-candidate.mjs` 通过；
- CLI 正常路径通过，并只输出本节约定的窄投影；
- CLI 对额外 argv 以 `CLI_ARGUMENTS_FORBIDDEN` 失败关闭；
- CLI 对可见 `NODE_OPTIONS` 以 `VISIBLE_NODE_LOADER_OPTIONS_FORBIDDEN` 失败关闭。

同层独立测试 `scripts/verify-bazi-domain-release-manifest-version-aware-observation-candidate.test.mjs` 为 `26819 bytes / ed514d8f6c5b3b3d0a56d464f3a9afb63efe14fb50dfd6d8898a722ca4fa033b`；实际结果 `19/19 PASS`、`0 skip`。它覆盖 full loader／private brand、prospective reproduction、保存 manifest 与旧 D0 分账、独立 `9/5/4/11/8` 重放、五 context brand／零 release parent、纯 verifier 不获品牌、自重签与 authority 红门、strict bytes、raw drift、固定路径、34 条唯一组件文件一次性稳定读取、区间替换、post-import intrinsic poisoning、CLI 三合同、旧消费者隔离与 LF closure。

最终修补完整 source／rights／receipt actual-to-actual tuple 与 pure verifier semantic pin 后，八文件 C／D／本候选组合链重新执行为 `226/226 PASS`、`0 skip`。最终独立红队复核关闭了先前的 self-reseal 与 partial-tuple 问题，结论为无剩余 P1／P2。

这些通过项只是本候选及其机械依赖链的工程证据。未执行全仓 typecheck、默认 Web build、浏览器、PWA／Service Worker、真实主机、部署或回滚验证。

## 首 slice 隔离

本候选首 slice 只允许新增独立 artifact、lib、CLI、test 与本文档。不得修改或导入旧 Bazi manifest builder／CLI、旧 D0、system registry、cross-system receipt、default Web、runtime、prebuild、C 阶段 candidate 或其他体系产品消费者。后续任何 rebind／resign 必须取得明确 owner decision，并作为独立阶段重新验证。
