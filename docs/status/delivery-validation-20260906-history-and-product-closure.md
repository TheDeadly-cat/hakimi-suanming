# 2026-09-06 历史依据与产品补充归档

本记录补充 [SW、启动身份与 C9 原归档](delivery-validation-20260906-sw-boot-identity.md)，保留原 14 项及旧失败，不改签。基础 HEAD 仍为 `b7216a301a74bea0591b364b4dba32aa34409378`，结果包含未提交修改，不是该提交或远端 CI 通过。

QA 根：`C:/Users/Administrator/AppData/Local/Temp/hakimi-v13-approved-build-a53fb2e74e364e588e62001315717438`。下文 `QA/` 相对此目录。

## C9 产品补充：6/6

原产物仍为 `hre1-c8b8cff4d0514969b7a4e492445e67e3`、build `1ab8f706fe78`，137 文件；原锁 SHA `f6d4366a3b5ef7a379a3e2586fc8cc869fac7107115e3b74d6e71300cd5e0258`，artifact set SHA `307f62f7193b0ff8203a342fc71eb87f45a251002d51475ff7e1b1beb91d9d3a`。仍为 `legacy-v13 / 13 / null`。

Chrome、Edge 各执行以下三场景，单次运行 6/6、exit 0、无 skipped/unexpected/flaky，耗时 101.23 秒：

| 场景 | 实际证明 |
| --- | --- |
| 空资料空间 | 检查 9 个页面入口，每次原生只读快照覆盖 16 分区；全部保持空，不生成伪资料 |
| 非法备份 | 通过真实文件预检拒绝 `UNSUPPORTED_FORMAT`、`DIGEST_MISMATCH`、`ORPHAN_REVISION`；原数据摘要不变 |
| 重复恢复 | 恢复处理中再次点击仍锁定；完成后再次恢复须新安全预检/确认；四个检查点与原完整快照一致，Revision 仍为 1、2 |

重复恢复用例只暂缓真实 `storage.estimate()` 已取得的返回值以观察处理中状态；清理记录确认返回同一对象、恢复原方法，不替换数据库内容。结果不能扩称为所有 T7 状态、全容量矩阵或外部 Provider 验收。

原证据：`C:/Users/Administrator/AppData/Local/Temp/h7p-6dfbe021/completed-run-summary.json`，同目录保留 `playwright-report.json`、`browser-run1.log`、`exit-run1.json`、产物前后记录及截图。源码端点见 `QA/candidate-9/source-delta-before-product-supplement.json`、`source-delta-after-product-supplement.json`，均为 `60c072d02afd0ee87519fff9880bb317dc7493dd305b90cf5b726f86e67fbf60`。

本补充与原五次运行 14 项合计为**六次独立运行、20 个 C9 目标**。SW6/ABA2、cross4 是另外的夹具产物，不计入 20；既有跨 Schema 范围限制保留。

## 历史依据：原件找回与限定复验

以下三份输入从本地 Git blob 找回，先核对原长度与 SHA，再作为数据保存；未执行恢复的 TypeScript，也未使用旧 lock 安装依赖。

| 原路径 | 字节 / Git blob OID | 原 SHA-256 |
| --- | --- | --- |
| `packages/knowledge-core/src/index.ts` | 39595 / `ea3284d85e2be067a34abe8f6c0181177fd4a788` | `9e6420e8c6c5b3aafd892fdb3c5363af81ea9d9e24ebff6e11897300053524b0` |
| `package-lock.json` | 175812 / `7a8a2964aae53981c5742d3633af3f5e472c193f` | `40a02c7c3166f0c9bc03afa9c1d1f342fb7f54efe1abbf7cb3f5cf6ecb482a4d` |
| `packages/research-export/src/single-chart-report.ts` | 161365 / `5daf540b7fc30c21cf28a156419d7d495e14bf25` | `215a470e79ea6eb844b41a5aad18867279d1a7ae60fd2b9cf6a364cc2c1b5082` |

37 份完整原输入已逐项匹配历史组件/上游 pin，固定于 `scripts/fixtures/bazi-domain-manifest-v2-original-inputs.zip`；ZIP 为 303905 字节、SHA `0d9659b5eb8f652c0803305cbc4372c97cfc46f7d711ceeb5c7dfae98bec71be`，精确路径设置 `-text`。来源说明见同目录 README。

历史数据 root 的实际 loader 与 `node scripts/verify-bazi-domain-release-manifest-v2.mjs --historical-input-root <directory>` 均通过，验证代码从当前 repo 加载。原 v2 manifest 保持 16743 字节、SHA `f5d7c2793f29a1b36e65c2cf087994bb2ed4be84e4fbb3d40e7ecdf13f6921c1`。输出限定为 `historical_input_root`，`currentApplicabilityAssessed=false`；冻结 0/12、专家 0/2、发布权限 false。

无参数 CLI 仍读当前 repo 并以 `BOUND_READINESS_BASIS_DRIFT` 退出 1。current domain 仍为 `selectedCurrent=null`，scoped resolver 返回 `CURRENT_UNAVAILABLE`。DTT 默认 reader、v2/v2.2 库、历史 failure 字段及 current-index 没有加入归档回退或被改写。精确旧源码缺失这一阻塞已闭合；原来的 11 次失败仍是原运行事实。

证据目录 `QA/historical-v2-original-inputs-60e5915823/`：`materialization.json` 与两份 ZIP readback；`historical.exit.json`/stdout、`current.exit.json`/stderr；`verification-run1` 的两份独立 CLI exit/stdout/stderr。

**运行范围纠正：**run1 的筛选未实际排除指定测试，真实 TAP 为 18/18；`verification-run1/scope-invalid-correction.json` 标记 `execution_scope_invalid`，原日志与原 summary 均保留。该次不能作为获准的 17 项限定运行。run2 实际执行 17 个普通合同、明确排除 1 个未执行，TAP 17 pass / 0 skip、exit 0；见 `verification-run2/selection.json`、`tests.stdout.log`、`tests.exit.json`、`summary.json`。run2 前后 2107 个源码项及 C9 产物相同，48 个受保护原件不变。此结果不是 18 项限定通过、v2 全文件通过或全 Node 通过。

## T4 与后续边界

Migration CI 已按 `app-boot-*` 职责和 PWA 构建生产/测试路径补触发，保留无关文档负例。最终普通 `ci-contracts` run2 为完整 5 文件、41/41、exit 0。证据位于 `QA/t4-boot-identity-trigger-20260906-ba3c85c8/run2-boot-responsibility/`；原 run1、三文件原字节/diff、原锁及 SW21 无变化的核对均保留。

本轮未改变 C9 运行时或产物，后续 CLI/测试/fixture 与文档修改分别记为源码差异，不重写构建身份。正式 npm 的来源语义红门、三个 Node 未整组执行、真实旧发布兼容范围仍保留。T8 真实作者、材料权利、专家原意见及可信资格回执消费者，T9 HTTPS 环境批准和真实同产物部署/回滚尚未完成；找回旧源码与局部测试不替代现实准入。

## T6 仓库入口与真实复跑

已将原 Temp 的双标签页、原生事务中止、只读 ZIP 三场景迁入 `apps/web/e2e/local-data-recovery-boundaries.spec.ts` 和 `local-data-readonly-recovery.spec.ts`。相对路径的 `locked-default-v13-artifact.ts` 调用现有原锁 verifier；新增最小类型声明，不修改其实现。`npm run diagnose:e2e:local-data-boundaries` 只选择这三场景、Edge/Chrome 两个项目，使用已有产物的验锁预览，不重新构建、不生成正式回执。原 matrix candidate、formal backup4/boot6、正式 13 项命令要求均保留。

原字节和迁移 diff 位于 `QA/t6-repository-data-boundaries-7d49f031/`。首轮完整 typecheck 明确报新 readonly 测试 `routeMatch` 两处可能为空；原日志在下述 `typecheck-run1`。root 添加明确非空守卫后 run2 通过；后续共享构建 helper 修复后 run3 再次完整通过。原 readonly 文件副本及最终代码差异没有抹去。

最新实际执行根为 `QA/t6-repository-wiring-review-20260906-9bf941ac/`：

| 执行 | 结果与范围 |
| --- | --- |
| `typecheck-run3/summary.json` | 完整默认图 PASS，2.429 秒；输入 2113 项，前后相同 |
| `boundaries-run1/summary.json` | 仓库诊断别名实际 6/6，90.917 秒；无跳过、重试、错误或 flaky；标准报告与 `compact-readback.json` 逐一回读 |
| `cross-run1/summary.json` | 首次仓库跨版本入口夹具构建失败，2 failed / 2 skipped，测试主体未执行；源及 C9 原产物未变 |
| `cross-run2/summary.json` | 修复后实际 4/4，177.514 秒；每个浏览器重新构建七个夹具，无跳过或重试 |
| `history-final-check.exit.json` / `current-index-final-check.exit.json` | 最后独立机械复核均 exit 0；历史 25 族/77 成员，current 仍 16 选定/9 不可用，domain 与专家包没有获准或自动提升 |

六个恢复目标的实际浏览器为 `Edg/152.0.4191.66`、`Chrome/152.0.7977.83`。两浏览器中止证据均为真实 attachment clear 成功后一次原生 abort，complete 为 0；全部 16 分区在中止前、回滚后与重新打开后逐一相同。实际 UI 进入未知结果分支，关闭重复恢复与资料写入，并经可用的“重新打开”操作核对；导出 ZIP 保留两个 Revision 和两个附件。双标签页旧预检拒绝后，R1 原摘要、R2 最新指针和竞争写入均保留。只读界面通过真实文件下载导出 ZIP，四阶段的 16 分区及版本相同。

boundary 的 page errors、异常 console 与外部请求为空。readonly 每浏览器三条预期错误只属于精确受控路由资源的取消及连带动态导入/SW 错误，`unexpected=[]`；DOM 身份、非空内容、无框架 overlay、真实下载及两个界面 PNG 已回读。原始截图/ZIP/trace 在 `C:/Users/Administrator/AppData/Local/Temp/h6repo-boundaries-9bf941ac-run1`。此处 6 项是既有边界覆盖复跑，原 20 个独立目标仍为 20，不能因重复执行写成 26。

跨 Schema 原 spec 只替换两个场景的退场助手：观察 A 的真实 worker 与 B waiting 身份，关闭全部 A 页，明确观察零受控客户端及 B 自然激活，再开目标页验证业务。未发强制接管协议。其他 11 个测试体不改，完整入口仍保留；精确 grep 仅作本地子集复跑。清理只接受本 spec 创建并登记、仍位于原临时父目录且真实身份不变的目录；七个并行构建改为全部结束后汇总失败，避免一项提前失败时清理其他构建仍在使用的目录。原件和 diff 位于 `QA/t6-cross-schema-repo-wiring-5fe9c13c89/`。

`cross-run2/compact-readback.json` 独立回读四份原退场附件及四份副本：每项关闭两个 A 页、显式零受控客户端、同一 registration/script 下的目标 worker 自然激活，观察器 cleanup/error 均为空。两浏览器的 A build 为 `2ad926ef0b4d`，正常 B 为 `185f58cfaf60`，校验失败 B 为 `4a2e02aad310`。成功用例按原配置未保存 trace；报告未记录随机 generation/profile 目录名，不能另行证明这些目录已删除，不能把观察器 cleanup 字段当作文件系统清理记录。

首次 run1 的原因是新增诊断 alias 改变根 package 原字节，当前工程 sidecar 正确拒绝旧指纹。该对象明确为 `current_checkout_runtime_closure_not_historical_binary_or_expert_attestation`。用既有生成器预生成并核对后执行 `--write → --check`，只改变 root package 的 SHA、长度 `32032→32154` 和派生总摘要，执行图、固定源码、历史原件不变；证据在 `QA/current-runtime-closure-package-sync-d0d1f8d2/`。这不是为历史证据改签。

另修正 `cross-schema-upgrade-helpers.ts` 从应用 package 解析 Vite，要求安装版本精确等于应用声明，再使用该包声明的 CLI bin，兼容正常 hoisting。现在实际使用 7.3.6；根安装与原 `h6cs-22824ab3` PASS 日志实际是 8.2.0，旧证据仍保留。没有安装依赖或改锁。resolver 原字节、最小 diff 和实际只读解析在 `QA/cross-helper-vite-resolution-6231026e2d/`；新工具链的浏览器证据只引用本次 run2。

typecheck-run3 与 cross-run2 前后源树摘要同为 `84e9971950dfb40ba49968e16c638641d8988eea68fc275a102aeddd6d0f97a6`，输入 2113 项。C9 仍为原 137 文件、原 build/证据 ID/锁；跨 Schema 另建夹具不继承 C9 的 evidence ID。之后的状态文档修改单独列入源码差异，不改写这两个运行快照。完整 Vitest 保留先前 213/2795 的实际记录；最终对其 936 个原记录输入逐一比较，只有 root package 与当前工程 sidecar 两项改变，不声称此次重新执行完整 Vitest。

## Nightly 补充诊断的计数与失败传播

`nightly-heavy.yml` 保留原 heavy job 的完整字节，新增独立 Windows 诊断任务，依次计算身份、完整诊断构建、验证 default-v13、写入原锁、执行六目标、核查标准 JSON。即使浏览器失败，只要锁已生成仍核对原锁，并保留日志/trace/截图/锁。任务不生成 formal receipt，也不改变正式 backup4/boot6 的结果 schema 或测试数。

新增三个有限合同进入既有 CI 路径测试文件；完整 `ci-contracts` 五文件实际 44/44、无跳过，证据在 `QA/t6-local-data-ci-wiring-8bfabc5b/`，之前 41 项的原运行保留。另从已冻结工作流提取实际 PowerShell 报告校验正文，原标准六目标报告 exit 0；跳过、重试、缺失目标、错误浏览器、顶层错误五份临时副本分别 exit 1，均命中预期拒绝分支。证据在 `QA/nightly-report-gate-check-4da970e3/`。这验证本机报告校验，不代表 GitHub 任务实际运行或云端 CI 通过。

## T7 仓库五文件与九场景双浏览器复验

本节是上述六目标/44 项合同记录之后的补充，不改写原运行。QA/t7-reproducible-flow-20260906-6c9ff320 保存这次原文件备份、各次日志、源码快照、退出码和标准报告。

将原 Temp 的空库、非法备份、重复恢复三用例迁入 local-product-flows.spec.ts，将旧 AI 上下文及来源不可用两用例迁入 local-ai-source-resilience.spec.ts，保留原业务断言。原三场景与容量用例一起接入既有本地诊断配置，现为五文件、每浏览器九项、共 18 项。正式 backup4/boot6 和原 heavy job 不变，新增 ABA 也没有替代正式 SW 三场景要求。

容量 spec 修复了陈旧的安全备份按钮操作，改为实际“先准备当前安全备份”和既有下载助手；在真实 Worker 预检后、恢复提交前的两次受控估值拒绝均增加原生只读 16 分区逐项/摘要核对。该用例模拟估值，不证明真实设备耗尽。

| 运行 | 原结果 |
| --- | --- |
| typecheck-run1 | 完整默认图通过，2.832 秒 |
| ci-contracts-run1 | 完整五文件 45/45，exit 0，零 fail/skip/TODO/cancel；原标准 results/events 另行归档 |
| local-data-run1 | 14 PASS / 4 FAIL / 0 skipped，218.461 秒；AI/来源四目标在业务开始前报 tracing.start: Tracing has been already started |
| typecheck-run2 | 修复追踪所有权后完整默认图通过，2.684 秒，source 2118 项前后一致 |
| local-data-run2 | 18/18，exit 0，277.329 秒；每浏览器九项，各一次 retry 0，零 skipped/unexpected/flaky/top-level error |

两项 AI/来源用例原本自己管理 persistent context 的 trace；仅在该 spec 设置 test.use({ trace: "off" }) 避免再次自动启动，手动 trace 仍实际保存。其余用例保持自动 trace。没有借关闭失败用例或减少计数来得到通过。

run2 的完整类型检查与浏览器运行源摘要同为 9f102d238fbefff5852a8087a5c2cef093af0b085cef5c3eeced4b9070bf3767。C9 原 137 文件、build、evidence ID、原锁在运行前后相同；原 run1 报告及 source 记录保留。

独立回读位于 QA/t7-reproducible-flow-20260906-6c9ff320/independent-readback-2c4719af/compact-readback.json，SHA-256 412160eb22dbb86cabb34a62ef7f9147bed85f0f166c1e666a0fcea454e61cc1。实际为 Edge 152.0.4191.66 和 Chrome 152.0.7977.83。102 份 snapshot/witness 摘要重新计算并分组核对，容量拒绝、九页空库、三类非法备份、忙碌锁及两次完成恢复、AI、来源、只读、双页和事务中止均核对原 16 分区。

18 个布局样本均无横向溢出；18 个 trace ZIP 均含真实帧/动作和相应 channel，四个手动 trace 绑定四个独立 profile；其 Default、IndexedDB 和 Service Worker 目录实际存在并保留。100 张 PNG 已检查格式/字节并计算摘要，目视检查其中五张。来源用例各真实点击一次受控 503 导航，拦截在本地完成；未向第三方发出该请求，不证明第三方停机或真实 Provider 降级。

本次是独立一次 18 目标运行，其中包含此前覆盖复验。原 C9 六次运行的 20 个独立目标保持原计数，不能相加写成 38。

Nightly 的最新独立任务实际 PowerShell 正文为 1951 字节，SHA-256 e7994619bb92f079ecf87505c46e832537c66ccb33354240187e89a012463e0e。提取后以真实 18 目标原报告运行，exit 0；缺一实际 target、单 result skipped、非零 retry、flaky 汇总、顶层 errors 五份普通副本分别 exit 1，六个结构预期均符合。原工作流及原报告前后相同。证据位于 QA/t7-reproducible-flow-20260906-6c9ff320/nightly-report-gate18-and-ci45-mtpjeytt/summary.json；这不是六次新浏览器运行或远端 CI。

同目录 ci-contracts45 保存原五文件 45/45 的 results.json 与 events.jsonl 字节副本，源/副本 SHA-256 分别为 0d0949472d37af2b965996c3827f7a307ea8a1e68f39ff27026d802491c48b92、5a2f8a0ed9ea9848fc1d4030799492d16ff1aaa3d59520f83b9717247caa4f5d。该组实际运行在追踪器修复前，后续 trace 所有权改变由完整 typecheck-run2 与 18 目标 run2 验证，不改署 CI 合同原运行快照。

## 同 Schema ABA 的仓库独立入口

新增 service-worker-same-schema-aba.spec.ts、playwright.sw-aba.config.ts 和薄入口 scripts/run-sw-same-schema-aba-fixture.mjs，以 npm run diagnose:e2e:sw-aba 调用。复用原 fixture 身份、source identity、标准浏览器矩阵和诊断 Vite 解析；不新增正式 receipt 类型，不改 canonical 每项目三场景门或其 rollbackVerified 字段。

正式 npm 入口实际 exit 0，总耗时 83.798 秒，2026-09-06 08:06:00.217–08:07:24.021 UTC。外层原记录为 QA/t6-aba-repository-run-qLC5uP，内层保留于 C:/Users/Administrator/AppData/Local/Temp/h6aba-YkIRur。应用 Vite 7.3.6 构建原合同要求的三代夹具，两个实际品牌浏览器分别执行一次 A→B→A 场景。

独立 compact-readback.json 的 SHA-256 为 88a0ff467965c76ad561089f574d414dc6c5ce103ea0d05b354d97cf3c947da6。Edge 152.0.4191.66、Chrome 152.0.7977.83 各 1 attempt、retry 0、零 skip；浏览器主体共 37.961 秒。每浏览器七阶段×16 分区逐项核对：A→B 不改数据，B 新写仅 cases 改变，旧 B 拒写数据不变，完整导航回 A 数据不变，新 A 写入仅 cases 改变，离线 A 不改数据。trace 中轮询观察到旧 controller/activating 的瞬时不匹配，最终父 expect.poll 均成功，属于等待过程，不是测试级重试。

真实 A ed0ed3704376→B 142a0bced955→原 A；共享 fixture SHA-256 fc3034485ea4b3ef29feb78318f42a8f4a5b9d8aaf1d0bbd2f3dd422b3ace36b，412 个文件与原记录身份匹配。三个 index 均为 unbound-local-build，不带 C9 ID。两张 390×844 截图已目视检查；两个 profile 与夹具按设计保留，核对时自有浏览器/Node 子进程为 0。

外层 2118 项原输入逐条前后相同，摘要 aef680f4bc9e6adee874ff0d832f78f475182288cab5d1382cb0d396454b10b0。该摘要是对排序后的 path/size/sha256 数组直接 JSON.stringify 后取 SHA-256，与 T7 的 computeSourceTreeDigest 格式不同，不能直接跨运行比较两串值。C9 137 文件和原锁保持不变，三个夹具前后身份另行核对。

子进程明确剥离生产 evidence ID，拒绝 HAKIMI_DB_* 覆盖，并将 Playwright JSON 固定到自己的 runRoot，避免外层 PLAYWRIGHT_JSON_OUTPUT_FILE 重定向结果。实际外层专门给定不同报告路径，证实输出仍绑定本次隔离目录；没有改父进程环境。夹具、独立 profile、trace 和报告保留，不声称对应线上旧发布产物。

新增根 package alias 后，通过既有生成器 --write → --check 同步当前工程 sidecar，仅改变 root package 的 SHA、字节长度 32154→32232 和派生 overall 三字段，计算执行图及历史 pin 不变。证据为 QA/t7-reproducible-flow-20260906-6c9ff320/sidecar-sync.json；该 sidecar 仍明确 current_checkout_runtime_closure_not_historical_binary_or_expert_attestation。

## 六份普通治理测试：原失败、历史修复与仍缺原文

本次先审阅 current-governance 的完整文件范围，选择六份普通文件完整执行，没有运行涉及动态 primordial/prototype 污染的测试，也不称全组已运行。原 evidence root 为 QA/current-governance-ordinary-six-c800b80893，50 项中 40 PASS / 10 FAIL，零 skip/TODO/cancel，exit 1、6.092 秒，1486 个有界输入和 C9 前后不变。

| 完整文件 | 原运行 |
| --- | --- |
| verify-current-history-boundary.test.mjs | 5/5 |
| verify-current-independent-scoped.test.mjs | 5/5 |
| verify-history-checkpoint.test.mjs | 19/19 |
| verify-independent-source-binding-requirements.test.mjs | 7/9 |
| verify-system-admission-registry.test.mjs | 1/9 |
| verify-web-storage-import-boundary.test.mjs | 3/3 |

两份 requirements 正例因历史清单绑定旧 Ziwei/Western 源码而失败。registry 八项在旧 Bazi 父依据漂移处提前失败，其中七个负例尚未到达它们要检查的 registry 拒绝层。原 tests.stdout.tap、逐名记录、退出码与 summary 完整保留。

只读扫描本地全部 11063 Git 对象、5199 blobs，19 个缺失身份找回 18 个；每个恢复项先核原 SHA/长度，再用 Git OID 复核，原件仅作输入数据。requirements-v1 是完整 12/12；registry-v1 是另一个历史截面，52/53。恢复计划、逐项来源和当前 loader 实际探针在该 evidence root 的 historical-input-recovery-mtpi3zo9；TypeScript 原文及旧 lock 不导入执行、不安装。

requirements 的最小修复只有测试文件、新 ZIP、fixtures README 与该 ZIP 的精确 -text 规则。ZIP 为 91760 字节，SHA-256 01d97b68ce0ca1380feb72e72a2375e6e25507051301c4972c489639349833d2，12 项原输入由 fflate 和 .NET ZipArchive 独立回读。测试 verifier 仍从当前仓库导入，before 将固定原输入写入守卫的独占临时目录，after 只清理该真实目录。首个标题明确 original subject inventories；全部原九个测试及断言保留。

应用后完整 requirements 九项与 current-independent-scoped 五项实际 14/14、exit 0，零 fail/skip/TODO/cancel；1488 个有界输入及 C9 前后相同，独占 C:/Temp/hreq14-D510YS 测后为空。证据为 requirements-fixture-patch-mtpijlet/repository-application/verification-run1/summary.json 及同目录原 stdout/stderr/exit；最终测试 14889 字节、SHA-256 4da6354b72800a000a14322fe463092ad816444d7891babc72c2548c43729aff。原 50 项的 40/10 不改成新的整组计数，这次没有重跑 registry 九项。

registry 唯一未找回输入为 docs/西洋星盘契约草案与来源门-v0.1.md，20351 字节、SHA-256 518116de8187893ddbe04542431681f6d17969e41b337988d189af6d977d9984。requirements 同路径要求 20999 字节/3a8e38d3f321e3232c0c895476cb4b7be61473c67d7a956444ccb8d4776c6c57，不能互换。检查已知 worktrees、项目 QA 与自有 fixture 的同名候选均不匹配；三份最小 EOL 候选仅在内存核对也不匹配，未保存拼接或标准化候选，未改原 pin。结论只覆盖已检查来源，不声称扫描全盘。

历史 v2 的 37 原输入与本次 requirements 的 12 原输入均已齐；这不表示所有历史对象已完成复验。当前 source_requirements 的 CURRENT_UNAVAILABLE、current domain 未选择、旧 registry 缺原文、T8 现实作者/权利/独立意见及资格核验、T9 HTTPS 批准/真实旧发布/同产物部署回滚继续保留。

## 跨 Schema 未执行范围与默认 v13 的职责

本轮只读核对确认，apps/web/public/sw.js:198 定义 descriptorsEqual，229–233 明确同 Schema/同 descriptor 接管；1570 的目标端与 1724 的源端均拒绝异 descriptor。跨 Schema spec 仍保留 13 个声明，原两个已跑场景位于 1062、1244；1076、1253 调用退场助手，该助手在 501 关闭全部源页、507 确认零受控客户端、511 观察自然激活。

其余 11 场景确实未运行，其中十项保留了源页存活时跨 descriptor 热接管的旧候选假设，另一项是 1028 的全新 v16 安装。现行 default-v13 任务不因此获得开放跨 descriptor 热接管的义务或许可，不能为使这些旧假设通过而放宽运行时策略。原目标要求已冻结旧页拒写，以及同 Schema 回滚且跨 Schema 不自动反写；本次 ABA 与既有 cross4 各按其实际范围证明，不合成完整 v16 候选矩阵通过。

原只读审计为 QA/t6-sw-remaining-readonly-plan-rBBt7T/readback.json，本轮源码锚点确认在 QA/t7-reproducible-flow-20260906-6c9ff320/nightly-report-gate18-and-ci45-mtpjeytt/cross-policy-current-anchors.json。未执行项继续列明；真实旧发布兼容性及 T9 的获准主机部署/回滚仍需真实对象与批准。

## 首装 v16 的真实失败、最小启动修复与候选 10

本节追加于原历史正文之后，不重签 C9、旧 cross4 或原完整 Vitest 2795 项。证据根仍为本页的 QA；新增原记录位于 `t6-cross-fresh-v16-6e418a2c`、`fresh-shadow-focused-vitest5-9ab71f3e0d`、`fresh-shadow-full-vitest-run1` 和 `candidate-10`。

原 cross spec 中“全新浏览器直接安装 v16 时从空 v13 建立完整目标并确认 clean epoch”此前未运行。本次不改该测试、超时、SW 或跨 descriptor 接管策略，先精确列出每浏览器一项，再实际运行。两次外部脚本/路径预启动错误原件保留，没有执行构建或测试主体；首次真正的浏览器 run1 则是 0 PASS / 2 FAIL，121.442 秒，不能混称为同一次运行。

run1 两个浏览器均在约一秒时报 `ReleaseControllerTakeoverFrozenError`：新 shadow 首装在正常启动提交前注册 SW，`clients.claim()` 触发旧文档永久写锁，随后协调器不能完成启动提交，`BOOT_OK` 也无法发送。DOM 的 `verified` 只表示准备存储完成，不代表提交完成。每浏览器 185 次本地 HTTP 200，未见外部请求或 404；失败在原 waitForAppReady，后续原生数据快照代码未运行。因此原失败没有可回读的 v16 完整行集。原失败 readback 的 SHA-256 为 `1a6dd8e32beb05a9934595d799c3cde85203cd7ebdc7327e665e6433f3bc8c72`。

修复只改 `main.tsx`、`release-database-coordinator.ts` 与对应测试。对于起始无 controller 且确为 `FRESH_INSTALL` 的 shadow，先完成正常启动提交再注册 worker；首次接管继续冻结旧文档，经已提交状态的只读核验后完整导航。原未受控文档不发送 `BOOT_OK`，由新文档完成确认。协调器记录是否真正完成提交；只读核验要求冻结状态、已完成提交、物理 generation/db/schema、protocol、build、精确 migrationId 和 receiptDigest 一致。仅准备或绑定缓存状态不能授权导航，没有新增解锁能力。

八个新增普通单元覆盖实际调用提交后的 shadow 导航核验、尚未提交、仅缓存绑定、protocol/receipt 漂移、虽可接受但不等于提交记录的 migrationId、缓存和存储同值但 descriptor 不接受的 migrationId，以及未冻结拒绝。正例使用既有 cleanSchema16 mock harness，不称为原生 shadow 建库证据。编辑前后原字节与守卫脚本保留于 `t6-cross-fresh-v16-6e418a2c/first-claim-fix` 与 `fresh-shadow-coordinator-tests-57bc9049c4`。

| 当前修复验证 | 实际结果 |
| --- | --- |
| 完整默认 TypeScript 图 | PASS，2.821 秒，原摘要 `f9863c8eeb537e29a038fc416c3e36ee817cc8565f2cdc54170e9cd7511b71ce`，2119 输入前后相同 |
| 五份完整 Vitest 文件 | 171/171，exit 0，20.331 秒；协调器、写栅栏、app-boot-ready、sw-lifecycle、pwa-files |
| 原 fresh v16 场景 run2 | 2/2，exit 0，67.457 秒；Edge 152.0.4191.66、Chrome 152.0.7977.83 各一次，无 retry/skip/flaky |
| 完整原 Vitest 三项目 | 213 文件、2803 个实际测试名，2803 PASS，exit 0，227.804 秒；未筛文件/名称，未改 include、超时或重试，仅 maxWorkers 2 |

fresh run2 的原测试主体完整执行，包括原生 v13/v16 行集与元数据、clean epoch=verifiedEpoch=1、commit receipt/digest，以及不创建中间 14/15 代的原断言。原配置成功时不保留 trace，标准报告 attachment 为空；不能另称保存了成功时的原生行集或有明确导航时序 trace 断言。独立通过 readback SHA-256 为 `0514d87da66c48d4c3ed1f6648f164e86275dca0b0f27a6258bae09edd872a3b`。运行前后源码 2119 项相同，当时仍在位的 C9 137 文件与原锁不变。此项 v16 是隔离夹具，不是默认通道晋级。

完整 Vitest 的 938 个有界源码/固定输入前后逐一相同，输入清单摘要 `560f5e852e3b8029aba837aec7456d348ac31e1aba70cfa98a311edc334b3a5a`，Node 二进制不变；并行生成的 dist 与产物锁不在这份输入范围。它不是全部传递依赖持续无变化或 ABA 排除证明。原 2795 次运行仍保留原时间与范围，不能改写成新 2803。

随后新建 C10，源树 2119 项及上述 `f9863c8e…` 摘要前后相同。正式 `npm run build` exit 1，在 prebuild 的三个 source_requirements `CURRENT_UNAVAILABLE` 处停止，程序构建本体未执行；独立 `npm run diagnose:build` 实际 exit 0，17.417 秒，只构建一次。default-v13 manifest 单独通过。首次写新锁因旧 C9 锁存在而 EEXIST，未覆盖；核对并保留旧锁原字节后，第二次独立写锁成功，没有重建。

| C10 身份 | 固定值 |
| --- | --- |
| evidence ID | `hre1-3d5228d6912e5f003211552479808027` |
| build | `0d84d313bb67` |
| 默认 descriptor | `legacy-v13 / hakimi-bazi-research / 13 / migrationId=null` |
| 产物集合，137 文件 | `80c0dbce34cc783cdbc513ecdb555227925a9fed384e6d645ced63e622bc17b6` |
| 原锁 SHA-256 | `95d97d11dfb13402d41f99b19413a3deff8f8f48fad0f9e312dd440d0be77dbe` |
| manifest SHA-256 | `0f467690fb4d6fad692454a42262d3203ae57d53403c01c68efb61dbbafe1294` |

C10 独立归档 `validated-artifact-10` 的全部 137 文件已逐字节核对；原 C9 独立归档 `validated-artifact-9` 保留。新源码和后续运行只绑定对应的新候选或独立夹具，不把它们补签到 C9。

## 历史原件、普通工程检查与尚未闭合的真实依赖

`engineering-binding-eight-cb51702caa` 完整执行 `verify-bazi-engineering-binding-candidates.test.mjs` 八项，8/8 PASS、exit 0、221.008ms，无过滤或跳过；八个实际输入及四个受保护包/索引/checkpoint/C9 锁前后相同。它支持既有七条工程 binding、三来源身份、九 claim links 不漂移，不等于整个 Node 分组或现实权利资格通过。

registry 原件再次有界核对项目与项目 QA 的七个源码 ZIP：六个是已知原件的重复；唯一新候选 `tmp/deepseek-byok-pending.zip`（95007 字节，SHA-256 `909ce7cda27e8bf4e7026a76c3072ca3502ef34a6fbeb2d83302ef1152688542`）的 11 个中央目录成员没有一个长度为所需的 20351，因此未解压或执行正文。此次不是全用户盘、全会话或第二次全 Git 扫描。记录为 `registry-source-archive-readback-5ce24185/readback.json`，SHA-256 `17a036fa0c14a28b163e147bf0272e6d19f5f523ddf4346bf75d98dbf6e3980c`。registry 仍是 52/53，缺失原文身份不改。

源码读回进一步区分了现实资料与工程缺口：三个 source_requirements 报错的直接原因是 `selectedCurrent=null`，当前命令并未在此阶段审完真实专家/权利；不能把历史最高版本改选 current 来消除报错。专家当前消费者仍硬性 `qualifiedIndependentOpinionCount=0` 且没有 qualification receipt loader，既有私人资料 precheck 只验证结构和绑定，尚不能表示有真实受信资格的 1/2 进展。

T9 也不只是等待一个网址或部署批准。现有 rollback 正式消费者在下游重放前直接 `ROLLBACK_EXECUTION_ADMISSION_CLOSED`；policy 仍 contract_only_not_executed、八项能力为 false，主机未选择、actor registry 未配置。现有 formal/host/browser/provider 读取器尚未接成真实受控部署 A→B→A；数据指纹仅读声明而未重算 HMAC，actor registry 缺可信治理根，phase freeze 缺真实采集冻结，离线回滚缺获准公网原始阶段。不得翻转标志或制造合成回执代替这些工作。

此外，正式 release decisions、evidence workflow、command runner 与 receipt generator/verifier 仍要求执行原完整 cross 命令。该 spec 当前有 13 个场景，配置使用两个浏览器；此前 cross4 和 fresh2 属于不同运行与源码快照，不能相加成完整矩阵。进一步核对表明，发布要求的“13 项”是整套 release receipt 数量，cross 自身使用 line reporter，没有独立的严格 13 场景数量/标题/skip summary 门，不能混为一谈。其余十个旧跨 descriptor 热接管编排先保留失败与未执行范围，再逐项区分可修的测试生命周期和实质策略冲突；不能删检查、放宽 SW 或把部分诊断结果替换正式完整命令。

## C10 同一产物的本地流程、连续 Web 与 PWA

`candidate10-browser-revalidation-6fc271a4` 保存本次三个独立入口、各项目的真实标准结果和退出码，均 preview 已锁定 C10，不重建。

| 入口 | 实际终态 |
| --- | --- |
| local-data run1 | 18/18，274.312 秒，每浏览器九项，零 skip/retry/flaky/report error |
| web run1 | QA 薄配置的 webServer cwd 错置，npm 找不到 QA/package.json；0 discovered、0 attempts，产品和浏览器主体均未执行，exit 1 原件保留 |
| web run2 | QA 配置恢复原 apps/web cwd 后 2/2，156.172 秒，原 strictGatePassed=true |
| pwa run1 | 2/2，35.474 秒，原 strictGatePassed=true，零 report errors |

三个入口均逐字段核对原 C10 evidence ID/build/descriptor/manifest/137 文件集合/原锁，并核对运行前后 2119 项源码与 `f9863c8e…` 摘要相同。三次通过是本次 18、2、2 各自的范围，不叠加 C9 或独立 SW 夹具的计数。

本地流程独立回读重新计算 102 份 native snapshot/witness 摘要，核对 18 个布局样本、18 个实际 trace、4 个保留 profile 和 100 份 PNG 字节，findings 为空。`local-data-readback/compact-readback.json` SHA-256 为 `d6cd8dc4c2ad99eadf1badff38e9885c62aa54472809a4be14e7b4cc4fd39d8a`。root 实际目视五张截图，范围为只读冻结、文件交付状态、320px AI 页面及来源故障后恢复预检；记录 `root-visual-readback.json` SHA-256 `51908390f0bd942502c6426194d7b44b00a74af6056ec2aa6c91667a15ae8e4f`。不是对全部 PNG 的目视或完整可访问性验收。

Web 原完整主体执行 16 分区恢复差异/计数、整个 payload 与 16 个摘要 roundtrip；其“至少十五分区非空”的额外 fixture 分支和截图没有执行，成功报告无附件。PWA 实际保留两独立 profile、六张 390×844 离线深链/Help reload 截图，Edge 152.0.4191.66、Chrome 152.0.7977.83 的 profile 版本原件已核；其中两图另有目视回读。安装完成交互使用受控浏览器事件，不称操作系统真实安装。

三入口总回读 `three-stage-compact-readback.json` SHA-256 为 `385524b879197937811437599ee9f2ee6cd066c18866047bd1cde0d6bd297260`，`readback-completion.json` SHA-256 为 `f41f77e8f13c45334a431a26a5b421dbac1204d0b0c7f759d6b72b3a5e17b1a4`。结束后预览端口 4197 没有监听，记录的自有 Node 进程已退出，用户资料与独立 profile 保留。

## SW 当前源码约束与历史负例的分离

首轮当前源码 SW/ABA 记录在 `t6-c10-sw-canonical-aba-a9e67e0a`。精确应用 Vite 7.3.6 构建一次三代共享夹具后，canonical 六个行为目标全部通过，但原 reporter 因运行起止的两项 critical-source 不匹配而 strictGatePassed=false、exit 1，76.940 秒。原 reporter 在存在 outputErrors 时不写 summary 文件，因此外层尝试读取缺失文件又发生 ENOENT；完整 stdout/stderr 中的原 JSON 已另行提取，不能把收集错误写成六个行为失败或宣称原严格门已通过。随后只复用同一三代夹具另跑原 ABA 两项，2/2、exit 0、40.023 秒，未重新构建。

该共享夹具集合 SHA-256 为 `6d26959e4af31e7651d380a713a107c5616aa0ec8ba4aba1154f6174d781743c`；源码 2119 项与 `f9863c8e…`、C10 原 137 文件与原锁、三代夹具前后均核对相同。原 8 个目标各自的 trace 已保留。上述严格失败、ABA 成功和收集错误分别归档，不受后续修复结果改签。

只读核对确认，SW21 表是现有 canonical fixture 对经审当前关键源码的约束：loader 实际读取当前 21 路径，runner/reporter 核对起止身份，release governance 单独绑定该模块自身摘要。它不是 current/history family 登记的不可变历史材料，不能把当前合法修改永远当作外部批准阻塞，也不能自动根据实际文件重签来放过未经审阅的漂移。

另一个真实问题在原历史负例：它克隆当前 21 行，只覆盖七个旧值，却沿用较新的 spec、public/sw.js、vite.config.ts 三行，重算为 `8d7f93e241d0a9212e64c1da75db17558aa2f89a01f4de9e384b6e2cac200a9f`，不等于原要求的 `e5e7ced52540e761940b632291d25edbe989306a16add8e2c3a61fb3d8876a00`。完整原 17 项先实际运行一次，15 PASS / 2 FAIL / 0 skip，exit 1；失败分别是当前 exact matrix 正例和 previous identity 历史负例，原记录在 `contract-before`。

从 Git `550977d541cddada61dc646c59f63977d6ef859f` 精确找回 identity 模块数据，blob `d0dadea58b110c6ebc8c3dc485ff54b2c2f8e31c`，13003 字节、SHA-256 `0544a958b2217ae47e8769bf126f5aaba7a2b6c8fcf327e85059bfc415920a77`。完整 21 行独立重算吻合原 e5e7 摘要；只读取为数据，没有执行历史 TypeScript。

经原差异复核后，最小修复四文件：旧负例固定完整历史 21 行并保留原摘要和拒绝断言；当前表只更新已审 main/coordinator 及本次 test/runner 四行；同步现有 governance 模块/集合两个 pin；canonical runner 复用已有 `resolveDiagnosticProgram` 从应用解析精确 Vite 7.3.6，修正误用根 Vite 8.2.0。成员、角色、严格场景数、rollbackVerified=false、全部业务断言不变，没有增加 policy/family 或形式准入能力。

原 QA 生成稿曾含单个 NUL 分隔字节，仅在 QA 被发现并修成源码的显式反斜杠零，没有写入仓库。实际应用的是 `sw-critical-current-history-patch-faff942ed6/revision2-text-only`，补丁 SHA-256 `3944699ae288624b0b07314068b22fb22a5f5cd48613de58d78615d5ec236589`；当前 SW21 集合为 `e9be09051d1ecb6a62a5d6cf7d1309d9348a78cc50985f627bf55b9d78d85d0f`，模块/pin 为 `57905fc755e07dc6a542e150c3bcee06a87dd6ab87082d830ee7a290d2a5f0bf`。所有预像和应用后原字节已核对。

同期五场景跨 Schema 测试仅更换首次激活编排，见 `t6-cross-five-cold-orchestration-7b0e40ae`。容量不足、目标摘要不符、迁移事务中止、BOOT_OK 中断、CAS 竞争使用现有“旧页退出→零受控客户端→自然激活”助手；CAS 删除助手已完成的重复 close。13 个原标题、全部 expect、故障夹具、超时、其他八个测试主体不变。原 spec SHA-256 `bb74f2ac61d6cf3dfce3617deffcbd9a1d35ae2256794d9aa13372a6688124da`，应用后 `ec449aa3bf1418fabcf3dd0dadbad8dac4d831c0ccf5b2a3f3438e227e54e651`。

这五份 harness/test 修改后，2119 项当前源码摘要为 `62db460cd540cded396debb7d7a1e17ab8e59962480f0bff205467784ab62801`。C10、C10 独立归档、C9 独立归档三个集合各 137 文件已再次完整验锁；C10 的原构建源摘要仍是 f9863，不能改签。完整 Vitest 的 938 原记录输入逐项比较，主输入不变，后续 harness 修改另列差异；不宣称重新执行完整 Vitest。

应用后 `sw-current-post-apply-validation-run1` 完整 fixture17 为 17/17、490ms；完整 resolver10 为 10/10、146ms；四个精确 SW governance 标题为 4/4、1373ms。治理运行实际使用名称过滤，Node 仅报告四项且 skip=0，不称整份治理文件通过。完整 TypeScript 另为 exit 0、2.844 秒。2119 项源、三个原产物集合与锁均前后不变；原 before17 的 15/2 不改签。

随后使用仓库原 `npm run test:e2e:sw-upgrade`，不追加 Playwright 参数、reporter、trace 或 grep，原 runner 自行构建三代并执行全部六项。实际 exit 0、111.382 秒（10:05:43.489–10:07:34.861 UTC），每浏览器三项、各一次、零 skip/retry/flaky，原 strictGatePassed=true、errors=[]、rollbackVerified=false。全部 21 关键源仍为 e9be0905 集合；2119 全源 62db460c 与 C10 原件前后相同。

`t6-c10-canonical-formal-f39a287c/compact-readback.json` SHA-256 为 `4392552604a1c7221a137a3cc248a5a0bbf28c8cdacda953bcec0d20708c1b2a`。原独立 summary 与 stdout JSON 对象一致，三代 412 文件另存并逐字节匹配，集合仍为上述 6d26959e。六个独立 profile、六图与 last-run 原件保留，自有进程归零，原 runner 自己的临时目录按既有逻辑清理。此次成功未产生 trace；原 runner 内部没有输出单独的 build 子 stdout，不能另称保存了它们。独立 ABA 的两项仍引用此前当前应用源码的实际运行，不增加 canonical 的回滚声明。

## 五场景跨 Schema 的真实失败与字段契约校正

五场景第一次实际完整运行 `t6-cross-five-cold-orchestration-7b0e40ae/cross-run1` 为 6 PASS / 4 FAIL / 10，exit 1、681.968 秒，零 skip/retry/flaky。目标摘要不符、迁移事务中止、BOOT_OK 中断在两个浏览器都完整通过；容量和 CAS 则分别停在原未发送标记期望 null、实际字符串 false 的断言。CAS 保留原 180000ms 等待，未缩超时、重启或继续声称后续 epoch/恢复已执行。

原 10 份自然退场附件逐一核对：旧受控 clients=[]、自然激活、无强制激活。四份失败 trace 与六图原件保留。run1 回读 SHA-256 为 `2d59e418d1b01767b3f3f0190f2da653ecb79a2761af1f5a8863403a480549f2`；运行前后全源仍 62db460c，C10 原 137 与锁相同。

从未修改的 bootstrap.ts、recovery-main.tsx 和现有 orphaned-v13 回归确认，启动后的该标记明确初始化为字符串 false；缺省 null 表示字段不存在。main 真正调用 postMessage 后设 true，而本次容量/CAS 的失败路径不把 true 重置为 false。因此只把所选场景的三处旧 null 预期改为严格字符串 false，其他断言和未执行场景不动，不使用宽松的“非 true”。该字段仍只表示当前文档状态，不等于原始消息计数或跨导航未发送证明。

修正的前后原件与依据在 `cross-selected-unsent-flag-contract-e7dfab5697`：spec SHA-256 从 ec449aa3 变为 `c8f1c9f9a9679c500561aa2c595a10d89800fd6d956ef980b0c8ed3bb8cebf87`。随后 run2 只精确复跑容量/CAS 两场景×两浏览器，4/4 PASS、112.161 秒，零 skip/retry/flaky/error。两次运行不能合并成一轮 10/10。

run2 容量完整验证 target/v14/v15 零创建，原生 v13 snapshot 的 nativeVersion/stores/metadata/rows 完全相同，并经恢复源页面完成真实仓储写入；这不是物理 IndexedDB 文件或整个 profile 字节相同的证明。CAS 完整走过 epoch2→3 的并发写入、释放 held audit 后的 CAS 冲突与旧 contender 写锁、recovered full_audit 的 clean3/3，以及重载 cache_hit。

run2 全源 2119 项前后同为 `54025c2aa14a57fd0b7576415406ee435b5a9d0c1a33a70550c133eb17123162`；C10 原产物不变。四份自然退场附件保留，成功依原配置无 trace 或 native 返回值独立附件。其回读 SHA-256 为 `9484bac2e467c575c8fdfcb60cc2edfee7f1a26cd7520d5a2596f0a11bdc3ce4`；两个实际品牌版本与前述一致，自有进程/端口已释放。原 6/4 失败记录保持原样。

## 原生连接持有与失败后的重发

原 versionchange 场景的 target 连接由旧 A 页持有；全退场会关闭该连接，不能删掉持有者后声称阻塞通过。最小修复新增本 spec 局部 holder：B 自然激活后，在独立页使用精确本地路由和单页 CDP bypass 提供无脚本文档，先实际要求同源、response 非 SW、controller=null、零脚本/无应用属性、B 尚未开始 boot，再调用已有原生连接助手。真正 B trial 使用另一正常页面，不旁路其 SW，不伪造写冻结 ACK。

应用稿为 `t6-cross-blocker-republish-design-6bc3908e/revision2-c8f1`；spec 从 c8f1c9f9 变为 77792 字节、`df4dd118c3b222a0971b8f89a0c2230e1a210a75eedefd2fddf70c8d2cd9962f`，其他 12 个测试正文不变。完整 TypeScript 2.513 秒通过，随后原两浏览器目标 2/2、120.629 秒。全部 holder 前提、native130/e2eBlocker、真实 versionchange 标记、blocked journal、control 保持 v13、源快照不变、释放连接后的恢复与异常过滤原断言均通过。

证据 `t6-cross-holder-browser-b164e2a9/cross-run1/compact-readback.json` SHA-256 为 `241fb20643aa6052f01d7eb634971b261b1104acdb664677dd9d15cac3a61b7a`。2119 全源前后同为 `432ef20992b7371c43e6c8f4b0646187a5f2fc7d74b48655cd89b0a2d764e3d7`，C10 原身份不变。原配置成功无 trace 或 holder/native 返回值独立快照，仅保留两份自然退场附件和原完整测试结果；进程退出，49159/63436 无监听。

最后修复原重发场景的编排：默认退场助手行为保持原样，新增可选的已就绪源文档、文档 fixture、当前 worker 与观测名四项。后两次直接复用真实 v13 rollback 页面，分别断言当前 active/controller 仍为 failed-v16 与 same-id-v16；不调用会重新发布 v13 sw.js 的桥页 opener。三次观测使用 default/same-id/new-id 独立 wx 文件，源 worker 身份与 v13 文档身份分开记录。

应用稿为同根 `revision3-df4dd-republish`，spec 79432 字节、SHA-256 `aa3781c8b204809abc4ddba7ccb81db9280fe25325336b5935c74cb2a8dd874f`。其他 12 个测试正文与 holder 原字节不变。完整 TypeScript 2.531 秒通过；原重发标题两浏览器实际 2/2、136.542 秒，零 skip/retry/flaky/error。first blocked/targetIsolation failed、同 ID 失败终态仅清理且 target 删除、新 ID committed、完整 receipt/digest、原生源保护/目标 schema160/clean epoch 及受支持写入断言均完整通过。

证据 `t6-cross-republish-browser-cc510276/cross-run1/compact-readback.json` SHA-256 为 `912c25ef98721eff6742543cbc513631dec04a3d341d121e58f3c49ab1cc85e6`。每浏览器三份自然退场原 JSON 均显式 zero clients/自然激活/无强制激活，CDP versionId 与 build 链连续：源文档始终 `6a8f36490e79`，worker 为 `6a8f36490e79→f75effe400ce→a342d2ee7fcc→45f1aefe1b5c`；同 ID/新 ID 阶段没有把 worker 切回 v13。全源 2119 项前后同为 `df9ab1b2e177f869a9f3f5c3af88ada1746062957f648d6adc3900a266141dcf`，C10 原件不变，进程与 49450/63994 端口已释放。成功 trace/native/journal 返回值独立附件未生成，不扩大留档声明。

## 最后三个旧热接管场景与正式 cross 回执的范围

当前 spec 保留三个未满足的原义场景，原行号 832/956/1137 对应当前 932/1056/1237：慢审计旧页被 v16 接管并最终收敛、保留旧页时源冻结 ACK 超时后重试收敛、多个活着的 v13 页被 v16 控制器冻写并收敛。现有同 descriptor canonical/ABA 与自然退场结果不能证明这三个跨 descriptor 正向能力；将预期改成拒绝，也不能沿称原三项通过。当前 SW 拒绝异 descriptor 热接管的普通合同保留。

正式流程仍要求原整份 cross npm 命令。cross config 只有整份 spec、Edge/Chrome 和 line reporter；它不属于 backup/boot/pwa/web-v1-flow 四个严格 browser receipts，consumer 对 cross 的 browser summary 要求为 null。其普通命令回执记录 evidenceId、精确命令与退出，最终生成/验证再通过 sourceTreeDigest 与 required receipt 集合做总体绑定；没有 cross 专用的每场景身份/数量/skip 校验或四个 strict browser receipts 那样的命令前后产物锁绑定。发布的 13 项 required receipts 与当前 cross spec 的 13 个声明是两个数量，不能混称为已有 strict13 门。

已询问是否维持当前策略并保留这三项未通过，或明确修订正式范围为自然退场、保留旧矩阵并新增当前政策拒绝回归；答复前不改变政策、正式选择或原断言。cross 完成/skip 核验还须随选定范围补齐。T3 精确原件、T8 真实资料/资格消费及 T9 真实主机、旧发布与八项可信消费者仍未完成，本轮真实进展不关闭整体目标。

## 2026-09-07：完成性检查、子构建环境与下游消费

本节追加于原 48257 字节之后，原文 SHA-256 74516e03796b5afa6b98fe73b1b06704956a76ec7251d70a28cc12fbeeb92ff5 保留。前节“没有 cross 完成门/summary 为 null”描述其原核对时点，本节说明当前已修复状态；原运行、失败和未满足断言均不改签。

本轮复用原 result/reporter、cross config、闭合 Schema、runner 和现有消费者，新增 completion 第五码 cross-schema-v13-v16，要求原 13 标题×两品牌和单次尝试，拒绝少项、skip/fixme/预期失败、失败、重复、重试及选择执行。原四个 artifact receipt 的类型、计数、产物锁与 mutationBoundary 不扩展到 cross。最终读取绑定的聚合摘要，未增加逐题原始事件独立重放能力。

cross 构建子进程先按键名大小写无关地移除父 evidence ID 与 HAKIMI_DB_*，只从明确 descriptor 重新装配数据库字段，生成 HTML 必须 unbound。canonical runner 去掉父 evidence ID 并继续拒绝数据库覆盖；ABA 原边界保持。SW21 只更新 runner 与合同两行/派生摘要，历史 e5e7 和其余 19 行未修改，当前集合 d8c525432f4c299150bad902297127848bc832fc2d14e5d2e8e351e857888b47，identity module SHA 0829fe2bceaed109d5d5d3c5f46ba70c38cc9914576e9a9a9c938c07ccec99c2。

以下 QA 路径相对本文既有 QA 根。85 项、79 项和三个浏览器运行使用同一 2119 源快照 65b4a81d9c4e615cc0eefd46a49d211c618311002dcd8006ee8b1eda01448e7a，各次前后无变化。随后候选计数补丁仅改 lib、test 与当前治理 pin，第二轮 11 项及完整 typecheck 使用 ce14fe4801e05a591e97952dca72b4ff5a052c6243506569a56d251d6f971286。文档更新另计，C10 未重建。

| 实际入口/范围 | 结果 | 原件 |
| --- | --- | --- |
| SW 合同完整文件20；completion47、governance11、candidate6、composition1 精确普通范围 | 85 PASS，原 TAP 的 fail/skip/todo/cancel 均为 0；不是整份后四文件或 Node 整组 | QA/cross-completion-validation-run1/summary.json；selected-scopes.json 与各 stage 原 TAP |
| 原 Vitest 配置，仅 pwa-files 与 sw-lifecycle 两文件 | 79/79、1.874 秒、0 pending/todo | QA/completion-pwa-focused-vitest-run1/summary.json 与 results.json |
| npm run test:e2e:sw-upgrade，无 Playwright 选择参数 | 6/6、strict true、exit 0、106.876 秒 | QA/t6-canonical-environment-sentinel-plan-731ea294/run-5bf4b346a1/summary.json |
| 原 cross config+runner，仅 fresh-v16 标题 | run1 错误整题锚定导致 0 发现，exit 1；run2 两正文 PASS/严格 false/失败 receipt/exit 1、68.743 秒 | QA/cross-completion-real-partial-negative-272331fe；QA/cross-completion-real-partial-negative-94ba1ce7 |
| npm run test:release:pwa-artifact，经原 pwa receipt runner | 2/2、strict true、exit 0、35.874 秒，C10 endpoint binding 完整 | QA/completion-pwa-c10-90a7c0bc/summary.json 与 receipt-original.json |
| 候选消费者计数最终修复：2治理+8候选+1下游，完整 typecheck | 11 PASS；typecheck 2.713 秒，主体确实启动 | QA/completion-consumer-counts-validation-run1/summary.json |

原 canonical 的父进程携带公开合成 hre1-aaaa…，三代原 HTML 均为 unbound-local-build，完整 412 个夹具文件归档且集合摘要仍为 6d26959e4af31e7651d380a713a107c5616aa0ec8ba4aba1154f6174d781743c。cross 的父发布标识及数据库哨兵也未进入 2×7 份生成 HTML；14 份原件及 descriptor 逐项留档。环境合同验证 canonical/ABA 对数据库覆盖仍拒绝，cross 仅接受明确传入的 descriptor lineage。

候选内部消费先要求现有闭合 Schema；同 ID 的 completion 摘要调用共享严格校验器检查该 ID 的品牌、计数与失败字段，缺失或错 ID 仍由原 mandatory predicate 拒绝并保留原错误分类。current lib pin 为 feb9bc3ee034cfd5c34f20a0d1fe8f179b56e3ab367f9c62927d29f6581b0256。合法合成候选仍为 not_admitted，所有权限 false。

独立审计见 QA/cross-completion-evidence-audit-20260907-314f8a9c/summary.json：85 个原 TAP 标题与选择相符；前轮完整 Vitest 的 938 输入中 934 未变，仅 cross config/result/reporter/SW21 identity 四个外围项变化，主输入没有变化。C10 构建输入中的应用运行时/构建配置无差异；完整 Node/Vitest、真实 HTTPS 与完整 cross 均没有被本轮局部结果补签。

原 85 项 summary 的 cleanup 标签误写 empty，但其 contentsAfter 明列 36 个保留目录；按目录清单解释，保留原记录。PWA 保存 6 PNG、目视核对 2 PNG，成功没有 trace；cross 成功正文未新增原生返回值独立附件。进程及 4197 监听检查见 QA/cross-completion-and-fixture-isolation-20260906/process-and-preview-readback.json。

原 cross spec 79432 字节、SHA aa3781c8b204809abc4ddba7ccb81db9280fe25325336b5935c74cb2a8dd874f 本轮未改，三个旧热接管正文仍未满足。该范围问题仍待用户答复；完成性门落地没有把当前策略改为异 descriptor 热接管，也没有将旧断言改成拒绝或自然退场。

T2/T3 的 source_requirements selectedCurrent=null、精确历史 registry 52/53，T8 的真实材料/独立意见与 qualified 消费能力，T9 的八项 rollback 可信消费者、真实 HTTPS/旧发布和受控部署仍未完成。全目标继续保持 active；没有暂存、提交、推送、合并或部署。所有保护文件、C10/C9 原件与完整旧文档前缀由 QA/completion-closure-final-20260907/final-readback-after-doc-review.json 再核对。

## 2026-09-07 续轮：参数审阅单元与 rollback 数量消费

新增可直接复算的入口为 node scripts/review-bazi-strength-engineering-inputs.mjs，不接入默认 npm 生命周期，不产生 formal receipt。它从原单元测试提取 weakFacts/strongFacts 和固定演示 BirthInput，以当前 calculateChart/interpretBaziChart/buildStrengthSensitivityReview 重算 36 行；9 对原阈值输入单独列出。QA 原型与仓库命令各实际运行一次，193129 字节输出原件 SHA-256 均为 82546a53e9d0cd73d50b8cad2ba829231d44a53a92935cf8dacdf5ae2894cf54，仓库命令 138 条执行依赖输入前后不变。

[参数工程审阅](../八字参数工程审阅-2026-09-07.md) 与 docs/review-data/bazi-policy-sensitivity-20260907.json 保存具体数值和因素。含时柱模式为稳定0/分档敏感2/方向敏感1，非稳定3/3；不计时柱为1/1/1，非稳定2/3。没有将两个模式合并为六个独立自然案例，也没有把结构适用性未知写成0。来源/资格和全部正式结论保持未准入/null。独立算术复核只读取输出，另以整数交叉乘积核对分档，见 QA/t8-strength-independent-arithmetic-ff1b459a/readback.json。

rollback-evidence-lib.mjs 的既有 assertFormalReceiptEnvelope 现在要求 receiptCount 精确等于绑定 releaseEvidence.testReceipts.length，未写死13。原调用方和错误分类保持；原 helper 仅增加 ForContract 导出，便于普通合成数据核对。三条新合同覆盖精确2/13、低报及高报，另复验原未选主机拒绝、语法选定主机仍关闭及失败结果权限归零；再跑三条现有治理合同，共6+3=9 PASS，原TAP、精确选择和起止记录见 QA/t8-t9-validation-run1。

九项检查时2120源码文件前后相同，快照序列化摘要为5823579f5b52e79a2022558782ba0e0fcd14765582e195666fc5437f974f70db；这不是computeSourceTreeDigest同域摘要。原两个rollback临时夹具目录保留，summary里的empty cleanup文案不能覆盖contentsAfter的实际清单。C10原件/C10归档/C9归档分别全137文件及原锁不变。没有重跑完整TypeScript/Vitest/build或浏览器，工程报告用的esbuild编译不是Web产物构建。

资格链有界核对见 QA/t8-existing-expert-consumer-readonly-cc1f68c2/readback.json；回滚八项映射见 QA/t9-rollback-existing-chain-readonly-20260907-65d1b48f/review.md。现有结构及同缓冲字节读取可复用，但当前没有可据以授予qualified的真人核验授权材料。回滚先因未选主机失败，即使主机语法就绪仍在八项false的无条件关闭门终止；后面的shape/签名/phase投影不能替代原始host/CDP/provider/HMAC/registry治理根、逐阶段与离线观察的可信核验。

源及状态最后读回见 QA/t8-t9-final-20260907/final-readback-after-doc-review.json。旧三项cross热接管、三个source_requirements的selectedCurrent=null、历史registry52/53、真实材料/意见、主机/actor/旧发布输入与可信消费工程仍未闭合。该续轮的审阅单元与九项合同通过不关闭完整目标。

## 2026-09-07 续轮：默认范围与独立体系库存分离

原报告明确独立体系不得无条件阻塞八字基础工程，并要求仅校验显式选择及闭合依赖。现有发布章程、隔离主壳与所选 Bazi binding 未发现对三体系 requirements/domain manifest 可用性的依赖。原专用 check:independent-source-binding-requirements / check:independent-domain-release-manifests 名称和严格 CLI 保留；它们只是 current availability 检查，本身也不是三体系 deep loader 验收。

默认和 Quick 两个步骤改用新 inventory 名称。新 API 仍稳定读取原 current-index，保留全部三项 head、selectedCurrent=null 和 unavailable，返回 inventoryOnly=true / semanticEvaluationPerformed=false / authority=false。没有选择新版本、没有 allowUnavailable 开关、没有从 null 生成 qualified 或领域 PASS。Bazi 的来源/readiness/manifest/expert、完整 history、current-index、许可证与隔离导入门均保留。

| 本轮真实入口 | 结果 | 原件 |
| --- | --- | --- |
| inventory/strict 普通 Node 精确筛选 | 8/8，8.099 秒；不是整份测试 | QA/t1t2-default-scope-faf12c10/run1/scope-ordinary.stdout.txt |
| 两 inventory npm 命令 | 独立 exit 0，均三项未选、语义未评估、权限 false | 同目录 source-inventory / domain-inventory stdout |
| 两原 strict npm 命令 | 独立 exit 1，均三项 CURRENT_UNAVAILABLE | 同目录 source-strict / domain-strict stderr |
| history / current-index / draft isolation | 独立 exit 0，分别 0.908 / 1.964 / 13.795 秒 | run1/summary.json 与各日志 |
| 首次治理合同与治理 CLI | HKO bothBeforeCommands 仍引用旧名，顶层文件失败；17 个选定正文未执行 | run1/governance-ordinary.stdout.txt 与 release-governance.stderr.txt |
| 修复顺序接线后的治理合同及 CLI | 精确 17/17、1.654 秒；check:release-governance exit 0、1.645 秒 | run2/summary.json 与各日志 |
| Bazi manifest / expert packet | 两者独立 CURRENT_UNAVAILABLE、exit 1 | run1/bazi-manifest / bazi-expert stderr |
| npm run prebuild | source inventory 后继续完成 Bazi engineering/readiness，停在 Bazi manifest；exit 1、19.616 秒 | run1/default-prebuild stdout/stderr |

本轮没有执行完整 typecheck、完整 Vitest、构建主体或浏览器。25 项 PASS 分属两次精确筛选，原 Node 整组没有通过证据。prebuild 的 domain inventory / expert 及后续命令没有执行；上表对应结果是独立运行。8 项与 17 项实际 skip/todo/cancel 均为 0，不据此声称未选测试也通过。

静态正式闭包仍建模 30 个终端，当前摘要 b978a04eb32c480d168c69b3cef77d63ee8c91a1744d7bb23a8b195a11b58ab6；Quick 原字节 13245 / a3623c93a6ba36477303d09981dd06addbf35010b4234ea94500c8f8a1e2c437。只同步 Quick/closure 的现行 HKO 身份与顺序要求，未改变其许可、权利或准入字段，未修改历史 checkpoint、current-index、六个独立体系 head 或选择。两轮 2124 项输入各自前后相同，摘要分别 f3528347b6a321ba7cf5baf697d40571aa2da631c1371733279f9b0e42ac56aa 与 4ac3c0abe469b8eefa0cb7f7ebbd49c598618b9d47ecb2a265942429cc13694d；后续仅更新状态文档。C10/C9 各 137 文件原锁保持，完整目标、内容准入、远端 CI 与部署均未被声明完成。

本节追加前完整历史前缀为 56953 字节 / cd202efaa57038046f6d33a94cbb10f86f52542694e3101a98d4912e82b3a5e3，原字节保持。完整 diff、原件与源码快照见 QA/t1t2-default-scope-faf12c10；最终产物、源差异、工作树与历史前缀读回见 final-readback-final.json。

## 2026-09-07 续轮：八字当前 manifest 与空席位任务包输入闭包

原报告要求明确选择及依赖闭合，不能自动选最高版本或把候选变成正式内容。此次以既有 manifest 2.2 为历史工程基线，因为它已经消费当前 source 1.7、rights 1.3 和 readiness 1.9；逐文件核对发现 28 个唯一组件文件仅两处过期。新 2.3 只重绑 package-lock.json（176276 字节 / fd94ca9ba0832c1cf596c3e05f980fde5af82849b4935877342cc67d4d22c0e2）与 single-chart-report.ts（164210 字节 / 43da8ce98eb0b09c061e6997dd140ffd3ad3dd597cb30720413fd67cf724d2dc），更新受影响组件及报告摘要，保留其余 26 项和原零权威/未完成语义。原 2.2 full loader 仍因旧组件 pin 失败；新增历史构造品牌不冒充其 current full-loader 品牌。

原 Bazi domain current 入口现按明确 2.3/2.2 版本调用真实机械 loader，再核对五项已选 artifact/id/digest，未知版本拒绝。2.3 文件 23376 字节 / d155b4d3cf8693ca61a210091a8563aea8cdbe646689f11e09e946e2d1333578，manifestDigest 98babe5a9e29ad20807961f1561991c8ddaa5bb068f6da37cd1b0978b509fa3f。

复用既有 nonVersionedSelections，明确选择 content/bazi-strength-expert-review-packet.current.json 中的任务 1.6.0，12692 字节 / 42c7541b9c1f84d5473bc91765cf599eb518abf2ebb656ba4360fbbd6ae37327，packetDigest 1b1e06439b4b3e44358b9e5b9feea2d44058933c8f66010d6a8940faa2da87e6。公开任务 loader 和 progress 都验证 12 实际输入、当前三账/权利到来源关联以及 readiness 原 11 项依据；4 题、10 独立因素、7 排除项、12 binding、两空席位及分歧规则未变。readiness 保留旧 1.5 任务包为历史依据，没有向当前任务回链。旧 private intake 仍绑定旧会话；真实意见/资格均为 0，合成 0/1/2 收件合同不能充作真实意见。当前任务可用后，专家 CLI 仍 exit 1 / EXPERT_QUALIFICATION_RECEIPT_LOADER_UNAVAILABLE。

history-checkpoint.v2.json 使用既有格式，checkpointId /2.0.0、25 families / 78 members，36579 字节 / e1eba8f4d7a7ed7ffbe343cf8cc4c7dd2a453cba27a8d0b090da9b6cfb67c7ff。full loader/builder 核对旧 v1 原 bytes/SHA 和逐 family 的旧 77 成员前缀；旧 v1 文件原 SHA 65dceb6bccbe90b5526980f42edc78670587eef5cb27be90780a96c94e9f35ee 保持。元检查点仅按两条精确路径排除自身库存；current identity 读取不额外加载完整旧历史。current-index 仅改变 manifest 与专家任务两项显式选择，其余 24 family 记录相同：42740 字节 / df7e9ac217d480ea84acb02d0f3484d8684fbcc6426eef9d0dbc7d8d358f326a，indexDigest 63e71d0c36e2f216711ac6c0b8ae0051c7f3ccd98d5b4a55cfdce8560180520e。状态投影与 README 的机器区块同步生成；全部 authority 保持 false。

| 真实验证 | 原结果与适用范围 | 原件 |
| --- | --- | --- |
| 新 manifest 2.3 整份普通测试 | 8/8、0.831 秒；历史构造与 full brand 分离，28 文件校验、两项重绑和红门保留 | QA/t2-bazi-current-cf370e20/manifest-v23-first.stdout.txt |
| 集成普通合同第一轮 | 六文件精确筛选 92 项：history19、index21/1、history/current5、status13/1、scoped24、independent8，共90PASS/2FAIL | run1/summary.json，各stdout保留每题 |
| 两处修正后的复验 | index22/22、9.127秒；status14/14、11.115秒；原 current CLI exit0 | run2/summary.json |
| history/current/Bazi manifest | 原独立命令均 exit0；manifest实际消费2.3 full loader | run1/history-cli、current-cli、manifest-cli日志 |
| 专家与默认 prebuild | 两者资格读取器不可用、exit1；prebuild 21.557秒，主体未执行 | run1/expert-cli、prebuild stdout/stderr |
| 其他独立边界 | 两inventory、Node文件登记、draft isolation、release-governance exit0；原两strict各CURRENT_UNAVAILABLE/exit1 | run1各命令日志 |
| 完整 TypeScript 图 | npm run diagnose:typecheck，programStarted=true、exit0、3.890秒；不是默认生命周期绿 | run1/full-typecheck stdout/stderr |

首次 index 错误由选择状态较早报错遮住旧 head 诊断；修正为先核 head、再保留同样的选择状态检查。首次 status 夹具把改写后的临时 index 当作可通过固定 raw pin，正确被拒绝；修正为纯未选数据合同及必须 INDEX_RAW_DRIFT 的负例，生产品牌/pin 不放宽。三项代码/测试变化在 run2 复验，原失败未改写。92 项是明确筛选，原其他测试未执行，不能写成 Node 整组通过；加上 manifest 8 项也不是一次100/100运行。

两轮各2129项输入前后相同，run1=17276c32cc84734f2a9a5e3e28d3b3d671a5eb966bfb5385def90b2884499f51；run2=b71f5d63481f3a9da156bb738f105f17a2e7479a265cc96305b06d4cbe6a76cc。本轮没有完整 Vitest、构建主体或浏览器运行。C10 live、C10 archive、C9 archive 的各137文件和原锁再次通过；新治理源没有重新构建或重签 C10。最终读回见 QA/t2-bazi-current-cf370e20/final-readback-final.json，另有登记依据、preimage、独立审阅与真实运行日志。旧跨 descriptor 三场景、全cross、精确历史文档、真实来源/资格/意见和同产物主机回滚仍未闭环；没有暂存、提交、推送或部署。

本节前 60597 字节历史原文保持；其 SHA 为 d7cbebcf093f9f18d83f605fa73891fa7e5030c29be639820b63a5dabcb9ceae。


## 2026-09-07 当前私有文件收件续轮

当前专家任务仍为固定 current 文件的 1.6，四题、十项独立性因素、十二条 binding、两空席位和原权限边界不变。新增入口复用既有 identity、original-opinion、seal 三种记录格式，消费仓外实际文件；第一份意见可单独收件并显示 1/2，身份资料缺失明确列出。提供身份资料时核对双摘要及对应 reviewer 引用，同一已声明 reviewerId 不能占两个席位。以上仅是收件和字节关联，qualifiedIndependentOpinions 始终为 0。

诊断命令为 node scripts/resolve-bazi-current-expert-review-packet.mjs --private-intake <仓外收件清单的绝对路径>。清单是至多两项的 JSON 数组，每项包含 opinionRelativePath、sealReceiptRecord；可选 identity 包含 dossierRelativePath、identityBindingRecord。相对文件路径以清单所在目录为根。记录会话必须来自 loadBaziCurrentExpertIntakeSessionBinding 的实际选择；没有自动升级、改写原件或代签摘要。封存原始 SHA、字节数、意见/身份引用及时间顺序须全部一致。清单及文件上限均为 5,000,000 字节。

此模式只输出当前身份、收件数量和缺口，不输出私有路径、意见正文或身份正文；成功读取也仍 exit 1 / EXPERT_QUALIFICATION_RECEIPT_LOADER_UNAVAILABLE。无参数命令保持真实 received=0 / qualified=0；不会隐式扫描私有目录或持久写入收件结果。旧私有 API 和旧对象 JSON parser 保持原历史 1.5 / object-only 契约，当前清单使用专门的严格数组 parser。

| 执行 | 原始结果 |
| --- | --- |
| 新私有文件合同 | 16/16，47.648 秒，0 skipped/cancelled/todo；全部为明确标注的合成材料 |
| 当前入口普通合同 | 精确筛选 24/24，17.244 秒；不是整文件/整 Node 组的安全审计 |
| 旧入口普通兼容 | 精确筛选 8 项为 7 PASS / 1 FAIL，0.247 秒；唯一失败为原零实例 gap 的 INTAKE_GAP_BINDING_DRIFT |
| 完整类型诊断 | npm run diagnose:typecheck，exit 0，3.000 秒，程序主体已执行 |
| 独立机械命令 | history/current-index/status、Bazi manifest、Node 文件登记、draft isolation、release-governance 均 exit 0 |
| 专家及 prebuild | 专家 exit 1；prebuild exit 1、20.362 秒，停止在资格读取器不可用；Vite 主体未执行 |

本轮原始结果为 QA/t3-current-private-intake-2f55aa54/run1/summary.json，各 stdout/stderr 和精确标题保留。2130 项源输入在全部检查前后相同，摘要 231579459aaa7cf27e9ec9a4bcb25eb526cfb03e247b518e050e92d35cc65089；因旧测试失败，验证编排器最终 exit 1、allExpectedOutcomes=false。不能把新测试通过拼成整轮或发布门通过。静态独立复核期间发现并修正数组/对象 parser 接线及同 reviewerId 跨席两项，最终测试覆盖这两项。

未添加新 candidate、current 选择、历史 checkpoint 或权利/资格记录。原 C10 137 文件、其独立归档及 C9 137 文件再次逐字节验锁；原 65944 字节历史正文前缀保持。最终输入/产物/分支读回在 QA/t3-current-private-intake-2f55aa54/final-readback-final.json。全量 Vitest、构建主体和隔离浏览器本轮未重跑，前轮证据仍按其原输入范围标注。真实材料及合格专家仍为 0，十二 binding 冻结仍 0/12；三个跨 descriptor 热接管、精确历史备份、可信资格消费与真实 HTTPS/回滚链仍未完成。未暂存、提交、推送或部署。

旧 gap 失败的静态定位：content/system-admission/bazi-binding-freeze-requirements.v1.json 被历史账固定为 readiness 1.5.0、26038 字节、SHA-256 662c91e6269d5e860a0d207185680ea7c7b752f24e313859c0d987cb5b446201；实际同路径为 1.6.0、30655 字节、SHA-256 1db59e2f7d3c5448f27b32d96bc8cf5a75968e8470dd0592d70594b44b3ec809。旧 packet 和 gap 自身匹配。完整校验函数和八个相关固定值与本轮修改前逐字节相同，因而同一输入下旧实现也会拒绝；这是静态比较结论，未声称执行修改前测试。run1 仍保留实际 7/8 与编排失败，未改历史固定值或把测试预期改为通过。


## 2026-09-07 历史 intake gap 原依据恢复

从本地 Git 两个 26038 字节候选对象中找回唯一精确原件：OID 6f475c5ca792d0e2a58378bd734f4cc5d34ed3c5，SHA-256 662c91e6269d5e860a0d207185680ea7c7b752f24e313859c0d987cb5b446201。readiness ID 为 hakimi.bazi.strength.binding-freeze-readiness/1.5.0，语义摘要 feea402079cab44a5d3e0855f867114684da96e4005343a1b1a7cdc75fbee9ad。独立核算 Git 对象头及原字节也得到相同 OID；恢复和独立报告分别在 QA/t3-history-intake-891cb2e4/readiness-recovery.json 与 independent-readiness-original-review.json。

原件按原字节保存于 scripts/fixtures/bazi-expert-intake-readiness-1.5.original.json，单文件 .gitattributes -text；filtered/no-filter Git hash 均等于原 OID。它只含十二条未冻结的历史工程候选记录，没有私有意见或身份正文。旧 gap 的逻辑路径、字节数、SHA、ID、自摘要及零实例断言不变，当前 v1 alias 仍为 1.6、当前选择仍为 readiness1.9/专家任务1.6。

verifyBaziExpertReviewIntakeGapLedger 使用同一稳定文件读取器读取固定历史归档，无 current fallback。结果新增 verificationScope=historical_intake_gap_snapshot、currentApplicabilityAssessed=false。缺失或漂移的历史依据仍拒绝；当前1.6任务不能代替历史1.5任务。历史通过后，完整旧专家包仍因当前源码与原 artifact locks 不同而报 ARTIFACT_DRIFT。

对应旧观察测试改为检查上述实际行为，去掉把过去44/47数量强制到当前测试文件的断言和嵌套整组执行。过去JSON、日志、44/47记录与上一轮7/8失败未改写，测试原件和diff存于本轮QA。当前private入口、任何qualified或发布状态没有晋级。

| 本轮独立执行 | 结果 |
| --- | --- |
| 历史与旧私有普通合同 | 精确14/14，0.382秒 |
| 完整旧packet仍拒绝当前漂移 | 精确1/1，0.369秒 |
| 当前私有文件收件 | 整份普通16/16，46.496秒；均为合成意见/身份资料 |
| 独立机械命令 | history、current-index/status、Bazi manifest、Node文件登记、draft isolation、release-governance均exit0 |
| 当前专家门 | exit1 / EXPERT_QUALIFICATION_RECEIPT_LOADER_UNAVAILABLE；真实received0 / qualified0 |

原始结果为 QA/t3-history-intake-891cb2e4/run1/summary.json，31项普通合同均无skip/cancel/todo；2131项源输入前后相同，摘要79367935c1049fb77ca1d18fd4233bc479fb699df9ddb274820c5fc9352df37d。不是Node整组或正式发布通过。本轮没有再次执行完整类型检查、全量Vitest、prebuild、构建主体或浏览器；这些前轮证据保留原范围。终检三组各137产物文件、固定current/历史对象及原70148字节历史正文前缀，记录为 QA/t3-history-intake-891cb2e4/final-readback-final.json；测试后仅本组四份状态文档变化。

进一步静态复核确认T1仍有工程缺口：Quick CI已独立运行三个诊断并always聚合，但根pretypecheck/pretest/prebuild及正式runbook仍使用会在专家门短路的npm链，正式raw receipt只记录外层退出，缺乏实际程序阶段证据。下一项工程工作应把治理与获准程序放入明确阶段、保留root/workspace hooks和全部检查，再使原回执消费本次阶段记录；不能把diagnose结果填成原npm命令通过。相关主要入口为 scripts/run-diagnostic-stage.mjs、formal-npm-lifecycle-closure-lib.mjs、run-release-evidence-command.mjs。三个跨descriptor热接管、完整cross、真实来源/权利/资格与HTTPS部署回滚仍未完成。


## 2026-09-07 默认生命周期与实际阶段回执

T1默认命令接入固定协调器。root typecheck/test/build仍分别执行原完整tsc、Vitest和Vite命令；三个原prehook的current-governance义务移入明确governance阶段，build仍先执行原workspace prebuild。原治理脚本文本与27种实际终端命令文本保留，静态闭包通过固定plan展开，未知root/workspace hook不能被静默接受。执行阶段顺序为governance、workspace-prebuild、program、workspace-postbuild、root-post；无适用钩子如实记录，不伪造成功。

阶段报告绑定本次UUID、receipt ID、原npm命令、root/web实际package字节和planDigest；父runner验证时间、是否启动、退出码、signal、阶段次序与aggregate一致性。只有typecheck/unit/build三项必须附本次报告，其余10项原语义保留。generator和verifier均验证原raw receipt的实际阶段绑定，不接受旧式或缺失阶段记录充作通过。独立程序有真实结果后，最终总门仍拒绝治理失败。报告写入不承诺跨文件原子快照或执行区间不可变。

普通合同首轮76/76：runner20、receipt44、runtime6、Quick/default6；首轮draft-boundary因旧build字面值约束真实失败。最小补齐固定plan的普通Web目标检查后，run2独立命令及新增1项普通合同通过，真实默认类型检查正文PASS而资格治理FAIL。run3在最终夹具源上再次执行相同受影响检查：全部预期结果成立，完整TypeScript正文3.139秒、外层exit1。原run1失败未覆写。

完整npm test均通过真实formal parent启动原命令，无CLI文件/标题筛选和timeout/retry参数。三次结果：

| 运行 | 原生结果 | 输入摘要 |
| --- | --- | --- |
| real-unit | 213文件185PASS/28FAIL，2803项2676PASS/127FAIL；native250.57秒；81项timeout、46项UI等待失败，9条fork结束超时 | 8b5b041643313238127a721413d30643f27af9ec0359e39f4d8508c360f972de |
| real-unit-r2 | 213文件212PASS/1FAIL，2803项2802PASS/1FAIL；native365.48秒；唯一transit-review-inbox的5秒超时 | 7fbac81d6ee7b3229a4002ab4af90632ce1c0b0fc0996de9f77f68793b96220c |
| real-unit-r3 | 213/213文件、2803/2803测试通过；0项失败；正文PASS/224.886秒 | 4f2bfbe8db5a430309e62a92764e99bbce772c9a055fbc51f87b86bbd8804d6b |

第一轮真实命令结束后QA postprocessor因receiptsDirectory变量拼写错误中止；从原日志/收据/前后源快照恢复summary，没有重跑、改签或覆盖原日志。第二轮原解析器只识别全PASS格式；completion-audit.json从原mixed输出补齐1失败计数，原summary保留。第三轮QA解析器支持mixed结果，仍以实际程序终态为准。每次治理均真实失败，programStarted=true、外层/阶段aggregate均1；前轮失败不因后续结果重署。

第一项修复仅在Vitest根test设置maxWorkers:2，三项目共享；同步当前配置review pin，原2131输入中仅此配置与活动pin两项变化，其余2129逐字节一致。未改变测试发现图、各环境/Schema、超时或重试。第二项仅整理transit-review-inbox.test.ts的重复真实夹具生成：固定时间18候选包在beforeAll真实生成并序列化一次，两项各自编码独立bytes；正式import和每次projection完整重算保留。8标题、37个含expect的行及其断言上下文不变。生成成本转入hook/全程，不能描述成生产优化。定向attempt1为7PASS/1FAIL（本次遗漏bundle局部变量），run2为8/8、5.441秒、原超时项1052ms；两轮保留。最终文件20146B/SHA1a62cb74a646cbd0d5638e38ba81c928d51082557c43eff5dd76c236d8ce29b5。

默认build在C:/Temp/hdt1-e07dba93的物理副本实跑，未复制Git元数据、主dist或主锁。2131个源文件按主目录Git给出的固定清单逐项原字节复制；20258普通依赖文件412450424B逐SHA核对，260个pnpm内部链接与32个workspace链接只指副本内目标。原盘点发现内部links时的completed:false记录保留，真实复制结果在isolated-build-prep/summary-copy.json。真实build的workspace prebuild PASS、Vite正文PASS，治理FAIL/总exit1；default-v13 manifest检查exit0。副本生成137文件，证据字段unbound-local-build，没有正式锁或current晋级。raw receipt SHA=e5e11bf05cb7c2dbb330cbd36124895522a2522aef518745782500cbbcbff644，phase SHA=e97d0e7242ad1ed9ccbbe0af86a1be94cef73320ad07cafdf57509bf3f9f3ab9。C10在完整编排前后逐文件/原锁验证，最终副本源码和产物也在manifest检查后复核。

活动闭包pin更新为011ab7a7220451856bc558ee73054a329268d4efb63bf921d2fa27b8d1d47cd1；HKO绑定仅刷新该implementation的字节/SHA及policyDigest，未改变权利规则。runtime sidecar仅root package身份及总摘要变化，原source/facts未改；详细字段比较见obligation-comparison.json。原历史current/checkpoint/旧gap、恢复原件及C6长账固定值均由final-readback再次验证。

本轮QA根为既有QA/t1-default-lifecycle-e07dba93。run3/summary.json、real-unit-r3/summary.json、isolated-default-build/summary.json绑定相同4f2bfbe8db5a430309e62a92764e99bbce772c9a055fbc51f87b86bbd8804d6b与2131源文件；终检final-readback-final.json记录测试后仅四份状态文档差异，保留原73728B历史正文前缀。主C10/C10归档/C9归档各137文件再次验锁，21项SW关键源码摘要不变；这不等于整个传递构建输入未变。本轮未执行新浏览器、部署、远端CI、暂存、提交或推送。三个Node分组、原26项cross、三个跨descriptor热接管、真实来源/权利/qualification/独立意见和实际HTTPS/旧部署回滚仍没有完整通过证据，整体目标未完成。


## 2026-09-07 T6 原热接管与完整矩阵

保留原13标题和两个浏览器品牌，三个热接管场景没有改成自然退役。新增独立的前向激活协议，实际waiting worker的完整描述符只能匹配legacy-v13到独立shadow16。源控制记录、全部旧页写入排空及实际worker身份核验后才允许激活；旧页锁保持到完整导航。慢旧页允许真实只读审计结束，但其迟到提交不能写回。默认产物仍为legacy-v13/schema13/migrationId null。

修复两处实际问题：预期的前向冻结停止不再被最外层注册catch误报；来源迁移FREEZE在第一次异步加载前登记单一pending身份，精确ABORT/COMMIT能取消迟到续体。解锁、恢复与ACK均核对会话归属，COMMIT保持终态写锁，未知结果不推断取消。精确取消丢失时可保持冻结直到正常刷新；没有新增main时序单测框架，实际8秒慢页场景在两个品牌通过才是这条接线的运行证明。

九个自然退役场景仍使用原helper。该helper只暂缓现有同源旧页对捕获controller的两种自动激活REQUEST，不伪造ACK、不调用skipWaiting、不重放；原waiting、缓存、关闭全部页、零客户端与自然激活断言保留。三个热场景均不使用此调度。观察元数据明确其限制；初始about:blank及浏览器内部页面不安装hook，仍按原列表关闭。

| 实际运行 | 结果与范围 | 原件目录 |
| --- | --- | --- |
| 原完整跨Schema矩阵 | Edge13/13、Chrome13/13，26/26；0 skipped/failed/flaky/retry；原严格门与raw receipt PASS；703.291秒 | browser-full-r2 |
| 完整默认TypeScript | 正文PASS/2.467秒；资格治理FAIL/外层1 | integration-r5 |
| 完整默认npm test | 213/213文件、2824/2824测试PASS，0失败/skip/todo；正文223.900秒；资格治理FAIL/外层1 | full-vitest-r1 |
| 原同Schema SW6与ABA2 | 两个独立命令分别6/6与2/2；真实源/产物前后核验，无重试或标题筛选；非同一产物集合 | same-schema-regression-r1 |
| 隔离默认npm run build | workspace prebuild与Vite正文PASS/15.127秒；资格治理FAIL/外层1；default-v13 manifest检查0 | build-prep/build-run1 |

QA为既有根下t6-forward-activation-20260907-0f582e3a。完整cross的2131项源摘要为d5a11507a53835bc6ea11c5fc8b0d8351171e3d7b4f6c37ee713c633c3a560d3，对应原evidenceId hre1-d52b5d29096589eed05852c3992ccaf2；其前后字节相同。之后只更新当前critical21清单的3个runtime记录/总摘要及活动治理selfpin，两文件变化；cross运行时、配置、spec和helper均未改变，旧cross回执不重签为新current。后续类型、完整Vitest、同Schema与隔离构建绑定当前2131项源dfac165bb21e1e9ad917d4961a126c5eb711efa22711b41d1fe79580b685e1cd。这不是单一正式发布包的全门通过。当前critical21摘要6781fb7d831a3c0185cfc58ccf4cc787b22b0c3ee04ca356ce3286abd73586ef，其余18项原字节一致。

隔离默认构建位于C:/Temp/hdt6-0f58：执行时复制20258个依赖文件、412450412字节并逐SHA核对，260内部链接与32workspace链接均指副本内。相比旧依赖盘点仅Vitest缓存少12字节，复制核验采用本次实际清单。137个新诊断产物，build 40b7a0c6f879，artifact SHA 45afd57bcbfc911b4e34396562bffd30114b34aae03b5b6c5e11a1ef2f94fc46，evidenceId unbound-local-build；未写正式锁、未选为C10。主C10及旧档案保持原身份。

失败原件完整保留：browser-full-r1因真实迁移失败及重复自然waiting等待冲突主动终止，raw failed且缺失完整summary，不能计PASS。最早一次目标prepare及收尾双失败的内层根因没有单独确证；后续单项和完整双品牌未再出现，不能倒改旧失败。diagnostic-edge-r1因标题锚定无发现；r2原首场1/1与r3重试/富数据2/2均被严格完成门因筛选正确拒绝，只有full-r2的26/26计完整cross。先前新增单测的ACK次数/静态字面值/类型夹具错误及各次原日志也保留；integration-r5四个相关Vitest文件165/165不是另一场完整Vitest。

本轮没有提交、推送、部署或改写旧产物证据。历史西洋20351字节原件、真实12条来源/权利绑定、两名独立合格专家、qualification loader、现实HTTPS/旧部署及可信回滚消费者仍未闭环。方案B整体未完成，工程PASS不授予内容、专家或公开发布权限。


T6最终独立治理补充：首轮readback在SW运行时采集检查处实际exit1，原日志保留为QA/final-release-governance.stderr.log。该活动检查仍钉旧整SW摘要和旧FREEZE发送字面值；仅刷新当前整SW摘要，并同时核对protocol map的freeze名称与真实session.protocol.freeze发送。原只读challenge摘要、same路由、身份约束、单skipWaiting及所有未授权状态保持。两个明确普通合同2/2、独立node scripts/verify-release-governance.mjs退出0（QA/runtime-capture-active-sw-pin/validation）；未运行整Node组。完整类型/Vitest/SW6/ABA2/副本build之后的源差异仅此治理脚本及四份状态文档；原dfac回执、原cross的d5回执与旧产物都未重签。最终读回见QA/final-readback-r2.json。

## 2026-09-07 T9 原始正式证据文件消费

本节追加在完整T6记录后；此前记录及其摘要前缀不修改。实施仍为 `C:/Users/Administrator/Documents/哈基米算命`，基础HEAD `b7216a301a74bea0591b364b4dba32aa34409378`，未提交工作树；用户已解除受限源码及 `local-user-data-cleanup.ts` 的读取/必要修复限制并批准完整验证。本轮没有再修改应用runtime或该文件。

### 实际实现与范围

既有正式CLI导出 `verifyReleaseEvidenceFiles`，以两个明确目录分开源码合同与原绑定文件。源码/Git、package-lock、四份策略/schema、实际工具链及阶段package/plan在sourceRoot；Evidence/sidecar、dist/lock、13条原raw、3份阶段报告、5份严格浏览器摘要和四项原browser receipt的端点绑定在boundFilesRoot。原文件内 `dist/web`、`tmp/...` 字符串无需重写，缺件不会回落到源码目录找同名文件。当前支持合同检查通过不推断旧A历史适用性；两根结果 `verificationReceipt=null`、`historicalApplicabilityAssessed=false`，不补签历史。

原同根CLI继续固定全部必要回执/命令和工程门，保持dirty/unbound的诊断边界及artifact外独占 `wx` 输出。独立读审发现初版入口路径字符串比较存在Windows大小写兼容风险，已改固定Node运行时的 `import.meta.main`；不支持该字段明确报错，避免未核验而静默退出。已回读修正，没有执行入口绕过复现。

原rollback产物组件现在真实调用上述reader，固定 `allowDirty=false / allowUnbound=false`，重算所有门并比较除新verifiedAt之外的完整formal投影。单组件测试经过真实文件读取，删除unit raw后拒绝。整体v1仍在所有下游前关闭准入，原五参数和四根隔离不变；一个公共receipt根无法同时含两套原A/B布局而不与artifact域嵌套。此处没有把已有baseline-root/candidate-root静默重解释为归档根，也没有增加假定历史profile或新发布权限。

### 原运行及终态

新普通文件合同原run1：10 selected、8 PASS/2 FAIL、0 skip，82.261秒，exit1。首项观察到generator与reader的Edge元数据不一致（一次为not-detected），没有确证其内部原因，未改检测器或复用旧值；另一项是新测试期望后置mismatch，实际更早在canonical endpoint门拒绝，只有该断言改为既有精确报错。失败原日志保留。

独立run2：原同一10项前缀，76.209秒，exit0，10/10 PASS、0 fail/skip/cancel；四源before/after一致。成功运行的实际toolchain相等检查通过，但成功夹具版本字符串未单独打印，不能把run1数值写成run2原始记录。全部输入明示SYNTHETIC，仅普通文件与临时Git fixture；没有执行这些release命令或真实浏览器来生成假定的成功记录。临时fixture按自身目录身份清理，原TAP/摘要/前后SHA留档。

新测试覆盖两归档全文件原字节，13条raw逐项缺失、3份阶段报告/5份摘要逐项缺失、不同源码身份、阶段package域、四项原browser receipt端点、dirty诊断、unbound仍受锁约束、正常CLI的13条formal投影与wx拒绝覆盖，以及原rollback单产物组件的真实调用。另13项既有兼容合同、3项受影响helper默认合同PASS，最后独立 `node scripts/verify-release-governance.mjs` exit0。没有运行整个Node安全组或重新跑完整应用Vitest、build、浏览器；T6原输入/回执继续按自己的范围保留。

新运行绑定的四源：

| 文件 | 字节 | SHA-256 |
| --- | --- | --- |
| scripts/verify-release-evidence.mjs | 21781 | 4a7a41a4a3d3c3b4102adfe58a1846dc18e2e6c05454b803048dbbf1a1093c7f |
| scripts/release-evidence-lib.mjs | 32825 | 32367d73284ca11402bca190f9c18f0683c370625e128076ce1fd802bf61f5b0 |
| scripts/rollback-evidence-lib.mjs | 104736 | 2775a84da8a8bf85609b6051d3abe7661920b37817ab1b6c7a0990e696ebd85a |
| scripts/release-evidence.test.mjs | 119770 | a205ad50e8dd6dc3e1f0529141b621918c0a90ac9b80321880a051074faaeb1d |

QA根为 `C:/Users/Administrator/AppData/Local/Temp/hakimi-v13-approved-build-a53fb2e74e364e588e62001315717438`。新run1/run2与compact-readback在 `t6-forward-activation-20260907-0f582e3a/release-file-replay-test-agent`；本轮生产前像/独立审查、compatibility-final.log、fixture-defaults.log、governance-final.log与final-readback.json在 `t9-release-file-reader-20260907`。

### 对外措辞与剩余真实依赖

限定只读核对了19个入口/报告相关文件，沿真实main→App路由→help/settings/Revision→报告正文及Markdown出口查验；所读文字未发现把工程结果当成专家、科学或公开授权的明确声明。README107仍把2026-08-11的147文件/1541项称为最近一次，现仅该行标明历史、链接当前状态并将“当前工程”改为“当时工程”，原数字、日期和旧记录保留。源码文案核对不是C10或真实部署的措辞验收。原文与精确19文件身份/阅读锚点在 `t9-release-file-reader-20260907/wording-readback-45b57aa6`。

本轮只读GitHub元数据返回deployments/release均为空、Pages404且has_pages=false；只能说明所查GitHub表面无这些记录，不能证明其他托管平台没有部署。未进行任何远端写入。

真实旧A源码/工具链/原产物与正式原始证据、获批HTTPS域名和托管平台仍待材料；主机/CDP/provider可信观察、真实去标识数据HMAC重算、可信身份与签名、阶段freeze和离线回滚均未闭合。八项准入false、registry零可信actor、hosting平台未选择继续保留。来源权利与两名独立专家也未闭环。C10/C9原锁与137文件、旧history前缀及当前选择原件在最后读回再次核验；未暂存、提交、推送、部署或打开发布权限，方案B整体尚未完成。

## 2026-09-07 B1失败修复与B2同产物实跑

本节只追加；此前90552字节原文保留。实施仍为原HEAD b7216a301a74bea0591b364b4dba32aa34409378的未提交工作树。用户解除受限源码及local-user-data-cleanup.ts的读取与必要修复限制，并批准完整验证；本轮没有再改应用runtime或该文件。

本轮先修正既有runbook的一句过时描述：当前支持合同的单产物raw文件消费已经实现，但未知旧A布局及其他可信消费者仍未闭环，八项准入仍关闭。之后冻结实际主仓库源，制作物理副本，使用原默认build阶段入口构建、检查default-v13完整描述符、写新锁并归档。每次副本2131源文件逐字节核对，20258个依赖文件/412450412字节逐SHA核对，260内部与32workspace链接都指向副本内；不复制Git元数据，不用合成提交代替实际源身份。

### B1原失败保留

B1目录为QA根下 `t9-bound-default-artifact-20260907`，副本 `C:/Temp/hdt9-bound-0907`。原源摘要 `730a3391aa6cd48adfb2a7660a2b509204d139433cdb75fca1d7cf6c6b9f8662`；HRE `hre1-78c97a9082b2322005f7fc023042d949`，build `6601d438d926`，137文件；artifact `3e9bee88c3dc41090fa1a6058bc7c8da986ac47b3b98f586d5952bfd3cb2bf45`，lock `a39c1eb49ee54700e0a4f595015d14a2da10a47243f79702b5adf5b663a9bae9`。build正文通过、资格治理失败/总1。

B1依次完整执行local18（18/18）、boot（9/12）、backup（4/8）、PWA（2/2）、Web（2/2）。boot和backup确实失败，原raw、stdout/stderr、summary及实际生成的trace均保留，未改写或重签。失败点分别是：

- Edge启动readiness的page.evaluate恰逢第二次正常完整导航而上下文销毁；页面两次响应身份相同，trace没有记录全部controller协议，不能扩大为全协议线序证明。
- bad-v8恢复页两个测试按钮仍找旧“导出…”名称；实际产品是“生成启动诊断 JSON”“生成只读完整备份 ZIP”，后者因storageReady=false保持禁用。
- v9升级的版本等待误调用完整store inspector；新store在升级前不存在，NotFound异常跳过连接关闭，测试自身留下的旧v9连接阻塞升级。
- 离线备份的宽文字正则同时命中无障碍状态与可见提示，引发严格定位冲突；旧运行尚未执行后续导出、清空、恢复。

仅修改四份E2E：boot-fail-closed采用跨导航可重试的html属性定位；database-v8-v9修正两个精确按钮名称；database-v9-v10使用既有v10测试的原生indexedDB.databases元数据等待版本，并在完整inspector的finally关闭连接；offline-full-backup定位精确可见提示“浏览器报告当前离线”。原8个test声明/标题、原expect调用数量及末尾数据断言保留，无timeout/retry/skip放宽。四文件原像在B2 QA的before目录。实际trace/DOM/原生版本元数据读回支持这些修复；没有改生产恢复页面、无障碍提示或迁移逻辑。

### B2重新构建后五组全部实跑

B2目录为QA根下 `t9-bound-default-artifact-20260907-r2`，副本 `C:/Temp/hdt9b-bound-0907`。源码冻结文件SHA `3ba784355c712422fc4bb06cbdfdfbd93c2cf32c84dec63cae1751267a4c142d`；2131项源摘要 `553b3fbf43ff5a900897636c5c266efdac1f01faad298eb51fb2f09d2b81d0dd`，HRE `hre1-2a8d57b7f19f8eb77dcd8b74003abd67`，build `9e80b1c23a8c`，137文件；artifact `fc58211cbceb50f82d35c19b923ac4a40ade58dedd5c037ec1fa2f4dc2329331`，lock `9876d535787d35cbafb4a70d5a92867506e1a77c203049960e9ec41706c24c14`。这是新构建、新锁和新实跑；没有给B1或C10换标签。

| 原运行 | 实际结果 | 耗时 |
| --- | --- | --- |
| 默认build | workspace prebuild及Vite正文通过；资格治理FAIL/原命令与聚合1 | Vite15.054秒，命令32.527秒 |
| 默认typecheck | 完整TypeScript正文通过；资格治理FAIL/原命令与聚合1 | TypeScript3.064秒，命令18.788秒 |
| local-data诊断 | Edge9/9、Chrome9/9；18/18 | 255.755秒 |
| boot原命令 | Edge6/6、Chrome6/6；12/12，strict/raw通过 | 53.827秒 |
| backup原命令 | Edge4/4、Chrome4/4；8/8，strict/raw通过 | 31.814秒 |
| PWA原命令 | 两品牌各1/1；2/2，strict/raw通过 | 36.387秒 |
| Web连续流程原命令 | 两品牌各1/1；2/2，strict/raw通过 | 148.093秒 |

五组均只有一次原配置执行，无失败、skip、flaky或retry；不是42项独立覆盖。各组都在同一B2锁上运行，源码及产物端点不变、旧C10不变、errors为空。先前B1未到达的v9末尾数据保留、bad-v8末尾原库核验及离线ZIP恢复断言现已完成。local诊断使用line/json输出，不签发正式receipt；四正式命令保持原config/reporter，实际原始receipt按原id生成。

B2 build raw SHA `54e733a5415b1f0556081860d1270eab797d2c0a6a0b19f165a5def473452b49`，阶段文件 `tmp/release-evidence-receipts/.lifecycle-build-c8d5LG/terminal.json`，SHA `ca92f95bb169af953b9586b3a195184947ddadf6845b5dbdbdac4942feba5fc0`。typecheck raw SHA `30c4010bd534f04b8302965f5c9a39079aba844dd3fc196c80642b2e7bff3fd5`，阶段文件 `tmp/release-evidence-receipts/.lifecycle-typecheck-z8KpJv/terminal.json`，SHA `6d18c34fba76b84a642b1fd62832d86e624f83d9fded611427065f90489fa17c`。两份阶段报告均实际记录治理FAIL、正文PASS及总1；具体资格错误码EXPERT_QUALIFICATION_RECEIPT_LOADER_UNAVAILABLE在对应build-run1/stderr.log与typecheck-run1/stderr.log中，阶段JSON自身不含该错误码。

独立 `independent-five-stage-readback.json` 为35633字节，SHA `14cc6680a1124eaf19a17bf89b3c3b1e43f1f932c8eba9f347905eecec61f986`，实际执行5.117秒/exit0；按真实raw、strict摘要和local JSON重新核对五组计数、四原命令/HRE/摘要SHA/端点绑定、主仓及副本2131文件、B2与归档137文件和旧C10原锁。独立回读不执行浏览器正文，不声称排除整个时间区间内的所有瞬时变化。12份raw/阶段/摘要文件再按原相对路径与原字节归档，索引 `receipt-archive.json` SHA `79605e4a4b7139d42aa12e4e00bf87187035f1f7309526421acc6385a82200c9`；旧文件存在时只核对相等，不覆盖。

B2的dist、锁和原绑定文件在其 `artifact` 目录；每次命令的stdout/stderr、执行终态、摘要与源端点在 `browser-<stage>-run1`；build-summary、typecheck-run1及preparation保存实际前置/源/依赖身份。原B1的独立build回读首版ANSI解析失败与修正版也保留，属于QA解析问题，原stdout/产物没有改动。

### 限定与下一项真实输入

本轮没有再运行完整Vitest；先前213/2824绑定dfac原源。原cross26绑定d5原源，SW6和ABA2是独立夹具/产物；这些旧回执不拼成B2的13项正式发布包。B2仍绑定dirty源，程序正文/五组浏览器通过不改变资格门或发布门。状态收尾后仅四份状态/归档文档变化，原B2输入、证据和副本保持。

主仓dist仍是旧C10，旧C10/C9归档及B1原件都保留。历史西洋20351字节指定原件仍缺；12条binding、来源权利和两名独立专家未完成，qualification loader未形成受信消费。真实旧A、获批v13数据副本、HTTPS主机/所选平台、可信操作者及原回滚v1所需全部消费者仍缺；八项准入保持false。真实旧v13产物恢复的deferred不能由B2普通只读恢复代替。未暂存、提交、推送、部署或执行远端CI，整体方案B未完成。

## 2026-09-07 T7 未知提交标题的真实浏览器修正

原98001字节历史全文保留。重新逐项审查T6四deferred和T7八态，B2已有检查中、空库、正常可写、只读、未知、竞争、离线和未准入状态的实际行为锚点；不足范围单独保留，包括原cross夹具未绑定B2、12个内容binding未逐条展开以及真实旧A。审计在本轮QA/eight-state-readback.md，不把静态分支或测试数量当作全部行为已运行。

B2两品牌native-abort-proof实际outcomeText均出现Mutation epoch hold，而默认v13没有可核验mutation epoch。仅将apps/web/src/pages/data-management-page.tsx中一个eyebrow改为“写入暂停，等待核对”。原文件SHA219e3c9511aec23fd6f35e24fea51e8b128138b06bf61de2ef26e2c35f3d281e，新文件SHAd336f9ce9cbce867a43fe5ff0f62d282a725bcf5aef63678aad11f79b39b281d；所有状态、事件、确认与锁写逻辑逐字节保留，没有新增镜像测试。

现有DataManagementPage完整单文件29/29 PASS、8.760秒、零失败/pending，无name filter；是jsdom与原仓储mock合同，不等于真实事务或全量Vitest。原29标题、stdout/stderr/JSON/退出码、源码2131前后身份和工具链在component-test-run1；stderr保留Vite React插件esbuild/oxc弃用提示。

等待该测试真实终态后才重新盘点依赖，避免缓存并发变化。物理副本 C:/Temp/hdt7-label-0907 的2131源文件、20258依赖/412450412字节逐SHA核对，292链接均副本内；无复制Git历史。实际源摘要 645b2c5c6cd96848f95c8db30ee368c104c24cffbe8e8d76408008ae6fb0c51d，freeze SHA6e158783a30238f3414ea576ae36a2a13968a53111c9d285ce1768db86a8fe4a，HRE hre1-a64fd5dba806ee53db61a20b3b26121b。

新build c5acd70c1999、137文件、artifact 36e6ceeeb40507b2be9a3149c7f77e79cc907ed30de57a52c4518d748edb6313、原锁 db0ae05f717ca52ba7a93aec486e95382f1a2fd4f1866a977b43017fb31af396。构建原命令32.854秒，workspace prebuild1.782秒及Vite15.223秒PASS；资格治理15.177秒FAIL，原命令和阶段聚合exit1。原build raw SHA397345376048d65e3d7c3ae15776600cca42c1174294033a5c2216ebbbc15a8b，原阶段文件 tmp/release-evidence-receipts/.lifecycle-build-S7A6u3/terminal.json / SHA fdac174d4d63b6827dbc3fcaa4ae61f526a0b41846c02bab26ceda56c604ffd0，保持原相对路径归档；没有绕过资格门或签发发布PASS。

新产物原local18诊断实跑PASS，两个品牌各9，原配置、原完整场景、单attempt，无失败/skip/flaky/retry。真实native-abort到达未知分支后显示新标题，写入/重复恢复/清空继续禁用，只读ZIP与重新核对入口可用；原16分区摘要及修订关系核对保留。使用现有隔离Playwright（Browser plugin not available），没有真实用户资料或外部Provider。独立读回核对组件原结果、local原JSON、native-abort/unknown-write-gate附件、源码副本及新产物锁；截图可见范围另按实际帧记录，附件文字不冒充图像证明。

QA根下t7-unknown-write-label-20260907保存全部新原件；独立结果为independent-label-readback.json。旧C10、B1、B2及其原失败/回执不改；主dist仍C10。本轮没有重跑B2四个正式浏览器门、完整typecheck或完整Vitest，也没有把旧结果转签为新13项发布包。历史指定原件、真实来源权利、两独立意见与可信资格消费、获批HTTPS/真实旧A/数据副本及回滚消费者仍未完成；源码单行修正不替代这些真实条件。未暂存、提交、推送或部署，方案B整体未完成。
