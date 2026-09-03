# 阶段 F：吠陀 parent 声明 57 路径 Manifest v2 与四体系 v2.7（2026-09-01）

## 1. 结论

本阶段只完成两项追加式工程身份工作：

1. 为吠陀建立一个可由固定路径 full-loader 复验的 Manifest v2。它只覆盖两个上游已经声明的路径集合：旧 Manifest v1 的 33 条路径，加上 same-artifact browser child 的 expected authored-build graph 24 条路径；两集合无重叠，共 57 条。
2. 以四体系 v2.6 为唯一父级建立 v2.7，只把吠陀 endpoints 的 index 1 从 Manifest v1 原位替换为 Manifest v2；endpoint 总数仍为 3，Bazi、Ziwei、Western 保持父级 canonical exact。

这不是吠陀目录完整闭包、吠陀全域 Manifest、正式产品身份、内容真值、专家审定、许可结论、发布就绪或公开发布授权。

发布治理继续固定为项目默认上下文 legacy-v13 / targetSchema 13 / migrationId null。吠陀自己的 productIdentity / releaseIdentity / targetSchema / migrationId 均为 null；项目默认上下文没有继承为吠陀产品身份。

## 2. 新增端点

吠陀 Manifest v2：

- [artifact](../content/domain-release/vedic-astrology.engineering-draft.v0.1.0.manifest.v2.json)
- [loader](../scripts/vedic-independent-engineering-manifest-v2-lib.mjs)
- [CLI](../scripts/verify-vedic-independent-engineering-manifest-v2.mjs)
- [tests](../scripts/verify-vedic-independent-engineering-manifest-v2.test.mjs)

四体系 v2.7：

- [artifact](../content/system-admission/four-system-current-status-observation-child.v2.7.0.json)
- [loader](../scripts/four-system-current-status-observation-child-v2-7-lib.mjs)
- [CLI](../scripts/verify-four-system-current-status-observation-child-v2-7.mjs)
- [tests](../scripts/verify-four-system-current-status-observation-child-v2-7.test.mjs)

既有父级没有被覆盖：

- [Vedic Manifest v1](../content/domain-release/vedic-astrology.engineering-draft.v0.1.0.manifest.v1.json)
- [Vedic same-artifact browser child](../content/system-admission/vedic-civil-time-same-artifact-browser-observation-child.v1.0.0.json)
- [four-system v2.6](../content/system-admission/four-system-current-status-observation-child.v2.6.0.json)

## 3. 吠陀 Manifest v2 的准确范围

### 3.1 57 是 parent-declared selected paths，不是目录枚举

Manifest v2 的 selected closure 只有：

- predecessor Manifest v1 declared paths：33
- browser child declared expected authored-build paths：24
- overlap：0
- selected unique paths：57

固定失败关闭字段：

- recursiveDirectoryEnumerationPerformed=false
- extraFileAbsenceEstablished=false
- entireFactBrowserDraftRootClosureEstablished=false
- entireTzdbCorePackageClosureEstablished=false
- entireVedicEngineeringClosureEstablished=false
- currentFullDomainManifestMechanicallyVerified=false

loader 复验两个上游 fixed-path full-loader 的私有品牌、persisted raw identity 和语义摘要；它不通过扫描目录证明“没有额外文件”。

### 3.2 已知反例路径单独记账

在制作本 Manifest 时，fact-browser draft root 可见 27 个普通文件：

- 其中 16 个进入 browser child authored graph；
- 4 个只属于 child evidence tooling：
  - playwright.same-artifact-evidence.config.ts
  - tsconfig.same-artifact-evidence.json
  - e2e/civil-time-browser-gate.spec.ts
  - e2e/same-artifact-summary-reporter.ts
- 另有 7 个既不在 authored graph，也不在上述 evidence-tool-only 集合：
  - README.md
  - vitest.config.ts
  - src/browser-fact-projection.test.ts
  - src/civil-client.test.ts
  - src/civil-time.test.ts
  - src/input-contract.test.ts
  - src/ui-format.test.ts

packages/tzdb-core 可见 8 个普通文件；child authored graph 只选 4 个，另有 4 个没有进入本次 selected identity：

- scripts/run-release-gate.mjs
- scripts/verify-artifact.mjs
- scripts/verify-artifact.test.mjs
- src/index.test.ts

这些 omission 清单是防止 scope laundering 的 authoring-time counterexamples；Manifest loader 明确不声称递归复验这些目录或 omission 清单的当前完整性。

### 3.3 组件分类主动收窄

最初设计曾提出 58 component references / 40 mapped paths / 17 attachments。独立红队发现，该方案会把 README、package/config、lockfile 或 mutation-epoch 实验 UI 过度解释为 input policy、rights bundle 或 report contract。

最终落盘口径降为：

- 9 个固定组件槽位
- 35 个启发式引用
- 26 个 mapped unique paths
- 31 个 engineering attachments
- 26 + 31 精确覆盖 selected 57

所有组件均固定：

- classificationMethod=path_name_and_file_role_heuristic_only
- semanticMembershipEstablished=false
- componentComplete=false

interpretation_rules 和 expert_review_bundle 为空并保持 absent。专家计划只可能是工程附件，不能冒充真实专家审查实例。

具体反洗白边界包括：

- civil-time/tzdb 只是一段实现切片，不是吠陀 ruleset；
- iana-2025b retained chunk 没有建立场景运行请求或 civil resolver 执行；
- input kernel 和 rejection evidence 不是正式 input policy；
- fact implementation/test evidence 不是事实契约完成或领域真值；
- source requirements/private package metadata 不是来源正文或 provenance；
- rights requirements 不是作品层、载体层许可证据，也不是法律结论；
- preview projection implementation 不是正式 report contract。

### 3.4 private package label 不是产品身份

Manifest 只观察到：

- package name：@hakimi/vedic-civil-time-fact-browser-draft
- version：0.0.0-draft.0
- private=true
- productionImport=forbidden
- formalAdmissionEffect=none

它同时固定：

- ownerAssignedProductIdentity=false
- packageLabelOrVersionIsProductIdentity=false
- product/release/schema/migration 全为 null

## 4. 浏览器证据仍是历史子账

Manifest v2 消费 same-artifact child 的私有品牌，但不重新运行浏览器：

- browserRuntimeEvidenceEstablishedByThisManifest=false
- manifestRerunsBrowserMatrix=false
- currentWorkspaceOutputInventoryEstablished=false
- historicalIssuanceOutputTreeOnly=true

child issuance 的有限事实仍为：

- Chrome 5 个 scenario outcome
- Edge 5 个 scenario outcome
- 合计 10/10
- isolated loopback、civil-time fact-only
- 不是 Web 主应用、PWA、Service Worker、公开主机或 production receipt

历史 output tree 的 12 条路径已精确拆成：

- scenario runtime paths：4
- evidence-only body probe paths：1
- neither scenario requested nor evidence probed：7

因此“同一 output-tree identity 供两浏览器使用”不得被误读为 12 个输出文件都被场景请求。retained iana-2025b chunk 只由 evidence-only probe 观察；scenario runtime requested 仍为 false，civil resolver execution 仍未建立。

## 5. 四体系 v2.7 的唯一变化

v2.7 的 direct bindings 恰为：

1. four-system v2.6 fixed-path full-loader 私有品牌；
2. Vedic Manifest v2 fixed-path full-loader 私有品牌。

Vedic 投影：

- current status：父级原文保持不变
- browser runtime evidence：父级 isolated fact-only 10/10 原文保持不变
- currentEngineeringManifestMechanicallyVerified：true -> true
- currentFullDomainManifestMechanicallyVerified=false
- endpoints：长度 3；index 0 canonical exact，index 1 v1 原位替换为 v2，index 2 canonical exact

它不是 endpoint append，也不是 engineering flag 从 false 晋级为 true。lineage 使用 ReplacedFromV1ToV2 和 FlagRemainsTrue 语义。

Bazi、Ziwei、Western 均为 v2.6 canonical exact copy。Western 和 Vedic 的 engineering flag 为 true，但各自只表示各自受限 Manifest 的机械当前性；两者都不是 full-domain。

四体系总账继续：

- admission gates：32 required / 0 satisfied
- systems formally admitted：0
- systems domain authority authorized：0
- systems release ready：0
- systems public release authorized：0
- mutation epoch：无
- cross-file atomic snapshot：false
- interval mutation excluded：false
- ABA excluded：false

CLI summary 将项目上下文与吠陀产品身份分名：

- projectDefaultActiveLine=legacy-v13
- projectDefaultTargetSchema=13
- projectDefaultMigrationId=null
- vedicProductReleaseIdentity=null
- vedicProductTargetSchema=null
- vedicProductMigrationId=null

summary 不再暴露会混淆两账的裸 releaseIdentity / targetSchema / migrationId。

## 6. 冻结身份

### 6.1 Vedic Manifest v2

| 文件 | bytes | SHA-256 |
|---|---:|---|
| artifact | 47,107 | ad69843f8e9ec9f1f3f5a446c2107389753100fe371fdbcef7202cbdb39639c4 |
| loader | 50,792 | d6e3d88b91876a25ea5ee8c4d17d80d67c75f71406ef8093df66b5f640b9372c |
| CLI | 3,558 | 6c470feae1713d5ae749c346e249bec698b3e69250ce3de2904abeca480857a1 |
| tests | 17,762 | 91d10cad22739c693b125d469a27aea082006cf9ee3c233d63ec502fb87e5ea9 |

- manifestId=hakimi.vedic-astrology.parent-declared-selected-path-machine-identity-manifest/2.0.0
- manifestDigest=7d4fcf50e4fdfa513611ace4331abf2079b1faf433f0a1c58e60603a9584a347
- selectedPathSetDigest=381c34d72ff0de55ccdba8a9690d8f1cf3184a303865c3419ebdbc8fd163e20c

### 6.2 four-system v2.7

| 文件 | bytes | SHA-256 |
|---|---:|---|
| artifact | 18,697 | 93e4b0487974d6b4b11312eaec7ee4e759a3af603e67389891bba31a42df4307 |
| loader | 36,316 | 147a0782077db672889d39325836edcfafce091f098f6e97778a0f926ae41079 |
| CLI | 3,334 | d8b8deb6ad4dfe31c45673a2d12cd8e3f2ad46767da18356554e923460a0c47f |
| tests | 26,148 | 71b39609cba62d6b937b3320b3e86d4c457bf75b48f76fdd751aa65ddac2f1b3 |

- childId=hakimi.system-admission/four-system-current-status-observation-child/2.7.0
- childDigest=2dde1ccaf92d3437da13dc0ebcd2153fa11724b0be5bfed832ba519b9d5b9637

## 7. 验证账

最终文件状态上的验证：

- Vedic v2 default：23/23
- Vedic v2 serial：23/23
- four-system v2.7 default：30/30
- four-system v2.7 serial：30/30
- 两文件 combined serial：53/53
- 6 个新增 .mjs：node --check 6/6
- 两个 CLI：exit 0
- npm run check:release-governance：exit 0
  - default release line：legacy-v13
  - target schema：13
  - migration id：null
  - publicDeploymentAuthorized=false
  - expertClaimsAuthorized=false

独立红队先后发现并关闭：

1. 两份候选组件映射都存在语义抬升风险，最终改用更保守 35/26/31 分类；
2. output 12 没有拆分 4/1/7，可能被误读为全部被请求；
3. four-system v2.7 初稿含 v2.5/Western 克隆残留，包括错误的 three-package、append/raised 和重复 system id；
4. CLI summary 曾把项目 legacy-v13 上下文命名成裸 releaseIdentity；
5. v2.7 CLI 的 non-literal dynamic import 被 draft-boundary checker 识别，最终改为 literal dynamic import。

最终两层独立红队均报告无剩余 P1/P2。

### 7.1 仍保持红色的仓库级检查

npm run check:system-contract-draft-boundaries 仍 exit 1。当前输出是既有仓库阻塞集合，包括：

- apps/web/src/lib/local-user-data-cleanup.ts 被 checker 标记为 known restricted source 且未检查；
- 既有 Western live audit、Bazi expert packet、v2.5/v2.6 CLI 和若干既有测试的注册或 non-literal dynamic import 问题。

最终输出中已不再包含本阶段新增的 v2.7 CLI。这个结果不是本阶段通过线，也没有读取或修改受限文件。

node scripts/verify-independent-domain-release-manifests.mjs 仍按预期 exit 1：

- MANIFEST_MISMATCH
- 首个报告对象为 stale Ziwei domain manifest

因此，本阶段没有把 Vedic v2 或 four-system v2.7 冒充当前全体系正式 domain manifest。

## 8. 未建立事项

本阶段明确没有建立：

- 递归目录完整闭包、extra-file absence 或整个 Vedic engineering closure；
- Vedic full-domain manifest、正式输入/事实/规则/报告契约；
- Vedic 内容真值、来源正文/exact quote 冻结、作品层或载体层许可结论；
- 真实专家身份、资质、独立性、两份意见或专家真值；
- 当前浏览器重跑、Web 主应用、PWA、Service Worker、公开主机或 production runtime evidence；
- storage/backup/recovery/rollback 产品实现；
- mutation epoch、跨文件原子快照、区间完整性或 ABA 排除；
- release evidence、发布就绪、部署/回滚确认或公开发布授权；
- Bazi v1.7 权威向 Vedic、Western 或 Ziwei 继承。

全仓 typecheck 与默认 Web build 没有运行。已知受限阻塞文件继续未读、未改。

## 9. 后续独立通过线

后续若继续吠陀，至少仍需分别完成：

1. owner 明确的产品身份和正式输入/事实/规则版本；
2. 38 条 source binding 的可靠底本、exact quote、作品层与载体层权利依据；
3. 不可再分发材料的 private/link-only 边界；
4. 两名真实、独立、资质可核验的吠陀专家意见及分歧并列保存；
5. 正式高风险表达边界；
6. 当前源图上的独立 Chrome/Edge/PWA/Service Worker/公开主机证据；
7. Release Evidence、部署和回滚确认；
8. 明确 owner admission decision 与公开发布授权。

这些通过线彼此独立，不能由本次 hash、测试、历史浏览器 10/10 或四体系聚合观察相互兑换。
