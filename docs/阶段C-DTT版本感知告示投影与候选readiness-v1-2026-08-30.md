# 阶段 C：DTT 版本感知告示投影与候选 readiness v1（2026-08-30）

## 结论

本切片把已冻结的 DTT 成对版本化 source／rights candidate parent 与 supersession receipt 接入一条**独立、候选态、失败关闭**的 C-L3 v2 和 readiness 1.7 机械链。它只证明固定 raw／semantic tuple 下，SSID、CADAL 与 Wikisource work notice 的候选投影已被分别记录；不建立告示适用性、法律结论、正式 parent、正式准入、Binding freeze、内容真值、专家真值或发布授权。

旧 C-L3 v1、旧 readiness 1.6、通用 source／rights verifier、旧 WeakSet 品牌、旧 active/default consumer 与根 lifecycle 均未放宽、未改写、未重签。新 readiness 使用候选专用 `recordType` 与 ledger ID，不能凭 shape 或 digest 冒充旧 active readiness。

## 固定输入

- source candidate parent 1.6.0：`50427` bytes；raw SHA-256 `62f6a68b99246a802bcf2055aa09a8ac8113df37a7ede1c55d8a2ea64deaea98`；ledger digest `6f008058b282613fd131344206b27fccb1d80596bb49789f0554acdd69c1e44c`；DTT candidate digest `2c59ee25081c6e0a88ee7f9da18395be2ea615bb289c28798e324e23befeeb59`。
- rights candidate parent 1.2.0：`23947` bytes；raw SHA-256 `678632a8875672f58bb5c9f1ec4a299a4f0c6e750b8ff4a02bfe4df889e1243a`；ledger digest `300e092c4913885cff626221b8734786128639c7d6cfd7c2be7bea2acc6bbefc`；DTT rights candidate digest `674a0b64179f5fbb0dff331fdad6b6ac93e3093de4a8459abf6ff9bdd6cd418c`。
- supersession receipt：`9229` bytes；raw SHA-256 `aa9e62089990d8ba699c441114914173141e8228f027605b47f5c5e238fac0e3`；digest `601b4e07b94e62b73812a7a26f1108a094272dca660a188bb660fa860f031264`。
- 历史 C-L3 v1、readiness 1.6 与 source 1.5／rights 1.1 身份继续原样保留；历史工件没有 backlink，也没有原位 mutation。

专用 consumer 每次从同一个 primitive `workspaceRoot` 内部加载 supersession，并要求私有 WeakSet 品牌及上述全部字面固定 tuple。它不接受 caller JSON、caller path 或外部传入的“已品牌化 dependency”。

## C-L3 v2

工件：`content/system-admission/bazi-dtt-notice-reconciliation.v2.json`

- `schemaVersion=2.0.0`
- `recordType=bazi_dtt_notice_reconciliation_overlay_v2`
- `reconciliationId=hakimi.bazi.dtt-notice-reconciliation/2.0.0`
- raw：`8881` bytes
- raw SHA-256：`e2656a19955db0ce908df88aa696cd40847e7536af58c79548ac1fbce9a7464b`
- reconciliation digest：`2a47fc6fe281a4362c36dfc67c2a6dee195b5b069065ffc0e86ac1afcd7aa8a0`

允许为 true 的仅是候选投影字段：

- `candidateParentPairVersionedSupersessionReceiptComplete`
- `candidateNoticeProjectionCorrected`
- `candidateNoticeProjectionReconciliationPassed`
- `candidateNoticeProjectionDiscrepancyResolved`

同时保持：

- `noticeApplicabilityEstablished=false`
- `rightsLegalConclusionEstablished=false`
- `candidateNoticeDiscrepancyPromotionBlocked=false`
- `formalAdmissionPromotionBlocked=true`
- `promotionBlocked=true`
- `activeAdmissionEffect=none`
- `distributionPolicy=link_only`
- formal rights／carrier records `0/0`
- Binding freeze `0/12`

投影枚举严格分层：source SSID 为 `commons_pd_scan_top_level_notice_observed_not_adjudicated`，source CADAL 为 `commons_pd_old_top_level_notice_observed_without_pd_scan_template_not_adjudicated`；rights work 为 `rendered_pd_old_dependency_observed_not_oldid_main_slot_literal`，rights SSID／CADAL 分别为对应的 `...not_adjudicated` rights 枚举。Public Domain Mark 不被当作 license，marker authority、applicability 和 legal conclusion 均未建立。

## 候选 readiness 1.7

工件：`content/system-admission/bazi-binding-freeze-requirements.v1.7.0.json`

- `schemaVersion=1.7.0`
- `recordType=bazi_binding_freeze_version_aware_candidate_readiness_v1_7`
- `ledgerId=hakimi.bazi.strength.binding-freeze-candidate-readiness/1.7.0`
- raw：`32629` bytes
- raw SHA-256：`7565a1c1ae51c09c78cf8f906e544bd8ee822020f76587237bc909ef1e6408a2`
- ledger digest：`afdebfa1fb7a797f02d136373eb9aef1afa26b38b755926f8930ea5de97316b8`

九项候选 basis 是五项未变工程／专家／注册表／合同／knowledge 工件，加新版 source、rights、C-L3 v2 与 supersession receipt。12 条 binding 中只有 DTT 第八条 candidate ID 从 v1 换为 v2；其余 11 条逐字段不变。候选投影 reconciliation 为 `1/1`，候选投影 discrepancy block 为 `0`；旧 active reconciliation 字段继续为 `0` 且 active discrepancy block 继续为 `1`，正式准入阻断为 `1`。所有 source body、exact quote、work／edition／carrier identity、rights evidence、现实 reviewer、domain review、expert review 与 freeze 数量继续为 0；三个 bundle、release ready、public deployment 和 expert claims 全部为 false。

该 loader 只从同一 workspace root 内部加载 C-L3 v2，并要求本模块私有 C-L3 v2 WeakSet 品牌；readiness 自身使用另一私有品牌。clone、自重封 plain object、test-only projection、旧 C-L3 品牌、旧 readiness verifier 和两个品牌交叉使用均被拒绝。

## 完整性边界

专用 reader 复用 supersession 层捕获的 `open/lstat/realpath/createHash`、held-handle `maxBytes+1` 有界读取、pre／handle／post endpoint 与目录链核对，以及 duplicate-key rejecting strict JSON parser。每个文件只形成各自 point-in-time exact match；没有共同 mutation epoch，因此以下全部保持：

- `crossFileAtomicSnapshot=false`
- `mutationEpochAvailable=false`
- `mutationEpochReceipt=null`
- `intervalMutationExcludedAcrossFiles=false`
- `abaExcluded=false`

raw／semantic digest 都是 checksum，不是数字签名。固定 digest 相等不证明文件在同一原子时点共存，也不产生 currently-active 或正式 admission 身份。

## 机械验证

入口：

- `scripts/bazi-dtt-version-aware-readiness-lib.mjs`：`34665` bytes；SHA-256 `4c907822bfb3fb719416268c8de5752ee74c6d67cc5f4b5d97edac130efc60c7`
- `scripts/verify-bazi-dtt-version-aware-readiness.mjs`：`1748` bytes；SHA-256 `517444e79398d1de6130f58e5b43d0cf8643f8118c880145e380499b11154845`
- `scripts/verify-bazi-dtt-version-aware-readiness.test.mjs`：`20086` bytes；SHA-256 `530c6d69d06936dc123e5477c1dcadf7e3b24d3a656aaa158f6bfcbd4b68460a`

结果：

- 新 version-aware candidate tests：`23/23`
- 与旧 C-L3、旧 readiness、supersession tests 合并：`95/95`
- candidate CLI exit `0`，前缀为 `DTT_VERSION_AWARE_CANDIDATE_READINESS_MECHANICS_OK`，并显式输出 `activeAdmissionEffect=none`、active block `1`、candidate projection block `0`、formal admission blocked、`0/12` 与全部 epoch／authority 红门。

攻击覆盖包括 old/new source 与 rights 混配、receipt 漂移、clone／自重封、两个新品牌交叉、旧品牌／旧 gate 误接、raw-only reformat、duplicate／escaped duplicate key、hardlink、builtin 与 fs redirect、authority／freeze／epoch／atomicity／ABA 正向伪造。旧通用 source／rights verifier 继续拒绝新版 envelope。

## 未接入与后续

本切片有意不把新 candidate capability 接入 `prebuild`、`pretest`、`pretypecheck`、旧 active readiness、专家包、domain manifest、system registry、cross-system receipt 或四个下游。静态测试覆盖这些 shape／digest-only 消费面，确认当前未导入新模块或新路径。

四个下游当前仍按原红门失败，未被重签：

- PR10BC CLI：`LEDGER_MISMATCH`；tests `10/11`
- engineering value-subject gap CLI：上游 `LEDGER_MISMATCH`；tests `9/11`
- policy weights CLI：`PARENT_LEDGER_DRIFT`；tests `14/22`
- C-M1 CLI：`BASIS_ARTIFACT_IDENTITY_MISMATCH`；tests `19/23`
- 合并：`52/67`

下一 C 切片必须使用新品牌创建各自新的、候选专用版本，按 PR10BC → engineering gap → policy weights → C-M1 顺序重绑；不能原位改写历史工件，也不能借重算 hash 把旧 active/default／中央闭包洗绿。

本切片没有执行 Git 操作、全仓 typecheck、默认 Web build、浏览器／PWA、公开主机、部署或回滚验证；受限 `apps/web/src/lib/local-user-data-cleanup.ts` 未读取、未修改。`legacy-v13 / targetSchema 13 / migrationId null`、`publicDeploymentAuthorized=false`、`expertClaimsAuthorized=false` 保持不变。
