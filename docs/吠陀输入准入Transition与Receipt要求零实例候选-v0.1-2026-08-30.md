# 吠陀输入准入 Transition 与 Receipt 要求零实例候选 v0.1（2026-08-30）

## 结论先行

本文件说明 `content/system-admission/vedic-input-admission-transition-and-receipt-requirements.v0.1.0.json`。它只定义未来吠陀输入准入 transition、receipt、角色、冻结 packet、mutation epoch、evaluation snapshot、撤销和 supersession 必须满足的要求；当前没有 executable receipt schema、没有正向 transition evaluator、没有 receipt 或 transition 实例，也没有任何准入或授权效果。

本工件不能被称为“已实现状态机”。即使未来所有结构要求均被实现并机械通过，8 条输入准入条件仍只是必要条件，不单独构成正式体系准入、产品可用、发布就绪或公开发布授权。

项目发布治理继续固定为 `legacy-v13 / targetSchema 13 / migrationId null`。这只是现有项目上下文；吠陀的 `targetSchema`、`migrationId` 和 `releaseIdentity` 继续为 `null`，不得继承八字 v1.7 的版本、内容、专家、权利或发布结论。

## 为什么单独建立本合同

前一份 readiness 候选已经诚实记录 13 条输入要求、26 个语义 invariant 和 8 条必要条件均为零态，但同时明确：

- `positiveTransitionEvaluatorImplemented = false`
- `positiveReceiptSchemasDefined = false`
- `positiveTransitionReceiptsAccepted = 0`
- `currentFrozenPacketDigest = null`
- `currentAdmissionEpochReceipt = null`
- mutation epoch、跨文件原子快照、interval mutation exclusion 和 ABA exclusion 均未建立
- 独立法律权限角色、席位、资格、签署和真实性 schema 均缺失

本合同补的是“未来正向机制必须长什么样”的版本化要求，不补任何现实实例，也不把缺失事实填成通过。它不改写 readiness 候选、历史 parent 或 central registry。

## 三种身份不得混用

“同一 epoch”若把历史证据的签发时点、后端写入时钟和最终评估快照混成一个数字，将无法支持证据分批形成，也无法排除 replay 或 A→B→A。未来实现必须分开：

1. `admissionCycleId + packetId + packetDigest`：标识一次不可变的 13-row / 26-invariant 治理 packet。packet 任一值变化即新 cycle；旧意见不得自动继承。
2. `ledgerGenerationId + mutationEpoch`：后端 CAS 与 mutation 身份。generation 不得复用；成功 mutation 必须使 epoch 精确加一，失败不得改变 state、epoch、nonce、receipt、revocation head 或 chain head。
3. `evaluationSnapshotEpoch`：最终 evaluator 对 receipt exact set、签名状态、撤销状态和角色状态作一次原子只读重验的快照时钟。历史 evidence receipt 可以在此前不同 mutation epoch 签发，但进入 gate 的 binding 与最终评估必须绑定同一 cycle、packet 和 snapshot。

状态 digest 不是 ABA 防护。A→B→A 即使恢复相同 `stateDigest`，`mutationEpoch` 和 `chainHead` 也必须不同；旧 generation、旧 predecessor、旧 chain head、旧 nonce 或旧 receipt 均应被拒绝。若没有备份之外的 monotonic anchor 或 fencing 证据，只能声称单一 ledger 实例内防重放，不能声称抵抗离线 clone、清库重建或旧备份回滚。

## 未来状态与 transition 只是一份要求表

本合同允许未来实现下列候选状态标签，但当前 `stateInstances = []`，不存在状态对象：

- `uninstantiated`
- `packet_frozen_receipts_incomplete`
- `pre_snapshot_evidence_manifest_complete_unverified`
- `conditions_1_to_7_verified_supersession_pending`
- `all_eight_conditions_mechanically_verified_input_gate_candidate`
- `invalidated_new_packet_and_epoch_required`

最后一个正向状态刻意只叫 `input_gate_candidate`，不能命名为 admitted、authorized 或 ready。`invalidated_new_packet_and_epoch_required` 是不可就地恢复的终态；新增、更正、撤回、吊销、替换、packet 漂移或 epoch 漂移都必须进入该状态，并用新 packet、新 cycle、新 epoch 和新 evaluation instance 重新开始。

未来 transition family 仅包括冻结 packet、封存 pre-snapshot evidence manifest、验证条件 1–7、验证 owner/formal projection 的第 8 条，以及 append-only invalidation。日常证据收集不是可覆盖旧状态的 transition；证据只能 append-only，闭包后才能 seal。

当前必须保持：

- `transitionEvaluatorImplemented = false`
- `executableReceiptSchemasImplemented = false`
- `transitionInstances = []`
- `receiptInstances = []`
- `evaluationReceipts = 0`
- `supersessionReceipts = 0`
- `inputContractGateSatisfied = false`
- `activeAdmissionEffect = none`

## Receipt family 与 exact-set 边界

本合同定义的是字段与 cardinality 要求，不是可接收实例的 executable schema。未来至少需要冻结 packet、13 份 owner selection、13 份来源/第一方 binding、13 份三层权利证据、两份覆盖同一 13 项 packet 的领域专家原始意见 binding、一份并列分歧清单、两份独立 source-rights review、独立 legal-authority disposition、结构 validator、语义 validator、一个不含个人数据的 private-lifecycle public attestation、epoch snapshot、条件 1–7 evaluation、owner supersession intent、formal supersession commit 和最终 readiness evaluation receipt。另定义 correction、withdrawal、revocation 与 transition rejection 四类 non-success lifecycle receipt；它们永远不能进入成功 exact set。

所有 aggregate、snapshot、supersession commit 与两级 evaluation 的 transition/epoch/state/chain/nonce-head 字段必须按 receipt kind 使用各自的 exact schema；不存在一组可被任意 receipt kind 继承的通用 additional-fields 数组。这样可避免 snapshot 被迫引用包含自身输出的 evaluation manifest，也避免两级 evaluation 的 layer-specific manifest digest 被通用字段别名化。

必须对下列集合做 exact-set equality，而不是只比较计数：

- 精确 13 个 requirement ID
- 精确 26 个 invariant ID，并保持各自所属 requirement 行
- 精确 8 个 condition ID
- 每个 manifest layer 或 transition output 内 receipt family 的规定 cardinality、角色和覆盖范围

16 个 success family 不构成一份 flat manifest。未来必须按三个互不自引用且 digest domain 不同的层构造：pre-snapshot evidence manifest 明确排除 snapshot/evaluation/supersession 输出；条件 1–7 evaluation input 只包含前一 manifest digest 与 epoch-snapshot receipt digest，并排除其自身输出；final evaluation input 只包含条件 1–7 evaluation、supersession intent 与 supersession commit 的 digest，并排除 final receipt 自身。12/13、25/26、7/8、重复 ID、别名、unknown/extra ID、空 ref、一个 receipt 被重复计数、跨 packet/版本/generation/snapshot 拼接或把 output 填回自身 input manifest，都必须得到 `not_ready_no_product_receipt`。

frozen packet 还必须固定 owner 最终 `selectedValueSetDigest`、`targetUseProfileDigest`、`questionSetDigest`、source-binding manifest、三层权利证据 manifest、validator profile set、private-lifecycle policy、distribution operation set、target jurisdiction set 与 review/disagreement instruction digest。每份 binding receipt 都要逐项匹配这些 packet 字段；只匹配 `packetId` 或只比较 13/26/8 计数不足以证明专家、source-rights reviewer 和 legal authority 审的是同一组最终选择与用途。

## 角色与法律权限分离

未来要求按下列现实责任分账；当前所有角色实例、席位实例、身份核验和签署实例仍为 0：

| 角色 | 可形成的证据 | 禁止越权 |
| --- | --- | --- |
| `product_owner` | 冻结用途、渠道、受众、目标辖区、13 项取值与 scope、采用限制和 supersession intent | 不得自行补作领域意见、权利审查或法律结论，不得覆盖未决或否定法律处置 |
| `vedic_domain_expert` | 输入/事实/规则语义、流派范围、反例、内容相关性、高风险表达意见 | 不得签 rights/legal conclusion、工程证明、采用或发布授权 |
| `source_rights_reviewer` | 来源链、作品/版本/载体身份和证据、notice/license 事实、分发操作矩阵建议；兼任 provenance evidence review | 不得签最终法律结论、领域真值、工程或发布授权 |
| `engineering_reproducibility_reviewer` | schema、digest、同 packet/snapshot、validator、签名密码学状态、mutation/ABA 与 lifecycle 的机械核验 | 不得签现实身份真值、领域真值、权利法律结论或公开授权 |
| `independent_legal_authority` | 对冻结用途、材料层级、操作和覆盖辖区作范围受限的法律处置 | 不得替代来源证据审查、领域真值、工程证明、owner 决策或公开发布授权 |
| `formal_admission_governance` | 机械核对 parent/registry preimage、postimage、transaction 与 rollback ref | 不是内容、专家、法律或发布权威 |

两名 domain expert 必须是不同现实自然人；两名 source-rights reviewer 必须相互独立；legal authority 必须与两名 source-rights reviewer 分离。原始意见不得覆盖，只能以 append-only correction、withdrawal 或 revocation 追踪。分歧不得多数表决、平均或由生成模型选择赢家。

法律角色当前继续 `required_undefined`：实际最低席位数取决于目标辖区覆盖，role/eligibility/jurisdiction/capacity/signature profile 尚未形成获准的 executable schema。结构验证器最多证明某份 legal receipt 的字段、字节、签名引用和覆盖关系符合未来 schema；它不能建立签署者现实身份、资格、独立性、适用法或法律意见正确性。

“审查完成”也不等于“允许再分发”。`not_permitted` 可以是完整处置，但 owner 必须把相应操作从目标用途排除并落实 private/link-only；任何 requested operation 为 deferred、out-of-scope、未覆盖或已撤销，均须 fail closed。

## 治理 receipt 的个人数据机械排除

本合同只允许 `governance_policy_packet_only`，且当前 `candidateInstanceCount = 0`。未来公开治理 envelope 的 exact schema 不得允许：

- 民用出生日期及 year/month/day
- 本地出生时间、精度、时间不确定区间或候选
- 与个人绑定的 IANA zone、地点名、纬经度和精度
- UTC/candidate instant、扰动候选或 transition point
- 姓名、别名、自由文本备注、个人输入 ref
- 由上述字段稳定派生的 digest、fingerprint 或可链接 identifier

`containsPersonalData = false` 之类自声明和简单 key blacklist 不能证明无个人数据。未来 parser 必须使用 exact schema 与已冻结的 governance digest allowlist 机械复算；所有公开随机 `receiptId`、`operationId` 和 generation-scoped nonce 不得由个人数据派生。真实个人输入的 lifecycle receipt 必须另用 private schema 和 namespace，不能被本 admission evaluator 消费，也不能进入 DOM、URL、history、console、log、telemetry、network、Cache、Service Worker、IndexedDB、localStorage 或 sessionStorage 的公开面。

Condition 7 不能把 `privateLifecyclePolicyRef` 冒充完成证据。未来 evaluator 只能消费一份 public non-person lifecycle attestation：它必须绑定 private lifecycle schema、retention/deletion policy、合成 canary corpus、受保护 runtime evidence context、freshness policy 和当前 revocation head，同时精确保持 candidate refs、personal-data refs、person-derived digest 和 free text 为空。该 attestation 当前实例数为 0；即使将来结构有效，也不单独证明真实浏览器或后端无泄漏。

当前静态合同只能证明这些要求写入并保持 zero instance；它没有证明浏览器或后端已经做到无泄漏。

## Replay、撤销、恢复与 supersession

未来实现必须满足：

- 同一 idempotency key 的重试只能返回 byte-identical 原 receipt；不同 payload 必须 conflict。
- generation-scoped operation nonce、前后 consumed-nonce-set head 必须同时进入 CAS precondition、原子 commit 与 receipt envelope；已消费 nonce、operation、receipt 或 evidence ID 不得重复使用。
- 撤销是 append-only forward mutation，推进 epoch，并使全部依赖 condition/gate 立即回落为 false；不存在 un-revoke。
- correction、withdrawal 与 revocation 三类 receipt 都是前向失效 mutation：`afterEpoch = beforeEpoch + 1`；receipt 的前后 revocation-ledger head 必须分别与 CAS precondition 的 previous revocation head、atomic commit 的 next revocation head 是同一值；consumed-nonce head 必须发生变化，且只能通过加入本 ledger generation 的当前 operation nonce 在同一原子提交中推进。operation nonce 必须被消费。
- transition rejection 是确定性的零 ledger mutation 失败响应：不含 `targetReceiptId`，before/after epoch、state digest、chain head、revocation head 与 consumed-nonce head 必须逐项相等，operation nonce 不得被消费。
- 缓存 verdict 必须绑定并重验当前 generation、epoch 与 revocation head。
- recovery/rollback 是 forward mutation，不得倒退 epoch。
- multi-tab、worker、device 或多 connection 必须有 single-writer fencing 或明确 replica/fork model，否则拒绝。
- supersession 只接受显式 owner intent 与 formal-governance commit，并绑定 predecessor/successor packet、旧/新 generation、registry before/after、撤销/分歧处置和 rollback ref。
- 较高 semver、较新 `createdAt` 或覆盖文件都不构成 supersession。

本合同不实现任何 transaction，也不更新 parent 或 registry。`formalParentUpdated = false`、`centralRegistryUpdated = false`、`supersedesReadinessCandidate = false`。

## 直接上游与完整性身份

本合同只直接固定两个当前工件：

1. readiness candidate：定义 13/26/8 的零态与当前角色缺口；
2. independent storage design candidate：定义 mutation epoch、CAS、backup/recovery/rollback 的零实现设计边界。

readiness candidate 已经绑定其 34 个工程与治理 endpoint；本合同不复制第二份易漂移的 34 项清单。直接加载器会分别调用两份上游的固定加载器并核对当前 raw/semantic identity，但这仍是逐文件 held-handle 的非原子观察，不是 simultaneous current closure、跨文件 atomic snapshot 或 mutation epoch receipt。

合同本体身份在落盘验证后冻结：

- 路径：`content/system-admission/vedic-input-admission-transition-and-receipt-requirements.v0.1.0.json`
- 文件字节数：`57125`
- raw SHA-256：`e394f26f581b517666fec4b8361cba85c6c2761d0dfd06ba5cab23710bafde4d`
- `contractDigest`：`548a0ab95dbe030dda2c158a7a4583c4591d98be75bc9f9a604ff98cff3d52ac`
- digest domain：`hakimi/vedic-input-admission-transition-and-receipt-requirements/v0.1.0`
- canonicalization：`sorted_object_keys_compact_json_finite_numbers_aliases_expanded_active_cycles_rejected_v1`

`contractDigest` 只建立 domain-separated 完整性标识，不是数字签名，不建立作者身份、真实性、专家真值、法律真值或发布授权。

## 设计证据、运行时证据和外部真值继续分账

静态合同与固定 verifier 最多能证明：字段、exact keys、版本、transition graph、receipt 要求、zero instances、全红 authority、canonical digest，以及纯结构攻击 fixture 被拒绝。

后续仍需独立运行时证据证明：state + epoch + receipt + nonce + revocation head 的同事务提交；abort/crash/quota/eviction；并发 tab/worker/connection；A→B→A；clear/recreate；旧备份 restore、offline clone/fork；旧 receipt/nonce replay；撤销后继续使用；真实 Chrome/Edge 的 DOM/URL/console/network/storage/Service Worker canary；真实 key custody、signature、revocation 和 trust anchor。

现实 owner 授权、两位现实独立专家、两位 source-rights reviewer、legal authority 的身份/资格/独立性、内容真值和法律结论仍属于外部真值。机器与生成模型不能判定这些现实事实，也不能把签名的密码学有效性提升为签署者现实身份、权限或结论正确性。

## 本工件明确不建立

- 已冻结的实际 13 项取值或来源 packet；
- 任何个人输入实例、稳定个人摘要或产品输入处理权限；
- executable receipt schema、transition evaluator 或 runtime receipt；
- mutation epoch、跨文件原子快照、interval mutation exclusion、ABA 或跨备份/克隆 rollback resistance；
- 作品、版本、载体权利、许可、再分发或法律结论；
- 现实专家、reviewer、owner、legal authority 的身份、资格、独立性或意见；
- 内容真值、专家真值、法律真值或吠陀传统权威；
- parent supersession、registry 更新、吠陀 target schema、migration 或 release identity；
- 正式体系准入、产品集成、发布就绪、Release Evidence、部署/回滚确认；
- 专家 claims、高风险 claims、公开部署或公开发布授权；
- 八字 v1.7 或 `legacy-v13 / targetSchema 13` 向吠陀的继承。

## 当前验证

工作目录固定为 `C:\Users\Administrator\Documents\哈基米算命`。本节只记录本合同和固定验证器的当前工程验证，不把历史测试、隔离浏览器演示或上游局部构建当作本合同运行时通过。

- `node --check scripts/vedic-input-admission-transition-and-receipt-requirements-lib.mjs`：exit `0`
- `node --check scripts/verify-vedic-input-admission-transition-and-receipt-requirements.mjs`：exit `0`
- `node --check scripts/verify-vedic-input-admission-transition-and-receipt-requirements.test.mjs`：exit `0`
- `node scripts/verify-vedic-input-admission-transition-and-receipt-requirements.mjs`：exit `0`
- `node --test scripts/verify-vedic-input-admission-transition-and-receipt-requirements.test.mjs`：`35/35` pass，`0` fail，`0` skipped，`0` todo
- 独立以 `domain + NUL + sorted-key compact JSON` 重算 `contractDigest`：与 persisted 值一致
- `npm.cmd run check:release-governance`：exit `0`；项目默认仍为 `legacy-v13 / targetSchema 13 / migrationId null`，`publicDeploymentAuthorized=false`、`expertClaimsAuthorized=false`

35 个测试覆盖固定 loader 私有品牌与 deep-freeze、raw/semantic identity、canonical LF、严格 UTF-8/BOM/duplicate-key/size/root 检查、13/26/8 exact sets、六角色与空席、legal required-undefined、16 类分层 success receipt 与 4 类 non-success lifecycle receipt、三种 epoch 身份、21 个 ordered guards、generation-scoped nonce 与 consumed-nonce head、十项 frozen packet review-content digest、三个不同 domain 的无环 manifest、逐 receipt kind 的 snapshot/commit/evaluation 字段、三类前向失效的 epoch/head/nonce 原子推进与 revocation CAS exact identity mapping、transition rejection 的 before/after 全等与 nonce 不消费、public non-person lifecycle attestation、PII/person-derived digest 排除、零实例与全红 authority、自重签 authority/instance/evaluator/schema/逐类型 lifecycle 语义攻击、绕过 contract-digest 闸门后直接命中 non-success exact-validator 的删除/弱化负例、12/13/25/26/7/8 partial 攻击、flat manifest/self-output、跨 packet/generation/epoch/replay/ABA、角色重叠、自验资格、多数/平均/模型赢家、匿名化伪称、targetSchema 13 外推、supersession 和上游绑定发明，以及 endpoint missing/empty/oversize/hardlink/symlink、路径逃逸、held-handle truncate/grow/replace、CLI operand 与可见 Node launch state 拒绝。

`npm.cmd run check:system-contract-draft-boundaries` 当前 exit `1`。本合同五个新路径没有注册进 `scripts/system-contract-draft-registry.json`，所以该命令没有遍历并覆盖本轮新 lib/CLI/test 的 import/target 边界；“输出未列出新 finding”不能当作覆盖或通过证据。命令实际报告的仍是既有项目账：受限文件被明确跳过、`bazi-expert-review-packet-lib.mjs` 的既有未注册 imports/targets，以及三个既有测试的 non-literal dynamic import。本轮不登记通用 draft boundary 通过，也没有读取受限文件。

固定 CLI 当前输出：13 个 requirement ID、26 个 invariant ID、8 个 condition ID、21 个 guard、5 个 authority role 加 1 个 formal projection actor、16 个分层 success receipt family、4 个 non-success lifecycle kind、10 个 packet review-content binding field 与 3 个无环 manifest layer 均已定义要求；但 executable receipt schema、positive evaluator、receipt/transition/cycle/generation/snapshot/manifest/lifecycle-attestation 实例、nonce runtime enforcement、runtime receipt evidence、personal input、mutation epoch、atomic snapshot、ABA、single-writer fencing、external monotonic anchor、法律角色实例、准入和全部发布 authority 继续为 0、`null` 或 `false`。

即使上述工程检查通过，也只进入工程证据账，不进入浏览器/运行时、内容、专家、权利法律、发布就绪或公开授权账。
