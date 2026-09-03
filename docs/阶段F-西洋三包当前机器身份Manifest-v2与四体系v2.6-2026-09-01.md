# 阶段 F：西洋三包当前机器身份 Manifest v2 与四体系 v2.6（2026-09-01）

## 0. 结论与分账

本轮按“先推进 C、D 或其他体系”的优先级，选择西洋体系的当前工程身份缺口，追加完成两项机械闭包：

1. 新增 Western three-package authored machine identity Manifest v2。它只对三个明确选定的草案 package roots 做真实递归枚举、逐文件稳定读取和 9 组件双向机器身份映射；共 70 个物理文件、152 个组件引用。
2. 新增 four-system current-status child v2.6。它只向 Western 当前 endpoint 集合追加上述 Manifest，并把 `currentEngineeringManifestMechanicallyVerified` 更新为 `true`；这里的 engineering 只表示三个选定 package roots 的当前机器身份。八字、紫微、吠陀与 v2.5 保持 canonical exact。

本轮没有新增浏览器运行，因而没有新增浏览器／运行时证据。也没有建立西洋完整工程闭包、完整 Domain Manifest、正式来源、内容真值、专家真值、权利法律结论、发布就绪或公开发布授权。

项目治理继续固定为：

| 字段 | 当前值 |
|---|---|
| project release identity | legacy-v13 |
| targetSchema | 13 |
| migrationId | null |
| Western product／release／schema／migration identity | null／null／null／null |
| mutation epoch receipt | null |
| cross-file atomic snapshot | false |
| interval mutation excluded | false |
| ABA excluded | false |
| publicDeploymentAuthorized | false |
| publicReleaseAuthorized | false |
| expertClaimsAuthorized | false |

## 1. Western Manifest v2 冻结身份

| 文件 | Bytes | Raw SHA-256 |
|---|---:|---|
| [artifact](../content/domain-release/western-astrology.engineering-draft.v0.1.0.manifest.v2.json) | 72,472 | a4ba9ca6504e5d386be5302c28a498d95b172a3904c5ddc5f90a8adcc5951f27 |
| [loader library](../scripts/western-independent-engineering-manifest-v2-lib.mjs) | 53,507 | 57aaebc14393fe8d7ff08a95e01cf948a8805f86c2b4421e938815da1514c41d |
| [verification CLI](../scripts/verify-western-independent-engineering-manifest-v2.mjs) | 3,770 | db1e80ed086e18828d61b88829a2fe31478ada8232d5dffcc453d30924c6739f |
| [adversarial tests](../scripts/verify-western-independent-engineering-manifest-v2.test.mjs) | 21,909 | eba29e61e5d288339d556042937b51ff853c96c709f1592005c11ce32c214f4b |

语义身份：

| 字段 | 值 |
|---|---|
| manifestId | hakimi.western-astrology.three-package-authored-machine-identity-manifest/2.0.0 |
| schemaVersion | 2.0.0 |
| manifestDigest | 4ed66eeae3d0f7a45dcb850a67dfb6407b695a2f6ecb58eac8b0dd1748db632d |
| activeAdmissionEffect | none |
| component count | 9 |
| component file references | 152 |
| unique physical paths | 70 |
| admission gates | 0/8 |
| frozen source bindings | 0/28 |
| independent expert reviews | 0/2 |

### 1.1 精确范围：三个选定 package roots，不是整个 Western 工程

loader 对下列三个根进行递归目录枚举，并把发现的普通叶文件集合与固定的 code-unit 排序清单 exact compare：

| package root | 当前纳入文件数 |
|---|---:|
| `packages/western-astrology-contracts-draft` | 6 |
| `packages/western-astrology-rules-preview-draft` | 24 |
| `packages/western-astronomy-engine-adapter-draft` | 40 |

合计 70 个物理路径。hidden、无扩展名、未知扩展名和普通新增目录均不能通过扩展 allowlist 或集合去重而消失。路径必须唯一、全局排序；文件采用 held-handle stable read，拒绝 symlink／junction／reparse、hardlink 和端点变化。

以下两个已知 Western 草案根明确在本 Manifest 范围外，且本 Manifest 不枚举、不验证其身份：

- `packages/western-civil-time-input-adapter-draft`
- `isolated-drafts/western-civil-time-fact-browser-draft`

因此 artifact 固定：

- `threeSelectedPackageRootsExact=true`
- `entireWesternEngineeringClosureEstablished=false`
- `currentFullDomainManifestMechanicallyVerified=false`
- `browserRuntimeEvidenceEstablished=false`

三个 package roots 直属的 15 个精确 runtime output／cache 路径可被排除，例如 `dist`、`node_modules` 和 `tmp`。排除只适用于 package-root 直属完整相对路径；`src/tmp/...`、`browser-app/dist/...` 等 authored tree 内同名目录仍会失败关闭。被排除的 runtime subtree 明确 `not inspected / not authoritative`，不能把 CLI 中的 `threeSelectedPackageRootsExact=true` 单独解释为整个根目录所有运行时字节均已受权威验证。

### 1.2 9 组件只是机器身份视图，不是领域语义证明

组件顺序固定为：

1. `execution_rules`
2. `interpretation_rules`
3. `input_policy`
4. `fact_contract`
5. `source_bundle`
6. `rights_bundle`
7. `expert_review_bundle`
8. `high_risk_policy`
9. `report_contract`

每个物理文件带有按上述业务顺序排列的 `componentIds`；每个组件也反向精确列出文件 identity。两边必须一一对应，不能通过 `Map`／`Set` 去重掩盖重复、缺失或错配。

152 个 component references 是 path／filename heuristic routing，用于观察同一物理文件向多个机械视图的 fan-out。它不等于 152 个独立语义依赖、152 次语义变化、完整 callgraph 或领域真值；artifact 固定：

- `pathNameHeuristicRoutingOnly=true`
- `semanticDependencyOrCallgraphEstablished=false`
- `componentMembershipEstablishesDomainTruth=false`
- `componentReferenceFanoutEqualsIndependentSemanticChanges=false`

### 1.3 current parent、历史 context 与私有品牌

唯一 current branded parent 是：

- `western-source-and-manifest-identity-drift-receipt-candidate.v1.0.0.json`
- 12,537 bytes
- raw SHA-256 `09feb585528a6d390afda19a10d967ff2356714cbb00d4eef3462fe267d01c26`
- receiptDigest `f422b6b1bd61e97631b5ce5719877d0e17525b18cdfd7cc7d1c3257e85884097`

loader 必须消费该 fixed-path full-loader 的 WeakSet 私有品牌，再读取三个 package roots。结构 clone、builder 返回值和 raw JSON 均不能取得 Manifest v2 的新品牌；只有 fixed-path persisted artifact 完成 raw／self／canonical／current rebuild exact 合取后才签发新品牌。

四个旧件只作为固定 raw＋self-digest 历史 context：Western source v1、nonformal v1.1、nonformal v1.2 和旧 Western engineering manifest。它们的 current full loader 仍分别失败为 `LEDGER_MISMATCH` 或 `MANIFEST_MISMATCH`；本轮没有重绑、重签或把旧件提升为 current formal source／manifest。

## 2. Four-system current-status child v2.6

| 文件 | Bytes | Raw SHA-256 |
|---|---:|---|
| [v2.6 artifact](../content/system-admission/four-system-current-status-observation-child.v2.6.0.json) | 18,673 | 7e82402069b9a761cd23a8d428b74f389754bd1e30654428fc5bd965bdf57dd5 |
| [loader library](../scripts/four-system-current-status-observation-child-v2-6-lib.mjs) | 34,759 | e226c73fec089cb29aee246622db8b6b8aab222e0bb8d44d260f0ee4021d4c5d |
| [verification CLI](../scripts/verify-four-system-current-status-observation-child-v2-6.mjs) | 3,462 | fb66994a72ae43427b52d0003bfcbe38774916d412d7ed07870affbaa9a5c820 |
| [adversarial tests](../scripts/verify-four-system-current-status-observation-child-v2-6.test.mjs) | 22,191 | 677dd8f830596f324aadcd6a64ef04078dc0e44c832865b15c0a576d0c56424c |

语义身份：

| 字段 | 值 |
|---|---|
| childId | hakimi.system-admission/four-system-current-status-observation-child/2.6.0 |
| childDigest | 72f9cb10f46025662730bd2a4d12c1d7ec8796109350358c815a97c492b07ee7 |
| direct parent | four-system current-status v2.5 |
| new direct input | Western three-package authored machine identity Manifest v2 |
| activeAdmissionEffect | none |

相对 v2.5，只允许 Western 发生以下投影变化：

- `currentStatus` 增加三个选定 package roots 的 current machine identity，同时继续写明 formal source 和历史 Domain Manifest stale；
- `currentEvidence.endpoints` 在既有 Western v1.1 observation 和 drift receipt 后追加新 Manifest endpoint；
- `currentEngineeringManifestMechanicallyVerified` 从 `false` 变为 `true`，但其范围必须同时读取为 `three_selected_package_roots_exact_not_entire_western_engineering_closure`；
- `currentFullDomainManifestMechanicallyVerified` 继续为 `false`；
- `browserRuntimeEvidence` 继续为 `not_assessed_by_this_child`。

八字、紫微、吠陀必须是 v2.5 canonical exact copy。四体系仍为 32 个 admission gates 满足 0；formally admitted、domain-authority authorized、release-ready、public-release-authorized systems 均为 0。

## 3. 聚焦验证

| 验证 | 结果 | 仅能证明 |
|---|---:|---|
| Western Manifest v2 focused tests | default 23/23；serial 23/23 | fixed-path brand、70-file exact enumeration、9 组件双向 identity、范围和全红边界、visible preload 校准 |
| four-system v2.6 focused tests | default 29/29；serial 29/29 | v2.5＋Western v2 双品牌、唯一 Western delta、三体系 exact copy、32 门全红 |
| 两个新 suite 合并串行 | 2 files / 52 tests | `--test-concurrency=1` 下的机械组合闭包 |
| 6 个新 `.mjs` 的 `node --check` | 6/6 | 两组 lib／CLI／test 语法闭合 |
| Western Manifest v2 CLI | exit 0 + 固定 OK prefix | exact persisted branded Western 三包机器身份摘要 |
| four-system v2.6 CLI | exit 0 + 固定 OK prefix | 校准后的四体系 current-status 摘要 |
| `npm run check:release-governance` | exit 0 | 默认仍为 legacy-v13／13／null；公开部署与专家授权仍关闭 |
| 独立红队 | 早期 3 类 P1／阻断被复现并修复；最终无剩余 P1/P2 | 列明枚举、排序、组件和排除路径反例已覆盖；不扩大到隐藏 runtime／OS attestation |

红队推动关闭的真实问题包括：

1. file paths 使用 code-unit 排序、`componentIds` 使用业务顺序时，初版错误地复用同一 comparator，导致当前 build 直接失败；现已拆分并分别固定。
2. 初版按任意深度目录名跳过 `tmp/dist/node_modules`，可使 `src/tmp/policy.ts` 永久漏出清单；现只允许 package-root 直属精确 runtime subtree 排除。
3. 初版的范围字段可能被理解为整个 Western engineering closure；现已更名为 three-package authored machine identity，并明确两个已知草案根不在范围内。
4. compact `-rfoo` 在本机 Node 由 runtime 自身先拒绝，测试现明确区分 runtime rejection 与 CLI 对受支持 `-r <module>`／`--import` 的 visible-preload guard，未把前者冒充后者。

这些测试、哈希和私有品牌只证明列明的工程机械关系。它们不是 Node／OS／launcher、浏览器、可信时间、领域专家、内容或法律 attestation。

## 4. Expected-red 与未执行项

本轮完成后，下列既有入口继续按设计失败关闭：

| 入口 | 当前实际结果 | 含义 |
|---|---:|---|
| Western source requirements v1.2 CLI | exit 1 / `LEDGER_MISMATCH` | nonformal successor 的旧 current loader 没有被重签或洗绿 |
| independent historical Domain Manifest aggregate | exit 1 / `MANIFEST_MISMATCH` | 旧 Ziwei／Western manifest 仍是历史身份，不是当前完整工程闭包 |

Western v1.1 version-aware observation CLI 继续 exit 0，但其自身明确 `browserRuntimeEvidenceEstablished=false`、`upstreamPrivateBrandCount=0`；新 Manifest 的 drift-receipt 品牌不能反向改写该历史事实。

本轮没有运行全仓 typecheck 或默认 Web build。既有阻塞仍位于受限的 `apps/web/src/lib/local-user-data-cleanup.ts`；按任务边界，本轮没有读取或修改该文件。也没有执行 Git、完整应用启动、PWA／Service Worker、公开主机、部署或回滚。

## 5. 仍需独立完成的现实闭环

- 28 条 Western binding 逐条冻结可靠底本、版本、正文、exact quote、作品层与载体层许可；当前仍为 0/28。
- 至少两名现实专家的身份、资质、独立性和原始意见并列保存；当前仍为 0/2，分歧不得由多数表决、平均或生成模型自动裁决。
- 补齐 Western civil-time adapter、isolated fact-browser draft 及其他 owner 选定产品范围，才能讨论整个 Western 工程闭包；本轮三包 Manifest 不能代替该决定。
- UT1／UTC、leap seconds、EOP、target center、ICRF、官方 JPL／Horizons bytes 与许可、真实领域复核等 strict-receipt 前置条件仍未建立；当前 `issued=false`。
- 完整应用、正式仓储边界、Chrome／Edge 产品矩阵、PWA／Service Worker、公开主机、Release Evidence、部署与回滚仍未完成。

八字 v1.7 frozen golden SHA-256 保持不变：

`aba357d98a99271cc9a9b2727ad1c7c516424c94b7cf34f765cb38b0e9a74b29`

