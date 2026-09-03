# 阶段 D：八字现实专家资格与核验 Authority 零实例预检 v1

日期：2026-08-30  
状态：`zero_instance_authority_precheck_contract_mechanically_verified`  
适用范围：八字 single-chart-report v1.7 后续现实专家资格、核验者 authority 与两席独立性材料的结构预检；不接收、保存或确认现实人物实例。

## 结论先行

本 tranche 新增了一个独立、单向、零实例的 expert authority material child。它补上了旧 formal intake 中 `verifierBindingRef` 可为空、核验者 authority 没有独立材料闭包、identity/credential/question scope 易被同一 dossier 重复计数等结构缺口，但没有修改或重签旧 packet、intake gap、readiness、公开候选账、manifest、registry 或跨体系 receipt。

机械验证只证明：当前 child、五份 Bazi 父账、旧 formal verifier helper 的指定原始字节身份一致；候选材料结构会拒绝自核验、两席互验、authority ref 空缺或错接、同源双计、四题 scope 缺项、十因素缺项、PII/正文注入和 authority 自晋级。它不证明现实身份、资质真实性、核验者权限、专家独立性、内容真值、许可法律结论、发布就绪或公开发布授权。

旧 formal 专家链继续保持红态：intake gap 固定 readiness `1.5.0`，当前 readiness 是 `1.6.0`，因此首个失败码仍为 `INTAKE_GAP_BINDING_DRIFT`。本 child 只确定性复现该原始字节绑定前置条件，并绑定旧 verifier helper 源码身份；本 child 没有执行并证明历史 formal verifier runtime、Node、loader 或 launcher 身份。

## 本 tranche 工件

| 工件 | bytes | raw SHA-256 |
|---|---:|---|
| `scripts/bazi-expert-authority-material-precheck-lib.mjs` | 72,874 | `5f338c822bd7aca218bbcca06d2a7786a5a2b4082180c91ecd7ec5e2fa0c6301` |
| `scripts/verify-bazi-expert-authority-material-precheck.mjs` | 1,842 | `394e51fde4ce7a2a1a44e0bae6cb0ec5ab60493ea245b4720e1f35b482b086e0` |
| `scripts/verify-bazi-expert-authority-material-precheck.test.mjs` | 36,926 | `a9db40adfe8d28ab21d89199e6f25072cc66758b09b8aec1954720cb1b03cbd0` |
| `content/system-admission/bazi-expert-authority-material-precheck.v1.json` | 12,974 | `ccfe28e4dfb8c1bd7a6764d6253cf818c37a712ea24225bd100092362cc1f2af` |

持久化 child：

- `ledgerId = hakimi.bazi.expert-authority-material-precheck/1.0.0`
- `ledgerDigest = 0c68a77a135a6ad6205a9c0da3e37162a820ee2f273cb899783fe9a990526a80`
- `recordType = bazi_expert_authority_material_precheck_v1`
- `status = zero_instance_authority_material_contract_formal_intake_blocked`
- canonical pretty JSON、LF、单一末尾换行；raw hash 与 parse 使用同一 held-handle buffer。

## 单向父账绑定与 formal 红态

| 父工件 | 当前精确身份 | 本 child 的处理 |
|---|---|---|
| expert packet | `1.5.0`；12,684 bytes；raw `ba28de1b…`；digest `cfe554b6…` | 只读单向绑定；不改、不重签 |
| expert intake gap | `1.0.0`；4,309 bytes；raw `7d01f000…`；digest `6cf349fd…` | 保留其 readiness `1.5.0` 锁；不回填 `1.6.0` |
| current binding readiness | `1.6.0`；30,655 bytes；raw `1db59e2f…`；digest `97406785…` | 作为当前 readiness 独立绑定；`bindingFrozenVerified=0/12` |
| public candidate prescreen | `1.0.0`；21,691 bytes；raw `88e5dabc…`；digest `ba9878bf…` | 仅为非权威公开线索父账；不得占席或晋级身份 |
| public evidence followup | `1.0.0`；11,989 bytes；raw `1961f1e9…`；digest `3cbe882b…` | 仅为 link-only operator record；不成为资质证据结论 |
| formal verifier helper | 139,453 bytes；raw `76046086…` | 只绑定源码身份与已知前置条件；不声称 runtime/toolchain attestation |

精确漂移：

- intake gap 锁定 readiness：`1.5.0 / 26,038 bytes / 662c91e6… / feea4020…`
- 当前 readiness：`1.6.0 / 30,655 bytes / 1db59e2f… / 97406785…`
- `intakeGapMatchesCurrentReadiness=false`
- `formalPacketVerifierPasses=false`
- `firstFailureCode=INTAKE_GAP_BINDING_DRIFT`
- `formalVerifierExecutedByThisChild=false`
- `parentMutated=false`、`parentBacklinkAdded=false`

## 材料合同覆盖

结构候选固定六类记录：

1. verifier authority material；
2. reviewer identity material；
3. reviewer credential material；
4. reviewer question-scope material；
5. pairwise independence material；
6. authority material bundle。

预检要求：

- 两个固定 reviewer seat 分别消费一份 reviewer-surface verifier authority material，independence assessor 消费唯一 assessor-surface authority material；三份材料各消费一次，不得闲置或交叉复用。
- reviewer 不得自核验，两席不得互相核验，assessor 不得是任一 reviewer；grant issuer 必须与 verifier、两席 reviewer 和项目内越权角色分离。
- verifier authority scope 必须绑定 Bazi v1.7、固定 review purpose、两席和四个固定问题。
- identity、credential、四题 scope、verifier authority 与十个 independence factor 都要求 primary 与 independent corroborating evidence 成对出现。
- primary/corroborating 必须是不同 evidence record、不同 digest、不同 opaque/public ref，并且 control/content-lineage/derivation provenance group 不得复用；同一 dossier、镜像、同作品再包装或 same-upstream 不得多重计数。
- public 与 private ref 严格二选一：活动 ref 必须是安全 opaque ID，非活动 ref 必须严格等于 `null`，不能在未启用字段中夹带邮箱、URL、正文或私有材料。
- 四个 scope question 和十个 independence factor 都按固定顺序全覆盖；一般主题、课程页、协会角色或其他体系经验不能替代逐题 scope。
- 候选自摘要固定为 domain-separated SHA-256，但 `digestIsDigitalSignature=false`、`authenticityEstablished=false`。
- 完整 synthetic no-person 结构通过只返回 `materialStructurePreflighted=true`；返回值由模块私有 WeakSet 标记，clone/spread 不能冒充当前验证结果。

## 零实例与隐私边界

持久化实例数组全部为空；当前计数继续固定：

- `reviewerSlotsOccupied=0`
- `realReviewerInstances=0`
- `verifierIdentityInstances=0`
- `verifierAuthorityGrantInstances=0`
- `credentialVerificationEvents=0`
- `identitiesVerified=0`
- `credentialsVerified=0`
- `scopeFitsVerified=0`
- `pairwiseIndependenceMaterials=0`
- `expertReviewBundles=0`

仓内 child 不含现实人姓名、联系方式、证件、原始 credential、private dossier、页面正文、exact quote、截图、原始意见或 outreach 信息。候选结果中的 digest 仍明确为：

- `candidateDigestIsAnonymous=false`
- `candidateDigestSafeToPublish=false`
- `personalDataPresenceAssessed=false`

因此不能把摘要当作去标识、可公开材料或隐私审查结论。

## 验证证据

执行命令均为显式文件列表，没有使用裸 `node --test`：

```text
node --test scripts/verify-bazi-expert-authority-material-precheck.test.mjs
结果：35/35 通过

node --test scripts/verify-bazi-expert-public-candidate-prescreen.test.mjs scripts/verify-bazi-expert-public-evidence-followup.test.mjs scripts/verify-bazi-expert-authority-material-precheck.test.mjs
结果：86/86 通过

node --test scripts/verify-release-governance.test.mjs
结果：193/193 通过
```

独立红队先发现并复现两项 P2：未启用 ref 可夹带对象、两席可共用同一 verifier authority material 并留下未消费材料。修复后分别由 `EVIDENCE_VISIBILITY_INVALID` 与 `AUTHORITY_MATERIAL_GRAPH_INVALID` fail closed；34/34 定向测试复跑通过，最终没有剩余可操作 P1/P2。

旧 formal packet 定向测试单列为预期红态：

```text
node --test scripts/verify-bazi-expert-review-packet.test.mjs
结果：44/47；3 个失败均先遇到 INTAKE_GAP_BINDING_DRIFT
```

这不是新 child 的失败，也不能被计入绿色通过数；它是旧 packet/gap 尚未与当前 readiness 对齐的真实阻塞。

体系草案边界也单列：

```text
node --test scripts/verify-system-contract-draft-boundaries.test.mjs
结果：69/70
```

没有新增 D child 问题。既有输出仍记录受限源未检查、旧 `bazi-expert-review-packet-lib.mjs` 的未登记 bare/local imports，以及旧 exact-quote 测试的 non-literal dynamic import；这些未在本 tranche 修改或掩盖。

## 分账结论

| 账本 | 本 tranche 结论 |
|---|---|
| 工程证据 | 独立 zero-instance contract、strict parser、held-handle endpoint、candidate graph 和 fail-closed tests 已机械验证 |
| 浏览器/运行时证据 | 未运行产品浏览器、PWA、正式仓储或公开主机；未建立 Node binary/loader/launcher/toolchain 身份 |
| 内容真值 | `not_established` |
| 专家真值 | `not_established`；现实专家 0/2，意见 0/2 |
| 权利/法律判断 | `not_established`；本 child 不作许可或法律结论 |
| 发布就绪 | `false` |
| 专家宣称授权 | `expertClaimsAuthorized=false` |
| 公开部署授权 | `publicDeploymentAuthorized=false` |

观察边界继续固定：`crossFileAtomicSnapshot=false`、`mutationEpochAvailable=false`、`intervalMutationExcluded=false`、`abaExcluded=false`、`sameSessionReplayExcluded=false`、`workspaceCustodyEstablished=false`。

## 后续真正需要的外部材料

本 child 之后若要进入现实专家审定，必须另行获得并保护：核验者现实身份与 authority trust root、grant issuer 身份与权限依据、两席各自的 primary credential 与独立佐证、四题逐项 scope 材料、十因素双边声明与外部佐证、共同上游披露、真实性/first-seen/custody 记录，以及用户明确授权的受保护外部 intake。公开线索、生成模型简介、自述 bio、单一 dossier、自摘要或本 child 的结构通过都不能替代这些材料。

在这些材料及新的 current formal intake admission 决策建立前，旧 packet/gap 不得自动刷新，新 child 不得反向接入 formal gate，专家意见不得收集或宣称，公开发布继续不授权。
