# 吠陀预快照证据清单 Seal 可执行 Fail-Closed 零实例草案 v0.2

日期：2026-08-31  
体系：Vedic / `vedic-astrology` 研究标签  
状态：隔离下游工程草案；零真实实例；无正式准入、发布或公开授权效果

## 1. 本增量的精确结论

本增量没有把

`packet_frozen_receipts_incomplete --seal_pre_snapshot_evidence_manifest--> pre_snapshot_evidence_manifest_complete_unverified`

实现为正向 candidate。它把该 transition 从笼统的 `TRANSITION_NOT_IMPLEMENTED` 改为可执行、可验证的 fail-closed 路径：在 from-state、replay/idempotency 与 epoch 前置检查通过后，固定返回 `PRE_SNAPSHOT_MANIFEST_SEAL_BLOCKED`，并逐项保留冻结合同要求的四个失败 guard：

1. `same_cycle_and_packet_for_every_receipt`
2. `pre_snapshot_evidence_manifest_closed`
3. `manifest_layer_exact_set_coverage`
4. `no_active_correction_withdrawal_or_revocation`

拒绝结果不改变 state、epoch、state digest、chain head、revocation head 或 consumed-nonce head，不消费 nonce，不产生 `targetReceiptId`，也不是 accepted receipt。

## 2. 为什么当前版本禁止正向 candidate

冻结上游合同同时存在三类不能由本地合成 fixture 消除的红门：

- pre-snapshot manifest 明确包含 `legal_authority_disposition_receipt`，但该 family 的 `minimumCount` 与 `maximumCount` 均仍为 `required_undefined`；无法诚实证明 exact-set cardinality。
- manifest 覆盖的 11 类 success receipt 仍没有完整 executable accepted-receipt schemas 与已验证实例；现有 `frozen_packet_receipt` 只是 `acceptedReceipt=false` 的 draft candidate，不能冒充 success-set 成员。
- `no_active_correction_withdrawal_or_revocation` 要求在 current revocation head 重检；当前 kernel 没有 ledger query、proof、atomic snapshot 或可信 runtime，调用方提供的空数组与相等 digest 只能是 projection，不能成为 runtime recheck 证据。

因此，任何在本版本推进到 `pre_snapshot_evidence_manifest_complete_unverified` 的正向输出，都会发明未冻结的法律基数、receipt schema 或 runtime 事实。

## 3. 独立 diagnostic projection

新增的 closed schema：

`content/system-admission/vedic-input-admission-pre-snapshot-evidence-manifest-candidate.v0.1.0.schema.json`

以及独立 API：

`inspectVedicPreSnapshotEvidenceManifestCandidate`

只用于检查 synthetic/no-person candidate projection。它可以机械报告：

- projection 是否引用同一 admission cycle、packet、packet digest domain 与 manifest digest；
- receipt reference ID 是否唯一；
- 是否仅出现 11 个 included kinds、是否误纳 output kind；
- 已定义的 10 类固定 cardinality projection 是否吻合；
- lifecycle reference projection 是否为空；
- projection 的 revocation head 是否与调用方 state snapshot 相等。

它使用独立的 kernel-draft candidate digest domain，不生成冻结合同声明的正式 manifest digest；并始终固定：

- `candidateManifestClosed=false`
- `formalManifestInstanceCreated=false`
- `legalAuthorityDispositionCardinalityDefined=false`
- `executableReceiptSchemasAvailable=false`
- `underlyingAcceptedReceiptInstancesVerified=false`
- `underlyingReceiptPacketBindingsVerified=false`
- `runtimeRevocationRecheckEstablished=false`
- `canAdvanceState=false`
- 全部 truth / expert / rights / release / deployment / public authority flags 为 `false`

schema 中的 `vedic-receipt/<hex>` pattern 与 512-reference 上限是本地 diagnostic 限制，明确不是冻结上游合同的 normative 字段。

candidate root/entry shape、`revocationObservation` shape 与 entry ordering 同样只是本地 diagnostic。`candidateManifestDigest` 对数组顺序敏感；冻结上游合同没有给出正式 entry schema 或排序规则，因此该 digest 不得充当正式 manifest digest、transition payload fingerprint 或 idempotency identity。

## 4. 载荷与 idempotency 边界

transition request 继续保持精确三字段：`currentState`、`operation`、`transitionId`。它不接收 diagnostic manifest projection。

这样做保证不同 caller-supplied projection 不会在相同 operation/idempotency/nonce 下生成无法区分的 rejection identity。projection 的解析和 candidate digest 只存在于独立 inspector；transition rejection 只表达当前冻结合同的已知阻断条件。

rejection draft schema revision 2 进一步把已解析 governance packet 的 `admissionCycleId`、packet schema、packet ID、packet digest domain、packet digest 与 packet-manifest digest 纳入输出和 `receiptDigest` projection；同一 request 对不同合法 packet 不再产生相同摘要。

该 rejection 仍只是 isolated kernel failure response，不是上游完整 `transition_rejection_receipt` envelope：它没有完整 common envelope、`protectedReasonContextRef`、issuer/signature/trust-anchor、持久化或 runtime proof。这里的 `receiptDigest` 只表示 closed draft response 的确定性摘要。

revision 2 使用独立 JSON Schema `$id` `urn:hakimi:vedic:input-admission:transition-rejection-receipt:0.1-draft.2`，避免与旧 `0.1.0` 身份共享 registry/cache key。保留的 `v0.1.0.schema.json` 文件名只用于当前工作区路径兼容，不是公开或稳定 schema locator。

## 5. 体系隔离与默认发布治理

本增量没有修改八字生产默认：`legacy-v13 / targetSchema 13 / migrationId null`。Vedic 仍保持独立 draft identity：`independentProductId=null`、`targetSchema=null`、`migrationId=null`、`releaseIdentity=null`，不得继承或外推八字 v1.7 的内容、专家、权利或发布证据。

仍固定：

- `formalAdmissionAuthorized=false`
- `expertClaimsAuthorized=false`
- `rightsLegalConclusionEstablished=false`
- `releaseEvidenceComplete=false`
- `releaseReady=false`
- `publicDeploymentAuthorized=false`
- `publicReleaseAuthorized=false`

## 6. 证据分账

| 账本 | 本增量能证明 | 本增量不能证明 |
|---|---|---|
| 工程证据 | closed candidate schema、strict parser、projection digest、精确 guard rejection、零变更语义 | 持久化、跨文件原子提交、可信 runtime |
| 浏览器/运行时证据 | 无 | PWA、Service Worker、Chrome/Edge、公开主机 |
| 内容真值 | 无 | 13 项 Vedic 输入事实或规则权威 |
| 专家真值 | 无；现实专家仍为零实例 | 身份、资质、独立意见、分歧审定 |
| 来源与权利法律判断 | 无；legal cardinality 仍未定义 | 作品/版本/载体许可或法域结论 |
| Release Evidence | 无 | 发布就绪、部署或回滚确认 |
| 公开发布授权 | 无 | 任何公开上线授权 |

## 7. 后续正向迁移的必要前提

必须另行版本化并冻结：

1. independent legal authority 的角色、法域、capacity、签名政策与 exact cardinality；
2. 11 类 success receipt 的 executable closed schemas、签名/真实性与 accepted-instance 验证路径；
3. 可查询、可重放防护、可原子快照的 revocation ledger/runtime 证明；
4. manifest seal transition 的 payload、idempotency fingerprint、receipt/commit 与 rollback 契约。

这些条件未完成前，继续拒绝 seal 是预期正确行为，不是可绕过的测试阻塞。

## 8. 本轮定向工程验证

本轮只运行与该隔离 draft 直接相关的验证，没有运行全仓 typecheck 或默认 Web build：

- `typecheck:vedic-input-admission-kernel-draft`：通过。
- package Vitest：`24/24` 通过。
- kernel source/schema 防漂移 Node tests：`20/20` 通过；覆盖 schema 根与嵌套 exact shape、state/receipt/hash grammar、条件分支 control keywords、上游 evaluator/issuer-supplied authority/success promotion 组合攻击、formal-parent URN/工作区 schema 路径泄漏，以及 Web 大小写、Unicode escape、行续接、二元/`concat`/数组 `join` 字符串拼接、`const` 折叠和三份 schema 直接引用绕过。
- 上游 transition-and-receipt requirements tests：`35/35` 通过；仍报告 `executableReceiptSchemasImplemented=false`、`positiveTransitionEvaluatorImplemented=false`、`preSnapshotEvidenceManifestInstances=0`、`independentLegalAuthorityRoleStatus=required_undefined`。
- `check:vedic-input-admission-kernel-draft`：通过；属于 `point_in_time_non_atomic_source_observation`，扫描 375 个可检查 Web 文本源，对 JS/TS/JSX/TSX/MJS/CJS 使用 parser 与静态字符串常量折叠，并显式跳过受限文件 `apps/web/src/lib/local-user-data-cleanup.ts`。这仍不是运行时 module graph 或完整生产依赖闭包证明。
- kernel package 的 README、evaluator tests、tsconfig 与 Vitest config 已纳入 raw identity closure；本说明文档与 verifier 自身测试不是被验证 artifact，不能拿本说明文档的存在替代命令实跑。

以上合计 `79/79` 个定向测试。它们证明的是本地工程结构和 fail-closed 行为，不是浏览器/runtime、内容、专家、权利法律、Release Evidence、发布就绪或公开发布授权。
