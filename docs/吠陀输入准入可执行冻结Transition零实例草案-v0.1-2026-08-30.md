# 吠陀输入准入可执行冻结 Transition 零实例草案 v0.1

日期：2026-08-30

## 1. 本切片究竟完成了什么

本切片为吠陀体系增加一个私有、零依赖、禁止 production import 的隔离工程包：

- `packages/vedic-input-admission-kernel-draft`
- package `private=true`、`exports={}`；
- 只实现纯函数形式的 `freeze_packet` 评估；
- 唯一非 rejection 输出是 `draft_transition_candidate`；
- 没有把候选写入持久化存储，没有签发或接受成功 receipt，也没有建立运行时 mutation epoch 或 ledger。

因此，“可执行”只表示源码可以解析 packet、计算候选结果并确定性拒绝不允许的请求；“零实例”表示正式 transition instance、accepted receipt、持久化 ledger instance 仍均为 `0`。

## 2. 独立体系和默认身份边界

本包固定 `contractSystemId=vedic` 与研究体系标签 `productSystemId=vedic-astrology`，并明确：

- `baziIdentityInherited=false`；
- `legacyV13IdentityInherited=false`；
- `independentProductId=null`；
- `targetSchemaInherited=false`；
- `migrationIdentityInherited=false`；
- `releaseIdentityInherited=false`。

吠陀切片自身的 `targetSchema=null`、`migrationId=null`、`releaseIdentity=null`。这不改变应用的全局默认治理：八字仍固定 `legacy-v13 / targetSchema 13 / migrationId null`。本切片没有修改正式 four-system admission registry，也不构成其 supersession 或 formal parent 投影。

主 `scripts/system-contract-draft-registry.json` 是 readiness candidate 已冻结的上游 endpoint，因此本 kernel 不回写该主 registry，避免形成“readiness → registry → downstream kernel → readiness digest”的反向依赖。本包只登记在 `scripts/system-contract-downstream-draft-registry.json`；通用 draft boundary verifier 在检查时组合主 registry 与 downstream registry，而 readiness/transition 上游 closure 仍看到原主 registry 的精确身份。

## 3. 冻结 packet 的精确输入

治理 packet 只接受 canonical UTF-8 bytes，并固定：

- 13 个 requirement ID；
- 26 个 invariant ID；
- 8 个 admission condition ID；
- 10 个 review-content digest 字段；
- upstream readiness candidate digest `688a786525d8d8c988be2d517d31cca23113d788cadc3168cae5bbd71a6a1efb`；
- transition contract digest `548a0ab95dbe030dda2c158a7a4583c4591d98be75bc9f9a604ff98cff3d52ac`。

十个 review-content digest 字段是：

1. `selectedValueSetDigest`
2. `targetUseProfileDigest`
3. `questionSetDigest`
4. `sourceBindingManifestDigest`
5. `threeLayerRightsEvidenceManifestDigest`
6. `validatorProfileSetDigest`
7. `privateLifecyclePolicyDigest`
8. `distributionOperationSetDigest`
9. `targetJurisdictionSetDigest`
10. `reviewInstructionAndDisagreementPolicyDigest`

解析器先以内槽 byte length 执行 64 KiB 限流，再做不经过 `constructor`/`Symbol.species` 的固定快照；它拒绝 SharedArrayBuffer/foreign buffer 与额外 own property，避免共享内存 torn packet 和 species hook。随后对 BOM、非法 UTF-8、重复 key（含转义后同名）、缺失或额外字段、非规范 JSON、非精确 `Uint8Array`、危险对象、集合替换、跨体系身份和 digest 漂移 fail closed。

## 4. 唯一实现的候选 transition

实现范围严格限定为：

```text
uninstantiated --freeze_packet--> packet_frozen_receipts_incomplete
```

候选计算提出 `afterEpoch = beforeEpoch + 1`，并计算 proposed state、chain 与 consumed-nonce heads；这些值不是已提交事实。输出固定：

- `acceptedReceipt=false`；
- `commitObserved=false`；
- `mutationEpochRuntimeEstablished=false`；
- `authorityEffect=none`；
- candidate receipt status 为 `draft_candidate_not_issued_not_accepted`。

其余已声明 transition、未知 transition、错误 from-state、replay/idempotency marker 与 epoch overflow 均返回确定性 rejection。rejection identity 绑定 `ledgerGenerationId`、`operationId`、`idempotencyKey` 和 generation-scoped nonce；同时要求：

- `afterEpoch === beforeEpoch`；
- `stateAfter === stateBefore`；
- state digest、chain head、revocation head、consumed-nonce head 前后完全相同；
- `nonceConsumed=false`；
- 无 `targetReceiptId`。

rejection 仍只是纯计算响应，不能证明 rejection 已被某个 ledger 持久化。

## 5. 隐私边界

测试 packet 使用合成治理 digest，不包含现实人物、出生信息、个人输入实例、任意引用或自由文本。schema 的结构 allowlist 不允许显式个人字段或显式 person-derived digest 字段。

但 opaque SHA-256 值的语义来源不能仅凭结构验证，因此 packet 固定：

- `digestSemanticOriginVerified=false`；
- `privacySourceProvenanceEstablished=false`。

这意味着本切片不能证明调用方传入的 digest 从未由个人数据派生，也不能替代实际来源、隐私生命周期或数据删除审计。

## 6. 证据分账

| 账目 | 本切片状态 | 不能外推为 |
| --- | --- | --- |
| 工程源码 | isolated kernel、严格 parser、候选 evaluator 已落盘 | 正式产品集成 |
| 机械测试 | 合成 packet、攻击输入、候选与零变更 rejection 可测试 | 真实运行时或浏览器证据 |
| mutation epoch | 只计算候选 `+1`；rejection 为零变更 | 原子提交、ABA 防护或持久化 ledger 已建立 |
| 内容真值 | `false` | 吠陀规则正确或权威 |
| 专家真值/授权 | `false` | 现实专家审定完成 |
| 来源与权利法律结论 | `false` | 来源许可、作品层/版本层/载体层权利已清算 |
| Release Evidence | `false` | 发布就绪 |
| 部署与公开授权 | `publicDeploymentAuthorized=false`、`publicReleaseAuthorized=false` | 可以公开上线 |

同样保持 `expertClaimsAuthorized=false`、`formalAdmissionAuthorized=false`、`inputContractGateSatisfied=false`、`releaseReady=false`。

## 7. 明确未解决事项

本切片没有实现 `seal_pre_snapshot_evidence_manifest`、`verify_conditions_1_to_7`、`verify_supersession_projection` 或 `invalidate`，也没有生成 condition 1–8 的任何真实 receipt。

当前绑定的 transition/receipt requirements 已把 aggregate/evaluation manifest 字段限定为逐 receipt kind，并把 correction、withdrawal、revocation 与 rejection 拆成各自的 mutation、epoch、revocation-head 和 nonce 语义；先前两处字段适用性 P2 已在该上游合同中关闭。

但这些仍只是 requirements：除本切片的 `freeze_packet` candidate 与 rejection response 外，其余 receipt kind 没有可执行 schema、持久化实现或真实实例。本切片不能被表述为上游全部 receipt family 已完成工程闭合。

## 8. 当前禁止结论

不得把本切片称为正式 Vedic input contract、accepted frozen packet receipt、运行时状态机、专家结论、内容权威、权利许可结论、Release Evidence、发布就绪、部署完成或公开发布授权。也不得把八字 v1.7 的任何工程或内容证据外推为吠陀体系权威。

## 9. 2026-08-30 定向机械验证

- package strict TypeScript：通过；
- package Vitest：`1 file / 16 tests` 通过；
- repository verifier：CLI 通过，tamper tests `12/12` 通过；
- 两份 JSON Schema：Draft 2020-12 meta-schema 检查 `2/2` 通过；
- evaluator 的 candidate/rejection 合成输出与对应 schema 相符，伪造的 rejection-code/transition 组合被拒绝；
- repository verifier 对 `apps/web` 的 375 个可检查文本文件未发现 production import，并明确跳过受限文件；这是带盲区的 point-in-time source observation，不是全仓原子快照；
- release-governance 定向检查通过，并继续报告 `legacy-v13 / targetSchema 13 / migrationId null`、`publicDeploymentAuthorized=false`、`expertClaimsAuthorized=false`；
- readiness candidate 与 transition/receipt requirements 的固定 endpoint verifier 均通过；它们仍报告零 condition、零 transition/receipt instance 和无 authority；
- offline lockfile dry-run 通过。

通用 `check:system-contract-draft-boundaries` 仍以 exit 1 结束：包含受限文件明确未读、既有 Bazi evidence-script import 注册缺口及既有 non-literal dynamic-import 问题；输出中没有本 Vedic kernel 的新增 finding。因此不能把这条通用检查写成通过。

受影响的通用 boundary verifier 测试为 `69/70`：唯一失败是最终 direct-Vite gate 测试在子进程中调用上述当前为红的通用检查；不是 kernel entry、downstream registry composition 或 kernel import 的新增 finding。这条测试同样不得写成通过。

本轮没有运行全仓 typecheck、默认 Web build、浏览器/PWA、正式仓储边界或公开主机验证，也没有读取或修改受限文件。

## 10. 2026-08-31 下游 registry 重锁增量

后续独立实验增加了吠陀 mutation-epoch runtime 和西洋 civil-time adapter，且吠陀实验的 `fake-indexeddb` 依赖已从包级 allowlist 收紧为 `fake-indexeddb-test-only-v1`。因此本 kernel 的 point-in-time observer 重新冻结当前 downstream registry：

- `scripts/system-contract-downstream-draft-registry.json`：`1808 bytes`；
- SHA-256：`c17503797376c5800364f8976b8c11e5b42479a637206de8b09ae77374f1cc59`；
- kernel CLI：通过，并继续报告 `runtimeEstablished=false`、`transitionPersisted=false`、`acceptedReceiptIssued=false` 与全部 authority false；
- kernel verifier tests：`20/20` 通过；
- kernel package Vitest：`1 file / 24 tests` 通过；
- kernel strict TypeScript：通过；
- `fake-indexeddb` 专用边界负向测试：`3/3` 通过。

通用 boundary suite 当前为 `72/73`；唯一失败仍是 direct-Vite aggregate 测试调用当前既有红色全局检查。本次新增的三个 test-only policy 用例全部通过，但这不把全局 boundary gate 改写为绿，也不改变 `legacy-v13 / targetSchema 13 / migrationId null`、正式体系准入、内容／专家／权利结论、发布就绪或公开授权。
