# 当前发布状态

更新时间：2026-09-01

本页是当前发布身份的人工权威入口；机器权威来自构建 HTML 中的发布清单和 Release Evidence。历史交接文档保留作证据，不代表当前发布授权。

## 当前默认

| 项目 | 当前值 |
| --- | --- |
| 产品定位 | 本地优先八字研究工具、工程预览 |
| 普通构建 | `legacy-v13` |
| targetSchema | `13` |
| migrationId | `null` |
| 默认数据库 | `hakimi-bazi-research` |
| v16 | 隔离候选，不是默认发布代 |
| 正式工程浏览器矩阵 | 桌面 Chrome、桌面 Edge |
| Android / Firefox / Safari | 未授权支持声明 |
| 专家金标 | `verified=0`，不得显示为专家已验证 |
| 许可证 | 保留全部权利的临时默认，不声称开源 |
| 公开托管 | 平台未选择，未授权公开生产发布 |

## 证据边界

- Release Evidence 是工程证据，绑定源树、提交、lockfile、清单、构建文件与测试回执。
- dirty 工作树可以生成明确标记为不可发布的本地工程快照，但不能生成正式发布资格。
- 工程摘要不等于代码签名、专家签名、内容授权或真实用户发布历史。
- Schema 16 只有在发布历史、当前迁移证据、真实数据副本回滚和所有者批准均闭环后才能晋级。

## 四层工程门

| 层级 | 工作流 | 当前职责 |
| --- | --- | --- |
| PR 快门 | `quick-ci.yml` | 治理、证据工具、类型、单元测试、默认 v13 构建与清单 |
| 迁移门 | `migration-ci.yml` | v13→v14、v13→v15、v14→v15、v13→v16 跨代浏览器与孤立 v13 只读恢复 |
| 夜间重门 | `nightly-heavy.yml` | 备份、PWA、可访问性、容量与重浏览器场景 |
| Release | `release-evidence.yml` | 干净源树、精确命令回执、构建/SW 契约和可重算证据包 |

Release 层的工程门只有在策略规定的完整回执集合、命令、源树、lockfile、默认 v13 描述符和最终构建产物全部一致时才可为 `true`。这仍不关闭下面的外部门。

## Release Evidence Schema 执行状态

Release Evidence Schema 现已接入 generator、verifier 与治理检查，不再只是 policy hash 输入。它封闭完整 descriptor、browser-result binding/summary/project、artifact mutation boundary 及其余对象层，并执行 type、pattern、`date-time`、required、数组界限和唯一性。generator 写盘前验证；verifier 在 Git 状态读取前验证。正式 mutation boundary 固定为四项 receipt 的 endpoint snapshot 语义，显式写明 Schema 13 没有 mutation epoch，且不声明 interval mutation 或 ABA 已被排除。

default-v13 generator 默认采用策略中的完整 13 项 receipt，显式列表和实际记录的 receipt ID 集合都必须与策略精确相等；默认 descriptor 的全部 11 个字段以及 repository、branch、toolchain 必须可重算。`allow-dirty` 和 `allow-unbound` 只能分别放宽源树清洁度和 artifact evidence-ID binding，不能绕过其余工程门。Schema 审核子集还会拒绝 `type` 与 `const/enum` 的静默降格组合。当前回归只建立工具契约；没有生成或验证当前工作区正式 evidence，也没有执行全仓 typecheck 或默认 build。

## 真实主机 verifier 契约

部署验证 policy 已升级为闭合 v2，明确 document route 矩阵、远端 Release Evidence 路径、非公开部署控制/Evidence sidecar、MIME 白名单、cache longest-match 与四类 redirect matrix。`_headers` 现在以 `/*` no-store 为基线、`/assets/*` immutable 为例外，并加入精确 HSTS；治理检查按精确 route/header 解析，不再接受 substring 证据。

真实 CLI 只接受由内部 formal verifier 成功授权、再由本地 Release Evidence、sidecar、policy 原始字节与 artifact identity lock 建立的预期身份；仅 Schema-valid 的本地 expectation 不能进入 real weak-set。执行顺序固定为 real-host policy preflight、formal evidence verifier、local artifact/index/SW AST 复核、public DNS address-set gate、真实网络矩阵。mocked fetch 入口与真实入口分离，mock 结果永远不能令 `publicHttpsVerified` 或 `realHostVerified` 为 true。逐路径核对 status、零意外重定向、安全/危险行为头、cache、UTF-8 MIME、identity content coding、流式字节大小和 SHA-256；document deep routes 必须绑定同一锁定 index，全部公开 artifact 与远端 evidence 都必须匹配，`_headers` 与正式 Evidence sidecar 必须远端隐藏。

当前 policy 继续为 `deploymentPlatform: unselected`、`canonicalOrigin: null`、`redirectRules: []` 和 Report-Only CSP，真实 CLI 因而会在 artifact、Git-backed verifier 和网络之前停止。现有回归是 mocked-host verifier contract，不是公开 HTTPS 主机、CSP blocking/browser enforcement、PWA/SW、部署、回滚、发布就绪或公开发布授权。详见 [真实主机部署验证器机械契约 v2](../release/真实主机部署验证器机械契约-v2-2026-08-26.md)。

当前机械结果为 `test:release-evidence` 204/204（其中 Release Evidence core 55/55）、治理回归 164/164、正式完整恢复 CAS 定向回归 59/59、storage-v13 candidate runtime/reporter/verifier 47/47、provider candidate loader/runtime/sequence 聚合 46/46、host candidate collector/writer/loader 33/33、deployed-PWA v3 离线 consumer 43/43、独立 host/provider/PWA composition v1 12/12、SW runtime client capture 16/16、SW 已解码浏览器 API transcript bundle 15/15、SW 采集器临时签发候选 24/24、SW candidate/runtime capture composition 8/8，以及 SW 两代本地夹具与 A→B 离线候选合同 47/47。本轮另将 SW candidate 32、runtime capture 16、composition 8 与治理 150 合并复跑为 206/206，并以 `--test-isolation=none` 验证 candidate + composition 精确执行 40/40；共享 fixture 独立成非测试模块，治理机械禁止 composition 再导入 candidate `.test.mjs`。storage、runtime capture、decoded API transcript 与两类 composition 均没有并入正式证据工具聚合；本次 204 项中的新增 19 项分别属于共享 deployment receipt helper 7 项与 phase/hash-chain helper 12 项合同回归。正式 boot/backup 配置的静态枚举分别为 Edge/Chrome 共 12/8 个 tuple，定向 strict TypeScript 通过；没有运行这些浏览器 tuple、正式 generator/verifier、默认构建、真实 DNS/HTTP 主机或浏览器 enforcement，只能登记为工具契约证据。正式四项浏览器回执现在都必须预览同一锁定 `dist/web`，并各自在命令前后绑定 artifact lock 端点；artifact inventory 拒绝持久 alias/hardlink，关键 JSON 由同一 held Buffer 完成摘要与解析，但这些检查仍不外推成 Schema 13 不存在的区间 mutation/ABA 证明。storage-v13 候选现在独立要求 export backup 与 `after_ui_read` 物理快照的 15 个共有分区计数一致，同时仍保留 four deferred boundaries；相同 count 不证明记录内容或 ZIP 正文一致。provider/host candidate 的最终 receipt hard-link 一旦公开便进入统一失败 guard，之后会重验来源与全部输出，进程内失败时写固定 discard tombstone；host 另有独立 exact-set/opened-handle loader，但磁盘包不能证明 writer 私有 network provenance，故仍固定 `realNetworkTransportProvenanceVerified=false`。Provider A→B→A sequence writer 已改为先预置固定 discard sentinel，在 exact-two 与独立待完成态复验通过后才把删除 sentinel 作为最后发布步骤；sequence loader 会显式接纳并重新绑定单包 loader 的 recorded-only artifact projection，但不把它解释为当前来源或真实 provider 权威；writer 返回仍要求调用方再跑正式 exact-one verifier，不声称 final set 已在 writer 内独立复验。PWA v3 consumer 现在对全部引用 receipt/attachment 文件做初末两次精确 file-set 枚举，但明确只属于 endpoint snapshots，不声称终点重读全部 bytes、区间 mutation 或 ABA 排除。本段所列 storage/provider/host/PWA 候选继续是 `untrusted_candidate / not_admitted`；其他候选以各自精确枚举为准。详见 [B 阶段正式 Release Evidence 同锁定产物回执修正](../release/B阶段正式Release-Evidence同锁定产物回执修正-2026-08-27.md)与 [B 阶段正式证据与候选回执终点复验补强](../release/B阶段正式证据与候选回执终点复验补强-2026-08-27.md)。

2026-08-28 取代说明：上段关于 provider/host receipt 发布后 callback + discard tombstone 的描述，以及其中对应的 2026-08-27 点时计数，均只保留为历史证据，不再代表当前候选格式。当前 Host 为 PREPARED/COMMITTED 精确五文件，Provider 为精确七文件；65-byte terminal marker 均绑定 raw receipt SHA-256，writer 在全部复验后以 pending→terminal 同目录 rename 作为最后一个可能失败的步骤，loader 只接受 COMMITTED exact set。composition v1 冻结两边 `terminalGateBinding`，Provider A→B→A sequence 的统一 held identity 为 17；持久化 sequence 对 deploy／restore 的 `terminal-commit` 都冻结 `path`、`size=65`、marker `sha256` 与 `commitsReceiptSha256`，不持久化文件系统 identity，persisted verifier 在 digest 前直接重算 marker SHA。sequence CLI 已把磁盘发布与 JSON/stdout 呈现分账，呈现失败不再倒写 `sequenceCandidateWritten=false`；另有 production collector 生成 deploy/restore 两个 exact-7 包并贯通 sequence loader、writer 与 persisted verifier 的集成证据。rollback/provider sequence composition 进一步要求 persisted verifier 的 `pending=false`、最终输出集合已验证、当前重组与重叠窗口成立、attempts／authorization 精确关闭，并把两个 terminal gate 纳入自身 digest。当前定向复验为 Host 30/30、Provider runtime+loader 26/26、Provider sequence 18/18（三文件聚合 44/44）、host/provider/PWA composition 12/12、rollback/provider sequence composition 21/21、release-governance 193/193；直接治理检查报告 sequence Schema frozen、sequence CLI ledger 与 production Provider→sequence integration 三项绑定均为 true，受影响生产脚本语法检查通过。该结果仍是离线工程合同证据：未运行浏览器、网络、真实 HTTPS、公开主机、部署、默认 Web build、全仓 typecheck 或正式 Release Evidence 实例；受限文件未读取；`deploymentPlatform=unselected`、`publicDeploymentAuthorized=false`、`expertClaimsAuthorized=false`，B 阶段仍未通过。

deployed-PWA v3 的共享合成 fixture 现已独立为非测试模块；v3 测试无条件注册，host/provider/PWA composition 的 fixture 与测试均不得再导入 v3 `.test.mjs`。修复前的无隔离同进程运行会因模块缓存只登记 composition 12 项与一个空测试文件壳；修复后精确执行 v3 43 + composition 12 = 55/55。治理把新 fixture、composition Schema/实现/fixture/测试/边界文档列为必需文件，并冻结导入方向。该 55/55 仍只是合成离线合同证据，不是 HTTPS、浏览器、provider、部署或发布证据。

PR5 的 exact-v13 跨连接完整备份 CAS 集成测试现为 8/8：保留 stale-valid 必须以 `CURRENT_DATA_CHANGED` 拒绝和 non-stale-valid 成功恢复两个控制组，并新增缺失摘要、显式 `undefined`、accessor 摘要、额外根键、自定义根 prototype 与大写摘要六个 malformed 负例。backup 正式入口现在通过共享运行时捕获器要求精确自有 data-property 壳与 mandatory 小写 SHA-256，Worker 客户端在接受 `verified_ready` 前复用同一捕获器，storage 最终防线区分“字段确实缺省”与“字段存在但为 undefined”；getter 负例保持零调用。所有 malformed case 都在仓储写入前以 `VERIFIED_REPLACEMENT_INVALID` 或 `BACKUP_WORKER_RESULT_INVALID` 失败，第三连接确认竞争写完整保留且 incoming 零部分落盘；v13 的 mutation state 与 calculation receipt 物理 store 仍不存在，没有伪造 epoch 0。三文件定向回归合计 59/59，受影响 strict TypeScript 切片通过，治理新增 mandatory-CAS 退化拒绝并把 SW 关键源码身份按 storage 实际字节重新冻结。它仍不是双标签页浏览器、旧 v13 artifact/现实数据 provenance、部署或发布证据，`two-tab` 继续保持 deferred。详见 [B 阶段正式完整恢复 CAS 运行时边界修复](../release/B阶段正式完整恢复CAS运行时边界修复-2026-08-28.md)。

上段的 `47/47` 与 count-only 描述属于 v1 历史点时证据，不是通用入口的当前语义。storage-v13 候选已通过 wire-breaking v2 增加完整 bounded hashed Case/Revision/revision-fingerprint semantic witness、Case edit-stable 摘要、`candidate_set` fingerprint 聚合守卫、15 个共有分区的独立 `sha256_canonical_json_multiset_v1` 内容交叉绑定，以及 delete 的 `before_trash → after_trash_before_permanent_delete → after_permanent_delete` 三段前置证明；每浏览器现为 16 个 capture。changed-store 判定同时绑定 count、native records digest、logical content digest 与对应 semantic projection；伪造者即使同步重绑五个下游 snapshot、backup、attachment、receipt 与 summary，也不能把 export 的摘要跃迁伪装成零写入。通用 collector/runtime/reporter/verifier 只接受 v2；v1 policy/Schema 继续作为历史未准入合同，以 raw/canonical 双 SHA 冻结，禁止升级转换或原地改写。`transaction-failure` 只承接 storage transaction abort；第四项为独立的 `cross-schema-no-backwrite`，`crossSchemaNoBackwriteVerified=false`，不得借用部署 rollback authority。当前 summary 发布已删除 rename 后再依赖条件性回退/invalidation 的补偿模型，改为精确 `PREPARED`/`COMMITTED` 两态 5 项根集合：final summary 与 65-byte pending terminal marker 完成全部复核、Windows marker handle 关闭后，原生同目录 terminal rename 才是最后可传播失败的操作；官方 verifier 拒绝 pending/缺失/额外/旧 invalidation/错误字节/硬链接/身份复用，并在 API 与 CLI 中统一投影 `terminalCommitMarkerVerified` 和 `terminalGateBinding`。测试 seam 只能制造固定的 terminal 目标目录冲突，不接受 callback，不能表达 commit-then-throw。当前 v2 runtime/reporter/verifier 合成定向回归 64/64、专用 strict TypeScript 通过；storage-v13 治理定向 5/5、完整治理 191/191、`check:release-governance` 与 Release Evidence 合同聚合 204/204 均通过。五个 PR5 行为关键源已按 normalized SHA 精确冻结，共用 native reader 的 SW critical source-set 保持其既有冻结状态 `static_contract_only_not_executed`；正式 84-script closure 只是静态遍历，摘要仍为 `eaba293e79453b250ce1d3520989da0dad184843e40dd28a9231c296f2bc9092`。这些结果只关闭当前进程合同里的 commit-then-throw 分叉，不证明断电持久性、目录 fsync、原子 no-replace、区间 mutation 或 ABA。v2 仍固定 `legacy-v13 / 13 / null / epoch null` 与全部 authority false；当前没有生成本轮真实 Edge/Chrome 回执，也没有完成双标签页、现实旧 v13、v13→v16 no-backwrite、真实 SW/PWA、公开主机、部署或回滚证据。详见 [默认 v13 正式仓储语义见证候选矩阵 v2](../release/默认v13正式仓储语义见证候选矩阵-v2-2026-08-28.md)。

当前已实现私有、只读的 composition v1：它在初末两轮亲自重跑 host v1 loader、provider v1 loader 与 deployed-PWA v3 verifier，并比较共同 release/artifact/scope/deployment/chronology 投影；CLI 即使机械一致也固定 `exit 1`，结果仍是 `untrusted_candidate_composition / not_admitted / usableForAdmission=false`。它不是正式 Release Evidence receipt，两个 npm scripts 从正式 npm/lifecycle/workspace 命令图不可达，也不改变 13 项 receipt allowlist；源码仍由全仓 `sourceTreeDigest` 绑定，但源码身份绑定不等于正式执行、闭包通过或授权。

host/provider v1 producer 与 deployed-PWA v3 consumer 的 producer trust mismatch 仍未解决：v1 loader 固定关闭的 network provenance、real-host、provider-authenticated、raw projection 与 operation claims 不能被 composition 或 adapter 提升为 v3 输入中的 true。当前 12/12 只证明三个候选包可以共享机械身份与引用边界，不把设计记为工程门通过；可信 producer/parser 出现后仍须另行设计 v4。详见 [B 阶段 v1 候选与 PWA v3 组合边界](../release/B阶段v1候选与PWA-v3组合边界-2026-08-27.md)。

SW runtime client capture 的 8 个 tuple 已改为 phase-major：先完成 Edge/Chrome 的全部 `initial-a` 双 slot，且最后一个 initial 时间必须严格早于任一 `post-claim`；随后才允许记录 Edge/Chrome post。旧的 project-major（先完成 Edge initial→post，再记录 Chrome initial）与主候选“一次共享切换前两个浏览器都在 A”矛盾，builder 与离线 verifier 现都会拒绝。该修复只消除未来真实 collector 的合同自相矛盾；capture 仍是 `capture_incomplete / usableForCandidateAssembly=false`，caller page authenticity、runtime provenance 与所有发布授权仍为 false。

SW candidate/runtime capture composition v1 现已按 `(projectName, phase, slot)` 唯一键把 browser-major 主候选 projection 与 phase-major runtime projection 交叉绑定，并保留 8 项 runtime observedAt、两浏览器 receipt chronology 与 shared A→B switch chronology。它重跑两套基础 verifier 的初末端点，核对输入/source raw SHA-256、canonical SHA-256、证据摘要与冻结 projection；candidate held terminal bytes 的重算 digest 必须同时等于 verifier result/projection，runtime 实际消费的 policy/Schema bindings 必须等于 checked sources，每次 held read 还会在 open 后重验体积并拒绝已知输入间物理别名。第 8 项聚焦测试会以合成候选、38 个附件、两个 artifact root 和合成 runtime capture 走完整真实磁盘 compose API 与 CLI，但没有访问 HTTPS、浏览器或真实运行时；它只消除了 I/O 编排未覆盖，不产生浏览器证据。端点快照仍明确不证明区间 mutation 或 ABA。结果固定为 `untrusted_candidate_composition / not_admitted / usableForCandidateAssembly=false / exit 1`，正式 13-receipt allowlist 与闭包摘要 `eaba293e79453b250ce1d3520989da0dad184843e40dd28a9231c296f2bc9092` 未改变。详见 [SW A→B 候选与运行时客户端采集组合边界](../release/SW-A到B候选与运行时客户端采集组合边界-v1-2026-08-27.md)。

PR6 另新增严格的 9 文件已解码浏览器 API transcript bundle：8 个 phase-major tuple 保留 Playwright `CDPSession.send` 与页面 `MessageChannel` 返回的完整已解码对象，第 9 个 manifest 最后发布；loader 拒绝额外文件、重复 JSON key、软/硬链接别名、自洽重绑后的连续性破坏及 Schema 13 伪造 mutation epoch，并从磁盘包重算既有 runtime-client-capture v1 投影。它只建立 `decodedApiObjectProjectionDerivationVerified=true`；`cdpWireBytesCaptured`、浏览器传输真实性、caller page authenticity、runtime provenance、真实双标签页/离线/更新、正式回执与发布准入全部固定为 false，CLI 即使机械有效也以 `capture_incomplete / closed_missing_selected_https_origin / exit 1` 收口。15/15 合同测试与该切片登记的 159/159 治理回归通过，但没有运行浏览器、HTTPS 或部署。详见 [PR6 运行时已解码 API transcript 候选边界](../release/PR6运行时已解码API-transcript候选边界-v1-2026-08-27.md)。

PR6 在上述 9 文件 transcript 外层新增 collector-owned、attempt-local Ed25519 临时自签 issuance candidate。成功物理树为 `00`、内含 8 tuple 与 manifest 的 `api-transcript/`、`99`，共 11 份 JSON；自签语义为 marker signature、8 项 predecessor-linked tuple digest 与 terminal receipt signature 的 10 项逻辑链；治理冻结的 policy/Schema/边界文档与 9 份脚本组成第三个 12 文件 source family，三者不得互换。候选固定 `default-v13 / legacy-v13 / targetSchema 13 / migrationId null / epoch null`，完整冻结输出分别列出 release identity、capabilities、provenance 与 authority。临时私钥只直接签 marker 与 receipt，receipt 对八项 hash chain 作终态整体覆盖；它不证明逐条独立签名、外部身份、可信 collector、浏览器/运行时/传输、HTTPS、freshness、replay resistance、区间 mutation、ABA、部署、发布、内容、专家或权利法律结论。若 writer 在 `99` 已发布后失败，v1 磁盘格式没有持久 commit/tombstone；后续 loader 只能重验当前端点，不能证明 writer 成功返回或保留失败历史。结果继续固定为 `untrusted_ephemeral_self_signed_collector_issuance_candidate / issuance_incomplete / closed_missing_selected_https_origin / exit 1`，`publicDeploymentAuthorized=false`、`expertClaimsAuthorized=false`。原始切片点时验证为 issuance 24/24、capture+transcript+issuance 55/55、治理 164/164、正式 Release Evidence 204/204；正式 closure 为 84 个脚本与 `eaba293e79453b250ce1d3520989da0dad184843e40dd28a9231c296f2bc9092`。详见 [PR6 采集器临时签发候选边界](../release/PR6采集器临时签发候选边界-v1-2026-08-28.md)。

2026-08-28 live Page adapter 取代说明：writer 现在只公开 `begin / collectNext...FromPage / finalize / abort`，不再公开 reserve、complete 或 `testOnly` 绕路；fixture 与测试同样只能经 exact `{session,page}` 入口。内部固定执行 reservation nonce、单一 CDP session 的 pre→MessageChannel challenge→post→detach→private complete，并以一次性 WeakSet-branded envelope 交付 decoded object 与时间线。十个时间字段在实际 capture 边界采样；`completedAt` 精确表示 adapter capture envelope 完成，不冒充 writer state/marker commit 终点。newCDPSession、pre/evaluate/post/detach 五类 never-settle 均有固定 deadline；晚到 CDP session 另做有界 best-effort detach，同步 postMessage 异常立即清理 port/timer。当前机械验证为 issuance+adapter 52/52、九 family 194/194、release-governance 193/193、正式 Release Evidence 204/204，system-contract draft isolation 与直接治理均通过；formal closure 仍为 84 / `eaba293e79453b250ce1d3520989da0dad184843e40dd28a9231c296f2bc9092`。这些测试全部使用 fake Page/工程 fixture，未运行真实 Chrome/Edge、CDP wire capture、HTTPS、双标签页、PWA/SW、公开主机、部署或回滚；`runAttemptCoordinationStatus=run_attempt_coordination_absent`、`deploymentPlatform=unselected`、`publicDeploymentAuthorized=false`、`expertClaimsAuthorized=false`，B 阶段仍未通过。

PR6 现另有独立四链 composition family，把冻结的 SW A→B candidate/runtime-capture 两链 v1、issuance root 内固定 `api-transcript/` 的独立复验和 collector issuance 做离线机械交叉绑定；旧两链 v1 未被修改或升级。入口保留原七个路径并新增 `issuanceRunRoot`，不接受另一个可选 transcript root。来源按新 composition、旧两链 composition、candidate、raw capture、transcript、issuance 六组 policy/Schema 固定为 12 个唯一路径；嵌套 verifier 重复引用的共享路径必须与外层 held bytes 在 size、raw SHA-256 与 canonical SHA-256 上完全一致。issuance loader 的一次固定 checkpoint 内以 `Promise.allSettled` 等待旧 composition 与 transcript loader；`candidateAndRuntimePrimaryInputsHeldAcrossIssuance=true`、`issuanceFilesHeldAcrossOldCompositionAndTranscriptReverification=true`，但 attachments/private/artifacts 只继承旧 v1 的端点边界，故 `allEvidenceFilesContinuouslyHeldAcrossComposition=false`。Schema 13 继续固定 `epoch=null`，continuous epoch、same-permission mutation exclusion、interval mutation exclusion 与 ABA exclusion 全为 false。组合器严格要求独立 runtime input、transcript derived projection 与 issuance 的 evidence digest 相等，但当前 probe 自行生成 observation/capture 时间戳，issuance 又分配独立 tuple timeline 并以 completedAt 派生 observedAt；现有 producer 没有发布同一份完整 immutable derived runtime evidence，因此状态明确为 `producer_bridge_absent`，自然生产链通常不可达该相等条件。即使合成输入机械一致，结果仍是 `offline_untrusted_four_chain_composition_candidate / untrusted_four_chain_composition_candidate / not_admitted / exit 1`，全部 provenance/authority、正式 receipt、部署/发布/内容/专家/权利与 schema promotion 均为 false。最终验证为新 family focused `18/18`、public API 收口后四文件组合 `65/65`、六 family 受影响切片 `113/113`、release-governance `171/171` 且 `check:release-governance` 通过、正式 Release Evidence 合同聚合 `204/204`、system-contract-draft-boundaries `42/42` 且 `check:system-contract-draft-boundaries` 通过；formal npm closure 仍精确访问 `84` 个 scripts，canonical SHA-256 为 `eaba293e79453b250ce1d3520989da0dad184843e40dd28a9231c296f2bc9092`。这些结果不关闭 `producer_bridge_absent`，也不提升 held-window、mutation epoch、provenance 或 authority。没有运行浏览器、网络、真实 HTTPS、公开主机、部署、全仓 typecheck 或默认 build，且未读取受限的 `apps/web/src/lib/local-user-data-cleanup.ts`；这不是浏览器、HTTPS、公开主机、部署、Release Evidence 实例、发布就绪或公开发布授权。详见 [PR6 四链离线组合候选边界](../release/PR6四链离线组合候选边界-v1-2026-08-28.md)。

PR6 另以独立 `sw-ab-update-runtime-derived-evidence-producer-bridge` v1 family，把 collector issuance 中冻结的 decoded transcript 确定性重构为完整 runtime-client-capture。成功 bridge root 是 exact committed 3：`01-derived-runtime-client-capture.json`、`99-producer-bridge-publication.json` 与 `100-producer-bridge-publication-commit.sha256`；terminal commit 前或失败时的已物化 root 是以 `.producer-bridge-publication-pending` 取代 `100` 的 exact pending 3，public loader 必须拒绝。marker bytes 精确为小写 `publicationDigest + LF`；最后接受点是不可由 test seam 覆盖的原生 pending→terminal 同目录 rename，其后只剩吞错 handle close 与预构结果 return。它只建立 `producer_bridge_present_mechanically_untrusted / bridge_candidate_not_admitted / exit 1`；旧四链 composition v1 完全不变，仍明确为 `producer_bridge_absent`。focused `26/26` 覆盖 terminal gate 与失败关闭，但输入仍是工程 fixture；Schema 13 仍为 `epoch=null`，全部 provenance/authority、运行时准入、正式 receipt、部署/发布/内容/专家/权利结论均为 false。详见 [PR6 运行时派生证据生产桥接候选边界](../release/PR6运行时派生证据生产桥接候选边界-v1-2026-08-28.md)。

在 bridge v1 之外，PR6 又新增独立 producer-bridge-aware 四链 composition v2。它固定消费 `<bridgeRoot>/01-derived-runtime-client-capture.json`，并在 issuance held checkpoint 内交叉复验旧两链、transcript、issuance 与 bridge，来源 inventory 精确为 14 个 JSON；bridge fingerprint 必须包含独立 `terminalGate` identity，v2 将其按 `100-producer-bridge-publication-commit.sha256` 逻辑路径纳入全链 physical-separation，缺失或跨逻辑路径 alias 都会失败关闭。`candidateAndBridgePrimaryInputsHeldAcrossIssuance=true`、`issuanceFilesHeldAcrossCompositionBranches=true`，但 `allEvidenceFilesContinuouslyHeldAcrossCaptureAndComposition=false`。v2 只在 injected/synthetic fixture 中得到 `runAttemptIdentifiersMatched=true`；自然 coordinator 仍不存在，因此 `runAttemptCoordinationStatus=run_attempt_coordination_absent`、`runAttemptCoordinationVerified=false`、`candidateProducerBoundToIssuanceAttempt=false`。最终工程证据分账为 v2 focused `27/27`、八 family 受影响切片 `166/166`、release-governance `191/191`、正式 Release Evidence 合同聚合 `204/204`、system-contract-draft-boundaries `42/42`；formal closure 仍为 `84` 个 scripts 与 `eaba293e79453b250ce1d3520989da0dad184843e40dd28a9231c296f2bc9092`。v2 仍是 `untrusted_four_chain_producer_bridge_composition_candidate / not_admitted / exit 1`，全部 authority 为 false；这些工程合同结果不证明真实浏览器、网络、HTTPS、公开主机、部署、内容、专家、权利或发布授权。本轮也未运行全仓 typecheck 或默认 build，且未读取受限的 `apps/web/src/lib/local-user-data-cleanup.ts`。详见 [PR6 生产桥接四链组合候选边界 v2](../release/PR6生产桥接四链组合候选边界-v2-2026-08-28.md)。

2026-08-28 真实执行前置审计进一步确认：当前 `deploymentPlatform=unselected`、`canonicalOrigin=null`，工作区只有一份 2026-08-21 历史 `dist/web`；其内置本地 Evidence 为 `hre1-49d643fdfc3a5181e2fba035d76691a0 / buildVersion d3f93c43232a / artifactSetDigest 99ee5ab5d483714f120a9522a7bf44a77aa38f098a6322e47199eae743f0e1ca`，但 `engineeringGatePassed=false`、没有独立 identity lock，并含不得直接公开的 local Evidence sidecar，因此不能充当真实 A 或 B。现有 deployed-PWA runner 只采单一已部署 Artifact，storage-v13 runner 只跑单产物仓储矩阵，two-generation runner 则固定为 loopback 合成三代；SW A→B candidate 仍没有 production writer/spec/reporter。单独增加复制 run/attempt 字符串或接受普通 JSON 事实的 coordinator 只会把 synthetic 自证产品化，本轮没有这样做。开始现实 A→B 前必须由所有者明确 provider/origin/外部写入与真实 Edge/Chrome 权限，并提供两份不同且带仓外 identity lock 的 legacy-v13 Artifact。详见 [B 阶段真实执行前置审计](../release/B阶段真实执行前置审计-2026-08-28.md)。

## 独立回滚证据执行准入

后部署回滚已从预部署的精确 13 项 Release Evidence 回执中分离，新增独立 Schema、policy、actor registry、私有离线 CLI 和失败账。Schema 固定 `legacy-v13 / 13 / null`，要求 A≠B、rollbackObserved=A、Chrome/Edge、现实主机、私有获批 v13 副本、`absent_schema13`、不同 actor/key、Ed25519 attestation 和 20 项派生 gate；formal verifier 也可写出仓外、不可覆盖的 `formal-verification.json`，且本地 allowance 不能把它提升为正式通过。

独立复核确认当前下游通过路径仍缺 formal 语义重放、原始 host/CDP/provider receipt 解析、实际 controller source 重算、HMAC/加密包重算、actor registry 治理根签名、逐阶段冻结及离线回滚观察。policy 因此固定 `contract_only_not_executed / closed_missing_trusted_raw_evidence`；当前未选主机会先失败，即便在隔离测试中选择语法合格主机，CLI 仍以 `ROLLBACK_EXECUTION_ADMISSION_CLOSED` 停止。当前 30 项 rollback-contract 测试中，原 11 项覆盖 Schema/identity/digest、签名语义、actor registry fingerprint、四域与链接隔离、两层早停和失败账；7 项覆盖共享 deployment receipt helper；新增 12 项覆盖 phase/hash-chain 纯合同的三阶段、默认 v13、runtime identity、host/Edge/Chrome/deployment 摘要、前序链、canonical digest 与冻结投影。正式文件 wrapper、artifact、原始 host/browser/provider、私有 data/attestation 与 terminal 路径仍未由正式入口执行，不得登记为真实回滚证据。详见 [独立 v13 真实回滚证据机械门](../release/独立v13真实回滚证据机械门-v1-2026-08-26.md)与 [B 阶段 formal rollback phase 哈希链合同验证](../release/B阶段formal-rollback-phase哈希链合同验证-v1-2026-08-27.md)。

本轮把 formal deployment receipt 的 exact binding/envelope/action/provider/active-deployment-id/origin/artifact-lock/expected-identity 规则抽成唯一共享纯 helper；formal private verifier 继续在原 admission 之后调用它，准入顺序与 policy 未变。另新增 rollback/provider projection-only composition v1：它只消费 persisted provider sequence verifier，在同一 overlapping checkpoint 内重验 rollback evidence、sidecar、两张实际 receipt、7 份 policy source 与 composition policy/Schema，并交叉绑定 provider/origin/hosting-policy raw SHA-256、B 与 restored A 的 declared active-deployment id、5 项共有 artifact identity 和时间关系。输入必须自行保持 `status=failed / failure!=null / 20 formal gates 全 false`；结果固定 `untrusted_candidate_composition / not_admitted / usableForAdmission=false / exit 1`。由于 provider v1 只接受 `unselected/null`，而 formal rollback 要求 selected canonical HTTPS host，`samePolicyEpochFormalCompositionAvailable=false`；该候选不证明 formal rollback、真实 provider、A→B→A、浏览器、数据回滚或发布授权。详见 [B 阶段 rollback 与 provider 序列投影组合边界](../release/B阶段rollback与provider序列投影组合边界-v1-2026-08-27.md)。

2026-08-27 历史点时记录：本切片当时的独立机械验证为 rollback contract/helper 30/30、persisted provider sequence 16/16、projection-only composition 14/14；三组在 `--test-isolation=none` 下合并执行为 60/60，且未残留对应临时目录。正式 `test:release-evidence` 当时为 204/204，该切片治理回归为 159/159，`check:release-governance` 通过；正式 npm lifecycle closure 精确访问 84 个脚本，canonical SHA-256 为 `eaba293e79453b250ce1d3520989da0dad184843e40dd28a9231c296f2bc9092`。该段计数已由上方 2026-08-28 取代说明更新，不代表当前 Provider sequence、projection-only composition 或治理用例数。新增治理固定 `contract_only_no_admission`、formal admission 先于全部下游、phase 投影不含 authority，并禁止候选 composition 消费 phase helper。这些结果没有运行真实浏览器、HTTPS、provider、部署或回滚，也没有运行受限的全仓 typecheck/default Web build。

## 既有产物本地预检

2026-08-26 对工作区既有的 2026-08-21 `dist/web` 做过一次不重建的本地后置锁预检。产物逐文件身份保持稳定，但它已经与当前源码和测试契约漂移：Chrome PWA 门在相同位置连续失败两次，Edge PWA 单项通过；Web v1 连续流在 Edge 和 Chrome 上均失败。因此该结果是失败证据，不是当前构建、正式 Release Evidence 或发布候选。详见 [既有 dist v13 本地同产物预检](../release/既有dist-v13本地同产物预检-2026-08-26.md)。

## 尚未关闭的外部门

- 所有者确认真实分发过的 Schema 与 migrationId。
- 所有者最终选择许可证及版权主体。
- 生产托管平台和真实响应头验证。
- 真实主机的路径级 cache/header 矩阵、CSP 阻断模式及产物身份绑定。
- 现实专家审核、身份确认和内容分发授权。
- 使用真实 v13 用户数据副本的发布与回滚演练。
- 与候选/baseline artifact lock、Chrome/Edge 和实际 Service Worker controller generation 绑定的独立回滚回执。

## D 阶段：八字 v1.7 与现实专家

2026-08-28 当前取代状态：八字 `single-chart-report@1.7.0` 的已保存 manifest 不再与当前工作区字节闭包一致，不能继续引用旧摘要作为当前有效机器身份。只读核验显示 `packages/bazi-core/src/index.ts` 从 manifest 锁定的 `73e0be8d…` 漂移到当前 `4c9b7fc5…`，根 `package.json` 从 `b8d8a31c…` 漂移到 `79ed3e10…`；本轮修复 live source auditor 的重叠唯一性检查后，该 source-bundle 文件也形成一处已知、已定向验证的漂移。因此八字 domain manifest、四体系 registry 与 historical natal runtime closure verifier 当前均失败。独立 frozen golden 仍为 `aba357d98a99271cc9a9b2727ad1c7c516424c94b7cf34f765cb38b0e9a74b29`，但 golden 未漂移不能替代 manifest 闭包。前两处修改的语义和归属尚未复核，本轮没有只重算摘要把红门变绿。

现实专家门仍为严格红线：当前只有锁定 12 个输入、两个空席、同题盲审顺序、隐私分层和分歧处理政策的候选包。现实身份、资质、两席彼此独立性、两份原始意见及不可变封存实例均不存在；`0/2`、`expertReviewBundle=absent/0`、`expertReviewBundleComplete=false`、`expertClaimsAuthorized=false`。专家候选包 verifier 目前也因同一 `bazi-core` artifact lock 漂移而失败；因此当前既不能声称专家审定，也不能声称该空席包已与现工作区机械对齐。

2026-08-29 D0 当前取代状态见 [八字 v1.7 机器 Manifest 漂移归属决策账](../八字v1.7机器Manifest漂移归属决策账-v1-2026-08-29.md)。账本没有重签，而是把保存 manifest `60711da4…` 与当前 builder 的非权威 expected preview `be637b1e…` 逐组件对账：9 个组件中精确 4 个组件／7 个组件－文件漂移条目（6 个唯一物理路径）；除原有 `bazi-core`、live source auditor 与根 `package.json` 外，Phase C 的 readiness trust-chain 文件同时进入 source／rights bundle，随包 audit 进入 rights bundle，Phase D 的 expert packet verifier 进入 `high_risk_policy`。七项作者归属、所有者接纳和重绑定决定均为 0/7。`bazi-core` 仍形成专家候选包唯一 artifact drift，现实专家为 `0/2`，`expert_review_bundle` 仍为 `absent/0`。D0 verifier 与 tests `12/12` 通过，账本摘要为 `5b82b545a2c5b0cd5714342c1bdaca742f4de44e196cc32817e8310926850d0f`；这只证明红账可重建，不使保存 manifest、专家包、四体系 registry 或 RC 变绿。

C 阶段新增 [八字前三 Exact Quote 私有材料过渡验证器](../八字前三ExactQuote私有材料过渡验证器-v1-2026-08-28.md)。它只为以后有权使用的仓外私有正文提供 hash、UTF-16 locator、最小引文摘要与重叠唯一性复核，并输出不含正文/引文/私有路径的脱敏回执；当前未提供真实材料，`3 topics / 2 current bindings / 4 quote candidates` 仍全部是候选，`0/12` 不变。

2026-08-29 C 阶段再新增 [PR10B／PR10C 概念与当前 Binding 对账](../八字PR10B-PR10C概念与当前Binding对账-v1-2026-08-29.md)。第二轮深审的后九个 topic 与 claim registry 当前精确 12 条 `sourceBindings` ID 命中为 0；深审原始列举序和推荐分批序互相冲突，账本已分别保存并采用推荐分批序。当前注册范围仍是 7 条工程候选、4 条历史文本候选与 1 条 review gate。五个 PR10B 主题在锁定 scoped 工件中没有专属规则表或逐值来源包，但 production/control 同时明确记录了非等价月令输入／加权路径；两个位置衰减主题的当前权重函数没有柱位参数或柱位衰减实现；两项 score 主题只映射现有七条 `project_engineering_heuristic` 候选并固定 `observational_engineering_candidate_only / formalScoringAllowed=false`。这些 mapping 是 repository-authored 范围判断，机器只验证预设投影与当前字节一致，语义等价与专家批准均为 0，也不证明仓库其他命名或新模块绝对不存在规则表。独立账本摘要为 `5e742a8a92a8ca4ebf2337f5eb0866be6c962e53801e3d259de4571b0cd65116`，新 verifier `11/11`、C 合并切片 `57/57` 通过；每个 basis/scoped 文件各自的检查与 hash 使用同一读取 Buffer，但跨文件不是原子快照，且仍是不带 mutation epoch 的端点观察，不排除区间 mutation／ABA。它没有新增平行 binding、没有接入正式 lifecycle 或重签中央 manifest，`0/12` 和既有中央闭包红门均不变。

2026-08-29 C／PR10C 继续新增 [七条工程 Binding 值级 Subject 缺口账](../八字七条工程Binding值级Subject缺口账-v1-2026-08-29.md)。账本从当前 7 条工程候选拆出精确 33 个 repository-authored 值级候选；当前 binding inventory 和所评估 binding EvidenceSubject registry 对这些 ID 的观察命中均为 0，但全仓 formal registry inventory 未评估；freeze eligible 为 `0/33`，总冻结仍为 `0/12`。机械观察确认 `factorInclusion` 与 `monthMainDuplication` 在 scoped factor／sensitivity source 中没有具名 AST 引用，但不建立动态或别名数据流不存在性；四个 includeHour consumer 只在 `hour_range` 上冲突；三个 legacy sourceRef 与当前 12 个 binding ID 精确命中为 0，本门建立的可审查语义 crosswalk 为 0，但全仓 crosswalk inventory 未评估；所评估 12 个 binding EvidenceSubject 的 algorithm／field／rule-profile locator 覆盖为 0；lockfile 的 `lunar-typescript@1.8.6` metadata 已观察，但已安装包／表字节、`ZHI_HIDE_GAN`／`SHI_SHEN` 表值摘要、来源和权利结论均未绑定。专家候选包仍因 `bazi-core` 的 `73e0be8d…→4c9b7fc5…` 漂移退出 1，本门未重签。新门 `11/11`、C 合并 `6 files / 68 tests`、五个 C 账本 CLI 与 release governance 均通过；这只建立 literal／AST／稳定可执行语法的源码端点工程缺口证据，不建立一般控制流、数据流、运行时等价或全仓 mutation set；跨文件非原子且 Schema 13 无 epoch，也不构成浏览器／运行时、内容、专家、权利、发布或公开授权证据。

2026-08-29 C 阶段当前补强见 [来源／权利信任链与随包材料预读门](../阶段C来源权利信任链与随包材料预读门-v1-2026-08-29.md)与 [项目物化副本／SourceCarrierRecord 分层合同](../阶段C项目物化副本与SourceCarrierRecord分层合同-v1-2026-08-29.md)。readiness 先执行完整来源候选 verifier 与完整三层权利 verifier，并让验证对象和 basis 哈希复用同一批 held-handle、有界读取 Buffer；随包 build gate 在正文读取前完成作品／版本／载体权利及全库存预检。C-M0 封闭私有 exact-quote 的 ADS 与完整目录链；C-M1 又把正式 carrier → 项目原始副本 → 固定 UTF-8 归一化 → KnowledgeDocument hash 写成零实例机械要求。C-M1 `23/23`，与既有 C 机器切片合计 `77/77`。当前仍为正式 `SourceRightsRecord=0 / SourceCarrierRecord=0 / project copy materialization=0`、可再分发来源 0、Binding `0/12`；C-M1 未进入 manifest／build，因此不新增 D0。端点采样不证明跨文件原子、epoch、区间 mutation 或 ABA，本轮未联网、未读取受限文件、未运行完整浏览器或默认构建。

2026-08-29 D 阶段当前补强见 [专家候选包来源信任链与同缓冲证据门](../阶段D专家候选包来源信任链与同缓冲证据门-v1-2026-08-29.md)、[现实专家独立工件零实例合同与准入红账](../阶段D现实专家独立工件零实例合同与准入红账-v1-2026-08-29.md)、[仓外原始意见文件端点及 Opaque Context](../阶段D仓外原始意见文件端点与OpaqueContext-v1-2026-08-29.md)与 [仓外身份 Dossier／Opaque Identity Context](../阶段D仓外身份Dossier端点与OpaqueIdentityContext-v1-2026-08-29.md)。正式 packet 未修改或重签；D1 以 held handle、同 Buffer seal 与 WeakMap context 接入两份候选意见，D2 再以 opaque dossier 双摘要接入两席 identity，并把 caller workspaceRoot 绑定 verifier 模块固定项目根。独立审计复现并修复假 workspaceRoot 可把仓内文件误签为仓外的 P2；修复后复核未见新 P1/P2。专家定向 tests `47/47`、D0 `12/12`；正式 CLI 仍精确因 `bazi-core` 退出 `ARTIFACT_DRIFT`。机械 true 不建立现实身份、资质、彼此独立性、加密、真实性、first-seen、custody、专家真值或发布权限；现实实例仍为 `0/2`。

## E 阶段：其他体系工程事实回执与跨体系 v0.3

2026-08-29 当前状态：旧跨体系 v0.2 的“调用方事实 + 自签 `contentSha256`”缺口已在 v0.3 工程层关闭。紫微和西洋分别新增体系自有窄 projector，并进入各自独立 manifest 的 `fact_contract`；离线 Node 证据工具从当前 producer、projector、独立 manifest 与 source requirement ledger 重放，生成 bundled registry `27630244f1ec8bc90a3a1ad5ebd3b1fa97d0a1d09d497f747d88a27d1872e263`。紫微 receipt 为 `22d981cd…`、7 facts、来源冻结 `0/27`；西洋 receipt 为 `9042d7bd…`、5 facts、来源冻结 `0/28`。两者状态均为 `engineering_replay_verified_not_admitted`，不建立领域真值、专家真值、来源正文或权利。

跨体系 contract 已升级为 `cross-system-readonly-comparison/0.3-draft`：候选的事实、规则身份、工程依据和 receipt reference 必须与 bundled registry 精确一致；输入先做 descriptor-safe 有界快照，accessor 零调用拒绝，成功结果脱离输入并递归冻结。伪造事实即使重算 envelope 摘要、复制合法 receipt 或同步重签可编辑摘要，也不能通过。观察仍为人工未审定；无评分、无加权、无投票、无模型仲裁、无自动人物合并和无概念等价推断保持不变。

八字没有借此重新进入：D0 当前为 4 个组件／7 个组件－文件漂移条目（6 个唯一物理路径）、0/7 项所有者决定。保存的四体系 registry 当前 verifier 首错为八字 `MANIFEST_MISMATCH`，机器回执还逐项冻结 4 个额外陈旧锁；中央 registry 本轮未重建或重签。吠陀现有 [独立输入合同草案与子要求账](../吠陀独立输入合同未决要求与零实例回执-v1-2026-08-29.md)、[独立事实合同草案与子要求账](../吠陀独立事实合同未决要求与零实例回执-v1-2026-08-29.md)、[独立规则合同草案与子要求账](../吠陀独立规则合同未决要求与零实例回执-v1-2026-08-29.md)及 [父产品化聚合账](../吠陀独立产品化零实例要求账-v1-2026-08-29.md)：input 13/13 结构覆盖、0/13 语义选择、0 个输入实例；fact 有 4 个独立 family 结构，12/12 scoped prerequisites draft covered、0/12 resolved、requirementsUniverseClosed=false，fact/value/producer/projector instances 与 failure/fact/success receipts 均为 0；rule 为 13/13 blocked prerequisites、0 resolved、requirementsUniverseClosed=false，rule candidate／definition／instance、evaluator／implementation／ruleset 与 failure／rule／success receipt 均为 0。父账计 3 个 standalone draft，三份 child requirements 不计产品工件；own_input_fact_and_rule_drafts 只在结构材料层 complete，故 re-review complete=1/7 但 rereviewTriggered=false，gate satisfied 仍为 0/8。七层依赖按绑定集合保持单向：input requirements 绑定 ADR 与 input draft；fact draft 绑定 ADR、input draft 与 input requirements；fact requirements 再绑定前三项与 fact draft；rule draft 继续绑定此前五层；rule requirements 再绑定 rule draft；parent 精确绑定三套 draft+requirements，所有 child 均无 parent backlink，中央 registry 未纳入。吠陀七层在默认隔离与显式同进程串行两种运行下均为 190/190。14-file 受影响聚合历史上已观测 458/458、456/458、457/458 与 455/458，故不再登记为稳定绿色总数；失败集中于既有八字 private exact-quote／project-copy 的 parent-chain mutation 负例，project-copy 文件未限 concurrency 单跑为 21/23。只读复核显示两套负例都把目录 `dev/ino/nlink/mtimeNs/ctimeNs` tuple 当作变化 oracle；本机 1,000 次 marker 探针有 769 次 `mtimeNs/ctimeNs` 同时不变，真实 project-copy API 的两个 phase 各有 1/200 与 5/200 次未拒绝。单文件／单 test-name 亦可复现，故 node:test 并发不是必要条件；1,000 次 rename/recreate 探针没有出现 `dev+ino` 重用，当前也没有 file-ID ABA 证据。该测试把 Windows 不保证变化的目录时间戳当成 mutation epoch，不能据此推翻已声明的“无 epoch、无区间 mutation/ABA 证明”边界，也不能再把 broader aggregate 写成稳定全绿。独立复核发现并修复 builder 旧摘要可变权威位、canonical getter／-0、CLI 泛化 ok、re-review complete 计数字段命名，以及 raw `Uint8Array` parser 读取可覆写 `length` 导致子类 getter 执行与 `maxBytes` 绕过；最终 raw parser 使用内部 typed-array 槽、拒绝 Proxy／SharedArrayBuffer／Resizable ArrayBuffer／detached view，并先复制私有快照，吠陀定向复验无剩余 P1/P2。所有 acceptance／failure／fact／rule／success receipt、来源／权利／专家证据与 authority／release 位仍为空或 false；结构草案存在不等于事实值、规则内容或领域真值已建立，事实 producer／projector、rule evaluator／versioned ruleset、产品 surface 仍 absent。Schema 13 仍无 mutation epoch，跨文件／双体系重放不是原子快照，区间 mutation 和 ABA 未排除。

2026-08-29 吠陀 runtime/bundle 点时取代说明（来源／权利 requirements-only child 接入前）：上段的吠陀七层、re-review 1/7、parent 24/24 与七层 190/190 只保留为提案接入前的点时身份；其中 broader aggregate 抖动、现存 expected-red 和 mutation/ABA 边界不被改写。该点时 [运行时与体积量化提案回执](../吠陀独立运行时与体积量化提案回执-v1-2026-08-29.md)已由 [父产品化聚合账](../吠陀独立产品化零实例要求账-v1-2026-08-29.md)单向绑定，状态为 `input_fact_rule_contract_drafts_and_runtime_bundle_proposal_present_research_only_not_admitted`。`productArtifactsPresent=3` 仍只计 input／fact／rule 三份 standalone schema 草案；proposal 是治理材料，不计产品工件。七项 re-review 在该点时为 2/7 complete，`rereviewTriggered=false`，八类 gate 为 0/8。

提案只列两个互斥候选 option、18 项尚未批准的 ceiling、结构化 tradeoff 与五项待决 dependency；`observedMeasurementCount=0`，运行时未选择、未实现、未运行、未量测、未验证，`reviewsComplete=false`，安全／隐私／可复现性／许可／法律复核均未完成。tradeoff 与 dependency 不回答代码或数据许可、商业使用或再分发问题；涉及重新评审第 5、6 项的内容仅是 interface plan，不能把独立存储／备份／恢复／回滚设计或独立浏览器门／Release Evidence 设计计为完成。proposal 独立 48/48、八层 240/240 在默认隔离与显式 `--test-isolation=none --test-concurrency=1` 两种模式均通过，parent 为 26/26；独立审计最终 P1/P2=0，发现的 `__proto__` 键与 complete coverage 两个 P2 已修复。该机械闭包不建立浏览器、默认 build、实际 runtime、任何产品 receipt、来源／权利、专家、准入／发布、mutation epoch、跨文件原子、interval mutation 或 ABA 证据。项目默认继续为 `legacy-v13 / targetSchema 13 / migrationId null`；吠陀自身 `releaseIdentity/targetSchema/migrationId` 仍为 null，不继承默认 v13 或八字权威。

2026-08-29 吠陀来源／权利 requirements-only 点时取代说明（expert-plan child 接入前）：该点时 [独立来源 Binding 与三层权利要求账](../吠陀独立来源Binding与三层权利要求账-v1-2026-08-29.md)作为与 runtime proposal 独立的 sibling，由 [父产品化聚合账](../吠陀独立产品化零实例要求账-v1-2026-08-29.md)单向绑定；child 不反向绑定 runtime、parent 或中央 registry。该点时父账状态为 `input_fact_rule_contract_drafts_runtime_bundle_proposal_and_source_rights_requirements_only_inventory_present_open_universe_zero_bindings_research_only_not_admitted`。`bindingRequirementsInventoryDefined=true` 只表示 current scoped minimum 为 input 13 + fact 12 + rule 13 = 38；universe 保持 open，`bindingRequired=38`、`bindingFrozenVerified=0`。该点时来源／权利 re-review 第 3 项为 partial，整体 2/7，正式 gate 0/8，`productArtifactsPresent=3`。

来源正文、exact quote、locator、冻结 binding、作品／版本／载体三层权利证据、许可结论、现实专家与法律判断均未建立；内容真值、浏览器、默认 build、实际 runtime、Release Evidence、发布就绪与公开发布授权全部保持红线。项目默认仍为 `legacy-v13 / targetSchema 13 / migrationId null`；吠陀自身 `releaseIdentity/targetSchema/migrationId` 为 `null/null/null`，不得继承默认 v13 或八字权威。本闭包没有 mutation epoch，不证明跨文件原子快照，不排除 interval mutation 或 ABA。中央四体系 registry 本轮未重建或重签；上文 expected-red 与 broader aggregate 抖动继续保留为历史失败关闭证据。

该点时定向机械结果为 child 103/103、parent 37/37、九个吠陀文件 354/354；它不再代表当前 expert-plan child 接入后的冻结身份或总数。

2026-08-29 吠陀两席现实独立专家审阅材料契约当前取代说明：当前新增 [两席现实独立专家可核验审阅计划](../吠陀两席现实独立专家可核验审阅计划-v1-2026-08-29.md)，只单向绑定 ADR、input／fact／rule 六件与 source-rights child，不绑定 runtime、parent 或中央 registry；[父产品化聚合账](../吠陀独立产品化零实例要求账-v1-2026-08-29.md)再单向投影该 child。两席均 vacant，现实专家、身份、资质、五维 Vedic scope fit、两两独立性、审阅包、意见和 review 实例均为 0。资格主证据与独立佐证不得同记录或同 provenance 双计，核验人必须在两席之外；八问全部分配给 Vedic domain expert，来源文本／翻译／评注／载体只审内容相关性，仍不得签发权利法律结论。

父账当前长状态为 `input_fact_rule_contract_drafts_runtime_bundle_proposal_source_rights_requirements_only_inventory_and_two_vacant_seat_expert_review_plan_present_open_universe_zero_bindings_zero_expert_instances_research_only_not_admitted`。item 4 只在材料契约层 complete，故 re-review materials=3/7、`rereviewTriggered=false`；expert gate 仍是 plan present／two seats defined／0 verified experts／bundle absent，八类正式 gate 仍 0/8，`productArtifactsPresent=3`。启动门 0/16，`planCoverageMeaning` 明确不建立 eligibility／identity／independence／opinion／truth／gate instance。十文件集合在默认隔离与显式同进程串行两种模式均为 440/440、0 fail／skip；child 84/84、parent 39/39。中央 registry 未重建或重签，来源、权利、专家真值、内容真值、法律判断、浏览器／build／runtime、Release Evidence、发布就绪与公开授权继续为红。

E 历史切片曾有回执对抗 `9/9`，但该数字不再代表当前工作区。2026-08-29 本次重跑：cross-system engineering receipts 为 `6/9`，三个正向闭包测试以 `REGISTRY_MISMATCH` 失败；system admission registry 为 `1/9`，八字 domain manifest 为 `2/3`，首错均为当前八字 `MANIFEST_MISMATCH`；紫微／西洋独立 manifests 为 `5/5`，release governance 为 `193/193`，D0 为 `12/12`。中央 registry 与回执没有被重签，这些红数应作为当前失败关闭证据，而不是本轮新增功能的绿色验收。v0.3 Edge／Chrome 尚未运行；旧 v0.2 浏览器 8/8 不复用。详见 [跨体系工程事实重放回执与 v0.3 准入边界](../跨体系工程事实重放回执与v0.3准入边界-v1-2026-08-29.md)。

本轮没有运行全仓 typecheck、默认 Web build、隔离构建、完整应用、PWA／Service Worker、正式仓储、公开主机、Release Evidence 实例、部署或回滚。受限文件未被人工打开、输出或修改；前段旧边界扫描曾由工具机械打开该路径，现已改为不读取并显式红账，故不得再写成“本轮完全未读”。`legacy-v13 / targetSchema 13 / migrationId null`、`publicDeploymentAuthorized=false / expertClaimsAuthorized=false` 不变。

## 已知受限工程阻塞

全仓 typecheck 的既有失败继续登记为 `blocked-known-restricted`。受限路径只允许登记状态和改善 CI 可观测性；禁止读取、修改、从 typecheck 排除、抑制、`xfail` 或根据外部报错反推其内部问题。

Quick CI 当前已将 `full-typecheck`、`full-vitest` 和默认 v13 build 拆为独立 job，因此 typecheck 失败不会阻止后两者启动；artifact manifest 只依赖实际构建产物，最终 aggregate 要求所有证据 job 都为 `success`。拆分提高可观测性，不改变失败关闭结论。

本页和受限阻塞登记不声称当前提交的全量 Vitest、默认 build 或 artifact manifest 已取得远程执行结果。机器可读登记见 `docs/release/known-restricted-blockers.v1.json`。

机器可读默认决定见 `docs/release/web-v1-release-decisions.json`；代际准入见 `docs/release/release-generation-history.json`。

## 2026-08-29 吠陀运行时依赖公开许可观察当前 replacement

当前 [吠陀运行时依赖公开一手许可观察回执](../吠陀运行时依赖公开一手许可观察回执-v1-2026-08-29.md)新增一个 authoritative、link-only evidence child：五个公开端点、十次 HTTP 200 读取、四组立即二读稳定／一组不稳定，五类候选依赖只覆盖四类。runtime proposal 的 refs 精确为 `python/swisseph/data/worker/loopback = 1/3/3/1/0`；`loopback_local_service` 仍为 0。公开响应正文、PDF、LICENSE、代码与星历数据均未复制入仓，publisher identity／authenticity／review／legal conclusion／redistribution／selection 均未建立。

child 自身只绑定 ADR，明确不反绑 proposal、parent 或中央 registry；runtime proposal 保留原 ADR→input→fact→rule 七节点线性链，把 child 作为正交单向聚合输入。parent 只冻结更新后的 runtime projection，不直接把 child 作为 sibling，因此 `productArtifactsPresent=3`、`bindingRequired=38 / bindingFrozenVerified=0`、re-review materials=3/7、gates=0/8、experts=0/2 均不变；child 不是第 4 个产品工件、第 39 条 binding 或中央 registry 项。

当前 child/runtime/parent 定向测试分别为 25/25、53/53、40/40；11 个吠陀 test files 在默认模式与显式 `--test-concurrency=1` 两种运行下均为 471/471、0 fail／skip。八字 manifest 仍为 2/3、中央 registry 1/9、cross-system receipts 6/9，分别以既有 `MANIFEST_MISMATCH`／`REGISTRY_MISMATCH` 失败关闭；release governance 193/193 通过。中央 registry、八字 manifest 与跨体系 receipts 均未重签。

该 replacement 只取代此前 expert-plan 阶段的 440/440、parent 39/39 当前身份；更早计数继续仅作历史点时。它不建立精确 runtime／版本／分发路线选择、许可兼容或法律结论、来源正文与三层权利闭包、内容真值、现实专家身份／资质／独立性／意见、浏览器／PWA／Service Worker、完整应用、默认 build、公开主机、Release Evidence、部署／回滚、发布就绪或公开授权。项目默认仍为 `legacy-v13 / targetSchema 13 / migrationId null`；吠陀自身 `releaseIdentity/targetSchema/migrationId=null/null/null`，`publicDeploymentAuthorized=false`、`expertClaimsAuthorized=false`。mutation epoch、跨文件原子、interval mutation 与 ABA 仍未证明。

## 2026-08-29 D 阶段现实专家公开候选预筛 current replacement

当前新增 [阶段 D 八字现实专家公开候选预筛](../阶段D八字现实专家公开候选预筛-2026-08-29.md)，只把四个无需登录的公开候选线索分成方法、领域、理论与实践／表达方向。四人均为 `uncontacted_public_candidate_lead`；没有联系、同意、现实身份／资质／四题 scope 或两两独立性核验，也没有原始意见。正式专家仍为 `0/2`，reviewer slot、sealed opinion 与 `expert_review_bundle` 仍全部为 0／absent；该文件不是权威 JSON，不能启动正式 intake 或审阅。

公开论文、著作、课程、协会或机构页面只用于候选发现，不能把任何候选写成“现实专家”，也不能把不同机构、不同页面或两个公开上游写成彼此独立。任何外联、私人 dossier、同意获取、席位分配和意见收集仍需另行明确授权；分歧不得多数表决、平均或由生成模型选赢家。

## 2026-08-29 紫微 HKO 公农历边界来源候选 current replacement

当前新增 [紫微 HKO 民用公农历边界来源证据准入](../紫微HKO民用公农历边界来源证据准入-v1-2026-08-29.md)。六个 2023—2028 冻结年度响应被独立重放为 2,192 日、74 个边界对与 5 个跨年 seam；candidate 精确映射 `ziwei.engineering.official-calendar-differential`，但只覆盖 `calendar_resolution`。紫微来源账为 1 条 partial candidate／27 required、`0/27` frozen；exact quote、三层权利与专家引用均为 0。紫微／西洋独立 manifest 仍为 draft，source bundle 均 incomplete；西洋未获得该 candidate。

两组 22/22（默认与同进程串行，含 parent 复用 child artifact 身份和 basis 同缓冲断言）、HKO adapter 4/4、draft-boundary 定向 fixture 3/3、release governance 193/193 通过；child／requirements／manifests 三个 CLI exit 0。中央 admission 与 cross-system receipts 两个 CLI 均 exit 1，未重建或重签；当前首错分别指向既有八字 manifest 分账不一致与跨体系 registry 不一致，因此不能把局部 HKO 绿线冒充中央准入。项目默认仍是 `legacy-v13 / targetSchema 13 / migrationId null`；紫微自身继续为 `targetSchema/migrationId=null/null`，`publicDeploymentAuthorized=false`、`expertClaimsAuthorized=false`。

本 replacement 没有证明节气、早晚子、四柱、真太阳时或紫微规则／解释真值，没有完成来源真实性、三层权利或法律判断，没有浏览器、完整应用、PWA、默认 build、Release Evidence、部署或回滚证据。逐文件 held-handle／same-buffer 重放没有 mutation epoch，也不证明跨文件原子、interval mutation 排除或 ABA 排除。

## 2026-08-29 西洋 JPL Horizons 来源候选不晋级 current replacement

当前 [西洋 JPL Horizons 来源候选真实性缺口审计](../西洋JPL-Horizons来源候选真实性缺口审计-2026-08-29.md)已把无效的相同 `START_TIME/STOP_TIME` 查询改为 21 参数显式 `TLIST` 单时刻合同，并用一次不落盘的 PowerShell live body 完成当前格式兼容探针；Node 直连路径同期超时。项目仍没有保存 raw body、独立 retrieval envelope 或 candidate child；`npm run demo:western:horizons` 以 `HORIZONS_RESPONSE_CANDIDATE_INVALID / exit 1` 失败关闭。因此 `western.astronomy.official-horizons-differential` 不登记 candidate，西洋继续为 `0/28 candidate`、`0/28 frozen`。

当前 candidate verifier 已精确绑定 canonical full URL、规范 retrieval time、exact byte snapshot、API／target／center／time／unit／calendar／correction／format／EOP／frame header 全序、固定 JDUT 和唯一 `$$SOE/$$EOE` 两行表；raw/record/result/payload digest、response/report WeakSet brand、deep-freeze 与 total failed-closed 入口也已建立，旧 `verifyOfficialHorizonsResponse` 对任何机械候选恒拒。Horizons + strict receipt 两个测试文件在默认与显式串行模式均为 16/16，scoped TypeScript 通过。它们只证明 candidate-only mechanics 和当前瞬时格式兼容；无密钥 SHA／结构 schema 仍可由提交者重算，序列化 report 必须携 raw inputs 重放，不能证明 publisher authenticity、官方网络来源、JPL 数据真值或占星解释真值。

西洋独立 requirements 已机械同步为 `ledgerDigest=2bb52306841098ee5e83906bffda400ad07efd706c7c294ee4d07115854849bd`，独立 engineering-draft manifest 为 `manifestDigest=5c44fce96357ed80c4274f1f225151764ffe5998956e7e823764499ee45f993e`；它们仍是 28 required／0 candidate／`0/28 frozen`、draft／`targetSchema=null`、experts=0、全部 bundle 与 release gate false。requirements 9/9、independent manifests 6/6、release governance 193/193 通过；中央 admission 仍因既有八字 `MANIFEST_MISMATCH` 为 1/9，cross-system receipts 仍以 `REGISTRY_MISMATCH` 为 6/9，两个 CLI 均 exit 1 且未重签。draft-boundary CLI 也继续被与本西洋增量无关的既有登记问题失败关闭。

API 使用政策不等于作品／版本／载体再分发许可，Astronomy Engine 的 MIT 文件也不覆盖 Horizons 输出。三层权利、法律判断、现实专家、浏览器、完整应用、默认 build、PWA／Service Worker、Release Evidence、部署／回滚、发布就绪与公开授权均未建立。中央 registry 与跨体系 receipts 未重签；默认继续为 `legacy-v13 / targetSchema 13 / migrationId null`，西洋自身为 `targetSchema/migrationId=null/null`，`publicDeploymentAuthorized=false`、`expertClaimsAuthorized=false`。本审计不提供 mutation epoch、跨文件原子、interval mutation 或 ABA 排除证据。

## 2026-08-29 C／D 阶段独立候选机器账 current replacement

Stage C 当前新增 [八字政策权重逐值证据候选](../阶段C八字政策权重逐值证据候选-v1-2026-08-29.md)，以独立 child 重建 `binding:policy:weights` 的三个 value-subject：声明值 `monthCommand/visibleStem/firstHiddenStem/otherHiddenStem = 4/2/2/1`、dispatch 语法和 guard／三个直接 consumer call shape。candidate digest 为 `208ae39797d048b2fc869392528a3cf7d1858de232a8691bc0296366d6363088`。这只证明当前源码字节和 AST 投影；工程理由、值 provenance、来源、三层权利、领域／工程／专家复核和运行时执行均未冻结，`bindingFreezeEligible=false`、`bindingFrozenVerified=false`。父账、八字 manifest 与中央 registry 均未接入或重签，正式 Binding 仍为 `0/12`。

Stage D 当前新增 [八字现实专家公开候选预筛机器账](../阶段D八字现实专家公开候选预筛机器账-v1-2026-08-29.md)：4 个 `uncontacted_public_candidate_lead`、11 个合格 link-only 公开观察、6 个去重上游组、4 个 scope 问题、10 个独立性因素和 6 个候选配对；ledger digest 为 `ba9878bfcf266d5f34c46cf0808b3bbc382ddaa8464b36bf1a63d8c77bdf6d21`。账内无登录入口、私人／联络／同意／dossier／意见／页面正文或正式 packet／manifest／registry 回链；所有 slot 为 null，身份、资质、scope、独立性、专家状态、内容／专家真值、发布与授权均为 false，正式专家仍为 `0/2`。

C／D 两个 test files 在默认模式和显式 `--test-isolation=none --test-concurrency=1` 下均为 44/44，两个 CLI 均成功；release governance 为 193/193。该 44 项包含合法摘要字段内注入、超限／非 exact-native byte 输入、固定 v1 basis 字节漂移、候选整体及父账重签提权（含 scoped authority／candidate／distribution、value-subject metadata／coverage 与完整 parent backlink 晋级）、错误 hidden-index guard、死 consumer call 与 Windows ADS 路径对抗。正式专家包 CLI 继续因 `packages/bazi-core/src/index.ts` 与已保存锁不一致而 exit 1；中央 admission 与 cross-system receipts 也分别 exit 1，三者均未重签。局部绿色不得解释为来源权利、专家真值、正式体系准入、完整应用、默认 build、浏览器／PWA／Service Worker、Release Evidence、部署／回滚、发布就绪或公开授权。

项目默认仍为 `legacy-v13 / targetSchema 13 / migrationId null`。future freeze 必须另有真实 mutation 边界，但 Schema 13 当前没有 mutation epoch／receipt；逐文件 held-handle endpoint snapshot 不证明跨文件原子、interval mutation 排除或 ABA 排除。`publicDeploymentAuthorized=false`、`expertClaimsAuthorized=false`。

## 2026-08-29 紫微 HKO 公开端点点时匹配与条款并存适用歧义 current replacement

当前新增 [紫微 HKO 公开端点点时匹配与条款并存适用歧义观察](../紫微HKO公开端点点时匹配与条款并存适用歧义观察-2026-08-29.md)，作为既有 HKO source candidate 的正交、单向、link/hash-only observation child。操作员记录 2023—2028 六个公开年度 CSV 的 requested URL 在 `2026-08-29T12:37:27.146Z` 至 `12:45:54.541Z` 收到 HTTP 200，`HttpClient` 交付 body 的字节数／SHA-256 与已有 candidate raw body 比较为 6/6；本次 live run 未保存任何新响应正文、网页、PDF、exact quote、`Content-Encoding` 或独立 capture receipt。自动解压只保留为未经机械验证的 operator claim；离线门固定 `automaticDecompressionMechanicallyVerified=false / remoteCaptureMechanicallyVerified=false / requestedToFinalUrlBindingEstablished=false`，只能验证该记录与仓内 candidate 自洽，不能独立认证网络采集。

DATA.GOV.HK 通用条款的有条件重用文字与 HKO 主站商业使用事先书面授权文字并存，且 CSV 位于 HKO 子域；适用条款尚未经权利／法律判断解决。新增机器账因此固定 `termsApplicabilityConflictOrAmbiguityObserved=true`，同时保持适用条款、条款版本、作品／版本／载体权利、既存六份 candidate raw body 的存储权利、再分发、公开仓／build 纳入与法律结论全部未建立；正式 `SourceRightsRecord=0 / SourceCarrierRecord=0 / independent rights review=0`。

observation 工件为 10,892 bytes，raw SHA-256 `9110d524274821179ff5e61de87bc0fa9788608135e2292725d5ae78b53a42eb`，内部 digest `7acc61b617564f8446f986ee90126fe968845959cdb13a334cc6ec6e1f05977a`。新门默认／同进程串行均 15/15；既有 HKO source + requirements + independent manifests 默认／串行均 22/22，HKO adapter 4/4，三个独立治理 CLI exit 0。中央 admission 与 cross-system receipts 继续分别因既有八字 manifest／registry 不一致 exit 1，未重签。既有 source child、requirements 与 manifest 没有反绑本 observation，故仍为 1 条 partial candidate／27 required、`0/27` frozen、`currentRemoteFreshnessRevalidated=false`、source bundle incomplete、manifest draft／Schema null。

该点时匹配不证明 publisher authenticity、network provenance、数字签名、未来 freshness、节气覆盖、紫微规则／解释真值、许可或专家真值；也没有全仓 typecheck、默认 build、浏览器、完整应用、PWA／Service Worker、公开主机、Release Evidence、部署／回滚证据。无 mutation epoch、跨文件原子、interval mutation 或 ABA 排除证据。默认继续 `legacy-v13 / targetSchema 13 / migrationId null`；`releaseReady=false`、`publicDeploymentAuthorized=false`、`expertClaimsAuthorized=false`。

## 2026-08-29 D 阶段八字现实专家公开证据跟进 child current replacement

当前新增 [八字现实专家公开证据跟进 child](../阶段D八字现实专家公开证据跟进-child-v1-2026-08-29.md)，单向绑定且不修改既有公开候选父账。父账继续保持 `4 leads / 11 observations / 6 upstream groups`、raw `21691 bytes / 88e5dabca1f3bb10cc8c8dfc2d2bfbdcf6b65a9a577b4747374e4e986c6988d9`、digest `ba9878bfcf266d5f34c46cf0808b3bbc382ddaa8464b36bf1a63d8c77bdf6d21`。本 child 只跟进其中 2 个候选，登记 3 条当日操作员公开观察，并把机构角色页与 DOI locator 保守并入同一个发布族，因此精确计为 2 个来源族；`doiResolverCountsAsIndependentFactUpstream=false`。

协会档案只形成月令／藏干、强弱数值化、内外格／从格的邻近主题信号，四个 exact project question 均未评估或回答；机构公开名册只记录同显示名与角色标签，DOI 只记录题名／显示名／locator 的出版元数据线索。两条记录不得自动合并为同一现实人物，也不证明当前任职、身份、资质、项目 scope、两席独立性、参与同意或专家意见。本批次没有联系候选，没有保存网页正文、PDF、摘要、关键词、exact quote、私人资料、UTC capture timestamp、redirect chain 或 capture receipt；三层权利、存储／再分发权和法律结论继续为 0／false／`not_established`，分发策略只允许 `link_only`。

child 的冻结身份为 raw `11989 bytes / 1961f1e9118f24eba8ea2a7c782afa6e3748ed56e3a4de2c4bca3bf5f481bce3`，semantic digest `3cbe882b03294119b75a3ba8e13bfcf60202529029aff0ea3821bf232f7619f9`；basis 为 `5517 bytes / 8ac95f9ea52cdf3aef7db2cc96f12a7fd780b00ea06d3b139d5deb8b8a0a982e`。新 child 默认／同进程串行均 29/29；父账 22/22、D0 12/12、D1/D2 47/47，四文件默认／串行合计均 110/110，全部 skip 0；release governance 193/193。末次独立红队未见该切片剩余 P1/P2。中央 expert packet CLI 仍因 `packages/bazi-core/src/index.ts` 漂移 exit 1；八字 manifest 为 2/3、中央 registry 为 1/9、cross-system receipts 为 6/9，分别保持 `MANIFEST_MISMATCH`／`REGISTRY_MISMATCH` expected-red，未重签任何中央工件。

以上绿色只证明离线 child／父账／D0／D1/D2 的工程闭包，不是公开来源语义的独立网络认证，不建立内容真值、专家真值、权利法律判断、现实专家门、release readiness 或公开授权。专家仍 `0/2`，正式 opinion／bundle 仍不存在，`expertClaimsAuthorized=false`、`publicDeploymentAuthorized=false`。本批次没有运行全仓 typecheck、默认 Web build、完整应用、浏览器／PWA／Service Worker、公开主机、Release Evidence、部署或回滚；默认继续 `legacy-v13 / targetSchema 13 / migrationId null`，逐文件 held-handle 检查不构成跨文件原子快照，也没有 mutation epoch、interval mutation 或 ABA 排除证明。

执行异常披露：最终压缩测试输出时，一次 PowerShell 参数数组拼接错误短暂启动了无目标文件清单的 `node --test`；进程观察中已经出现 `verify-system-contract-draft-boundaries.test.mjs` 子测试，精确终止时父进程已自行结束，且该次输出未保留。该误触运行不计入上方任何测试证据，后续结果全部来自显式文件清单。只读复核 verifier/test 自身可见其把 `apps/web/src/lib/local-user-data-cleanup.ts` 登记为 known restricted、相关单测使用临时 fixture 且不检查模块 imports，但现有日志不足以证明 Node 的无目标测试发现过程没有触及实际受限文件，因此本轮不再声明“从未触发受限边界检查”。没有执行 Git，也没有主动打开或修改该受限源码。

## 2026-08-29 C 阶段国家版权局页面标签公开证据观察 child current replacement

当前新增 [国家版权局页面标签公开证据观察 child](../阶段C中国现行著作权法公开证据观察-child-v1-2026-08-29.md)，单向绑定当前来源候选账与三层权利候选账。它只冻结两条国家版权局 requested URL 的操作员 bytes/hash 记录、1 个去重页面发布族、6 个法条页面片段 hash 与 1 个施行日期页面片段 hash，并把 5 条一般规则观察链接到父账 4 个历史权利候选。字段已校准为 `operatorRecorded* / pageClaim / immediatePairStableOperatorRecorded`；离线 verifier 不重放远程响应，不证明域名控制、页面真实性、法律权威层级、摘要语义或候选适用。

child 继续为 `link_only`：远程正文、法条文本、exact quote、DOM、截图和载体文件保存数均为 0；正式 `SourceRightsRecord=0 / SourceCarrierRecord=0`、作品／版本／载体核清 0、可再分发来源 0、法律结论 `not_established`。四条 candidate link 的作者事实、法域、现代整理层和三层 clearance 全部 false；`bindingFrozenVerified=0/12`、现实专家 `0/2`、内容／专家真值、release readiness 与两项公开授权均为 false。

最终冻结身份为 child raw `19961 bytes / c0e91874bd0b9e7c99d4db2b79df1e68c483fc1e68ed06700be44d5bf6bc10cf`、semantic digest `f2cbbbf2d34b6f6ee69272805799def74f582f0058de8cfbab3321a84a44146c`、basis raw `7867 bytes / 737b271ebf526b34e10ad3462657fe3baa1eec4ef2ccf417bdeb098fc2d296c4`。新门 31/31；与来源、权利、C-M1、Binding readiness 和 release governance 六个显式 test files 在默认并发与 `--test-concurrency=1` 两种模式均为 281/281，release governance 单独 193/193。公开 pure verifier 不读取调用方第二父账参数；四候选映射固定在 catalog 内，严格父账只在完整 held-handle load 内部交叉核验，hostile Proxy/getter 保持零调用。

本 child 不反绑或重签父账、八字 manifest、中央 registry 或 cross-system receipts。正式 expert packet 继续因 `packages/bazi-core/src/index.ts` 保存锁漂移 exit 1；八字 manifest 继续 expected-red，两个独立 draft manifests 仍通过；中央 registry 与 cross-system receipts 继续 exit 1。局部绿色不建立完整应用、全仓 typecheck、默认 Web build、浏览器／PWA／Service Worker、公开主机、Release Evidence、部署或回滚证据。默认仍为 `legacy-v13 / targetSchema 13 / migrationId null`；逐文件 held-handle 检查不构成跨文件原子快照，也没有 mutation epoch、interval mutation 或 ABA 排除证明。

## 2026-08-29 C 阶段 DTT 月令固定修订与双载体公开证据 child current replacement

当前新增 [DTT 月令候选公开证据 child](../阶段C-DTT月令候选公开证据-child-v1-2026-08-29.md)，只投影 `binding:dtt:month-command` 的 `dtt-yueling-minimal-v1` hash-only locator 与 SSID page 170／CADAL page 178 两条月令 normalized collation。公开读取中两份载体被临时下载并重算整文件 SHA-256：14,751,242-byte PDF 为 `d6a7d1daf6513ce9fb9940ff8331b96804c10cdafbeac00d4d3d0a37229e1803`，17,912,324-byte DjVu 为 `1d0a16f528ed3074cdefad33b2d2f9233a47199cf88a8b02001c897e16996e60`；均与父候选相等，临时文件随后删除，仓库未保存载体、页图、正文或 quote。

本轮同时发现并冻结一个失败关闭差异：SSID 固定 filepage 观察到 `PD-scan`，CADAL 固定 filepage 只观察到 `PD-old`／`CC-PD-Mark`、没有 `PD-scan`，所以父来源账对 CADAL 的旧 `pd_scan_notice` 概括未被重新建立，`noticeDiscrepancyResolved=false / promotionBlocked=true`。Wikisource oldid 正文字面不含 `PD-old`；该标签来自捕获时 `清朝作品 → PD-old` 的动态模板依赖，且 oldid 不单独冻结依赖修订。CADAL aggregate revision、main wikitext 与 MediaInfo 分账；同 uploader 标签不等于身份核验，MediaInfo 与 Public Domain Mark 都不另算独立权利来源或许可。

冻结身份为 child raw `31062 bytes / 85788506067b50453545ec786c7a47b0e51a4cf004419cbe8c547f9384c01ae6`、semantic digest `01e61e4f77526270ef83a0d95fbcb165bf307d5efa09c5a0360ff49bf1735993`、basis raw `10165 bytes / 9d0c09d9add17785f41bfdb56628771c12b091b9b0ef3db7caef558a270140cb`。新门 `42/42`；与来源、权利、C-M1、Binding readiness、C-L1 和 release governance 的七个显式 test files 在默认模式与 `--test-isolation=none --test-concurrency=1` 下均为 `323/323`，release governance 单独 `193/193`。

该 child 仍只是一向 link/hash-only 操作员记录：正式 `KnowledgeDocument / SourceRightsRecord / SourceCarrierRecord=0/0/0`、Binding `0/12`、现实专家 `0/2`、法律结论 `not_established`。expert packet、八字 manifest、中央 registry 与 cross-system receipts 分别继续 exit 1；紫微／西洋独立 draft manifests exit 0，未重签任何中央工件。本轮没有运行全仓 typecheck、默认 Web build、完整应用、浏览器／PWA／Service Worker、公开主机、Release Evidence、部署或回滚。默认保持 `legacy-v13 / targetSchema 13 / migrationId null`，`publicDeploymentAuthorized=false / expertClaimsAuthorized=false`；没有跨文件原子、mutation epoch、interval mutation 或 ABA 排除证明。

## 2026-08-31 C 阶段非 DTT 三载体点时字节观察 current replacement

当前 [非 DTT 来源与载体实时复核](../八字阶段C-非DTT来源与载体实时复核-2026-08-31.md)保留第一次 `metadata_only`／HTTP 429 的历史失败关闭记录，并新增同日 `required` 模式完整运行：三份固定 Wikisource revision、四个 hash-only quote locator、三个 Commons file-page revision 和三个原始载体字节身份均在一个运行区间完成复核。载体为 21,705,448-byte DjVu `be4df89…40f7`、22,564,579-byte DjVu `64491cdc…c037` 与 6,429,274-byte PDF `fca66e10…05f`，合计 50,699,301 bytes；临时载体均已删除，仓库没有保存来源正文、quote、文件页正文或载体文件。

新增正交、单向、无父 backlink 的 [link/hash-only observation child](../../content/system-admission/bazi-nondtt-three-carrier-byte-observation.v1.json)，raw identity 为 `16936 bytes / d33ddf6bbe1f820be53d41606f0970ce53915712c05eb4731f190c7d53de331d`，checksum digest 为 `b2d4d98e94c6bc1c5446d03905f0f24884b55c966c4dd90ed7701ce52f8573dd`。新 verifier 将 child 与 live producer、source `1.6.0`、rights `1.2.0`、SourceCarrier readiness `1.0.0` 的 raw／semantic identity，以及 candidate／binding／evidenceSubject／revision／quote／anchor／rights decision 交叉绑定；它还要求完整 SourceCarrier readiness 私有 brand，并逐条绑定三项 readiness row 的 source/right candidate digest、anchor、bytes/SHA/mime 与红色 decision。私有 WeakSet brand 与递归冻结结果不接受 clone 冒充。其当前定向测试为 14/14，CLI 输出 `operator-recorded 3 carrier identities / 50,699,301 bytes / 0 formal KnowledgeDocument / 0 formal SourceRights / 0 formal SourceCarrier / 0 of 12 frozen / activeAdmissionEffect=none`；离线 verifier 不联网或重新下载载体。

Commons 的 `Public domain` 元数据和 `PD-scan` 只作为观察，不是本项目的法律许可结论；三层权利、复制／引用／再分发权限和现实权利 reviewer 均为 0／false，distribution policy 继续 `link_only`。独立审计另登记一个首份正式材料前的 P2：Stage C fixture 的 `knowledge/bazi/...` 路径与生产 loader 只接受 `documents/*.md|txt` 不一致，且 Citation exact quote 到 registry exact locator、rights/carrier 元数据到生产消费端尚未闭环；当前 manifest 为空且 admission 全红，所以没有现行准入效力。

本 child 仅复验操作员保存的点时摘要，不独立认证远端 publisher、TLS peer 或未来 freshness；逐文件 held-handle 不是跨文件原子快照，Schema 13 仍无 mutation epoch receipt，interval mutation／ABA 未排除。默认继续 `legacy-v13 / targetSchema 13 / migrationId null`；`releaseReady=false`、`publicDeploymentAuthorized=false`、`expertClaimsAuthorized=false`。本批次没有运行全仓 typecheck、默认 Web build、完整应用、浏览器／PWA／Service Worker、公开主机、Release Evidence、部署或回滚，也未读取受限源码。

最终显式七文件受影响闭包为 344/344、0 fail／skip；observation、current versioned supersession、legacy source/right、SourceCarrier readiness、Binding readiness 和 release-governance CLI 均 exit 0，`npm run check:release-governance` 通过。独立只读红队在修复 Set 冻结绕过、补入完整上游 capability／readiness row 绑定与 Hash prototype 捕获后，最终无剩余 P1/P2。该工程闭包不提升任何来源、权利、专家、发布或公开授权结论。

## 2026-08-31 SMT-v10 CADAL 06056486 同“四库”标签候选父账（未晋级）

工程证据：当前新增 [source v1.7.0](../../content/bazi-strength-source-binding-candidates.v1.7.0.json)、[rights v1.3.0](../../content/bazi-strength-source-rights-candidates.v1.3.0.json) 与 [paired supersession receipt](../../content/system-admission/bazi-smt-v10-versioned-parent-supersession.v1.json)。三者 raw SHA-256 分别为 `03bc334a…ccd2`、`8b26eea6…1f17`、`e44740e0…17b5`；专用门 21/21，显式八文件闭包在默认并发与串行模式均 365/365。红队发现的 WeakSet／冻结、数组 iterator、`Promise.all` snapshot 注入和 rights `candidateCount` 漂移均已修复，最终无剩余 P1/P2。

来源／版本：新 CADAL anchor 只表达同题名、同作者归属、同“四库”标签及 [page 3](https://commons.wikimedia.org/w/index.php?title=File%3ACADAL06056486_%E4%B8%89%E5%91%BD%E9%80%9A%E6%9C%83%C2%B7%E5%8D%B7%E5%8D%81.djvu&oldid=1207460960&page=3) normalized／[page 4](https://commons.wikimedia.org/w/index.php?title=File%3ACADAL06056486_%E4%B8%89%E5%91%BD%E9%80%9A%E6%9C%83%C2%B7%E5%8D%B7%E5%8D%81.djvu&oldid=1207460960&page=4) nonexpert exact-glyph 两处 hash-only 对应。它没有建立与 [Wikisource oldid 761703](https://zh.wikisource.org/w/index.php?title=%E4%B8%89%E5%91%BD%E9%80%9A%E6%9C%83_(%E5%9B%9B%E5%BA%AB%E5%85%A8%E6%9B%B8%E6%9C%AC)/%E5%8D%B710&oldid=761703) 的同版、同复制本、共享载体标识、Index/Page／proofread chain 或直接派生关系。8,321,599-byte DjVu 的操作员记录 SHA-256 为 `d532196e…e6fbe`；离线门明确 `externalCarrierLiveVerifiedThisRun=false`。

权利观察：[Commons 固定文件页](https://commons.wikimedia.org/w/index.php?title=File%3ACADAL06056486_%E4%B8%89%E5%91%BD%E9%80%9A%E6%9C%83%C2%B7%E5%8D%B7%E5%8D%81.djvu&oldid=1207460960)只形成 `PD-old`／Public Domain Mark 平台观察，未形成 `PD-scan`、许可保证或法律裁定；IA metadata 的 `rights/licenseurl` 为空。继续 `link_only`，三层 clearance、复制／引用／再分发权限、正式权利 reviewer 与法律结论均未建立。

内容／专家：页级对应是自动化非专家视觉观察，不建立版本身份、内容权威或八字规则真值；human collator、domain expert、rights reviewer 均为 0，正式专家仍 `0/2`，Binding 仍 `0/12`。正式 `KnowledgeDocument / SourceRightsRecord / SourceCarrierRecord=0/0/0`。

发布状态：既有 Binding readiness 与五行 SourceCarrier readiness 继续锁 source v1.6／rights v1.2，没有 successor、backlink 或 active rebind。默认仍为 `legacy-v13 / targetSchema 13 / migrationId null`；无 mutation epoch、跨文件原子、interval mutation 或 ABA 证明，`releaseReady=false / publicDeploymentAuthorized=false / expertClaimsAuthorized=false`。未运行全仓 typecheck、默认 Web build、完整应用、浏览器／PWA、公开主机、Release Evidence、部署或回滚。

## 2026-08-31 D 阶段八字 v1.7 当前机器身份 Manifest v2（不晋级）

当前新增 [八字 v1.7 当前机器身份 Manifest v2](../阶段D-八字v1.7当前机器身份Manifest-v2-2026-08-31.md) 与 [v2 manifest](../../content/domain-release/bazi.single-chart-report.v1.7.0.manifest.v2.json)。它保留旧 `bazi.single-chart-report.v1.7.0.json` 的 `12,777 bytes / d63d8050…ccd6 / manifest digest 60711da4…c932` 历史身份且不修改旧文件；新 v2 raw identity 为 `16,743 bytes / f5d7c2793f29a1b36e65c2cf087994bb2ed4be84e4fbb3d40e7ecdf13f6921c1`，semantic manifest digest 为 `5236c63f4586e64a06e5d4304c7d40900d5ef6be41268e0b2d01ee4b566a5c80`，独立 frozen golden 继续为 `aba357d98a99271cc9a9b2727ad1c7c516424c94b7cf34f765cb38b0e9a74b29`。

v2 把产品 `1.7`／surface `1.7.0` 映射到 rules、input、fact、source、rights、空 expert bundle、expert preconditions、high-risk policy 和 report contract 共 10 个组件、31 个组件文件引用／25 个唯一文件，并要求 SMT-v10 paired supersession、SourceCarrier readiness 与 version-aware vacant expert intake 三个真实私有 brand。当前仍精确为 Binding `0/12`、正式 `KnowledgeDocument / SourceRightsRecord / SourceCarrierRecord=0/0/0`、现实专家／独立意见／sealed opinion `0/2 / 0/2 / 0`，source／rights／expert bundle 不完整；Binding readiness 尚未消费最新 source `1.7.0`／rights `1.3.0`，SourceCarrier readiness successor 也不存在。high-risk policy 未获专家批准，`releaseCandidateFreezeAllowed=false / formalAdmissionPromotionBlocked=true`。

v2 loader 固定 manifest 自身 raw bytes／SHA-256／semantic digest，逐文件使用 held-handle stable reader，拒绝 duplicate key、clone/private-brand 冒充、自重签 authority promotion、未知字段、raw drift 与 accessor digest；exclusive writer 不覆盖既有文件。专用测试 `14/14`，显式 9-file 受影响闭包在默认并发与 `--test-concurrency=1` 下均 `392/392`，`npm run check:release-governance` exit 0。旧 formal Bazi manifest 继续 `MANIFEST_MISMATCH / exit 1`，v1.2 observer 因当前 lockfile raw drift `RAW_IDENTITY_DRIFT / exit 1`，formal expert packet、中央 registry 与 cross-system receipts 也继续各自 expected-red；v2 精确固定 `centralSystemAdmissionRegistryIntegrated=false / crossSystemEngineeringReceiptRegistryIntegrated=false / ownerAcceptanceForReleaseCandidateEstablished=false`。

这只建立当前工程机器身份，不建立跨文件原子快照；`mutationEpochAvailableForSchema13=false / mutationEpochReceipt=null / intervalMutationExcludedAcrossFiles=false / abaExcluded=false`。本轮未运行全仓 typecheck、默认 Web build、完整应用、真实仓储、浏览器／PWA／Service Worker、公开主机、Release Evidence、部署或回滚，也未取得内容真值、专家真值或权利法律判断。默认仍为 `legacy-v13 / targetSchema 13 / migrationId null`；`releaseReady=false / publicDeploymentAuthorized=false / expertClaimsAuthorized=false`。

## 2026-08-31 E 阶段紫微隔离体系当前机器身份 Manifest v2（不晋级）

当前新增 [紫微隔离体系当前机器身份 Manifest v2](../阶段E-紫微当前机器身份Manifest-v2-2026-08-31.md) 与 [v2 manifest](../../content/domain-release/ziwei-doushu.engineering-draft.v0.1.0.manifest.v2.json)。既有 predecessor `ziwei-doushu.engineering-draft.v0.1.0.json` 保持 `11,591 bytes / 4a099281…d5f7 / ac8d05db…eed7` 且不覆盖；v2 raw identity 为 `17,968 bytes / f886e95815109d670b65628db403a2fb86e69e5af4088466de1330a15695a867`，semantic digest 为 `f16f4e023248d4362fe42b28e34fd054a3451980d437ca9c83b6bdfb053fb34e`。

v2 固定紫微隔离 surface `0.1.0` 的 9 个组件、59 个组件文件引用／46 个唯一路径，纳入当前 HKO source candidate、公开端点 observation、受限来源 fresh pre-release policy、iztro build-notice child、高风险 source-binding child、16 个注册 egress surface 及当前 workspace bridges。紫微自身继续 `releaseIdentity / targetSchema / migrationId = null/null/null`；项目默认另账保持 `legacy-v13 / 13 / null`，`inheritedByThisSystem=false`。

门状态继续精确为 Binding `0/27`、正式 `KnowledgeDocument / SourceRightsRecord / SourceCarrierRecord=0/0/0`、现实专家 `0/2`、既存 HKO raw bodies 6。fresh HKO 构建门历史通过不得复用且无持久化 pass；high-risk 源码身份虽已绑定，`highRiskPolicyBound=false / candidateCallSitesWiredToGate=false / semanticCoverageComplete=false`。中央 registry、cross-system receipts、主应用和 owner formal admission 均未集成或接受；全部内容／专家／权利／发布／公开授权结论为 false。

独立 Manifest 专用测试 `33/33`；显式绿色受影响闭包在默认并发与 `--test-concurrency=1` 下均 `325/325`。独立 Manifest 总门、source requirements、HKO source／endpoint、高风险 child、双隔离 fresh build 和 release governance CLI 均通过各自机械检查；fresh build 只证明本次两个临时输出树未观察到已登记的 HKO 精确表示，不证明未知转码不存在、link-only 存储、权利许可或公开 build 授权。exclusive writer 以 `EEXIST` 拒绝覆盖。

中央 `four-system-admission.v1.json` 继续因既有八字正式 Manifest 漂移 expected-red；cross-system receipts 继续因保存的 expected-manifest preview／registry 身份漂移 expected-red，均未重签。逐文件 held-handle 不构成跨文件原子或 mutation epoch：`crossFileAtomicSnapshot=false / mutationEpochAvailable=false / mutationEpochReceipt=null / intervalMutationExcludedAcrossFiles=false / abaExcluded=false`。本批没有运行全仓 typecheck、默认 Web build、完整应用、浏览器／PWA／Service Worker、公开主机、Release Evidence、部署或回滚，也未读取或修改受限源码；没有执行 Git 操作。

## 2026-08-31 E 阶段四体系当前观察 Registry v2（不晋级）

当前新增 [四体系当前观察 Registry v2](../阶段E-四体系当前观察Registry-v2-2026-08-31.md) 与 [authority-free observation artifact](../../content/system-admission/four-system-current-observation-registry.v2.json)。它不覆盖、不重签旧 `four-system-admission.v1.json`，而是冻结八字 Manifest v2、紫微 Manifest v2、西洋 Manifest 加 version-aware observation，以及吠陀 v1.2 research-boundary observation 的当前机器身份。v2 raw identity 为 `22,261 bytes / 1b73a55f74597712f84706b2a2046fe3907fd3726261d1f8703469c5fa9abc39`，semantic registry digest 为 `fa521f30a40fd1c006e886c30f8da5295fbb82784db5671d59df2691117f3738`。

四体系 Binding 继续分别为 `0/12 / 0/27 / 0/28 / 0/38`，每体系 8 门、总计 `0/32`，现实独立专家均为 `0/2`；四体系正式准入数为 0。八字保留 `legacy-v13 / 13 / null` 现有 surface 语境；紫微、西洋、吠陀自身均为 `null / null / null` 且不继承八字权威。吠陀仍没有 domain Manifest、产品身份或 comparison support。scoring、weighting、多数表决、意见平均、生成模型选赢家、自动合并、权威继承、概念等价推断与 formal cross-system comparison 全部禁止。

旧中央账保持 `19,093 bytes / a8155032…4959 / digest a992d58c…097a` 且 `predecessorCurrent=false`；旧 receipt registry 未消费 v2。两条旧 CLI 继续分别因八字 Manifest 不一致和 expected-manifest preview 漂移 exit 1，均未重签。新 Registry v2 专用测试在默认与串行模式均 `15/15`；与八字 v2、独立 Manifests、西洋 observation、吠陀 v1.2、release governance 的显式受影响闭包在两种模式均 `287/287`、`0 fail / 0 skip`；新 CLI 与 `npm run check:release-governance` exit 0。

这只建立当前机器身份观察的工程证据。浏览器／运行时未评估，内容真值、专家真值、作品／版本／载体三层权利法律结论、发布就绪与公开发布授权均未建立。逐文件 held-handle 不是跨文件原子快照，`mutationEpochAvailableForSchema13=false / mutationEpochReceipt=null / intervalMutationExcludedAcrossFiles=false / abaExcluded=false`。本轮没有运行全仓 typecheck、默认 Web build、完整应用、浏览器／PWA／Service Worker、公开主机、Release Evidence、部署或回滚；没有读取或修改受限源码，也没有执行 Git 操作。

## 2026-08-31 E 阶段西洋现实专家公开候选预筛机器账（不晋级）

当前新增 [西洋现实专家公开候选预筛](../阶段E-西洋现实专家公开候选预筛-2026-08-31.md)、[机器账说明](../阶段E-西洋现实专家公开候选预筛机器账-v1-2026-08-31.md) 与 [公开候选 machine child](../../content/system-admission/western-expert-public-candidate-prescreen.v1.json)。四名公开显示名只登记为 `uncontacted_public_candidate_lead`：11 条无需登录的公开页面观察按 Astrological Association、Mayo、OPA、Kepler、PAA/NCGR、STA 去重为 6 个上游组；组数不证明身份、资质、scope 或现实独立性。没有联系候选，没有保存私人联系方式、证书、页面正文、exact quote、付费材料、同意或专家意见。

child raw identity 为 `29,938 bytes / 5b98910325b953cbd29af3d194dbd31588ebc03e64319234088d17dfdca31ea8`，semantic ledger digest 为 `7c573831d6af8904192e069298a1b91c0d9c5b9635753aeb56250d21bf204880`；叙述 basis 为 `10,767 bytes / 0e14973a85f31c5bf4448578b939d99d70f6674bf3ec34442692f7d621037e7c`。机器账单向绑定当前西洋 source requirements、独立 manifest 与 version-aware observation，三个 parent 和四体系 Registry v2 均无 backlink。西洋 Binding 继续 `0/28`，现实专家继续 `0/2`，六个候选配对的十项独立性核验全部未开始；domain、astronomy engineering 和 source-rights reviewer 职责不能互相替代。

专用测试在默认与 `--test-concurrency=1` 下均为 `24/24`；与独立 manifests、source requirements、西洋 observation、四体系 Registry v2、release governance 组成的六文件闭包在两种模式均为 `293/293`。新 CLI 与 `npm run check:release-governance` exit 0。自重算摘要不能把候选晋级为专家、分配席位、伪造 scope／独立性／意见或抬升 Binding／authority；pure verifier 还通过 post-import primordial／iterator poisoning 负例，exclusive writer 以 `EEXIST` 拒绝覆盖。

这只是公开候选发现的工程账，不建立现实身份、当前资质、范围适配、参与同意、彼此独立性、内容真值、专家真值、来源正文、三层权利或法律判断。`releaseReady=false / expertClaimsAuthorized=false / publicDeploymentAuthorized=false / publicReleaseAuthorized=false`；默认仍为 `legacy-v13 / targetSchema 13 / migrationId null`。本轮未运行全仓 typecheck、默认 Web build、完整应用、浏览器／PWA／Service Worker、公开主机、Release Evidence、部署或回滚；没有读取或修改受限源码，没有执行 Git 操作。逐文件 held-handle 不构成跨文件原子快照，mutation epoch、interval mutation 与 ABA 仍未证明。

## 2026-08-31 C 阶段 SourceCarrier readiness v1.1 版本感知后继候选 current replacement（不晋级）

当前新增 [SourceCarrier readiness 版本感知后继候选说明](../阶段C-SourceCarrier-readiness版本感知后继候选-v1.1-2026-08-31.md)与 [v1.1 candidate](../../content/system-admission/bazi-source-carrier-record-readiness.v1.1.0.json)。旧 v1 五行保持 canonical-exact，旧 artifact 不修改、不替代、无 backlink；v1.1 只新增 ordinal 6 的 SMT-v10 CADAL anchor，并以旧 v1 私有品牌作为 lineage 基础消费 paired source `1.7.0`／rights `1.3.0`。当前精确为 4 个 source／rights families、6 行 carrier observations、SMT-v10 2 行、DTT 2 行。candidate raw identity 为 `18,654 bytes / 8a2ae3fcd2abc01d952159ab78cb98eeba5dd2ab06d205e478abf64574759377`，ledger digest 为 `ca2734777002a2e56d82ec3702f0517668ae68b23b423c2cb31e65164c225531`；说明文档为 `6,339 bytes / ed7abd46e47db965dc1c6fd984a06a944766e1f321416b60f371a257179dacd9`。

正式 `KnowledgeDocument / SourceRightsRecord / SourceCarrierRecord / project-copy materialization=0/0/0/0`，权利 adjudication、已核 reviewer、现实专家与 frozen Binding 均为 0，Binding 继续 `0/12`，法律结论未建立；same-edition、直接 provenance 与本轮 live verification 均为 false。Binding readiness 与 C-M1 继续锁各自旧父，不声称采用新父；`activeAdmissionEffect=none`，默认仍为 `legacy-v13 / targetSchema 13 / migrationId null`，跨文件原子、mutation epoch receipt、interval mutation 与 ABA 排除仍为 false／null。既有 Bazi Manifest v2 与四体系 Registry v2 未修改、未消费本 candidate，不能把其历史机器闭包外推为 v1.1 当前集成或正式准入。

专用测试默认／串行均为 `23/23`；新 candidate、旧 readiness 与 SMT paired supersession 三文件受影响闭包默认／串行均为 `90/90`；新 candidate、旧 readiness 与 SMT 三个 CLI 均通过。新增的两条显式回归分别拒绝遗漏旧载体与合并两条 DTT，即使攻击者重算 ledger digest 也不能通过。这些结果只建立 version-aware、zero-instance、deny-only 工程闭包，不建立内容／专家真值、三层权利法律结论、Release Evidence、发布就绪或公开授权。本轮未运行全仓 typecheck、默认 Web build、完整应用、浏览器／PWA／Service Worker 或联网复核，也没有读取受限文件或执行 Git 操作。

## 2026-08-31 D 阶段八字专家隐私与正式 intake 对账后继候选 current replacement（不晋级）

当前新增 [阶段 D 隐私／formal-intake reconciliation 说明](../阶段D-八字专家隐私与正式intake对账后继候选-v1-2026-08-31.md)与 [candidate-only child](../../content/system-admission/bazi-expert-privacy-formal-intake-reconciliation.v1.json)。它只消费 expert intake v1.1 与 authority/privacy precheck v1 两个真实私有品牌；旧 expert packet 的 8 个 public identity fields 全部降格为 `historical_template_only_not_collection_or_persistence_authority`，其中 display name／controlled pseudonym 与 `verifiedBy` 明确禁止。未来 opaque vocabulary 仅为 non-executable schema；`currentInstances=[] / collectionAuthorized=false / persistedRealPersonInstancesAllowed=false / safeToPublish=false`。

最终 artifact 为 `10,260 bytes / f99612bd68adbe42145b0cc92030f44d54ee91eed574617690de8a4f109c9a17`，ledger digest 为 `cdf1a4d73a07b99a915e19f24672adbf6a4b42fb98754a0d679b32ec91eca3a2`。专用测试默认／串行均 `30/30`；与 intake v1.1、authority precheck 的三文件闭包两种模式均 `92/92`。两路独立终审最终无剩余 P1／P2；一条终审保留 URL-shaped ID、全部零计数、临时父漂移传播与 consumer 反向引用的自动化覆盖 P3。Bazi Manifest v2、observers、四体系 Registry v2、formal lifecycle、D0 与隔离 kernel 均未消费本 child。

formal packet 继续 exit 1，首失败为 `INTAKE_GAP_BINDING_DRIFT`；packet locks 仍 `11/12`，唯一 drift 为 bazi-core；专家 `0/2`、Binding `0/12`。CLI 只输出 `..._OBSERVATION_OK`，并固定 hidden preload、Node／loader／launcher identity 与 CLI trusted attestation 全未建立，可见 loader guard 不是安全边界；任意 pre-evaluation code execution 不在机械结果证明范围内。默认继续 `legacy-v13 / targetSchema 13 / migrationId null`，无跨文件原子、mutation epoch、interval mutation 或 ABA 证明，内容／专家真值、权利法律判断、发布就绪与公开授权均未建立。未运行全仓 typecheck、默认 Web build、完整应用、浏览器／PWA、Release Evidence、部署或回滚；未专家外联、未读取受限文件、未执行 Git。

## 2026-08-31 C 阶段 12 Binding readiness v1.8 版本感知后继（候选，不晋级）

当前新增 [12 Binding readiness v1.8 说明](../阶段C-12Binding-readiness版本感知后继-v1.8-2026-08-31.md)与 [v1.8 artifact](../../content/system-admission/bazi-binding-freeze-requirements.v1.8.0.json)。它消费 predecessor v1.7、SMT-v10 paired supersession 与 SourceCarrier readiness v1.1 三个 fixed-path 私有品牌，把 source／rights 父位更新为 `1.7.0 / 1.3.0`；十二行只有 ordinal 10 的 SMT-v10 candidate 从 v1 单向切到 v2。artifact 为 `35,616 bytes / f612019e19255f47be03a569bb4cf3e61227146a924c4c63a2b75f1b28649ab3`，ledger digest 为 `6ed301be956d160e06126eed63a7155ab8182adbcbc7e0def2690e8271e50866`。

机械观察计数为 carrier／visual／normalized／exact-glyph `6/9/8/2`，quote digest 仍为 6；正式 KnowledgeDocument／SourceRightsRecord／SourceCarrierRecord／materialization 仍为 `0/0/0/0`，Binding `0/12`，现实 reviewer／专家／法律审查均为 0。专用默认／串行测试各 `23/23`，CLI 降格为 `..._OBSERVATION_OK`；红队最终无 P1/P2，Proxy trap 与任意同进程前置代码执行只作为未建立的运行时边界登记。无中央 consumer／backlink，`activeAdmissionEffect=none`。

## 2026-08-31 D 阶段八字 v1.7 Manifest v2.1（候选，不晋级）

当前新增 [Manifest v2.1 说明](../阶段D-八字v1.7当前机器身份Manifest-v2.1-2026-08-31.md)与 [v2.1 artifact](../../content/domain-release/bazi.single-chart-report.v1.7.0.manifest.v2.1.0.json)。它并列消费 Manifest v2、SourceCarrier readiness v1.1 与 privacy／formal-intake reconciliation v1 三个 fixed-path 私有品牌；只重绑 `rights_bundle` carrier，并在 expert preconditions 增加零实例对账。artifact 为 `19,064 bytes / 68794de2ce30c11a8e94333c23a2e115355590ead41eb97f67af6a638e420413`，manifest digest 为 `f3cc8c91674c49317f93a7362b34e1b8eb887029284e0c9994fdf15ea546bfd2`。

当前仍为 Binding `0/12`、专家 `0/2`、正式三记录全 0、packet locks `11 exact / 1 drift`，首失败 `INTAKE_GAP_BINDING_DRIFT`；真人 context 为 0，collection／persistence／publish authority 全 false。红队发现 test-only raw summary 可对未品牌 wrapper 写入误导 verified 标志后，该导出已删除；官方 summary 现在强制 full-loader brand，最终 P1/P2 为 0。专用默认／串行测试各 `32/32`；没有中央 registry、cross-system receipts 或 lifecycle backlink。

## 2026-08-31 E 阶段吠陀独立工程当前机器身份 Manifest v1（候选，不晋级）

当前新增 [吠陀 Manifest v1 说明](../阶段E-吠陀独立工程当前机器身份Manifest-v1-2026-08-31.md)与 [独立 artifact](../../content/domain-release/vedic-astrology.engineering-draft.v0.1.0.manifest.v1.json)。它用 fixed-path 私有品牌消费 v1.2 observation child 与最新 source-rights v1.1 successor；后者作为第 5 个 requirements-only component，当前为 `5 closures / 33 references / 33 unique paths`。artifact 为 `19,557 bytes / a21c5bcafe84fcbb6289af6d3dfdd052acb72c6987ea924a882abd76768bc0d5`，manifest digest 为 `96c1f8c4062a5d398b7b546ee68fd6bbd51f5a5200f4bdb4b76b994ab25d8685`。

v1.1 successor 固定 `94,582 bytes / 9356740cfd960a3137493928978d43d25be432f1bae719dde7ea95c66338c2bd` 与 digest `afd65de96a850c1632e8c00b03b6be2ff05a2f8b1dd0a19fbe27d4376ac2bb6b`；旧 v1 仍为 formal current，v1.1 `formalCurrent=false / active effect none`。吠陀继续 `0/38 binding / 0/2 expert / 0/8 admission`，自身 product／release／schema／migration identity 全 null，不继承八字 v13 权威。E 层 caller-supplied parent seam 已移除，最终红队为 P1/P2/P3 `0/0/0`；上游历史 v1.2 brand primordial residual 仍单独登记，不冒充已修复。专用默认／串行测试各 `36/36`，无中央 consumer／backlink。

## 2026-08-31 C／D／E 合并机械复验分账

三条新测试文件在默认与 `--test-concurrency=1` 两种模式均为 `91/91`；三个 CLI 均以 observation 语义 exit 0。`npm run check:release-governance` exit 0，继续报告 `legacy-v13 / targetSchema 13 / migrationId null`、`publicDeploymentAuthorized=false`、`expertClaimsAuthorized=false`；`package-lock.json` 保持 `175,812 bytes / 40a02c7c3166f0c9bc03afa9c1d1f342fb7f54efe1abbf7cb3f5cf6ecb482a4d`。

旧 formal Bazi manifest、v1.2 observer、formal expert packet、中央 registry 与 cross-system receipts 继续 expected-red；独立紫微／西洋 manifest verifier 只以所有 authority false 的离线工程闭包通过。`check:system-contract-draft-boundaries` 继续 exit 1，只列禁读文件未检查及既有动态 import／未登记依赖；本轮 C／D／E 新文件未出现在诊断中，没有绕过红门。

以上不建立完整应用、真实正式仓储、浏览器／PWA／Service Worker、公开主机、Release Evidence、部署、回滚、内容真值、专家真值或权利法律结论；也没有运行全仓 typecheck 或默认 Web build。跨文件原子、Schema 13 mutation epoch、interval mutation 与 ABA 排除仍未建立。

## 2026-08-31 C 阶段生产 Bundled Knowledge Manifest 共享契约 v0.2（不晋级）

当前新增 [Stage C 共享契约 v0.2 说明](../阶段C-生产BundledKnowledge-Manifest共享契约-v0.2-2026-08-31.md)。`packages/knowledge-core` 现在为 Web build 与隔离 Stage C candidate 提供同一个 manifest entry metadata gate：只接受 `documents/` 下的 Markdown／TXT 规范路径、拒绝空／`.`／`..` 段，统一 code-unit 排序与 `inferKnowledgeFormat`。Web 仍独占严格 manifest envelope、精确磁盘库存、普通端点／目录链、held-handle 稳定读取、UTF-8、字节上限和实际 content hash 审计。

Stage C candidate schema／摘要域升为 `0.2.0`，输出精确分账 `bundledKnowledgeManifestEntryMetadataContractValidated=true / productionBodyInventoryAndBytesAudited=false`，并新增 KnowledgeDocument format 与 bundle extension 双向拒绝。`bindingCitationLocatorLinked=false`、external pin、mutation epoch、跨文件原子、interval／ABA、正式准入和全部 authority 红门保持不变。三文件最终默认／串行均 `47/47`，两条 strict TypeScript 切片通过；红队最终运行时 P0/P1/P2 为 0，辨识性测试覆盖 5,000-heading `.txt` 点文件与 `a-.md / a_.md` 多 entry 顺序。

本次生产修改使旧 readiness／manifest 的完整私有品牌链按设计暴露漂移。v1.8 readiness、Bazi Manifest v2 与 v2.1 原件保持不变，但其当前 loader 分别 exit 1；v2 明确 `BOUND_READINESS_BASIS_DRIFT`，v2.1 的根因相同。因此它们从此只作为历史快照，不能再称 current machine manifest。append-only v1.9／v2.2 后继尚未落盘；在后继完成前没有可诚实称为 current 的八字 v1.7 完整机器 Manifest。

生产 `content/knowledge/manifest.v2.json` 仍为空，正式 KnowledgeDocument／SourceRightsRecord／SourceCarrierRecord／materialization 为 `0/0/0/0`，Binding `0/12`，专家 `0/2`。下一真实 C 输入仍需用户提供工作区外、合法持有的 revision 761703 UTF-8 body，并授权只作本机私有导入与 exact-quote 验证。Stage D 在未获现实专家外联和个人信息处理授权前停止；没有联系、收集、持久化或伪造真人 consent／意见／seal。

`check:release-governance` 继续 exit 0 并固定 `legacy-v13 / targetSchema 13 / migrationId null`、两项公开授权 false；`package-lock.json` 仍为 `175,812 bytes / 40a02c7c3166f0c9bc03afa9c1d1f342fb7f54efe1abbf7cb3f5cf6ecb482a4d`。`check:system-contract-draft-boundaries` 仍只按受限文件未检查和既有诊断 exit 1，本轮文件无新增诊断。未运行全仓 typecheck、默认 Web build、完整应用、浏览器／PWA、公开主机、Release Evidence、部署或回滚，也未读取受限文件或执行 Git 操作。

## 2026-09-01 C/D 阶段 readiness v1.9 与八字 Manifest v2.2 current replacement（机器身份，不晋级）

本节取代上一节“append-only v1.9／v2.2 尚未落盘”的当前状态表述；上一节保留为 2026-08-31 点时历史。当前 [Binding readiness v1.9](../../content/system-admission/bazi-binding-freeze-requirements.v1.9.0.json) 已冻结为 `45,551 bytes / e20145b5f34b5dc04464e482cda5da990f82e520236679efbf568b322637f797`，ledger digest 为 `42930e63cb0960df969f5fe059617eb96a8ec9bd857c486cd4b33a28d37a8ae1`。它只把 `packages/knowledge-core/src/index.ts` 从旧 `39,595 / 9e6420e8…524b0` 重绑到当前 `41,040 / 85e86d6e…20837`；十二条 Binding 行全部复制，`bindingRowsChanged=0`。v1.8 predecessor 与 source／rights／DTT／SMT／carrier 等旧上游仅作固定 raw／embedded-semantic 历史观察，全部 `brandCurrent=false / privateBrandConsumed=false`，当前 loader 不调用其已失效私有品牌。

[八字 v1.7 Manifest v2.2](../../content/domain-release/bazi.single-chart-report.v1.7.0.manifest.v2.2.0.json) 现为当前机器身份后继：`23,399 bytes / 6481d5edfa9f9819af035ad9d208ea526fa7b29f12ccd6e072ad31f625e7f86d`，manifest digest 为 `a95e722674c0b09a2d564b4090396fbfc25fdfc2f5f2fff9aedc92aa2468f68e`。它保持 10 个组件，以 34 个文件引用覆盖 28 个唯一路径；只重绑 `source_bundle` 与 `rights_bundle`，其余 8 个组件与 v2.1 canonical-exact。唯一 current private brand 是 v1.9；v2.1、SourceCarrier v1.1 与 privacy／formal-intake reconciliation v1 仅以 3 份固定 raw+self-digest+selected-red-semantics 历史 context 保留，三条旧 full-loader 的直接根失败均为 `BOUND_READINESS_BASIS_DRIFT`。

v2.2 只固定当前 knowledge-core manifest metadata contract 与 Web bundled-knowledge audit 实现的文件身份。它没有把 `apps/web/vite.config.ts`、生产正文盘点或本轮 build 执行冒充闭包：`productionWebConsumerClosureEstablished=false / productionWebCallSitePinned=false / productionBodyInventoryAndBytesAudited=false / currentBuildGateExecuted=false`；隔离 Stage C material-admission candidate 也未进入 active component surface。生产 knowledge manifest 仍为空，正式 `KnowledgeDocument / SourceRightsRecord / SourceCarrierRecord / materialization=0/0/0/0`，Binding `0/12`，现实独立专家 `0/2`，packet locks 仍 `11/12` 且首个 formal failure 仍为 `INTAKE_GAP_BINDING_DRIFT`。

v1.9 专用测试默认／串行各 `32/32`；v2.2 各 `25/25`；两文件联合闭包各 `57/57`。两路独立红队最终分别无剩余 P0–P2 与 P0–P3；Map iterator 选择性污染、Proxy／custom Array prototype、重签 brand／组件／authority 提升均 fail-closed。两个新 CLI exit 0；`check:release-governance` 与 `check:web-storage-import-boundary` exit 0；离线 lockfile dry-run 前后保持 `175,812 bytes / 40a02c7c3166f0c9bc03afa9c1d1f342fb7f54efe1abbf7cb3f5cf6ecb482a4d`。`check:system-contract-draft-boundaries` 仍按禁读文件未检查与既有诊断 exit 1，本轮 v1.9／v2.2 文件未进入诊断。

这只恢复八字 v1.7 的当前机器身份链，不建立来源正文、exact quote、作品／版本／载体权利 clearance、内容真值、现实专家身份／资质／独立意见、完整应用、默认 Web build、浏览器／PWA／Service Worker、公开主机、Release Evidence、部署或回滚。默认继续为 `legacy-v13 / targetSchema 13 / migrationId null`；跨文件原子、Schema 13 mutation epoch、interval mutation、ABA 与 replay 排除全部未建立，`releaseReady=false / publicDeploymentAuthorized=false / expertClaimsAuthorized=false`。D 阶段在获得现实专家外联与个人信息处理授权前仍停止。

## 2026-09-01 E 阶段西洋 civil-time→UTC fact-only 隔离浏览器观察 child（不晋级）

当前新增 [机械验证说明](../阶段E-西洋civil-time至fact-only浏览器链机械验证-v1-2026-09-01.md) 与 [observation candidate](../../content/system-admission/western-civil-time-fact-browser-observation-candidate.v1.0.0.json)。child 为 `21,132 bytes / c23cef0c53f433e4996c78769c4f9ffe023309e8ef136414e67fc35d7e0932b2`，semantic digest 为 `e898edd1e91aa69193157bdbfc5ea24610a828ce16588388cd9b7cb5b6331b81`；它固定 25 个源码／门禁 artifacts、两次 byte-exact 构建及 11 个最终构建产物。Vite `7.3.6` 只借用 `apps/web` 工具链，没有产品／runtime import，也不建立工具链完全独立。

定向验证为隔离 `4 files / 28 tests`、专用 verifier `11/11`、canonical contract `1 file / 7 tests`，两条 strict TypeScript 切片通过；release governance、Web storage boundary 与 offline lockfile dry-run 通过。中央 system-contract boundary 继续按禁读文件与既有诊断 expected-red，本轮西洋隔离路径没有新增诊断；其测试为 `74/75`，唯一失败在当前 Vite config 首次解析时、alias 注入前触发既有红门，不是西洋专用 verifier 回归，也不计为全绿。浏览器只在 Codex In-app Browser 受控 loopback 观察四组 synthetic 场景、`390x844` 响应布局、无 query form navigation 与 console warning/error 0；这不是 Chrome/Edge、完整应用或生产证据。

runtime storage probe 在 read-only browser evaluate sandbox 中不可用，只能记录 authored-source storage API 定向扫描为 0。受限文件继续未读，因此生产 reachability audit 明确 incomplete；不能声称全仓 production unreachability、runtime zero storage 或完整网络隔离。Dedicated Worker 是同一构建内的受信计算组件，主线程不独立重算 tzdb semantics；SHA-256 不是签名，UI generation 也不是 mutation epoch。

西洋自身仍为 `null / null / null`、`Binding 0/28 / expert 0/2 / admission 0/8`，不继承八字 v1.7 authority。来源正文、exact quote、三层权利、内容／专家／科学真值与法律结论均未建立；`releaseReady=false / publicDeploymentAuthorized=false / publicReleaseAuthorized=false / expertClaimsAuthorized=false`。本轮未运行全仓 typecheck、默认 Web build、完整应用、正式存储、PWA、Service Worker、Chrome/Edge、公开主机、Release Evidence、部署或回滚。
