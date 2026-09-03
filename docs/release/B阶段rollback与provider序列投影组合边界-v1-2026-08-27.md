# B 阶段 rollback 与 provider 序列投影组合边界 v1（2026-08-27）

## 1. 目的与结论

本候选只补一条此前断开的机械关系：把一份 **Schema-valid、摘要闭合但明确失败关闭** 的 rollback 声明及其两张实际 deployment receipt，与已经由独立持久化 verifier 重组过的 provider A→B→A 候选序列交叉绑定。

它不是正式 rollback verifier 的替代入口，也不是回滚通过证据。结果固定为：

- `trustClass=untrusted_candidate_composition`
- `status=admissionStatus=not_admitted`
- `usableForAdmission=false`
- `formalRollbackEvidenceVerified=false`
- `formalRollbackDownstreamReached=false`
- `samePolicyEpochFormalCompositionAvailable=false`
- CLI 无论机械组合成功或失败均以退出码 `1` 结束

网络、部署、回滚、真实 provider、真实主机、Chrome/Edge、Service Worker、数据回滚、Schema 13 mutation epoch、发布就绪、内容真值、专家真值、权利法律判断和公开发布授权均没有因此成立。

## 2. 为什么不能直接组合两个正式通过结果

当前两条生产政策在同一 binding root 下有明确互斥：

- provider sequence v1 只接受 checked-in hosting policy 的 `deploymentPlatform=unselected`、`canonicalOrigin=null` 闭门状态；
- formal rollback v1 要求 hosting policy 已选择现实平台、已有 canonical HTTPS origin，并通过 real-host preflight；
- formal rollback 随后仍在 `ROLLBACK_EXECUTION_ADMISSION_CLOSED` 停止，准入点后的 artifact、host、browser、provider、phase、data、actor attestation 与 terminal 路径尚无端到端执行证据。

因此，本候选不得调用一个绕过 admission 的 rollback 入口，也不得把 `ROLLBACK_EXECUTION_ADMISSION_CLOSED` 当作成功。将来选择真实平台后，需要新的 provider candidate/sequence policy 版本和正式 rollback 输出投影；不能由本 v1 组合器掩盖政策代际差异。

## 3. 唯一 receipt 语义来源

`scripts/rollback-evidence-lib.mjs` 现导出纯函数 `validateRollbackDeploymentReceiptProjectionForContract`。原 formal rollback downstream 的私有 deployment receipt verifier 与本候选共同调用这一函数，统一检查：

- exact binding/envelope keys；
- `candidate` / `rollbackObserved` phase；
- `deploy_candidate` / `restore_baseline` action；
- run、provider、origin、时间、declared active deployment id；
- default-v13 expected identity 与 artifact lock digest；
- 空 errors；
- detached、递归冻结的最小投影。

该重构没有移动或修改 formal admission 调用顺序，也没有修改 rollback policy、Schema 或授权。

## 4. 重叠文件系统 epoch

组合器只消费 `verifyPersistedProviderDeploymentCandidateSequence`，不得直接调用 sequence loader，也不得相信 writer 返回值。

消费边界要求 persisted verifier 精确处于终态：`externalSequenceCandidateIntegrityVerified=true`、`pendingSequenceCandidateIntegrityVerified=false`、`outputFinalization.finalOutputSetVerified=true`，且 discard sentinel 的 present/verified 均为 false。`attempts` 必须是精确三项 false，`authorizationBoundary` 必须是精确五项闭门账；缺项、附加项或任一权限漂移均失败关闭。

在 provider persisted verifier 持有 sequence 文件并重跑 deploy/restore 两包 loader 的 overlapping checkpoint 内，组合器同时持有并重验：

- rollback evidence 原始文件及 `.sha256` sidecar；
- candidate 与 rollback-observed 两张实际 deployment receipt；
- rollback policy 规定的 7 份当前来源文件；
- 本组合 policy 与封闭 Schema；
- binding root、rollback evidence root、rollback receipt root、deploy root、restore root、sequence root 的目录身份。

文件要求为有界、普通、非符号链接、单链接文件；初末重读必须保持 dev/ino/realpath/size/mtime/ctime/raw bytes/SHA-256 一致。该边界证明一个重叠的端点验证窗口，不声称排除同内容连续 mutation、介质级竞态或 ABA。

## 5. 接受的 rollback 输入边界

输入必须：

- 通过当前 checked rollback Schema；
- `rollbackEvidenceId` 与 `evidenceDigest` 由当前 canonical 算法重算一致；
- sidecar 精确绑定原始 bytes；
- 精确绑定当前 7 份 policy source 的原始 SHA-256；
- 固定 `default-v13 / legacy-v13 / targetSchema 13 / migrationId null`；
- baseline A 与 candidate B 不同，`rollbackObserved` 声明精确等于 A；
- `epochSupport=absent_schema13`、`epochBefore=null`、`epochAfter=null`，且 raw IndexedDB、mutation epoch bypass、release-control pointer mutation 全为 false；
- claims 为封闭的 engineering-only false ledger；
- 自身必须是 `status=failed`、`failure!=null`，20 个 formal gates 全为 false。

最后一项防止把仅 Schema-valid 的 `passed` 声明洗成候选组合证据。

## 6. 跨账机械等值关系

成功组合只证明以下投影一致：

- provider、origin 与同一 hosting-policy raw SHA-256；
- rollback candidate artifact 与 provider deploy target B 的 5 个共有字段；
- rollback baseline/rollbackObserved artifact 与 provider restore target A 的 5 个共有字段；
- candidate deployment receipt 的 declared active deployment id 等于 sequence 的 B；
- rollback deployment receipt 的 declared active deployment id 等于 restored A，并等于 baseline A；
- candidate receipt 完成、deploy final readback、restore operation start、rollback receipt start 的单调关系；
- 两张 receipt 均位于各自声明 phase 内。
- `providerSequence.terminalGates.deploy` 与 `.restore` 各自精确投影 `path / size=65 / sha256 / commitsReceiptSha256`；
- 每枚 terminal gate 均与对应 sequence package 的 `receipt`、`fixedFiles.receipt`、`fixedFiles["terminal-commit"]` 精确等值交叉绑定，marker SHA-256 还必须等于 `raw receipt sha256 + LF` 这 65 bytes 的重算值。

两枚 terminal gate 位于 composition unsigned document 内，因此共同进入 `compositionDigest`；任一 marker identity 或 commit-to-receipt 关系漂移都会改变摘要或在摘要生成前失败关闭。

5 个共有 artifact 字段是 `releaseEvidenceId`、`buildVersion`、`artifactSetDigest`、`identityLockDigest`、`releaseEvidenceSha256`。provider-only 的 account/project/environment/adapter/immutable URL/expectation digest，以及 rollback-only 的 manifest/components，不得写成已经跨账相等。

rollback v1 的字段仍名为 `deploymentId`。本候选只把它解释为 **declared active-deployment id**，不映射成 `deployOperationId` 或 `restoreOperationId`，也不声称 provider operation receipt 已经被认证。正式消除该歧义需要新版本 Schema 显式拆分 operation id 与 active deployment id。

## 7. 与正式发布账的隔离

本候选：

- 不进入 `test:release-evidence`；
- 不进入 default-v13 精确 13 项 receipt allowlist；
- 不修改 Release Evidence generator/verifier；
- 不修改 rollback policy/admission；
- 不授权外部部署或回滚执行；
- 不授权公开部署、公开发布、内容、专家、权利或 Schema 晋级。

治理只冻结文件、脚本、import 方向、闭门 policy/Schema 和“不得从 npm lifecycle/workspace/receipt 间接进入 formal closure”的规则。候选被治理约束，不等于候选被正式准入。

## 8. 本地机械验证账

本切片在当前脏工作区独立复核：

- rollback contract/helper：18/18；
- persisted provider sequence：16/16；
- projection-only composition：14/14；
- 上述三组以 `--test-isolation=none` 合并执行：48/48；
- 正式 `test:release-evidence`：192/192；
- 治理回归：154/154；
- `check:release-governance`：通过，正式 npm lifecycle closure 仍精确访问 84 个脚本，canonical SHA-256 仍为 `eaba293e79453b250ce1d3520989da0dad184843e40dd28a9231c296f2bc9092`；
- 对应 `provider-sequence-*` 与 `rollback-provider-composition-*` 临时目录：无残留。

这些数字只属于本地工程合同和治理证据。本切片没有运行真实浏览器、HTTPS、provider、部署、回滚、PWA/Service Worker 或现实 v13 数据，也没有运行受限的全仓 typecheck/default Web build。

2026-08-28 的 consumer 加固定向复核另行得到 composition `21/21`，并通过受影响生产/测试脚本的 `node --check`。新增负例覆盖 pending integrity、非 final output set、current recomposition／overlapping epoch／三项 attempts 漂移、authority 漂移、deploy marker 漂移、restore marker 漂移与 commit receipt mismatch。上面的 2026-08-27 聚合数字保留为历史点时账，本次没有重跑并不得据此宣称其他切片当前仍通过。

## 9. 后续真实闭环

要把本候选替换为正式回滚证据，仍至少需要：

1. 用户选择并审定现实 hosting/provider，形成新 policy 版本；
2. 可信 provider parser、原始签名/认证 receipt 与 raw→projection 推导；
3. formal rollback verifier 在完整 terminal gate 后直接导出经过验证的 provider deployment projection；
4. Chrome/Edge 连续 A→B→A、真实 Service Worker controller 与实际 host bytes；
5. 获批现实 v13 数据副本、数据指纹重算与数据所有者同意；
6. 现实 operator/acceptor 身份、独立性与治理根签名；
7. 部署、回滚、失败恢复和证据留存的实际执行。

这些工程事项仍不能替代来源许可、内容真值、专家真值、权利法律结论或公开发布授权。
