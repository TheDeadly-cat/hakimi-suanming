# 阶段 C：policy weights 版本感知候选 v1（2026-08-30）

## 结论

本切片新增一条独立的 policy weights v1.1 候选 capability。它内部要求 engineering value-subject gap v1.1 与 candidate readiness 1.7 的两个私有 WeakSet 品牌；同时在三项未变直接工程 basis 的当前 raw identity 精确匹配后，复用历史 policy weights v1 已保存的 binding、三个 value-subject 与工程语法投影。

这不是重新执行历史 AST／producer-consumer inspection，也不是把历史 policy weights 原位修成 active。它只证明固定 raw／semantic tuple 下，两个候选父账已重绑，且历史工程投影仍对应相同的直接工程字节。它没有创建新 binding，没有冻结权重的工程依据，没有补出来源、许可或专家意见，也没有接入 old C-M1、默认加载链、运行时 consumer 或中央发布闭包。

## 历史账与独立候选身份

历史账保持不变：

- path：`content/system-admission/bazi-policy-weights-value-evidence-candidate.v1.json`
- raw：`10397` bytes
- raw SHA-256：`91a6c9f10e1b56da1292133c6e276c437c7fb8b2c6dbca9bed2b54bcfa9726e6`
- candidate ID：`hakimi.bazi/policy-weights-value-evidence-candidate/1.0.0`
- candidate digest：`208ae39797d048b2fc869392528a3cf7d1858de232a8691bc0296366d6363088`
- role：`fixed_policy_weight_projection_template_only_not_current_capability`

历史 loader、工件和测试没有被改写。旧 policy weights 链仍因旧父账身份漂移而失败；此前定向证据为 CLI `PARENT_LEDGER_DRIFT`、tests `14/22`。这个红态没有被 v1.1 冒充为修复或覆盖。

新增工件：`content/system-admission/bazi-policy-weights-value-evidence-candidate.v1.1.0.json`

- `schemaVersion=1.1.0`
- `recordType=bazi_policy_weights_value_evidence_version_aware_candidate_v1_1`
- candidate ID：`hakimi.bazi/policy-weights-value-evidence.version-aware-candidate/1.1.0`
- status：`candidate_only_version_aware_repository_values_observed_not_freeze_eligible`
- raw：`13295` bytes
- raw SHA-256：`0b221bfc2669310298d9082711ad111b205c5881e419a90f92776229102f53c1`
- candidate digest：`95a1edb8d0228231229b561c97fd4960385e581cef87c3e1f2aa57e979c12c5b`

## 两个品牌父账与五项 basis

两个直接品牌父账为：

1. engineering value-subject gap v1.1：`71168` bytes；raw SHA-256 `f8ed780ce8e3fbaca59b295faff2f12b939a8b0c193bc0c20ce1198690528d4e`；ledger digest `d578b6e76c325bf79593b728b78035d3481ec60fa7fb99c815748d9f806a8330`。
2. candidate readiness 1.7：`32629` bytes；raw SHA-256 `7565a1c1ae51c09c78cf8f906e544bd8ee822020f76587237bc909ef1e6408a2`；ledger digest `afdebfa1fb7a797f02d136373eb9aef1afa26b38b755926f8930ea5de97316b8`。

五项 basis 精确为：

1. engineering binding candidate parent：`21712` bytes；SHA-256 `95154d55d9e368351f5a69a1fa2ff63a51ba946d33a800dbd1f2460d9ac97b2f`。
2. version-aware gap candidate parent：`71168` bytes；SHA-256 `f8ed780ce8e3fbaca59b295faff2f12b939a8b0c193bc0c20ce1198690528d4e`。
3. version-aware readiness parent：`32629` bytes；SHA-256 `7565a1c1ae51c09c78cf8f906e544bd8ee822020f76587237bc909ef1e6408a2`。
4. `packages/bazi-interpretation/src/strength-policy.ts`：`10905` bytes；SHA-256 `795709298542773459a73cd8a63a6824d3076bbdedf6a157c0652d25446486f1`。
5. `packages/bazi-interpretation/src/strength-assessment-core.ts`：`8559` bytes；SHA-256 `bbe6510c5cc0500efc8bb3af45efc1c344a5159f35c8fe5fca3aae3dab156e3b`。

这里必须分开计数：gap 与 readiness 是经过各自私有品牌验证的两个版本化父账；engineering parent、policy source 与 assessment consumer 是三项未变直接 raw basis。本层没有声称五项 basis 都重新执行了当前投影 inspection，也没有把嵌套 verifier 的 same-buffer 性质传递到本层。

## 精确允许的投影

新候选保持原 binding identity `binding:policy:weights` 与 policy version `hakimi.bazi.strength_policy/0.1.0`，并只覆盖该 binding 的三个 value-subject：声明值、dispatch surface、guard-and-consumer surface。

机械账只输出计数和边界，不在 CLI 输出权重实值或完整 candidate：观察到四个 policy value key、三个 scoped value-subject 与三个 direct consumer call shape；稳定语法投影为 true。历史投影的复用条件明确写为 `historicalPolicyWeightProjectionReusedAfterUnchangedDirectEngineeringBasisRawIdentityMatchAndBrandedParentRebind=true`。这不是一般控制流／数据流等价证明，也不是运行时执行证据。

binding identity 没有变化，平行 binding 数为 0，`activeAdmissionEffect=none`。scoped readiness 的当前分发边界是 `local_repository_only_no_distribution_clearance`；它不是可再分发许可结论，也不能被缩写成无范围限定的 `link_only` 权利结论。

## 六本账继续分开

### 工程证据

本层建立的只有固定路径、raw SHA-256、semantic digest、私有品牌父账、历史投影精确复用条件，以及 scoped binding／value-subject／consumer shape 的机械一致性。候选 digest 是完整性摘要，不是数字签名、作者身份或法律证明。

### 内容与专家真值

`sourceEvidenceRefsBound=0`，工程 rationale 冻结数、工程 review、专家 review 与独立 domain review 均为 0；`sourceBundleComplete=false`、`expertReviewBundleComplete=false`。因此 `contentTruthEstablished=false`、`expertTruthEstablished=false`、`expertClaimsAuthorized=false`。历史工程参数不能被称为古籍权威、专家共识或八字以外体系的权威。

### 权利与法律判断

formal SourceRights 与 SourceCarrier 记录均为 0，`rightsBundleComplete=false`，`rightsLegalConclusionEstablished=false`。本层没有建立作品层、版本层或载体层许可，也没有授权复制、再分发或公开发布任何第三方材料。

### 浏览器、运行时与发布

本层没有执行应用运行时、浏览器、PWA／Service Worker、Chrome／Edge、公开主机、Release Evidence、部署或回滚验证。`browserRuntimeEvidenceEstablished=false`、`releaseReady=false`、`publicDeploymentAuthorized=false`。

### 准入与 mutation epoch

Binding 仍不具备 freeze eligibility，scoped binding 没有 verified freeze；formal admission promotion 保持 blocked，formal activation 为 false。当前治理继续固定 `legacy-v13 / targetSchema 13 / migrationId null`，且 `crossFileAtomicSnapshot=false`、`mutationEpochAvailableForSchema13=false`、`mutationEpochReceipt=null`、跨文件 interval mutation 未排除、ABA 未排除。

## 独立产品边界与下游隔离

这条 v1.1 capability 没有被 old C-M1、默认脚本、`packages/bazi-interpretation/src/index.ts` 或真实 runtime consumer 导入。运行时代码仍直接消费既有 `strength-policy.ts` 契约；本候选 JSON 与 verifier 不是运行时授权开关。

若后续 C-M1 的明确定义确实要求消费本候选，必须新增独立版本化链路并要求本层私有 WeakSet 品牌；不能用 plain-object shape、clone、digest 或完整 candidate 替代品牌，也不能原位洗绿旧 C-M1 或默认 consumer。是否建立该依赖要由 C-M1 自身的真实契约决定，不能为了串链而虚构。

## 机械验证状态

CLI 前缀固定为 `BAZI_POLICY_WEIGHTS_VERSION_AWARE_CANDIDATE_MECHANICS_OK`，输出只含候选身份、工件身份、父账／binding／计数及失败关闭红门，不输出完整 candidate 或权重实值。

- library：`30775` bytes；SHA-256 `0511c79dd8d7fc5b28b96b7384bc007e9f32876e938b85ed4426f82a89c013e3`
- CLI：`3658` bytes；SHA-256 `ab19fe4d12c4573f6901d2fbaa3fa99f56b76b5e3c859ce1bcd80deb79012ef2`
- test：`39767` bytes；SHA-256 `5d6e085f983dd3a49eb636aeda82bdf7ed8bf18a3737775c9c0adf750a0f09b6`
- 新 policy weights v1.1 定向 tests：`29/29`
- 上游四层定向 tests：`119/119`
- 从成对 supersession、readiness、PR10BC、engineering gap 到 policy weights 的五文件候选链：`148/148`
- CLI：exit `0`，前缀为 `BAZI_POLICY_WEIGHTS_VERSION_AWARE_CANDIDATE_MECHANICS_OK`

本切片没有执行 Git 操作、全仓 typecheck 或默认 Web build；受限 `apps/web/src/lib/local-user-data-cleanup.ts` 未读取、未修改。工程通过、内容真值、专家真值、权利法律结论、浏览器／运行时证据、发布就绪与公开发布授权始终分账。
