# B 阶段 formal rollback phase 哈希链合同验证 v1（2026-08-27）

## 1. 结论

本切片把 formal rollback verifier 中原本位于执行准入之后、当前无法由正式入口到达的 phase receipt/hash-chain 核心抽成唯一共享纯函数：

```text
validateRollbackPhaseReceiptProjectionForContract
```

它只证明一份内存中的 phase 声明、phase receipt envelope 与已经验证的 host、Edge、Chrome、deployment 摘要之间满足固定的 A→B→A 哈希链合同。它不读取文件、不验证原始 transport、浏览器、provider、演员或私有数据真实性，也不产生任何 gate、claim、authority、admission 或发布授权。

正式 rollback v1 继续保持：

```text
status: contract_only_not_executed
executionAdmission: closed_missing_trusted_raw_evidence
legacy-v13 / targetSchema 13 / migrationId null
publicDeploymentAuthorized: false
expertClaimsAuthorized: false
```

## 2. 固定输入边界

纯 helper 要求：

- phase 精确属于 `baseline / candidate / rollbackObserved`；
- expected identity 独立通过完整 default-v13 检查；
- run id 为 `hrr1-` 加 32 位小写十六进制；
- origin 为 canonical、默认端口 HTTPS origin；
- phase、receipt binding、envelope、digest context 均使用 exact keys；
- phase 为单次 `passed`，`failureCode=null`；
- 时间使用 canonical UTC millisecond serialization，`durationMs` 等于精确差值；
- runtime observation 精确绑定对应 A 或 B 的 Release Evidence、build、应用壳、Service Worker、controller、origin 与在线状态；
- host、Edge、Chrome 摘要均为 SHA-256；
- baseline 的 deployment 与 previous digest 必须为 `null`；candidate 和 rollbackObserved 两者均必须为 SHA-256；
- envelope 的 canonical unsigned digest、envelope evidence digest 与 phase evidence digest 三者相同。

Schema 13 不存在 mutation epoch；helper 的输入和返回值均不允许添加 `epoch: 0` 或其他 epoch 字段。

## 3. 正式文件 wrapper 与 admission 顺序

私有 `verifyPhaseReceipt` 保留真实 `readBindingFile` 和 JSON parse，只从已经验证的 host/browser/deployment wrapper 结果取得摘要，再调用纯 helper。它不相信 Evidence 自己重复声明的 receipt digest。

正式入口中的 `assertRollbackExecutionAdmission(policyResult.rollbackPolicy)` 仍唯一存在，并位于 artifact、host、browser、deployment、phase、private data、attestation 与 terminal 全部下游之前。没有 `skipAdmission`、`allowClosed`、`bypassAdmission` 或测试令牌。

治理还明确禁止 rollback/provider 候选 composition 导入 phase helper。phase helper 属于正式工具代码的合同回归，不是候选准入入口。

## 4. 返回投影

返回值是 detached、递归冻结的最小投影，只包含：

- phase 身份、状态与时间；
- runtime observation；
- host、Edge、Chrome、deployment 与 previous phase 摘要；
- canonical evidence digest；
- phase receipt 的声明 binding。

返回值不包含 `gates`、`claims`、`authority`、`usableForAdmission`、`rollbackEvidenceVerified`、`rollbackEngineeringGatePassed` 或 mutation epoch 字段。

## 5. 本地机械验证账

- rollback contract：30/30，其中原 18 项保持不变，新增 phase/hash-chain 12 项；
- `test:release-evidence`：204/204；
- release governance：155/155；
- rollback 30 + persisted provider sequence 16 + projection-only composition 14，以 `--test-isolation=none` 合并执行：60/60；
- `check:release-governance`：通过；
- formal npm lifecycle closure：仍精确访问 84 个脚本，canonical SHA-256 仍为 `eaba293e79453b250ce1d3520989da0dad184843e40dd28a9231c296f2bc9092`；
- 对应 rollback/provider 临时目录：无残留；
- 测试文件之间没有 `.test.mjs` 导入。

本切片没有运行网络、HTTPS、Chrome/Edge、PWA/Service Worker、provider、部署、回滚、真实 v13 数据、默认 Web build 或全仓 typecheck。

## 6. 仍未完成

formal rollback 的正式通过路径仍缺：

1. 现实平台选择与审定平台档案；
2. formal Release Evidence 语义重放；
3. host 原始 probe、Chrome/Edge CDP transport transcript 与 provider-specific raw receipt parser；
4. 实际 controller source 重算；
5. 私有 v13 包 HMAC/加密材料重算；
6. actor registry 治理根签名和现实演员；
7. 跨阶段冻结、离线回滚观察与真实 A→B→A 执行。

未选择现实 provider 前，不实现 generic trusted provider v2。未来 provider v2 必须以被用户明确选择的平台实际 API/CLI、认证、独立回读与 operation identity 语义为依据，并把 `operationId` 与 `resultActiveDeploymentId` 分开。

以上工程合同不建立内容真值、专家真值、来源许可、权利法律结论、发布就绪或公开发布授权。
