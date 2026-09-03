# 阶段 C：12 Binding readiness 版本感知后继 v1.8

日期：2026-08-31  
状态：本地机械观察候选；`0/12`；无中央准入效力

## 结论

新增 `hakimi.bazi.strength.binding-freeze-candidate-readiness/1.8.0`，在不改写 v1.7 历史账的前提下，把 Binding readiness 的 source／rights 父位从 `1.6.0 / 1.2.0` 更新为 `1.7.0 / 1.3.0`，并消费 SMT-v10 paired supersession 与 SourceCarrier readiness v1.1 的私有品牌。

十二行 binding 的 ordinal、subject 和其余语义保持精确不变；只有第 10 行 SMT-v10 candidate 从 v1 单向切换到 v2。该变化把机械观察计数更新为：carrier observation `6`、visual page correspondence `9`、normalized facsimile collation `8`、exact-glyph facsimile correspondence `2`；candidate quote digest 仍为 `6`。

这些数字只代表被固定本地账本中的候选观察，不是可靠底本、同版、正文、exact quote、作品层许可、载体层许可或正式 binding 已完成。

## 固定身份

| 项目 | 值 |
|---|---|
| artifact | `content/system-admission/bazi-binding-freeze-requirements.v1.8.0.json` |
| raw identity | `35,616 bytes / f612019e19255f47be03a569bb4cf3e61227146a924c4c63a2b75f1b28649ab3` |
| ledger digest | `6ed301be956d160e06126eed63a7155ab8182adbcbc7e0def2690e8271e50866` |
| loader | `scripts/bazi-smt-v10-version-aware-binding-readiness-lib.mjs` — `24,435 bytes / e31098bff8498ba8acb8ede893596950a1daef29aa1a7b16ba467b980321ef36` |
| CLI | `scripts/verify-bazi-smt-v10-version-aware-binding-readiness.mjs` — `5,425 bytes / 0a0b5ed74669d8092549cc22dbe123b6a264519c829a1b9be8134354e31461c9` |
| tests | `scripts/verify-bazi-smt-v10-version-aware-binding-readiness.test.mjs` — `15,016 bytes / 2b100dccca5ff0ae5be033765d2d4a1419dbe7fefff8792441fb690e72d7aa19` |

loader 必须取得 predecessor v1.7、SMT-v10 supersession 和 SourceCarrier readiness v1.1 三个 full fixed-path loader 的私有品牌；结构克隆、旧新父混配、自重签 digest、删改／重排任一 binding 行都不能铸造结果品牌。

## 仍为红的门

- formal KnowledgeDocument、SourceRightsRecord、SourceCarrierRecord、ProjectCopyMaterializationRecord 均为 `0`；materialization verified 为 `0`。
- binding freeze 为 `0/12`；verified natural-person rights reviewer、domain expert review、rights legal review 均为 `0`。
- `sameEditionVerified=false`、`specificWikisourceCarrierProvenanceEstablished=false`、`externalCarrierLiveVerifiedThisRun=false`。
- `sourceBundleComplete=false`、`rightsBundleComplete=false`、`expertReviewBundleComplete=false`。
- `activeAdmissionEffect="none"`、`releaseReady=false`、`publicDeploymentAuthorized=false`、`expertClaimsAuthorized=false`。
- 默认治理保持 `legacy-v13 / targetSchema 13 / migrationId null`。
- `crossFileAtomicSnapshot=false`、Schema 13 mutation epoch 不存在、receipt 为 `null`，interval mutation 与 ABA 均未排除。
- 没有中央 consumer backlink；v1.8 不是正式 registry 当前项。

## 运行时信任校准与红队结论

CLI 前缀为 `BAZI_SMT_V10_VERSION_AWARE_BINDING_READINESS_OBSERVATION_OK`，只表示当前进程观察。它明确把 hidden preload exclusion、Node runtime identity、loader identity、launcher identity、CLI output attestation 和 visible-loader guard security boundary 全部记为 `false`；机械结果假定任意代码没有在模块求值前执行。

红队复核没有发现 P1。已关闭的 P2／P3 包括 CLI import 副作用、误导性的 `_OK` 语义及 `-0` 与 `0` canonical alias。canonicalizer 会对调用者提供的 Proxy 执行反射 trap；生产 full loader 的权威输入来自严格 JSON 与私有品牌，因此当前未形成 authority promotion，但不得把公共 helper 描述成“对任意同进程对象零代码执行”的安全边界。

## 本轮验证

```text
node --test scripts/verify-bazi-smt-v10-version-aware-binding-readiness.test.mjs
# 23/23

node --test --test-concurrency=1 scripts/verify-bazi-smt-v10-version-aware-binding-readiness.test.mjs
# 23/23

node scripts/verify-bazi-smt-v10-version-aware-binding-readiness.mjs
# exit 0; *_OBSERVATION_OK
```

三个 `.mjs` 文件均通过 `node --check`。本轮没有外部载体访问、专家工作、浏览器／PWA、正式仓储、公开主机、Release Evidence、部署或回滚；也没有运行全仓 typecheck 或默认 Web build。
