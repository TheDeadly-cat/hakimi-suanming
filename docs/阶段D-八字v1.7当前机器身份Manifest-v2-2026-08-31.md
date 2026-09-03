# 阶段 D：八字 v1.7 当前机器身份 Manifest v2

日期：2026-08-31  
状态：当前字节机器身份已固定；`engineering_candidate`；不是专家审定、Release Candidate、中央体系准入或公开发布授权

## 结论

旧 `content/domain-release/bazi.single-chart-report.v1.7.0.json` 已与当前工作区闭包不一致；它继续原样保留为历史 predecessor，CLI 仍以 `MANIFEST_MISMATCH / exit 1` 失败关闭。本 tranche 新增独立 v2 机器身份：

- `content/domain-release/bazi.single-chart-report.v1.7.0.manifest.v2.json`
- manifest id：`hakimi.bazi.single-chart-report.domain-release-manifest/2.0.0`
- raw identity：`16,743 bytes / f5d7c2793f29a1b36e65c2cf087994bb2ed4be84e4fbb3d40e7ecdf13f6921c1`
- semantic manifest digest：`5236c63f4586e64a06e5d4304c7d40900d5ef6be41268e0b2d01ee4b566a5c80`
- frozen golden：`aba357d98a99271cc9a9b2727ad1c7c516424c94b7cf34f765cb38b0e9a74b29`

v2 把产品 `1.7` / surface `1.7.0` 映射到 10 个具名组件、31 个组件文件引用／25 个唯一文件的逐文件 raw bytes、SHA-256 和组件 digest。组件分别为：

1. execution rules；
2. interpretation rules；
3. input policy；
4. fact contract；
5. source bundle；
6. rights bundle；
7. expert review bundle；
8. expert review preconditions；
9. high-risk policy；
10. report contract。

这建立的是“当前工程字节对应哪个八字 v1.7 表面”的机器身份，不建立这些规则、来源、解释或表达的领域正确性。

## 当前 C／D 上游绑定

loader 在签发私有 branded 结果前，必须独立取得并核对三条现有机械上下文：

| 上下文 | v2 中的作用 | 准入效力 |
|---|---|---:|
| `hakimi.bazi.smt-v10-versioned-parent-supersession/1.0.0` | 固定 source `1.7.0` 与 rights `1.3.0` 配对及最新 C 线候选身份 | none |
| `hakimi.bazi.source-carrier-record-readiness/1.0.0` | 固定正式 SourceRights／SourceCarrier／materialization 均为零实例 | none |
| `hakimi.bazi.expert-review-intake-gap.version-aware-candidate/1.1.0` | 固定两席空缺、正式 packet 漂移和意见零实例 | none |

Manifest 明确保存：

- `bindingRequired=12 / bindingFrozenVerified=0`；
- `formal KnowledgeDocument / SourceRightsRecord / SourceCarrierRecord=0/0/0`；
- `independentExpertsRequired=2 / reviewerSlotsOccupied=0 / independentExpertReviewsVerified=0`；
- `sealedOriginalOpinions=0`；
- 当前 Binding readiness 不消费 source `1.7.0`／rights `1.3.0`，仍固定历史父账；SourceCarrier readiness successor 也不存在；
- source／rights／expert bundles 均不完整；
- high-risk policy 未获专家批准；
- `releaseCandidateFreezeAllowed=false`；
- `formalAdmissionPromotionBlocked=true`。

## 不覆盖历史红线

v2 不修改、不重签旧 manifest；predecessor 继续固定为：

- raw：`12,777 bytes / d63d80502c6186a66f2eabc4bd2749687978a8cfb22d420842aa4a9d6e0eccd6`
- semantic digest：`60711da42ebc71e1f23ec300dffd5ed44f418c9bcc83ee394bf106f7354dc932`

现有 v1.2 version-aware observer 也没有被冒充为当前：其本轮 CLI 因后续 `package-lock.json` raw identity 漂移以 `RAW_IDENTITY_DRIFT / exit 1` 关闭。正式 expert packet 仍因 packet／readiness binding 漂移 exit 1。中央 `system-admission-registry` 继续读取旧 Bazi manifest，当前 exit 1；cross-system engineering receipts 当前也 exit 1。v2 内精确写明：

```text
centralSystemAdmissionRegistryIntegrated=false
crossSystemEngineeringReceiptRegistryIntegrated=false
ownerAcceptanceForReleaseCandidateEstablished=false
```

因此本 tranche 没有把新机器身份偷换成中央准入，也没有借此让紫微、西洋或吠陀继承八字权威。

## 机械验证边界

新增 loader：

- 对 v2 manifest 本身固定 raw bytes、raw SHA-256 与 semantic digest；
- 使用 duplicate-key rejecting strict JSON parser；
- 对每个组件文件使用已有 held-handle stable reader，并固定 raw bytes／SHA-256；
- 对三个上游上下文要求不可伪造的私有 brand；
- 返回值递归冻结并由私有 WeakSet brand 标识；
- 拒绝 clone、自重签 authority promotion、未知字段、raw drift、重复键和 accessor digest 输入；
- writer 使用 `wx`，不能覆盖既有 v2 文件。

逐文件 held handle 仍不是跨文件原子快照。v2 明确固定：

```text
endpointSnapshotOnly=true
crossFileAtomicSnapshot=false
mutationEpochAvailableForSchema13=false
mutationEpochReceipt=null
intervalMutationExcludedAcrossFiles=false
abaExcluded=false
```

其中 v2 loader 的私有 brand 和 `reviewCycleEpoch`（如其他 draft 使用）都不能冒充 Schema 13 mutation epoch。

## 定向验证

- v2 专用：`14/14`；
- 显式 9-file 受影响闭包：默认并发 `392/392`；
- 同一 9-file 闭包：`--test-concurrency=1` 为 `392/392`；
- v2、SMT paired supersession、Binding readiness、SourceCarrier readiness、expert intake 和 release-governance CLI 均按各自预期收口；
- `npm run check:release-governance` exit 0。

显式闭包只覆盖 v2 Manifest 与其所列上游机械边界。它不是全仓 typecheck、全量测试、默认 Web build、完整应用、真实仓储、PWA／Service Worker、Chrome／Edge、公开 HTTPS、Release Evidence、部署或回滚验证。

## 分账

| 账本 | 本 tranche 的结论 |
|---|---|
| 工程证据 | v2 当前机器身份、组件摘要、上游私有 brand、失败关闭门可机械复验 |
| 浏览器／运行时证据 | 未建立 |
| 内容真值 | `not_established` |
| 专家真值 | `not_established`；现实专家 `0/2` |
| 来源／权利法律判断 | `not_established`；正式三层记录 `0/0`，Binding `0/12` |
| 发布就绪 | `false` |
| 专家宣称授权 | `expertClaimsAuthorized=false` |
| 公开部署授权 | `publicDeploymentAuthorized=false` |

默认治理继续固定为 `legacy-v13 / targetSchema 13 / migrationId null`。本 tranche 未执行 Git 操作，未读取或修改受限源码，也未运行全仓 typecheck 或默认 Web build。
