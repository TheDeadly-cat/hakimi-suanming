# 默认命令与独立诊断映射

核对日期：2026-09-07（Asia/Shanghai）。对象：当前本地开发目录中的根 `package.json`、`apps/web/package.json`、Quick CI、Nightly 与相关入口。本文区分静态命令展开与本轮实际运行；命令关系本身不证明程序、浏览器或发布通过，实际证据见 [交付状态](delivery-status.md)。

静态展开阶段复用 `scripts/formal-npm-lifecycle-closure-lib.mjs` 的 `resolveFormalNpmLifecycleClosure()`，仅传入两份 package JSON，展开 `npm test`、`npm run build`、`npm run typecheck`；该解析操作本身不执行叶命令。2026-09-05 的静态快照中，三个闭包分别包含 20、22、20 个去重后的可达 script，未建模终端命令均为 0；上述三个分项旧计数未重算；本轮重新计算的是正式回执完整静态闭包，见文末。去重计数不代表实际调用次数或已运行数量。其后已实际执行治理、完整 TypeScript、Vitest、诊断构建和隔离浏览器验证，结果单独记录，不将静态展开误称为整条生命周期已运行或通过。

## 默认入口保留的完整前置链

| 用户命令 | 根生命周期钩子 | 前置成功后才到达的主体 |
| --- | --- | --- |
| `npm test` | `pretest → npm run check:current-governance` | 根目录 `vitest run --config apps/web/vitest.config.ts` |
| `npm run typecheck` | `pretypecheck → npm run check:current-governance` | 根目录 `tsc --noEmit -p tsconfig.json` |
| `npm run build` | `prebuild → npm run check:current-governance` | `npm run build --workspace @hakimi/web`；仍需下文的 workspace prebuild |

根目录没有 `posttest`、`postbuild`、`posttypecheck`。默认命令没有取消其治理钩子。生命周期顺序依据 [npm 官方脚本说明](https://docs.npmjs.com/cli/v11/using-npm/scripts/)，实际链路仍以本地 package JSON 为准。

`check:current-governance` 顺序执行 `check:current-boundaries && check:release-governance`。其中 `check:current-boundaries` 的真实顺序为：

1. `check:history-checkpoint`：活动 v2 的完整历史，以及旧 v1 的 77 项固定历史前缀。
2. `check:current-index`：先 `check:current-index:artifact`，再 `check:current-index:status`；分别核对显式当前选择及精确状态投影。
3. `check:system-contract-draft-boundaries`：隔离草稿边界。
4. `check:independent-source-inventory`：验证固定三体系 source_requirements 的索引身份，保留未选状态，明确不进行语义评估。
5. `check:bazi-engineering-binding-candidates`：八字工程候选。
6. `check:bazi-binding-freeze-requirements`：已指向当前 `verify-bazi-knowledge-core-identity-rebound-binding-readiness.mjs`，历史 v1 另有显式别名。
7. `check:bazi-domain-release-manifest`：固定八字当前 domain 范围，按显式 2.3/2.2 版本调用机械 loader，不回退其他历史版本。
8. `check:bazi-expert-review-packet`：核对当前 1.6 任务及实际输入，独立报告收件与资格；资格读取器不可用时仍拒绝。
9. `check:independent-domain-inventory`：验证固定三体系 domain_manifests 的索引身份，保留未选状态，明确不进行语义评估。
10. `check:web-storage-import-boundary`：Web 存储导入边界。
11. `check:historical-natal-source-lock`。
12. `check:historical-natal-runtime-closure`。
13. `check:historical-natal-build-attestation`：再次顺序调用 source-lock 与 runtime-closure。

这些入口由 `&&` 串联。任一入口返回非零，后续入口和程序主体就尚未开始；不能将该结果写成“Vitest 测试失败”“TypeScript 编译失败”或“Vite 构建失败”。候选 10 当时的 `npm run build` 退出 1：checkpoint、current-index/status 和 draft boundary 先通过，然后三个 `source_requirements` family 报 `CURRENT_UNAVAILABLE`；根 prebuild 后续检查及 Vite 主体未开始。原记录为 QA `candidate-10/npm-build-lifecycle.log` 与 `npm-build-lifecycle.exit.json`。独立 `diagnose:build` 的通过是另一条命令，不改写默认完整生命周期红门；C9 及更早日志仍保留。

三个 source requirements 的当前失败首先来自 `selectedCurrent=null` 的明确未选；writer 保留既有选择，不自动选最新。该入口没有据此重新核定真实专家或材料。历史字节与摘要通过、current-index 及状态投影一致、所选范围的实际语义可用，是三种不同的证明。current 可以准确登记一个仍不可用的候选；scoped resolver 仍需独立拒绝缺失、不可用或不满足约束的选定对象。历史或索引通过不能把这种语义红门转成通过，也不能证明来源权利、专家意见或发布已获准。

历史 v2 现可显式使用 `node scripts/verify-bazi-domain-release-manifest-v2.mjs --historical-input-root <directory>`。三份漂移输入已从本地 Git 找回精确原字节；37 份原输入固定于 `scripts/fixtures/bazi-domain-manifest-v2-original-inputs.zip`，历史 loader 与该 CLI 实际通过。归档 TypeScript 只作输入数据，verifier 仍从当前仓库加载，旧 lock 不用于安装。结果标记 `verificationScope=historical_input_root / currentApplicabilityAssessed=false`；无参数 CLI 仍使用当前仓库并报 `BOUND_READINESS_BASIS_DRIFT`。该历史入口不决定当前选择；当前 domain 已明确选择 2.3，并通过当前机械 loader 核验，不回退到 ZIP。原件身份、运行错误及有效限定结果见 [历史依据与产品补充归档](delivery-validation-20260906-history-and-product-closure.md)。

### Web workspace 额外 prebuild

根 build 到达 `@hakimi/web` 后，仍按顺序执行：

```text
apps/web#prebuild
  → npm --prefix ../.. run check:historical-natal-build-attestation
  → 根 source-lock 与 runtime-closure
apps/web#build
  → vite build --configLoader runner（cwd = apps/web）
```

因此在所有前置成功的假设下，默认 build 会在根 current-boundaries 中各运行两次 source-lock/runtime-closure，随后 workspace prebuild 各再运行一次。静态闭包对此去重，不能据其 tuple 数量隐藏重复前置执行。

## 本轮独立诊断入口

| 入口 | 执行主体及产物要求 | 运行目录 |
| --- | --- | --- |
| `npm run diagnose:typecheck` | pinned TypeScript：`tsc --noEmit -p tsconfig.json` | 根目录 |
| `npm run diagnose:vitest` | pinned Vitest：`vitest run --config apps/web/vitest.config.ts` | 根目录 |
| `npm run diagnose:build` | pinned Vite：`vite build --configLoader runner` | `apps/web` |
| `npm run diagnose:e2e:local-data-boundaries` | 已锁定 default-v13 产物上的五份 spec、九场景×两浏览器，共 18 目标；不构建、不签发正式 receipt | 根目录 |
| `npm run diagnose:e2e:sw-aba` | 用 workspace pinned Vite 7.3.6 在独立临时目录构建三代 SW 夹具，仅运行同 Schema A→B→A 一场景×两浏览器；保护现存 default-v13 产物和锁 | 根目录 |

前三者调用 `scripts/run-diagnostic-stage.mjs`，先读取 `docs/release/known-restricted-blockers.v1.json`。用户已明确授权读取、必要修复和完整验证，登记中的活动受限路径已清空。程序结果按真实退出码记录；旧 `phase=authorization / status=blocked / programStarted=false / exitCode=2` 是此前状态及保留的拒绝执行负例，不是当前检查结果。local-data 浏览器诊断直接调用仓库配置，无 `pre`/`post` 钩子；配置通过既有 preview 验锁，迁入的四份 spec 在测试前后再次核对锁身份。既有容量 spec 复用同一 preview，并在两处拒绝后核对全部 16 分区；整次运行另有产物前后守卫。

fresh-shadow 生产修复后的原默认 Vitest 完整三项目运行实际为 213 文件、2803/2803，exit 0、227.804 秒；命令 `node node_modules/vitest/vitest.mjs run --config apps/web/vitest.config.ts --maxWorkers=2`，无 file/name 筛选、timeout/retry/include 更改或重跑，938 项输入当时前后相同，见 QA `fresh-shadow-full-vitest-run1/summary.json`。后续四份 SW harness/current 文件及 cross 五场景编排不改生产 C10；其 2119 项源码摘要为 `62db460cd540cded396debb7d7a1e17ab8e59962480f0bff205467784ab62801`，完整 typecheck 通过、2.844 秒，见 QA `sw-current-post-apply-validation-run1/typecheck/summary.json`。此记录早于三处 false 断言修正。holder 编排后另一次完整 typecheck 通过、2.513 秒，2119 项源码前后同为 `432ef20992b7371c43e6c8f4b0646187a5f2fc7d74b48655cd89b0a2d764e3d7`，见 QA `t6-cross-holder-browser-b164e2a9/typecheck-run1/summary.json`；它又早于 republish helper/编排，不改署为后续源码验证。最新 republish helper/编排后完整 typecheck 又通过、2.531 秒，见 QA `t6-cross-republish-browser-cc510276/typecheck-run1/summary.json`；其全源为 `df9ab1b2e177f869a9f3f5c3af88ada1746062957f648d6adc3900a266141dcf`。C10 构建输入仍是 `f9863c8eeb537e29a038fc416c3e36ee817cc8565f2cdc54170e9cd7511b71ce`。直接五文件 171/171、早先 typecheck 2.821 秒、C9 的 213/2795 均保留各自原范围。

当前选定 C10：`hre1-3d5228d6912e5f003211552479808027` / build `0d84d313bb67`，137 文件，lock SHA `95d97d11dfb13402d41f99b19413a3deff8f8f48fad0f9e312dd440d0be77dbe`。一次诊断 build 17.417 秒、default-v13 manifest 与新锁通过，见 QA `candidate-10/build-summary.json`。旧 C9 锁使首次写锁按 EEXIST 拒绝；原样保存旧锁后独立写新锁，未重 build，C9 全部原件仍在 `validated-artifact-9`。C10 三次独立复验为 local18 18/18、274.312 秒，Web run2 2/2、156.172 秒，PWA 2/2、35.474 秒；源码及 C10 全身份不变，见 QA `candidate10-browser-revalidation-6fc271a4/three-stage-compact-readback.json`。Web run1 为 QA 配置 cwd ENOENT，0 发现/0 尝试，修复配置后才实际执行 run2；不是浏览器断言失败。C10 结果与下列 C9 历史覆盖分别记录。

候选 9 的独立诊断构建、default-v13 manifest 和实际 137 文件锁已通过；原 Chrome/Edge 连续流程 2、PWA 2、boundary 4、只读恢复 2、T7 4，分五次独立运行取得 14/14，原记录与 QA `validated-artifact-9` 保留。随后同一 C9 增加空页面、非法备份文件预检、恢复重复操作三场景×两浏览器，独立运行 6/6；合计六次运行、20 个目标，不能表述为一次 20 项全矩阵。补充运行前后原产物身份一致、源码端点相同。cross4 与 SW6/ABA2 属于另外的局部夹具验证，不能算入这 20 项或称为 C9 完整跨代矩阵。原范围见 [SW 与启动身份归档](delivery-validation-20260906-sw-boot-identity.md)，新增范围见 [历史依据与产品补充归档](delivery-validation-20260906-history-and-product-closure.md)。这些结果不使默认 npm 的 current 语义红门通过。

T6 归档时按原 Vitest 的 936 个输入路径回读，934 项相同，只有根 package 和当时 runtime-closure sidecar 两项差异；见 QA `t6-repository-wiring-review-20260906-9bf941ac/vitest-current-input-review-final.json`。这是该时点的对照，不枚举新增 E2E，也不把既有完整运行扩大为后来全部源码的测试证明。

较早 T6 将 boundary 两场景、只读恢复一场景迁入仓库后的 6/6 记录保留于 QA `t6-repository-wiring-review-20260906-9bf941ac/boundaries-run1/summary.json`，这是原覆盖的复验，不增加为 26。当前入口已补入空库、非法备份、重复恢复、AI 旧修订草稿与布局、来源 503 五场景，并纳入既有容量用例，共五份 spec、九场景×两浏览器。T7 run2 实际 18/18、exit 0、277.329 秒，零 skip/retry/flaky/顶层错误；Edge `152.0.4191.66`、Chrome `152.0.7977.83`，C9 原锁不变。独立回读核验 102 份快照摘要、18 份布局、18 个 trace 和 4 个隔离 profile，见 QA `t7-reproducible-flow-20260906-6c9ff320/local-data-run2/summary.json` 与 `independent-readback-2c4719af/compact-readback.json`。run1 的 14 pass/4 trace 初始化失败仍保留；修复只为 AI/source 文件关闭 runner trace，由其原手动 trace 独占。容量使用受控估值与真实 Worker/UI，503 是真实来源链接点击后的本地合成响应，不证明设备真正耗尽或第三方停机。历史 C9 的 20 目标与本次 18 目标不能相加为 38 项独立覆盖。

### 独立 checkout 复跑

使用独立、干净 checkout，按 `.node-version` 和 `.npmrc` 设置已锁定工具链。以下 PowerShell 命令在仓库根目录逐条执行，任一步非零立即停止；构建新产物会得到新的证据身份，不能覆盖或继承既有 C9/C10 的身份。

```powershell
npm ci
npx playwright install chrome msedge
$env:HAKIMI_RELEASE_EVIDENCE_ID = node scripts/compute-release-evidence-id.mjs --channel default-v13
npm run diagnose:build
node scripts/verify-built-release-storage-manifest.mjs dist/web --expected-channel default-v13
node scripts/release-artifact-identity.mjs --write --dist dist/web --lock tmp/release-artifact-identity.json
npm run diagnose:e2e:local-data-boundaries
node scripts/release-artifact-identity.mjs --verify --dist dist/web --lock tmp/release-artifact-identity.json
```

复验已选择且实物与锁一致的现存产物（当前为 C10）时，不执行构建或写锁；读取其实际 Evidence ID，验锁、运行十八目标、再次验锁。历史 C9 只能以其原件和原锁成对复验，不能把当前 dist 误称 C9：

```powershell
$env:HAKIMI_RELEASE_EVIDENCE_ID = (Get-Content -LiteralPath 'tmp/release-artifact-identity.json' -Raw | ConvertFrom-Json).evidenceId
node scripts/release-artifact-identity.mjs --verify --dist dist/web --lock tmp/release-artifact-identity.json
npm run diagnose:e2e:local-data-boundaries
node scripts/release-artifact-identity.mjs --verify --dist dist/web --lock tmp/release-artifact-identity.json
```

Nightly 独立 Windows 诊断 job 保留原 heavy job 每一步；使用相同 source-bound ID→诊断构建→默认代际验证→写锁→十八目标顺序，标准 JSON 要求 Chrome/Edge 各九项、每项一次 passed、无 skip/flaky/error/retry。锁建立成功后，即使浏览器失败也再次验锁，并 always 上传 runner.temp 下 JSON、日志、trace/截图及原锁。现行 PowerShell 正文（1951 字节）已消费实际 T7 run2 的 18 目标标准报告：正例 exit 0，缺目标、单项 skipped、非零 retry、flaky 汇总、顶层 errors 五份普通副本各 exit 1；见 QA `t7-reproducible-flow-20260906-6c9ff320/nightly-report-gate18-and-ci45-mtpjeytt/summary.json`。旧六目标 gate 检查仍保留于 `nightly-report-gate-check-4da970e3/summary.json`。这些是报告结构检查，不是新浏览器运行或远端 CI 通过。正式 backup 每项目 4、boot 每项目 6 及其全部 spec/receipt/schema 均保留。

以下保留较早自然退场两场景的四目标历史筛选形式，不能当作当前正式回执入口。当前 cross helper 自行去除父进程的 HAKIMI_RELEASE_EVIDENCE_ID 与全部 HAKIMI_DB_*，再按显式 descriptor 装配；原 strict reporter 会拒绝下面的子集，即使正文通过仍不满足 13 项×两品牌。当前完整入口为 npm run test:e2e:cross-schema-v13-v16，不附加选择参数。

```powershell
npm run test:e2e:cross-schema-v13-v16 -- --grep '(?:富 v13 数据直升 v16 后，业务写入变 dirty、全审计恢复 clean、再次启动命中 cache|v16 目标启动校验失败时隔离影子库并保持 v13 可恢复)$'
```

原仓库 run2 子集实际 4/4、exit 0、177.514 秒，源码 2113 项前后为 `84e9971950dfb40ba49968e16c638641d8988eea68fc275a102aeddd6d0f97a6`，见 QA `t6-repository-wiring-review-20260906-9bf941ac/cross-run2/summary.json`。后来完整执行既有 fresh-v16 一场景×两浏览器：原 run1 0/2，`ReleaseControllerTakeoverFrozenError` 阻止正常 commit；main 延后 fresh-shadow 首次注册至正常 commit，coordinator 保留 frozen、本页完成标记及持有连接的 protocol/代际/build/receipt/migration 校验，新增 8 项普通合同。修复后同 spec run2 2/2、67.457 秒、2119 项源码不变，见 QA `t6-cross-fresh-v16-6e418a2c/cross-run2/summary.json`。成功运行未录 trace，不冒充原始导航 trace 或 native 快照；原失败证据保留。

较早文档中的 fresh-v16 整题首尾锚定筛选不是当前可复用命令：Playwright 匹配包含项目及文件的完整标题，本轮该表达式产生零发现、exit 1，原记录保留。修正后的局部负向验证用原题子串，两正文通过但严格回执仍失败；正式入口只执行不带选择参数的原完整命令。后来五个独立场景采用自然旧页退场编排，首轮十目标为 6 PASS / 4 FAIL；quota/CAS 各两目标仅因旧 `swBootSignalSent:null` 与 bootstrap 的显式 `"false"` 初始化不符而失败。三处期望改为严格 `"false"`，运行时及其他场景不变；仅失败四目标 run2 实际 4/4、112.161 秒，零 skip/retry/flaky/顶层错误，2119 项源码前后同为 `54025c2aa14a57fd0b7576415406ee435b5a9d0c1a33a70550c133eb17123162`，C10 全身份不变。原 run1 保留，不把多次运行合并成单次 10/10；该字段只反映当前文档状态，不是原始 BOOT_OK 消息记录。证据为 QA `t6-cross-five-cold-orchestration-7b0e40ae/cross-run2/compact-readback.json`（SHA `9484bac2e467c575c8fdfcb60cc2edfee7f1a26cd7520d5a2596f0a11bdc3ce4`），断言修正见 `cross-selected-unsent-flag-contract-e7dfab5697`。

原 spec:1426 的 versionchange 持有场景完成 helper/编排后，两品牌实际 2/2、120.629 秒，零 skip/retry/flaky/顶层错误；源码前后为 `432ef20992b7371c43e6c8f4b0646187a5f2fc7d74b48655cd89b0a2d764e3d7`，C10 全身份不变。真实无 controller、无应用且目标未 boot 的 holder，再到 native blocked、源快照不变和正常恢复的严格断言均通过；原配置没有保留成功 trace 或 native 返回值独立附件，不把断言通过改写为这些原始附件已存在。见 QA `t6-cross-holder-browser-b164e2a9/cross-run1/compact-readback.json`（SHA `241fb20643aa6052f01d7eb634971b261b1104acdb664677dd9d15cac3a61b7a`）。原 spec:1566 的隔离受阻/republish helper 与编排已应用；完整 typecheck、两目标 list 与两品牌运行终态：完整 typecheck 2.531 秒通过，两品牌原场景 2/2、136.542 秒，零 skip/retry/flaky。2119 项源码前后同为 `df9ab1b2e177f869a9f3f5c3af88ada1746062957f648d6adc3900a266141dcf`，C10 全身份不变。见 QA `t6-cross-republish-browser-cc510276/cross-run1/compact-readback.json`（SHA `912c25ef98721eff6742543cbc513631dec04a3d341d121e58f3c49ab1cc85e6`）；同 ID 仅清理、新 ID 提交、数据保护原断言全部完成，六份观测证实 v13 文档与 v16 worker 分离，未切回 v13 worker。成功 trace/native 返回值独立附件未生成。

发布流程仍要求原完整 npm run test:e2e:cross-schema-v13-v16，13 声明×两品牌没有整轮全通过。原三个热接管断言与当前同 descriptor 策略的冲突仍保留。本轮在原 result/reporter 和原 config 中加入完成性检查：两品牌各原 13 个标题、同一原 spec、一次初始尝试、没有 skip/fixme/预期失败/重试/重复/筛选/分片。cross 作为第五类 completion 摘要由 runner、binding、generator、verifier 及更新候选消费者读取；backup/boot/pwa/web-v1-flow 四类的默认 v13 产物锁边界不扩展到 cross。下游使用绑定路径、SHA 和闭合聚合摘要，没有逐题原始事件独立重算。发布 13 份 required receipts 与 cross 每品牌 13 个场景仍为两个计数；局部结果不能拼成完整通过。

较早 T6 的 sidecar 同步仅通过现行 generator `--write`→`--check` 同步当前 sidecar 的 root package SHA/长度与派生 overall 三字段，未改执行图或历史原件；见 QA `current-runtime-closure-package-sync-d0d1f8d2/after.json`。共享构建助手现从 `apps/web/package.json` 解析并核对声明的 Vite 7.3.6；旧 `h6cs-22824ab3` 使用根安装 Vite 8.2.0 的事实及原结果保留，不能把旧运行改称为 7.3.6。解析修复证据为 QA `cross-helper-vite-resolution-6231026e2d/final-freeze.json`；以上均未提升 default-v13 正式根门。

上一轮 canonical 原命令 npm run test:e2e:sw-upgrade 为 6/6、strictGatePassed=true、111.382 秒，QA/t6-c10-canonical-formal-f39a287c/compact-readback.json 原件保留。其之前的行为通过但旧 critical-source 拒绝、fixture 15 PASS/2 FAIL 与外层 ENOENT 均保留。上一轮当前集合 e9be09051d1ecb6a62a5d6cf7d1309d9348a78cc50985f627bf55b9d78d85d0f 现由本轮已审查的 runner/合同两行变更派生新集合 d8c525432f4c299150bad902297127848bc832fc2d14e5d2e8e351e857888b47；21 成员/角色及其余 19 行保持，历史 e5e7 输入不改签。应用 Vite 仍为既有解析器核对的 7.3.6。原 ABA、C9/C10 和各轮合同记录不被新结果替代。

runner 区分授权阻断、程序无法启动、程序启动后的退出结果；真正允许执行时解析已锁定版本的本地工具二进制。它保留完整默认图，不排除文件、不压制错误。诊断入口本身不执行默认 npm 的治理前置；Quick CI 的治理 Job 和最终 aggregate 继续独立要求成功。任何 skipped、blocked、failed 或 cancelled Job 都不能满足总门。

`bazi-current-semantics` 独立执行默认前置中的 domain manifest 和 expert packet 两项义务；安装依赖成功后，第一项失败仍报告第二项。该任务加入最终聚合，避免索引能报告 unavailable 被误当作语义门已通过。工作流校验同时检查 `current-boundaries` 的每项直接义务都已在 CI 显式保留。

## Node 测试映射的实际覆盖

`check:node-test-groups` 只发现 `scripts/**/*.test.mjs` 和 `packages/*/scripts/**/*.test.mjs` 文件名，再核对逐文件登记，不导入测试源码。2026-09-05 的登记快照为 186 个文件，数量随后续增删而变化；本次文档更新不重新计算或改写该静态计数。漏登记、重复、路径消失或模糊路径均拒绝；`--list <group>` 仅列路径。

| 分组 | 已登记文件数 | 当前入口的含义 |
| --- | --- | --- |
| `ci-contracts` | 5 | `test:ci-contracts` 执行完整五份测试，独立 CI |
| `current-governance` | 27 | 全组路径已登记；包含新增 current/history 边界测试，现有独立命令覆盖部分测试，不等于整组已执行 |
| `bazi-evidence` | 51 | 同上 |
| `independent-system-evidence` | 74 | 同上 |
| `release-evidence` | 26 | `test:node-release-evidence` 执行全组，独立 CI；旧六份正式入口保留 |
| `package-artifacts` | 3 | `test:node-package-artifacts` 执行全组，独立 CI |

`test:ci-contracts` 的五份测试覆盖：

- `run-diagnostic-stage.test.mjs`：用注入的执行器夹具验证受限时不启动、缺失执行证据拒绝、启动失败与程序非零退出分开；不会启动真实应用主体。
- `verify-built-release-storage-manifest.test.mjs`：以临时产物夹具验证默认 v13 身份、候选模式及不一致产物的拒绝。
- `verify-migration-ci-paths.test.mjs`：只读配置与 spec 声明，验证 `service-worker-*`、`app-boot-*` 职责及 PWA 路径触发、无关文档负例；另核对 local-data 完整十八目标、独立 ABA 入口、Nightly 必要保护与正式 backup4/boot6 未缩减，不加载应用或执行浏览器主体。
- `verify-node-test-groups.test.mjs`：使用隔离目录验证路径发现、漏项、重复、删除和 CLI 非零退出。
- `run-node-test-group.test.mjs`：独立临时进程验证完整组、失败不遮蔽其他文件、跳过/TODO 不完整、缺少结果、原生事件及 worker 退出码。

执行入口为 `npm run test:node-group -- <group>`，使用 [Node 24.16 的 run / TestsStream](https://nodejs.org/download/release/v24.16.0/docs/api/test.html#runoptions)，以明确文件清单启动两个并行测试进程，不设置筛选、分片或强制退出。每次保存独立 `test-results/node-groups/<group>-*/results.json` 和 `events.jsonl`，保留逐测试名称、源码位置、结果、诊断和 worker 退出信息。文件 summary 缺失、零执行、跳过、TODO、取消或失败均返回非零。

清单通过不证明 186 份测试已运行。较早三个完整组的结果及各自源码范围见 [验证归档](delivery-validation-archive.md)，另三个组尚未取得全组运行结果。源码读取限制本次已获解除；分组和静态检查结果仍不能代替逐组运行。Node 工具结果不能证明真实产物、业务、浏览器、容量或现实材料验收。

T4 的 `ci-contracts` run2 41/41、原 run1，以及 T6 完整五文件 44/44（QA `t6-local-data-ci-wiring-8bfabc5b/after.json`）均保留为旧运行。当前完整五文件组实际 45/45、exit 0、无 skip/TODO/cancel/fail，原始逐项结果副本见 QA `t7-reproducible-flow-20260906-6c9ff320/nightly-report-gate18-and-ci45-mtpjeytt/ci-contracts45/results.json`。历史 v2 验证的有效 `verification-run2` 仍为 18 个声明中执行 17 个普通合同、明确排除 1 个，实际 TAP 为 17 pass / 0 skip。此前 run1 筛选错误，真实执行了 18/18，已登记 `execution_scope_invalid`；其原日志及纠正记录保留，不能写成 18 项限定通过或用原计划冒充实际排除。此限定运行不代表 v2 全文件或 `bazi-evidence` 全组通过。

`scripts/verify-bazi-engineering-binding-candidates.test.mjs` 已单独完整执行 8/8，exit 0、0.221 秒，无筛选或跳过；8 个实际输入及 4 个保护文件前后相同，见 QA `engineering-binding-eight-cb51702caa/summary.json`。它验证七条工程绑定与三个源码身份、九个 claim 链接，不等于 `current-governance` 整组通过，也不赋予作者、来源权利或专家资格。

requirements 历史依据另有固定 12 输入 ZIP：`scripts/fixtures/independent-source-requirements-v1-original-inputs.zip`，SHA-256 `01d97b68ce0ca1380feb72e72a2375e6e25507051301c4972c489639349833d2`。完整 requirements 九项与 current-independent-scoped 五项实际 14/14，见 QA `current-governance-ordinary-six-c800b80893/requirements-fixture-patch-mtpijlet/repository-application/verification-run1/summary.json`。原六文件 50 项运行的 40 pass/10 fail 保留，不改写为全通过；registry 原输入仍仅 52/53，缺 `docs/西洋星盘契约草案与来源门-v0.1.md`（20351 字节，SHA-256 `518116de8187893ddbe04542431681f6d17969e41b337988d189af6d977d9984`）。本轮源码归档补查仍未找到该 20351 字节原文。不能声称所有历史原件缺口已闭合，也不以较新版本替换固定旧输入。

保持 `legacy-v13 / targetSchema 13 / migrationId null`、fail-closed 与 mutation epoch。静态命令/Node 登记、各轮源码验证、C8/C9/C10 产物与独立夹具分别记录，最新七问见 [当前交付状态](delivery-status.md)。旧失败不改签，当前身份不匹配仍拒绝。默认 npm 治理红门、未整组 Node、T8 原始材料与硬 0 的可信资格消费缺口，以及 T9 完整 cross 合同、rollback 消费链、HTTPS 批准和真实旧产物部署/回滚，均不由本地诊断通过替代。
上一轮原件核对保留于 QA/remaining-delivery-gates-review-20260906/final-readback-after-doc-review.json。本轮最后读回见 QA/completion-closure-final-20260907/final-readback-after-doc-review.json，逐项检查 C10 原件、C10 归档与 C9 归档、保护文件、两工作目录和文档增量。

## 2026-09-07 完成性与子构建环境的实际验证

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


## 2026-09-07 T1 默认命令阶段消费

原npm run typecheck / npm test / npm run build现在进入固定lifecycle协调器。完整治理与获准正文分别记录，最终aggregate保留任何失败；build仍有原workspace prebuild。正式run-release-evidence-command三项raw receipt必须绑定本次实际报告，generator/verifier均读取它；不能把diagnose或缺失/旧报告代填成原命令通过。

| 原命令与QA入口 | 实际终态 |
| --- | --- |
| npm run typecheck；run3 | 正文PASS/3.139秒；治理FAIL/总1 |
| npm test；real-unit-r3 | 213/213文件、2803/2803测试通过；0项失败；正文PASS/224.886秒；治理FAIL/总1 |
| npm run build；isolated-default-build | 相同2131源码物理副本，workspace prebuild PASS、Vite PASS；治理FAIL/总1；unbound诊断产物未选为C10 |

详细原始日志位于QA/t1-default-lifecycle-e07dba93；源摘要4f2bfbe8db5a430309e62a92764e99bbce772c9a055fbc51f87b86bbd8804d6b。原Vitest127失败→1失败、夹具首次7PASS/1FAIL以及两次QA汇总问题均保留。默认maxWorkers2只调资源；夹具beforeAll仍真实生成，标题、断言、超时、重试和完整图不变。完整类型与原命令的正文结果不能称最终发布PASS。见既有[历史依据与产品补充](delivery-validation-20260906-history-and-product-closure.md)末节与final-readback-final.json；浏览器继续引用原C10范围。


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

原命令分别为 npm run test:e2e:cross-schema-v13-v16、npm run typecheck、npm test、node scripts/run-sw-two-generation-fixture.mjs、node scripts/run-sw-same-schema-aba-fixture.mjs，以及物理副本中的 npm run build；均保留现行原配置。


T6最终独立治理补充：首轮readback在SW运行时采集检查处实际exit1，原日志保留为QA/final-release-governance.stderr.log。该活动检查仍钉旧整SW摘要和旧FREEZE发送字面值；仅刷新当前整SW摘要，并同时核对protocol map的freeze名称与真实session.protocol.freeze发送。原只读challenge摘要、same路由、身份约束、单skipWaiting及所有未授权状态保持。两个明确普通合同2/2、独立node scripts/verify-release-governance.mjs退出0（QA/runtime-capture-active-sw-pin/validation）；未运行整Node组。完整类型/Vitest/SW6/ABA2/副本build之后的源差异仅此治理脚本及四份状态文档；原dfac回执、原cross的d5回执与旧产物都未重签。最终读回见QA/final-readback-r2.json。

## 2026-09-07 T9 正式证据文件读取

现有 `verify-release-evidence.mjs` 导出只读 `verifyReleaseEvidenceFiles`：`sourceRoot` 核源码/Git、包、策略与实际工具链，`boundFilesRoot` 定位保持原相对字符串的 Evidence、sidecar、dist、锁、raw receipt、阶段报告与浏览器摘要。只有当前支持合同被核验；两根归档结果不签发正式收据，`historicalApplicabilityAssessed=false`。原同根CLI保留默认参数、dirty/unbound诊断限制和外部 `wx` 写入，入口使用固定Node 24.16.0的 `import.meta.main`。

回滚原 `verifyArtifactIdentity` 产物组件实际调用同一reader，固定禁止dirty/unbound放宽，并比较除新核验时间之外的完整formal receipt投影。`verifyRollbackReleaseArtifactFiles`只导出这一个组件，未开放整体回滚入口。v1 CLI原五参数与四根隔离未变；其一个公共receipt根无法同时容纳两套A/B原布局，未知旧A合同不能猜测，因此八项准入仍全部false。

| 实际命令 | 范围与结果 |
| --- | --- |
| `node --test --test-reporter=tap --test-name-pattern '^release file replay ' scripts/release-evidence.test.mjs` | 独立run2：10/10 PASS，零fail/skip/cancel，76.209秒；全为普通合成文件合同。原run1为8/2，未覆盖 |
| `node --test --test-name-pattern '^(generator and verifier\|formal verifier receipt\|verifier recomputes\|formal JSON bindings\|default-v13 receipt policy and local allowances\|lifecycle receipts retain the original thirteen\|current unselected host\|a syntactically selected host\|formal receipt projection\|failure ledger)' scripts/release-evidence.test.mjs scripts/rollback-evidence.test.mjs` | 13项明确兼容合同通过；模式中的竖线是正则分支，执行时不带Markdown转义 |
| `node --test --test-name-pattern '^(release artifact identity lock detects any byte drift across browser evidence\|lifecycle receipts preserve a program pass after governance failure as an aggregate failure\|lifecycle receipts retain an authorized build precondition failure with a blocked program)$' scripts/release-evidence.test.mjs` | 两个既有helper的默认调用范围，3/3 PASS；模式竖线同上 |
| `node scripts/verify-release-governance.mjs` | 独立CLI exit0；不等于默认npm资格治理门通过 |

新测试逐条删除13个raw及3+5个嵌套文件，即使sourceRoot保有原副本也拒绝；两归档原路径/原字节、源码身份、package域、四个原浏览器回执的产物端点、诊断与CLI独占输出均核验。单产物rollback wrapper正例通过后删除unit raw，实际拒绝为 `FORMAL_RELEASE_FILES_VERIFICATION_FAILED`。没有运行真实release命令、浏览器、托管平台或数据回滚来生成这些合成输入；不计作现实T9。

QA根沿用 `C:/Users/Administrator/AppData/Local/Temp/hakimi-v13-approved-build-a53fb2e74e364e588e62001315717438`。生产审查、兼容/旧helper日志与最后读回在 `t9-release-file-reader-20260907`；新10项的原run1/run2及四源码前后SHA在 `t6-forward-activation-20260907-0f582e3a/release-file-replay-test-agent`。本轮应用runtime未改，未重跑完整Vitest、build或浏览器；沿用各自原输入范围，未重签为当前全门PASS。

## 2026-09-07 B2 当前源码的同产物浏览器验证

本节为最新本地运行；上文C10和各轮运行保留原范围。B2位于 `C:/Temp/hdt9b-bound-0907`，主仓库 `dist/web` 仍为C10。QA根沿用 `C:/Users/Administrator/AppData/Local/Temp/hakimi-v13-approved-build-a53fb2e74e364e588e62001315717438`；本轮目录为 `t9-bound-default-artifact-20260907-r2`，原布局归档在其 `artifact` 子目录。

B2绑定实际主仓库2131项源摘要 `553b3fbf43ff5a900897636c5c266efdac1f01faad298eb51fb2f09d2b81d0dd` 和原HEAD/dirty状态；副本不含 `.git`，不声称拥有原Git历史。Evidence ID `hre1-2a8d57b7f19f8eb77dcd8b74003abd67`，build `9e80b1c23a8c`，137文件；artifact `fc58211cbceb50f82d35c19b923ac4a40ade58dedd5c037ec1fa2f4dc2329331`，lock `9876d535787d35cbafb4a70d5a92867506e1a77c203049960e9ec41706c24c14`。构建后未再构建或改锁。

| 原命令 | 终态 | QA目录 |
| --- | --- | --- |
| `npm run diagnose:e2e:local-data-boundaries -- --reporter=line,json` | 18/18，255.755秒；独立诊断，无正式receipt | browser-local-data-run1 |
| `npm run test:release:boot-artifact` | 12/12，53.827秒；原strict门及raw通过 | browser-boot-run1 |
| `npm run test:release:backup-artifact` | 8/8，31.814秒；原strict门及raw通过 | browser-backup-run1 |
| `npm run test:release:pwa-artifact` | 2/2，36.387秒；原strict门及raw通过 | browser-pwa-run1 |
| `npm run test:release:web-v1-artifact` | 2/2，148.093秒；原strict门及raw通过 | browser-web-run1 |

四个正式浏览器命令由既有 `run-release-evidence-command.mjs` 包裹，分别使用原id `boot / backup / pwa / web-v1-flow`；原raw在 `tmp/t9-bound-browser-receipts`，严格摘要在其 `browser-results`。无正式配置/reporter覆盖，均无skip/retry/flaky；五组有覆盖重叠，不相加为42项独立覆盖。两个品牌均使用隔离资料目录。

B2原 `npm run build` 及 `npm run typecheck` 同样由原阶段入口执行，原raw/阶段文件在 `tmp/release-evidence-receipts`：build的workspace prebuild和Vite15.054秒通过；TypeScript3.064秒通过；两次资格治理均失败，aggregate与原命令exit1。未将程序正文通过写成总命令通过。本轮未重跑完整Vitest，2824项保留原dfac输入；原cross26、SW6、ABA2也不换成B2身份。

`independent-five-stage-readback.json` 已独立逐项重读实际命令、四raw、严格摘要、local JSON、四项产物端点、主仓/副本2131源文件、B2与归档137文件及旧C10，exit0/errors为空；SHA `14cc6680a1124eaf19a17bf89b3c3b1e43f1f932c8eba9f347905eecec61f986`。`receipt-archive.json` 记录12份raw/阶段/摘要文件按原路径原字节保存。没有签发全部13项正式发布包或部署许可。

## 2026-09-07 未知提交标题修正

T7八态审计从B2两品牌的真实native-abort outcomeText确认，默认v13未知提交标题仍显示Mutation epoch hold；现仅改data-management-page.tsx的一处静态标题为“写入暂停，等待核对”，保留所有状态与事件逻辑。现有组件单文件29/29通过，无新测试、标题筛选或放宽。

新物理副本 C:/Temp/hdt7-label-0907，2131项实际源摘要 645b2c5c6cd96848f95c8db30ee368c104c24cffbe8e8d76408008ae6fb0c51d，HRE hre1-a64fd5dba806ee53db61a20b3b26121b，build c5acd70c1999；137文件原锁 db0ae05f717ca52ba7a93aec486e95382f1a2fd4f1866a977b43017fb31af396。原 npm run build 阶段入口：治理FAIL、workspace prebuild及Vite正文PASS、聚合1；原 npm run diagnose:e2e:local-data-boundaries -- --reporter=line,json 为18/18，两个品牌各9、零skip/retry/flaky。仅运行受影响local组，四正式浏览器命令/完整typecheck/完整Vitest本轮未重跑。

QA根下 t7-unknown-write-label-20260907 保存build-summary、原build/phase收据、component-test-run1、browser-local-data-run1、八态审计与 independent-label-readback.json。新产物及原锁/构建收据在artifact；B2五组仍按原B2引用，不改为本次发布包。

## 2026-09-08 千问交付复核与P7

QA为 C:/Users/Administrator/Documents/Codex/2026-09-08/千问交付复核。原三稿及原工程JSON只读，官方GET只保存核验元数据。独立数值复算脚本为外部QA的 `复算检查.mjs`；结果36场景/9阈值无算术差异，不运行仓库算法或千问脚本。`source-hash-independent-check.json`记录两条固定修订与四条精确引文摘要，`gujin-page28-independent-check.json`记录官方固定修订1898854的完整目标匹配；不授予来源或权利许可。

唯一仓库测试命令使用 Node v24.16.0：`node node_modules/vitest/vitest.mjs run --config apps/web/vitest.config.ts packages/bazi-interpretation/src/index.test.ts --reporter=default --reporter=json --outputFile.json=<本QA>/p7-zero-factor-20260908-01/vitest-report.json`。这里的路径缩写只用于阅读，实际完整argv/cwd及环境在 `p7-zero-factor-20260908-01/command.json`；子进程TEMP/TMP为隔离的C:/Temp/hp7-0908-01，原配置maxWorkers2，无名称筛选/timeout/retry/skip覆写。

完整单文件34/34 PASS，原33项加新增1项合成零因素合同；0失败/skip/todo，正文27ms、Vitest总18.91秒、外层21.631秒，exit0。运行前后2131项源码摘要061de0de47325a0a173b11fc0aad5a8c7dbc58a93460073c982da4e4ec320621一致。summary.json的SHA-256为9e23e43e3a7d4e6725e0559ece3dea67b07e34752e19037cde4f681a875797ef，原前像、diff、34项执行名称、JSON/stdout/stderr与退出码均保留。它不构成本轮完整Vitest或新产物发布证据；之后仅追加本轮状态文档，旧构建/锁/current/准入保持。

本轮另执行现有只读 `node scripts/verify-release-governance.mjs`，exit0；命令及开始/结束时间在QA的governance-exit.json，stdout/stderr原件保留。该独立CLI通过不等于默认npm的资格消费门通过。

## 2026-09-08 迁移触发与派生面板修正

T4 QA：C:/Users/Administrator/Documents/Codex/2026-09-08/T4迁移触发补齐。原三文件前像、修前三模块不匹配、修后职责通配、完整路径合同10标题/日志/exit均保留。实际命令为 node --test --test-reporter=tap scripts/verify-migration-ci-paths.test.mjs 与 node scripts/verify-release-governance.mjs，分别10/10、exit0；无名称筛选，源码a245667c546610e4bd0323c04435848b349b273753fdf2987839b4801d620d57运行前后相同，未执行整组Node或远端CI。

T7 QA：C:/Users/Administrator/Documents/Codex/2026-09-08/T7派生只读文案。仅TSX两文案修正时source418a0c88454af302fbd66f9f7b09ab800588edff81d81c7ad45520c08abd6774，原组件完整6/6、4.762秒；原命令/JSON/日志在component-test-run1。第一次新copy C:/Temp/hdt7-derived-0908、build20c87bb0c8f6、137文件、原fe01锁及a917产物摘要在build-summary。完整既有local-ai-source-resilience.spec.ts两个场景×Edge/Chrome4项通过，67.978秒；原local18及B2正式四命令均未重跑或转签。

首轮只读visual-derived-run1保留innerText过早读取失败及服务已关闭终态；run2捕获到contentVisibility:auto时textContent已含新文案而innerText暂未包含，显式滚动到文案并等待可见后通过。其390px截图仍发现真实CSS级联错误，未把外层无横向溢出等同于三步内容可读。单行CSS修正原字节/差异在layout-fix；旧图和原断言通过记录保持。

最新copy C:/Temp/hdt7-derived-0908-r2，对应source a0a7c95b74e5c4eff80e69351a18234e284683f88dbc18ae3f89bce830075cbd，HRE hre1-fe550f335b9d1166535e59d0dbb5db13，build c15ef05bb165，137文件，lock 1403c9d765fff226b68d5b51e9cbe2c9cb724d7e3fc47893d3d3fa081d38227e，artifact d6774223f58104c78a88df7daef9c771b23a7dc854cf46de240fbe54a7da7cd6。每次默认npm run build都经既有run-release-evidence-command阶段入口执行，workspace prebuild及Vite正文通过、资格治理失败、原raw/phase总1；最新Vite14.02秒，原布局归档在layout-fix/artifact。源码/副本2131、依赖20258文件412450412字节及292内部链接前后核对，原C10/B1/B2/旧标签/首轮产物的保护锁均保持。

两次浏览器均执行原命令 npm run diagnose:e2e:local-data-boundaries -- local-ai-source-resilience.spec.ts --reporter=line,json，并先以同一完整文件参数执行--list确认4目标；原配置、300000ms spec超时、零retry及trace所有权未改，无--grep。最新4项实际终态、原inline附件、native snapshots与产物端点在layout-fix/browser-ai-source-run1；这是完整单spec而非完整18。独立readback逐项核当前/旧草稿、16分区无AI写入及受控503后ZIP预检。

最新layout-fix/visual-derived-run1是同产物只读复看，复用该轮自建合成profile，实际核URL/title、两个浏览器1280×720及390×844、零保存按钮、data-write-capability=read_only、native内容不变，以及三卡逐项宽度≥300px、同列且顺序纵向；另有面板和三步截图。使用既有Playwright（本会话无Browser专用skill）；预览仅运行原Vite配置body并先调用原锁核验，不冒充另一条正式npm回执。所有自有浏览器/服务关闭后4197连接拒绝。该观察不加到4项测试计数，未验证真实设备或callback保存模式。

来源QA：C:/Users/Administrator/Documents/Codex/2026-09-08/T8载体原件核验。metadata-check.json记录4既有载体官方HTTP200/ID/时间/大小/SHA1匹配；carrier-download-summary.json记录首个原件实际429、0字节，停止后其余3未请求，独立原件SHA-256为0/4。没有原件正文落盘、权利/专家/current更新或外发。当前七问仍保留52/53历史原件、0/12冻结、0/2真实专家及现实发布/回滚缺口。

最终状态文档更新后的现有只读release-governance CLI仍exit0；本轮QA根的final-governance-exit.json及原stdout/stderr记录该次执行，不替代默认npm资格门。

## 2026-09-08 c15ef同产物五组补验

运行根为既有独立副本 C:/Temp/hdt7-derived-0908-r2，沿用原c15ef产物及1403原锁，没有重build；个人使用的5188安装根未改动。原配置在4197启动严格独立预览，各组新TEMP/profile、原超时、零retry，无项目/文件/标题过滤。QA位于 Z:/HakimiBaziBackups/2026-09-08-local-review/qa/c15ef-same-artifact。

| 原命令 | 终态与范围 | 原记录目录 |
| --- | --- | --- |
| npm run diagnose:e2e:local-data-boundaries -- --reporter=line,json | 18/18，261.461秒；完整五spec，独立诊断 | browser-local-data-run1 |
| npm run test:release:boot-artifact | run1 11/12、总1；修复测试等待后run2 12/12、53.798秒、总0 | browser-boot-run1 / browser-boot-run2 |
| npm run test:release:backup-artifact | 8/8，32.763秒，strict true、exit0 | browser-backup-run1 |
| npm run test:release:pwa-artifact | 2/2，36.328秒，strict true、exit0 | browser-pwa-run1 |
| npm run test:release:web-v1-artifact | 2/2，151.955秒，strict true、exit0 | browser-web-run1 |

四个formal命令经原 node scripts/run-release-evidence-command.mjs --id <boot/backup/pwa/web-v1-flow> --output <新tmp目录下原id.json> -- npm run <原命令> 执行。原raw路径为 tmp/c15ef-same-artifact-0908，boot修复run2为 tmp/c15ef-same-artifact-0908-boot-r2；raw、browser-results与137产物/原锁在QA/artifact内按原相对路径归档。原--list身份与执行唯一集合一致，五组不相加为42项独立覆盖。Web只增加既有HAKIMI_QA_SCREENSHOT_DIR取证选项，无spec或reporter改动。

Boot首试Edge在旧v8连接关闭后重载的第4次evaluate采样遇到同URL导航，上下文被销毁，925ms即退出而非原超时耗尽。仅将 apps/web/e2e/database-v8-v9-upgrade.spec.ts:381 的 expect.poll(page.evaluate(...)) 改为 expect(page.locator("html")).toHaveAttribute("data-app-boot-ready", "true")，仍要求当前文档ready=true，原超时和后续完整迁移数据断言保留。[Playwright官方断言说明](https://playwright.dev/docs/test-assertions)。测试原文/补丁/摘要见boot-wait-fix。应用代码及已安装5188产物未改；run2测试夹具明确为2130原a0a7文件+一个固定测试补丁，不能当成原2131源码快照。

有效独立读回为 independent-five-stage-readback-run2.json，SHA b6e4bfbd3ebd4668e8ea3cec358a0a8bb9ee81ef97268570f1807e89650bcf44；local语义另重算102份快照。首份读回错误要求发现顺序等于调度顺序而失败，保留后以唯一身份集合核验；未重跑浏览器。补丁准备首试LF/CRLF前提不符，在写源码之前拒绝，也保留。既有证据和资格门未改签；未重跑完整typecheck/Vitest/build或签发13项全包。
