# 吠陀独立浏览器质量门与 Release Evidence 设计候选 v0.1

日期：2026-09-01  
状态：`requirements-only / candidate-only / zero implementation / zero receipts / activeAdmissionEffect=none`

## 1. 本轮结果

本轮完成 ADR-0001 重新审阅第 6 项所要求的“独立浏览器质量门和 Release Evidence 设计”的候选材料，但没有完成正式重新审阅，也没有建立任何 Release Evidence 实例。

新增候选：

- `content/system-admission/vedic-independent-browser-quality-gate-and-release-evidence-design-candidate.v0.1.0.json`
- raw identity：`45,131 bytes / 4f2ecea6cb8d639c23fa3b06528b217319e93d171a7db57f0a5331172a5ae673`
- `designDigest`：`c66ebecac08cbfad109d7bf11b6d63d7e8468bd075c599f105d4d515cbda768c`
- `designId`：`hakimi.vedic.independent-browser-quality-gate-and-release-evidence.design-candidate/0.1.0`

`designMaterialCandidateComplete=true` 只表示 8 份 requirements 文本已经齐备。它不表示设计被正式采纳、实现已开始、receipt 已签发、重新审阅已满足、Release Evidence 已完成或产品可以发布。

## 2. 五个直接上游

候选固定绑定并在当前路径重验五个直接上游：

1. 吠陀独立产品边界 ADR，第 6 项精确标记；
2. formal parent v1，`ledgerDigest=1017f048...`，目标项仍为 `required_absent`；
3. runtime/bundle proposal v1，`proposalDigest=ae9fb180...`，浏览器与 retention 仍只是计划；
4. storage/backup/recovery/rollback design candidate，通过完整固定路径 loader 的私有品牌消费；
5. civil-time→UTC fact-only browser observation candidate，通过完整固定路径 loader 的私有品牌消费。

五个直接上游均绑定固定 path、bytes 与 raw SHA-256，并在任何上游语义／full-loader 验证前先完成五份 direct identity 顺序校验。ADR 的 hash 与 marker 来自同一 buffer；formal parent、runtime proposal 与 storage candidate 三份 JSON 的 hash、严格 UTF-8／canonical parse 与 semantic digest 校验来自各自同一次单文件读取。browser observation 的 direct snapshot hash 与 child full-loader serialization 是两次顺序读取，所以明确保持 `sameBufferHashParsePerBoundFile=false`，不得把它升级为五文件全同 buffer。storage 与 browser child 还必须由各自模块的完整固定路径 loader 签发私有品牌，不能由 caller 自造对象或只抄嵌入摘要替代。

本候选没有独立重锁这五个 child 展开的 35 个去重传递 raw 端点。因此明确记录：

- `transitiveClosureIndependentlyRawPinned=false`
- `transitiveCurrentRawContextsIndependentlyPinned=0`
- `completeCurrentRawClosureClaimed=false`

这是一项有意保留的证据强度降级，不能称 40 个上游端点或加候选自身后的 41 点完整 current raw closure。

## 3. 精确八接口

顺序、大小写和 exact-set 固定如下：

1. `microsoft_edge_browser_receipt_interface`
2. `google_chrome_browser_receipt_interface`
3. `artifact_identity_receipt_interface`
4. `build_receipt_interface`
5. `runtime_execution_receipt_interface`
6. `deployment_receipt_interface`
7. `rollback_receipt_interface`
8. `evidence_retention_receipt_interface`

每项均使用与既有 storage design candidate 对齐的十字段 requirements-only 形状：fail-closed 条件、接口 ID、不变量、非主张、实现前证据、输入、输出、requirements 已定义、runtime 实现数量和状态。当前每项 `runtimeImplementationInstances=0`，状态均为 `requirements_only_zero_implementation`。

未来 Release Evidence exact-set 的最低 receipt 数量设计为：

| 接口角色 | 最低数量 | 当前接受数量 |
|---|---:|---:|
| Edge browser | 3 | 0 |
| Chrome browser | 3 | 0 |
| artifact identity | 1 | 0 |
| build | 2 | 0 |
| runtime execution | 6 | 0 |
| deployment | 1 | 0 |
| release rollback | 1 | 0 |
| evidence retention | 1 | 0 |

未来容器必须拒绝缺失角色、额外角色、重复 receipt ID、同一 receipt 复用多个角色，以及不同 product／release／artifact／runtime／build／storage／deployment host 的拼包。所有 receipt 必须绑定同一套非空吠陀产品身份、release identity、evidence-set identity、source lock、artifact identity、runtime option、build identity及适用的 storage／host identity，并具备 chronology、freshness、replay、supersession／revocation 规则。当前这些要求只有文本，没有实现或实例。

Edge 与 Chrome 各自的三次未来运行还固定为不可重复的 exact run-role matrix：

1. 新空 profile、online、owner-selected desktop viewport、cold cache 的首次加载；
2. 第二个新空 profile、online、desktop browser 模拟 `390x844`、cold cache 的首次加载；
3. retained profile 上从 release N 在线安装，经 offline cold start、在线更新到 N+1，再 offline recheck 的 cache／Service Worker／update convergence。

每个角色都要求唯一 run ID、唯一 profile directory、精确浏览器版本和同一五场景集，当前 executed/formal receipt instances 均为 0。交叉绑定字段还精确包含 `target_schema_identity`、`migration_identity`、`mutation_epoch_lineage` 与 `rollback_release_lineage`；缺少这些 lineage 时整体失败关闭。所有 receipt 共同绑定待验 subject release N+1；transition 角色另行绑定 predecessor release N 与 update lineage，predecessor 不得替代 subject。

## 4. 既有浏览器与构建观察没有升级

已有 civil-time child 仅投影为 operator-supplied engineering baseline：

- 两次 OS-temp build，12-file envelope 相同，统一 output digest 为 `2037ddbf...`；
- 一次 Codex In-app Browser loopback 观察，版本未知；
- 五个 synthetic scenario：`unique / gap / overlap_reject / overlap_earlier / overlap_later`；
- console probe 已执行并观察到 0 warning/error；
- CSP `form-action 'none'` 与 `connect-src 'none'` 来自独立 HTTP response 读取，不冒充 IAB DOM 证据；
- 没有真实人物数据。

这些观察明确不是正式 receipt：

- Edge、Chrome、cross-browser、production browser/runtime/host 均未验证；
- network 未探测，count 保持 `null`；
- storage 与 cookie 检查受工具边界禁止，probe 为 false、mutation 为 `null`；
- Service Worker 未探测，registration 为 `null`；
- build 与页面实际加载字节之间没有 tool attestation；
- loopback 不是 deployment；
- 两次相同构建不是正式 artifact identity 或 build receipt。

`false / null / not probed` 不得归一化成零活动或成功证据。

## 5. 计划 ceiling 仍未测量、未批准

runtime proposal 中 Edge 与 Chrome 各计划 3 次，当前执行分别为 0；两个 runtime option 共 18 个 candidate ceiling，observed measurement 为 0。

evidence retention 的 `50,000,000` 与 `100,000,000` bytes 仅是两个未选择 runtime option 下的 `unapproved_candidate / not_measured` ceiling：

- 不等于实测容量；
- 不等于批准预算；
- 不等于 retention receipt；
- 不选择 runtime、storage backend、namespace 或数据库。

storage candidate 的六接口仍全部是 requirements-only。backup、recovery、rollback 的实现、dry-run、receipt 均为 0；mutation epoch、CAS、跨文件原子、interval integrity 与 ABA exclusion 均未建立。storage 的 `rollback_interface` 设计文本与未来 release `rollback_receipt_interface` 是两个不同角色，前者不能充当后者的执行证据。

## 6. 七账与全部红门

本轮继续分开记录：

1. 工程证据；
2. 浏览器／运行时证据；
3. 内容真值；
4. 专家真值；
5. 权利与法律判断；
6. 发布就绪；
7. 公开发布授权。

候选现已把这七个 account ID 与逐账全红状态显式列出，不再只保留 `evidenceAccountCount=7`。工程和 IAB 账可以记录 observation present，但 formal receipt 与 authority 仍为 false；其余五账 established／authority 均为 false。

当前固定状态：

- formal rereview：`3/7`，目标项仍 `required_absent`；
- admission：`0/8`；
- Binding：`0/38`；
- 现实独立专家：`0/2`；
- Release Evidence set：`0`；
- 八类 accepted receipts：全部 `0`；
- `requirementsUniverseClosed=false`；
- content/expert/scientific truth、source freeze、rights/legal conclusion、artifact authenticity：全部 false；
- `releaseEvidenceComplete / releaseReady / publicDeploymentAuthorized / publicReleaseAuthorized / expertClaimsAuthorized / formalAdmissionAuthorized / domainAuthorityAuthorized`：全部 false；
- 吠陀 `productIdentity / releaseIdentity / targetSchema / migrationId`：`null / null / null / null`；
- runtime、storage backend、namespace、database、正式 product surface：未选择或不存在。

项目默认治理背景仍为 `legacy-v13 / targetSchema 13 / migrationId null`，但 `inheritedByVedicProductIdentity=false`。该背景不得成为吠陀产品身份，也不得继承八字、紫微或西洋体系权威。

## 7. 验证证据

新增 verifier 覆盖：

- 严格 canonical JSON、普通／转义 duplicate key、转义字段、compact／重排／额外 LF、BOM、非对象与不安全 byte view 拒绝；
- Proxy、alias/cycle、accessor、custom prototype、稀疏数组拒绝；
- post-import `WeakSet.has`、`Object.isFrozen`、`Object.getOwnPropertyDescriptor`、`Array.prototype[Symbol.iterator]`、`Array.prototype.push` 与继承 setter 定向投毒不能伪造私有品牌、形成浅冻结 mint，或让 branded summary 丢失 own 红门字段／八接口成员；
- 重新计算 digest 后的 gate、receipt、authority、identity、production-browser、null→0、epoch 与 closure 提权仍拒绝；
- clean fixture 先成功重建；五个直接上游任一同长度 raw 字节漂移均以 `BOUND_CONTEXT_IDENTITY_MISMATCH` 失败关闭；
- 任一 bound path chain 含 junction 均以 `BOUND_PATH_LINK_REJECTED` 失败关闭；
- candidate CRLF／缺失失败关闭；
- CLI operand、`NODE_OPTIONS`、`NODE_PATH`、`process.execArgv` 与 missing state 失败关闭；
- candidate raw SHA-256 使用精确固定值断言，不再只检查 64 位十六进制形状；
- 完整固定路径 loader 才能签发窄私有品牌。

结果：

- 专用测试在最终稳定快照默认／串行各 `18/18`；独立只读终审 `P0/P1/P2/P3=0/0/0/0`，并以真实 fixed-path 定向复现确认 inherited-setter／ambient-push P1 已关闭；
- 受影响四个既有吠陀测试文件：`169/169`；
- 三个新增脚本 `node --check`：通过；
- 固定 CLI：exit 0，输出工程观察与全红 authority／gate 的机械投影；该投影不签发正式 receipt，也不提升任何权威或发布状态。

这些结果没有运行全仓 typecheck、默认 Web build、完整应用、正式 Chrome／Edge、PWA／Service Worker、公开主机、部署或回滚，也不建立现实内容、专家、权利法律或发布证据。

## 8. 观察边界与下一步

固定路径使用顺序单文件观察。候选没有 mutation epoch，也不证明跨文件同时态、原子快照、interval mutation 排除或 ABA exclusion。SHA-256 是一致性摘要，不是数字签名、可信启动、发布者认证或 artifact authenticity。

若未来正式推进第 6 项，必须另行：

1. 决定独立吠陀 product/release/schema/migration 与 runtime/storage identity；
2. 实现八接口并生成 raw 可重验 receipt；
3. 在正式 Edge 与 Chrome 各完成精确三次独立运行；
4. 完成 artifact、build、runtime、HTTPS deployment、PWA/SW/offline/update、release rollback 与 retention 的同包交叉绑定；
5. 由所有者独立作出部署和公开发布决定；
6. 另行更新并复核 formal parent、Registry／Manifest，不能由本 candidate 自动回写。

C 的私有原始材料验证与 D 的现实专家外联继续需要用户分别明确授权；本轮未启动两者。
