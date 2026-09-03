# 阶段 C：engineering value-subject gap 版本感知候选 v1（2026-08-30）

## 结论

本切片新增独立的 engineering value-subject gap v1.1 候选 capability。它内部消费 PR10BC v1.1 与 candidate readiness 1.7 的两个私有 WeakSet 品牌，并在 14 项未变工程 basis 的当前 raw identity 精确匹配后，复用历史 gap 已冻结的七条 engineering binding／33 个 value-subject 投影。

这不是重新执行历史 AST／producer-consumer extraction，也不是把历史 gap 原位修成 active。它只证明固定 raw／semantic tuple 下，scope 与 readiness 两个候选父账已重绑，历史工程缺口投影仍对应相同工程字节；不建立 value freeze、平行 binding、正式准入、内容／专家／权利真值、运行时证据、发布就绪或公开发布授权。

## 历史账与当前旧失败

历史账继续固定为：

- path：`content/system-admission/bazi-engineering-binding-value-subject-gaps.v1.json`
- raw：`52073` bytes
- raw SHA-256：`5c7a999738200b55f5e3e79a3ff7b2c73f59d8af61846046d26ea1e31987c4c0`
- ledger ID：`hakimi.bazi.engineering_binding_value_subject_gaps/1.0.0`
- ledger digest：`7a03874b6009928367bf8c5aa60a1312d519d0f8c4ee339c83bc7a40f0b8e81d`

历史工件的 16 项 basis 中，当前唯一 raw 漂移是旧 readiness 同路径从保存的 `26038 / 662c91e6269d5e860a0d207185680ea7c7b752f24e313859c0d987cb5b446201` 变为 `30655 / 1db59e2f7d3c5448f27b32d96bc8cf5a75968e8470dd0592d70594b44b3ec809`；其余 15 项当前仍匹配。旧 builder 先被旧 PR10BC verifier 阻断，因此当前旧 gap CLI 为 `LEDGER_MISMATCH`，tests 为 `9/11`。这些失败没有被改写或冒充为通过。

## 新候选身份与父账

新增工件：`content/system-admission/bazi-engineering-binding-value-subject-gaps.v1.1.0.json`

- `schemaVersion=1.1.0`
- `recordType=bazi_engineering_binding_value_subject_gap_version_aware_candidate_v1_1`
- ledger ID：`hakimi.bazi.engineering_binding_value_subject_gaps.version-aware-candidate/1.1.0`
- status：`candidate_only_version_aware_value_subject_gaps_open_no_binding_created`
- raw：`71168` bytes
- raw SHA-256：`f8ed780ce8e3fbaca59b295faff2f12b939a8b0c193bc0c20ce1198690528d4e`
- ledger digest：`d578b6e76c325bf79593b728b78035d3481ec60fa7fb99c815748d9f806a8330`

两个直接品牌父账为：

1. PR10BC v1.1：`38161` bytes；raw SHA-256 `edb367448f857972e50c735e86acc5252605a0b4d27a2f85c996fcd67d0ed2cc`；ledger digest `24851de28a762c426e2630c9a52666786274c3c5477b9fc0463f9129e43d20d1`。
2. candidate readiness 1.7：`32629` bytes；raw SHA-256 `7565a1c1ae51c09c78cf8f906e544bd8ee822020f76587237bc909ef1e6408a2`；ledger digest `afdebfa1fb7a797f02d136373eb9aef1afa26b38b755926f8930ea5de97316b8`。

loader 不接受 caller JSON、caller path、caller dependency result 或可注入 options。除了品牌和 raw／semantic identity，它逐字段锁定 PR10BC 的 `12 / 7 / 4 / 1` inventory、DTT 三处引用／一个唯一父身份、`link_only`、candidate notice `1`、active block `1`、candidate block `0`，以及 readiness 的 `0/12` 和全部 authority／epoch 红门。

## 精确 transform

新账仍精确包含 16 项 basis：前两项替换为 PR10BC v1.1 与 readiness 1.7；历史第 3–16 项的 path、role、bytes 和 SHA-256 逐字段不变，并在本次 load 中重新做 point-in-time raw identity 核对。

以下投影与历史逐字段相同：

- release governance；
- 12 条 current binding inventory 与 `7/4/1` 分账；
- 7 条 engineering binding；
- 33 个 value-subject、value-subject boundary 与 cross-binding gaps；
- 历史 gate 的全部原字段；
- `valueSubjectsFreezeEligible=0`、`bindingFrozenVerified=0`；
- formal rights／carrier、独立 engineering/domain review 均为 0；
- formal activation、内容真值、专家真值、法律结论、浏览器证据、release ready、public deployment 与 expert claims 全为 false。

附加 candidate-qualified 元数据明确记录 `bindingInventoryChanged=false`、`parallelBindingsCreated=0`、`activeAdmissionEffect=none`、`formalAdmissionPromotionBlocked=true`。历史 projection 的措辞是 `historicalValueSubjectProjectionReusedAfterRawIdentityMatch=true`，不是“重新重现”或“重新审定”。

## 完整性边界

历史 gap raw／semantic identity、14 项未变 basis 与两个品牌父账分别核验；没有共同 mutation epoch。本层不把上游 verifier 的 same-buffer 性质当作传递证明，也没有重新声称直接 AST 解析：

- `nestedVerifierSameBufferTransitivityClaimed=false`
- `stableExecutableSyntaxProjectionReusedAfterRawIdentityMatch=true`
- `endpointSnapshotOnly=true`
- `crossFileAtomicSnapshot=false`
- `mutationEpochAvailableForSchema13=false`
- `mutationEpochReceipt=null`
- `intervalMutationExcluded=false`
- `abaExcluded=false`

新结果使用第四个独立 WeakSet 品牌。clone、自重封 plain object、test-only builder 结果与历史账均不能取得品牌。所有直接 raw-bound 文本路径均通过 `.gitattributes` 固定 `text eol=lf`，并由测试核对 checkout 闭包。

## 机械验证

入口固定身份：

- `scripts/bazi-engineering-value-subject-gap-version-aware-candidate-lib.mjs`：`22577` bytes；SHA-256 `b27b3fe2b743368ec9a47964fe23caa2870b27e15b1ccbec5e432f332bf1cb85`
- `scripts/verify-bazi-engineering-value-subject-gap-version-aware-candidate.mjs`：`2968` bytes；SHA-256 `79d7f4fc7289150866557e8f61a57c31e93299a3d317d06994916d60953353f2`
- `scripts/verify-bazi-engineering-value-subject-gap-version-aware-candidate.test.mjs`：`29598` bytes；SHA-256 `87c61aedcfc4b211bbfda761a011c3ccf3909814ac2b0237bdbadc8ebd09092a`

结果：

- 新 gap v1.1 定向 tests：`26/26`
- 新 PR10BC 与新 gap 合并：`51/51`
- CLI exit `0`，前缀为 `BAZI_ENGINEERING_VALUE_SUBJECT_GAP_VERSION_AWARE_CANDIDATE_MECHANICS_OK`

攻击覆盖 raw whitespace、BOM、非法 UTF-8、literal／escaped duplicate key、hardlink、历史 gap／PR10BC／readiness／任一未变 basis 漂移、clone／自重封／test-only brand 冒充、value freeze／authority／epoch／atomicity／ABA 正向伪造、post-import builtin 与 Array slice poisoning、fs clean-clone／Hash／FileHandle hiding、合法 decoy／caller injection、LF checkout 闭包和旧 policy weights／C-M1／默认 consumer 隔离。

## 下一步与仍分开的账

旧 policy weights 和 C-M1 尚未重签；四个旧下游合并仍为 `52/67`。下一 C 切片应新增 policy weights 的 version-aware candidate，内部要求本 gap v1.1 私有品牌，并保持所有 weights 仍是 repository-authored engineering candidate、没有来源逐值真值或专家审定。随后再新增 C-M1 version-aware candidate。任何一层都不能把 candidate brand 写成 active/default admission 或中央发布闭包。

本切片没有执行 Git 操作、全仓 typecheck、默认 Web build、浏览器／PWA、公开主机、Release Evidence、部署或回滚验证；受限 `apps/web/src/lib/local-user-data-cleanup.ts` 未读取、未修改。默认治理继续固定 `legacy-v13 / targetSchema 13 / migrationId null`，`publicDeploymentAuthorized=false`，`expertClaimsAuthorized=false`。
