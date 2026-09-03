# 八字专家 Formal Intake Successor（隔离 draft）

这是阶段 D 的可执行 strict-preflight / cross-link 工程草案。当前 successor 为 `0.2-draft`，input manifest、private envelope、opaque projection 与 lifecycle record 均使用 v3 身份。它解决旧 formal packet、当前隐私约束与 `Binding 0/12` 之间的代际冲突，但不收集真人资料、不创建仓内实例账、不接中央 Manifest、Registry、Web 或 production。

当前固定治理仍是 `legacy-v13 / targetSchema 13 / migrationId null`。所有 API 都固定：

- `mutationEpochAvailableForSchema13=false`
- `reviewCycleEpochIsSchema13MutationEpoch=false`
- `humanAttestationRecorded=false`
- identity、credential、scope、consent、verifier authority、independence、opinion authenticity、first-seen、custody、content truth、expert truth、rights/legal、formal admission、release/public authorization 全部为 `false`
- `formalTwoOfTwoCountDelta=0 / expertGateCountDelta=0`

## 为什么需要 successor

历史 `expert-review-packet/1.5.0` 和旧 intake verifier 仍接受八个 public identity 字段：`reviewerId`、`displayNameOrControlledPseudonym`、`verificationMethod`、`credentialDigest`、`verificationDate`、`reviewScope`、`evidenceType`、`verifiedBy`。当前 privacy reconciliation 已把它们全部降格为 historical-only，并禁止用摘要替代身份、同意、资质或独立性。

旧 review-cycle kernel 又把 `Binding 0/12` 作为 collection-start blocker；但 readiness 同时要求两份独立 domain opinion 才能冻结 Binding。若不分阶段，就会形成“未到 12/12 不能收意见、没有意见又不能到 12/12”的循环。

本 draft 不修改旧文件，而是严格拒绝历史七类 record type、当前 `PILOT_RECORD_TYPES` 闭集中登记的全部 pilot／rehearsal record type，以及已被这次 scope 语义变更取代的 v2 manifest/private/projection/lifecycle record type；`expert-review-packet/1.5.0` 不再作为新输入 Manifest 的 authority。此前没有 v2 真人实例或中央集成需要迁移，但仍不能静默沿用 v2 名称改变含义。

## 三阶段，不可相互转换

| Purpose | Seat / cycle namespace | 与 0/12 的关系 | 可产生的机械结论 | 永远不能由本 draft 单独产生 |
|---|---|---|---|---|
| `usability_only` | `usability-seat/<64hex>` / `bazi-usability-cycle/<64hex>` | 可以先于阶段 C；只测合成题面和界面 | envelope／manifest 结构观察 | usability eligibility、C 证据、formal 2/2、专家真值 |
| `binding_freeze_evidence` | 每个 binding 使用独立 `domain-expert-a|b` / `bazi-formal-review-cycle/<64hex>` | 可在 0/12；每个 cycle 必须精确选择一个 non-blocked 且非 `not_authorized` 的 candidate | 单条材料渠道与 envelope／manifest 结构观察 | Stage C evidence eligibility、未选 binding 结论、formal 2/2、发布闭环 |
| `post_freeze_reaffirmation` | 同一 formal cycle 的 A/B | 只接受完整 12 条；还必须全部 frozen、final binding-set digest 与审阅输入 exact match | 完整输入与 envelope／manifest 结构观察 | formal-2/2 evaluation eligibility、真人核验通过、实际 gate 计数 |

当前真实 input observation 仍是 `0/12`；七条工程 candidate 的 sharing policy 为 `not_authorized`，五条历史／review-gate candidate 为 `link_only`，且其中一条 review-gate binding 是 `blocked`。v3 不再让未选择的行阻断所选单条：因此四条 non-blocked `link_only` 行可以形成“单条 locator/link-reference delivery structure observed”的机械预检结果；七条 `not_authorized` 行和被 blocked 的行仍分别失败关闭。这个结果不授权现实收集、正文分发或 Stage C evidence eligibility。

`link_only` 绝不等同“可以分发来源正文”。它只允许把 locator/link reference 作为候选渠道，并固定 `expertActuallyViewedMaterialVerified=false / sourceBodyCopyingExcluded=false`；preflight 不检查专家实际看到的页面，也不证明协调人没有复制正文。只有 `private_review_only` 或 `redistributable` 才会产生相应材料渠道 code，这些 code 仍只是提供给引擎的受控 policy 投影，不是权利法律结论。

如果专家曾参加 usability pilot，其 prior exposure 必须在仓外 dossier 中记录。Pilot 输出固定 `formalConversionAllowed=false`，不能改名、重哈希或包装后进入 formal intake。

## 当前输入 Manifest

`buildCurrentReviewInputManifestV3(workspaceRoot)` 通过有界 held-handle 读取并绑定：

- `bazi-current-machine-identity-successor.v1.1.0` 的 raw SHA、successor ID、receipt digest 与 current-machine digest；
- `bazi-binding-freeze-requirements.v1.9.0` 的 raw SHA、ledger ID/digest；
- 精确 12 个 binding ID、顺序、evidence subject、candidate status、candidate digest、formal binding digest 和 sharing policy；
- 四个 successor-owned review questions 及 question-set digest。

Manifest 不输出文件路径，也不声称上述 endpoint 具有正式 authority。它保存 `crossFileAtomicSnapshot=false / intervalMutationExcluded=false / abaExcluded=false`。`sealReviewInputManifestV3Candidate` 只用于构造机械 candidate 或合成测试；它不能把调用者数据变成“当前工作区证据”。

每次 collection 还必须带 review scope、规范化 `selectedBindingIds` 和 `selectedBindingSetDigest`。Stage C 的 scope 精确为 `{mode:"single_binding", bindingId}`；usability 的 selected set 必须为空；post-freeze 的 selected set 必须精确等于 Manifest 中顺序不变的全部 12 条。selection digest 使用独立 domain，并同时覆盖 full manifest ref 与所选完整 candidate row（不是只覆盖 binding ID）。每个 private envelope、最小投影和 A/B pair 都绑定同一份选择；跨 binding 配对失败关闭，未选择条目的结论数固定为 0。

## 仓外私件与仓内最小投影

`preflightPrivateCollectionCandidate` 只从与 workspace 双向不重叠的显式 `privateRoot` 读取单层文件名。每个文件必须是非空、有界、`nlink=1` 的普通文件；symlink、junction、hardlink、路径穿越、BOM、非法 UTF-8、重复 JSON key、purpose/type/cycle/seat/input-manifest/category 错配都会失败关闭。

私件 envelope 的 `encryptedPayloadBase64` 只是“调用方声明为外部加密的字节”。本引擎不解密，也不证明 encryption、真人事实或人类判断。由于没有可信解密、解密后 schema／record-type、来源认证、意见真实性、first-seen 和 custody gate，所有 `eligibleAsUsabilityCandidate / eligibleAsStageCBindingEvidenceCandidate / eligibleForFormal2of2EvaluationCandidate` 当前固定为 `false`；即使把 rehearsal JSON base64 重包装进外层 v3 envelope，也只能得到结构观察，不能得到 evidence eligibility。外层 record-type deny list 不检查密文字节。输出的 repository projection 精确只含：

- purpose、cycle、seat；
- current input-manifest ref；
- review scope、selected binding IDs、selected-binding-set digest 与逐项材料渠道红门；
- 受控 outcome code；
- 按类别的 64hex opaque receipt refs；
- 固定 authority/privacy 红门。

投影不含姓名、假名、联系方式、URL、filesystem path、原始资质、原始意见、私件密文或私件摘要。64hex 外观本身不能证明随机熵，且 opaque ref / projection digest 仍可能间接源自个人资料，因此固定 `opaqueIdentifierEntropyVerified=false / personDerivedDigestExcluded=false / safeToPublish=false`。它仍只能按 private/off-repository material 处理。

`mechanicalBindingVerified=true` 的范围严格只是 `private_envelopes_to_supplied_input_manifest_only`；同一次 preflight 不重新读取 supplied manifest 的工作区父件，所以另有 `suppliedInputManifestCurrentWorkspaceVerifiedByThisCall=false`。`purposeInputPrerequisitesSatisfied=true` 也只表示 supplied manifest 的结构、选择和材料渠道先决条件满足，不是 payload eligibility。摘要和 cross-link 绝不能解释为 identity、consent、independence、authenticity、first-seen、Stage C evidence 或 formal evaluation。

## v4 认证私件 synthetic-only candidate

`authenticated-private-envelope-v4` 是与上述 v3 API 分离的窄入口；它没有改名、替换或放宽任何 v3 record type、projection 或 eligibility。首版只接受：

- `binding_freeze_evidence`；
- `{mode:"single_binding", bindingId}` 与顺序唯一的 selected binding；
- `original_opinion` 类别；
- 唯一的新 `bazi_expert_binding_freeze_original_opinion_synthetic_payload_v4` 内层类型；
- 不含姓名、意见正文或任何真人资料的固定 synthetic transport fixture。

外层 envelope 不允许携带公钥、AES key 或 trust-registry body。Ed25519 public key 与 AES-256-GCM key 必须分别经 envelope 之外、本模块私有 `WeakMap` 品牌的进程内 capability 提供；普通对象、spread、Proxy、structured clone 和 JSON 往返均不能恢复 capability。生产代码不生成或持久化任何 key；临时 Ed25519/AES 测试 key 只存在于 `src/test-support` 和测试进程内。

Synthetic producer identity 还必须在 capability issuer 与 preflight 两处满足 `producerId` 中的 `domain-expert-a|b` 与 `expectedBinding.seatId / envelope.seatId` 精确一致。即使攻击者用同一组 synthetic key 对换席 envelope 完整重加密、重算 tag 并重签，A→B 与 B→A 都失败关闭。

密码学绑定分两层，避免让 authentication tag 依赖自身：

1. 规范 GCM AAD 绑定 schema/record/protocol、purpose、cycle、seat、完整 input-manifest ref、review scope、selected IDs 与 digest、category、opaque ref、预期内层 schema/type/media/encoding、producer/registry/signing/encryption key IDs、算法、nonce 和固定 fail-closed boundary；
2. AES-256-GCM 产生 ciphertext 与 tag 后，Ed25519 statement 再绑定独立 domain、AAD SHA-256、tag、ciphertext byte length 与 ciphertext SHA-256。

因此 nonce、tag、ciphertext、signature、算法或任一 cross-binding 字段变化都会失败关闭。tag 与 ciphertext digest 不能直接放进生成它们的 GCM AAD，否则形成循环；它们由第二层签名 statement 精确认证。plaintext digest 不公开，避免为低熵私人内容提供离线猜测标识。

解密只在有界内存中进行；完成严格 UTF-8、BOM、重复 key、深度/大小、exact keys、record type 与内外 binding 校验后即清零原始 plaintext buffer。成功报告不含 plaintext、ciphertext、tag、signature、公钥、key、路径或 fixture ID，只允许三项窄义机械结论为 true：

- `aeadIntegrityVerified=true`；
- `signatureAgainstSyntheticOutOfEnvelopeKeyVerified=true`；
- `decryptedSchemaAndBindingMatched=true`。

这里严格只表示“验签 key 来自 envelope 外的 branded synthetic key capability”，绝不称 external pin 已建立。当前 issuer 仍是 synthetic candidate，所以 `payloadSourceAuthenticated=false / realKeyProvenanceEstablished=false`；它不能证明 producer 是真人、专家本人或获授权的协调人。

其余 identity、credential、consent、opinion authenticity、first-seen、custody、A/B independence、human attestation、content/expert truth、Stage C eligibility、formal admission 全为 false；`formalTwoOfTwoCountDelta=0 / expertGateCountDelta=0 / bindingFrozenCountDelta=0`，仍为 `0/2` 与 `0/12`。治理继续为 `legacy-v13 / targetSchema 13 / migrationId null`，没有 persistence、mutation epoch、interval/ABA/replay 排除或跨运行 nonce-uniqueness 证明。

当前 v4 API 消费调用方提供的 raw envelope bytes，不读写文件。未来若接仓外现实私件，仍必须先与 held-handle stable private-file reader 组合；本 candidate 不声称文件端点、路径、first-seen 或 custody 已验证。

`preflightFormalSeatPair` 只接受同一模块中 `preflightPrivateCollectionCandidate` 实际产出的冻结、私有 `WeakSet` 品牌 capability；普通 JSON、结构克隆、调用方重算的无密钥 projection digest 和 URL/path-shaped manifest ID 都拒绝。之后仍要求同 purpose、同 formal cycle、同 input manifest、同 review scope/selected set/digest、精确 A/B 两席；两席必须共享同一个 owner-authorization ref 和 pairwise-independence ref，其他 seat-specific refs 不得复用。通过只说明本进程内 receipt-ref 结构交叉绑定和 seat-specific ref 不相交，`endToEndSeatIsolationEstablished=false / humanIndependenceEstablished=false`。私有品牌不能序列化、不能跨进程证明 provenance，也不是签名或可信启动根。

## 仓外必须由 owner／真人提供的材料

这些内容不得放进仓库，也不能由代码或摘要虚构：

1. Owner authorization：唯一 cycle/purpose、精确 input-manifest、允许联系和材料分发的范围、逐项 private/link-only/redistributable 决策、data category、加密存储、custodian、retention/deletion/withdrawal/incident policy、指定 verifier/assessor 与 authority grant、A/B 隔离规则、`pilot->formal=false`、public release false，以及可信签名／first-seen 来源。
2. 每位 reviewer：法定身份与联系资料、primary identity evidence；credential issuer/ID/effective period/current status/revocation check 及独立佐证；四题和本次 selected binding（post-freeze 为完整 12 条）的 scope mapping；参与、数据处理、意见用途、保留与撤回同意；角色重叠与十项 independence declarations；原始意见字节与本人认证。
3. Verifier / independence assessor：本人身份、包外 authority grant、scope/expiry/revocation、与 owner/project/reviewer 的关系、核验方法、签署结果。签名最多证明可归属的声明，仍不自动证明声明内容为真。

只有上述真人材料经独立流程审定后，未来 successor 才可能新增“human attestation recorded”能力；本版本故意没有该正向路径。

## 更正、撤回、资质吊销

`preflightLifecycleEventCandidate` 接受三种独立 record type，但还必须同时收到原 collection preflight 在本进程产生的、不可序列化的 branded prior projection capability。event 与输出都精确绑定 prior projection 的 purpose/cycle/seat/full manifest ref/review scope/selected IDs/selected-binding-set digest，且 prior private receipt ref 必须实际属于该 projection；因此 correction、withdrawal 或 credential revocation 不能换绑到另一条 Stage C binding，也不能把 post-freeze 降成子集。它仍仅返回 candidate：

- correction 必须追加并引用旧件，禁止覆盖；
- withdrawal / credential revocation 候选要求受影响 seat 与 gate 重新关闭，但本 draft 固定 `gateRecloseObserved=false`；
- 三者都固定 `acceptedReceipt=false / stateMutationPerformed=false / countsTowardFormal2of2=false`。

这个 runtime brand 只阻断同进程普通 clone／自算摘要换绑，不能跨进程证明 provenance。本 draft 没有 store、CAS、可信时间或跨进程 replay ledger，因此不声称真正完成 append-only persistence。

## API

- `buildCurrentReviewInputManifestV3`
- `validateReviewInputManifestV3`
- `sealReviewInputManifestV3Candidate`
- `preflightPrivateCollectionCandidate`
- `preflightFormalSeatPair`
- `preflightLifecycleEventCandidate`
- `createSyntheticOutOfEnvelopeProducerKeyCapabilityV4`
- `createSyntheticDecryptionKeyCapabilityV4`
- `preflightAuthenticatedPrivateEnvelopeV4Candidate`

## 定向验证

只运行本隔离目录，不运行根 workspace typecheck、默认 Web build 或完整应用：

```powershell
node_modules\.bin\tsc.cmd -p isolated-drafts\bazi-expert-formal-intake-successor\tsconfig.json --noEmit
node_modules\.bin\vitest.cmd run --config isolated-drafts\bazi-expert-formal-intake-successor\vitest.config.ts
```

测试 fixtures 全部是程序生成的合成字节，不含真人身份、同意、资质、独立性或意见材料。测试通过只属于隔离工程证据，不是浏览器／运行时、内容真值、专家真值、权利法律、发布就绪或公开发布授权。模块还固定 `hiddenPreloadExcluded=false / nodeRuntimeIdentityEstablished=false / loaderIdentityEstablished=false / cliOutputTrustedAttestation=false`；同进程测试绿不构成可信启动证明。

`authenticated-envelope-v4-kat.test.ts` 另有固定 AAD 与 Ed25519 statement bytes KAT；其预期字节由测试内硬编码，不调用生产 canonical helper 生成，避免 producer 与 verifier 共用同一 helper 时形成同源盲点。
