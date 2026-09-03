# 八字阶段 C：精确材料 Tuple 候选准入 v0.1（2026-08-31）

## 当前结论

新增独立、默认无人消费的候选包：

- `packages/bazi-stage-c-material-admission-candidate`

该包解决的是 Stage C 的机械替换风险：不能再只按 `evidenceSubjectId` 找一条 Citation，也不能只凭作品／版本层 SourceRights 得出可再分发结论。它不会修改或接入 single-chart-report v1.7，不会改变 `legacy-v13 / targetSchema 13 / migrationId null`，也不会产生真实准入授权。

包的 `exports` 为空，当前 apps 和其他 packages 对包名的生产引用为 0。当前根 `package-lock.json` 已登记该本地 workspace link 与自身依赖投影；本轮在禁止 Git 的边界内只确认当前快照一致，不声称历史差分范围。离线 `npm ci --dry-run --ignore-scripts` 通过，运行前后 lockfile SHA-256 不变。

## 精确 Tuple

候选 tuple 至少锁定：

- registry projection/content version；
- `bindingId + evidenceSubjectId + sourceId` reference；
- registry resolved binding 的 `exactLocator.kind/value/verificationStatus/contentSha256` 与 resolved source 的 URL、stable revision、verification status；
- Citation `id + editVersion + canonicalRecordDigest`；
- Citation document id/hash、section/line locator、raw UTF-8 quote SHA-256、targetKeys digest；
- KnowledgeDocument `id + contentHash + editVersion + canonicalRecordDigest`；
- SourceRights document id/hash、editVersion 与 canonical record digest；
- SourceCarrier `carrierId + document id/hash + contentDigest + editVersion + canonical record digest`；
- bundle path；
- 完整 tuple digest。

`expectedTupleDigest` 只是调用方必须提供的一致性比较值。当前代码能够检出同一 evidence subject 下替换 Citation id、review note、editVersion、SourceRights、SourceCarrier 或 bundle path，但不能证明该 digest 来自独立 issuer、receipt 或外部冻结锚；因此固定输出 `externalTuplePinVerified=false`。真正的外部冻结仍需另建独立信任锚。

当前 registry 的 `exactLocator.contentSha256=null`，且没有从 registry chapter-heading locator 到 KnowledgeDocument section/line/quote 的独立映射。因此 tuple 会捕获两侧身份，却固定输出 `bindingCitationLocatorLinked=false`；不能把 Citation 在自有文档内的 exact quote 校验外推成 registry locator 已与该材料机械对齐。

## 机械校验顺序

1. 在首个异步摘要前同步捕获普通声明数据，拒绝 getter、Symbol、循环、稀疏数组、`undefined`、自定义／null prototype 和超限输入。
2. 严格解析 KnowledgeDocument、Citation、SourceRights 和 SourceCarrier 当前 schema。
3. 用当前 Bazi registry 精确确认 binding → subject → source reference，并把 resolved locator/source identity 纳入 tuple。
4. 用 KnowledgeDocument 的实际正文重新核对 content hash、sections、Citation locator 与 exact quote。
5. Citation 必须为 `verified`，并且只含一个、且恰好匹配该 binding 的 evidence-subject target。
6. document、rights、carrier 必须共享完全相同的 document id/hash。
7. 必须实际调用三层 `isRedistributableSourceMaterial`，再调用 `validateBundledKnowledgeRelease`；不允许以 rights-only gate 替代。
8. 重新计算 record digests、quote digest、tuple digest 与 candidate digest，只核对调用方给定 digest 一致性。

SourceCarrier 的 canonical digest domain 与现有 `hakimi.knowledge.source-carrier-record.canonical.v1` 对齐，避免同一正式载体出现两套并行机械身份。

## 永远保持为红的 schema 13 边界

当前候选包不提供 registry locator → Citation material link、独立 tuple pin issuer 或 mutation epoch capability issuer，并同步拒绝调用方用普通 JSON 对象伪造 capability。即使材料层结构门通过，输出仍固定为：

- `authorityEffect=none`；
- `bindingCitationLocatorLinked=false`；
- `callerProvidedTupleDigestMatched=true`（仅在 digest 相等时）；
- `externalTuplePinVerified=false`；
- `materialLayerStructuralGatesPassed=true`（仅指测试夹具对应的材料层结构门）；
- `structuralGatePassed=false`；
- `admissionAuthorized=false`；
- `rejectionCode=BINDING_CITATION_LOCATOR_LINK_UNAVAILABLE`；
- `blockingReasons` 同时保留 locator link、external pin 与 mutation epoch 三个未闭合项；
- `crossFileAtomicSnapshot=false`；
- `intervalMutationExcluded=false`；
- `abaExcluded=false`；
- `bindingFrozen=false`；
- `rightsLegalConclusionEstablished=false`；
- `realReviewerIdentityAndIndependenceVerified=false`；
- `contentTruthEstablished=false`；
- `expertTruthEstablished=false`；
- `releaseReady=false`；
- `publicReleaseAuthorized=false`。

现有 SourceRights/SourceCarrier schema 中的“双人复核”只能机械证明两个不同 reviewerId 字符串，不能证明现实自然人身份、资质或独立性。结构门通过不得表述为法律结论。

## 本轮定向验证

- 独立 strict TypeScript：通过，exit 0；
- Vitest：整改后 1 file / 13 tests 通过；
- v1.7 frozen golden 定向测试：1/1 通过，SHA-256 仍为 `aba357d98a99271cc9a9b2727ad1c7c516424c94b7cf34f765cb38b0e9a74b29`；
- DTT supersession、version-aware readiness、SourceCarrier readiness 三个父 verifier：通过；
- 独立只读初审：P0=0、发现 2 个 claim-scope P1（registry locator 未与 Citation material 关联、调用方 digest 被误称为外部冻结）；整改后复核为 P0=0、P1=0；
- 生成缓存：0。

这些结果只建立代码和机械契约证据。当前正式 KnowledgeDocument、SourceRights、SourceCarrier、materialization、现实 reviewer receipt 与 frozen binding 仍均为 0，不能由测试夹具外推。
