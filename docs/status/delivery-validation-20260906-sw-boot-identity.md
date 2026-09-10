# 2026-09-06 SW、启动身份与候选 9 验证归档

候选 9 本机产物验证已完成；默认 npm 治理前置、内容准入、远端 CI 与公开部署仍按各自结果处理。本页是普通工程证据索引，不产生新的 current 选择或发布权限。当前结论见 [交付状态](delivery-status.md)，命令层级见 [命令映射](delivery-command-map.md)。

实施目录为 `C:\Users\Administrator\Documents\哈基米算命`，基础 HEAD `b7216a301a74bea0591b364b4dba32aa34409378`；测试对象包含未提交源码，不能称该提交本身已通过远端 CI。默认仍为 `legacy-v13 / targetSchema 13 / migrationId null`。

下文 QA 相对路径均位于 `C:\Users\Administrator\AppData\Local\Temp\hakimi-v13-approved-build-a53fb2e74e364e588e62001315717438`。汇总入口是 [C9 local-validation-summary.json](C:/Users/Administrator/AppData/Local/Temp/hakimi-v13-approved-build-a53fb2e74e364e588e62001315717438/candidate-9/local-validation-summary.json)，其中保留原输入路径、SHA、独立运行及声明边界。

## C9 产物与源码身份

| 项目 | 实际值 |
| --- | --- |
| Evidence ID / build | `hre1-c8b8cff4d0514969b7a4e492445e67e3` / `1ab8f706fe78` |
| 源码快照 | 2104 项；sourceTreeDigest `11be5e3115cdf14728a5b90296bee9890bfb5af4bd84d2995fa594787de1258e`；QA `candidate-9/source-snapshot.json` |
| 实际产物文件数 | 137，由 C9 原锁读取 |
| Artifact set SHA-256 | `307f62f7193b0ff8203a342fc71eb87f45a251002d51475ff7e1b1beb91d9d3a` |
| Lock SHA-256 | `f6d4366a3b5ef7a379a3e2586fc8cc869fac7107115e3b74d6e71300cd5e0258` |
| 独立归档 | QA `validated-artifact-9/dist/web`、`release-artifact-identity.json`、`archive-verification.json`；原 live 产物仍保留，归档验证通过 |

`candidate-9/source-delta-before-docs.json` 记录文档收敛前源码差异为 0。文档修改前的三份旧文件及原 SHA 保存在 `candidate-9/documents-before/manifest.json`。文档后续变更与构建时源码分别记录，不重写 C9 source-snapshot 或产物锁。前后端点身份一致不是全程原子快照或期间无修改的证明。

## 当前源码与命令结果

| 对象 | 实际结果与原始证据 |
| --- | --- |
| 启动身份修复 | `app-boot-identity-fix-20260906/after.json` 与五份 diff：ready 核对当前已加载发布身份，生产环境不回填硬编码 v13；`pwa-build.ts`、`vite.config.ts` 将 HTML 根属性绑定实际 descriptor。默认发布代不变 |
| 普通定向验证 | 同目录 `focused-fixed.log/.exit`：3 文件、52/52、exit 0。首轮 URL 读取问题保留于 `focused.log/.exit`，修正读取路径后未放宽断言 |
| 完整 TypeScript | 同目录 `typecheck.log/.exit`：完整图、programStarted=true、passed、exit 0 |
| 当前工程 pins / closure | `boot-identity-current-pins/changes.json`、`runtime-closure-check.log/.exit`、`contracts.log/.exit`：current runtime closure PASS、4 个 fixture 静态合同 PASS；仅当前工程绑定更新，历史原件不改签 |
| 最新完整 Vitest | `boot-identity-full-vitest-run1/summary.json`、`stdout.log`、`stderr.log`、`exit.json`：213/213 文件、2795/2795 测试、exit 0、310.55 秒；原 full config/include/timeout，`--maxWorkers=2`，单次实际运行 |
| Vitest 输入与 C9 | 同目录 `inputs-before.json`、`inputs-after.json`、`input-comparison.json`：936 项前后一致。`candidate-9/vitest-source-binding-review.json` 逐路径比较：933 项与 C9 snapshot 原 SHA/长度一致、0 差异；3 个 `node_modules/vitest` 入口未纳入 source capture，原哈希另存。C9 另 1171 项在该有界账之外，不继承测试覆盖 |
| 最新默认 `npm run build` | `candidate-9/npm-build-lifecycle.log`、`.exit.json`：exit 1；history 25/77、current-index/status、draft boundary 后，3 个 source_requirements family 报 CURRENT_UNAVAILABLE；Vite 主体未启动 |
| 独立诊断构建 | `candidate-9/build.log`、`build.exit.json`、`built-manifest.json`、`artifact-lock-write.json`、`artifact-lock-verify.json`：exit 0、默认 v13 manifest 与 137 文件锁通过；不改写上一行默认生命周期红门 |

上述输入比较是有界路径的原字节对照，不是整个仓库的传递依赖闭包。Vite 弃用与测试环境 `Window.scrollTo` 提示保留在日志中，没有据此增加通过或失败统计。

## C9 同产物浏览器：五次运行、14 个目标

各行均为 Chrome/Edge 的实际终态；五行共 14/14，不是一次完整浏览器套件，也不包括后述独立 SW/跨 Schema 夹具。

| 阶段 | 结果 | QA `candidate-9/` 内原始记录 |
| --- | --- | --- |
| 连续业务 | 2/2，exit 0，strictGatePassed=true | `web-v1-run1.log`、`web-v1-run1.exit.json`、`web-v1-run1.receipt.json`、`web-v1-browser-result-summary.json` |
| PWA | 2/2，exit 0，strictGatePassed=true | `pwa-run1.log`、`pwa-run1.exit.json`、`pwa-run1.receipt.json`、`pwa-browser-result-summary.json` |
| 双标签与恢复事务失败 | 4/4，exit 0；0 skipped/unexpected/flaky | `boundary-run1.log`、`boundary-run1.exit.json`、`boundary-playwright-report.json` |
| 正式只读恢复 | 2/2，exit 0；0 skipped/unexpected/flaky | `readonly-run1.log`、`readonly-run1.exit.json`、`readonly-playwright-report.json` |
| T7 草稿与来源故障 | 4/4，exit 0；0 skipped/unexpected/flaky | `t7-run1.log`、`t7-run1.exit.json`、`t7-playwright-report.json` |

每阶段的 `*-run1-artifact-before.json`、`*-run1-artifact-after.json` 绑定上表 C9 身份；辅助工具另存原 before/after。汇总逐项读取退出、报告、复制来源 SHA 与端点，独立归档也验证了同一 137 文件原锁。

T7 保留真实 R1 正例→R2 拒绝未改写的旧 R1 草稿→R2 正例，以及 1280/390/320 宽度断言；来源页面受控 503 后本地创建、ZIP 下载与恢复预检可用。来源 503 不证明 Provider 降级或真实外部可用性。只读恢复限于正常 UI 创建的 v13 数据和受控路由资源失败，不证明未知旧库或整个 origin 写锁。PWA 的合成安装事件不证明操作系统实际安装完成。

## 独立夹具与保留历史

| 证据对象 | 原始结果、路径与边界 |
| --- | --- |
| C8 原产物 | `candidate-8/local-validation-summary.json`：同产物五次运行 14 目标；ID `hre1-b2a7e5f3174fe242bb3ce1a2cd25252d`，build `3b7218ff5ac4`。`validated-artifact-8/archive-verification.json` 验证其 137 文件及原锁 `d1f5539918e103b8e0303adbe690179fa0b6fd2c9979068d15fd6780a85abfba`。它不包含后续 SW/boot identity 修复，未改署 C9 |
| 早期失败 | `C:\Temp\h6sw-6f3a9c24` canonical 1/6；`C:\Temp\h6sw-e8423b7a` 3/6；`C:\Temp\h6cs-7fb8fe48` 2/4。原失败、产物与诊断保留，不由新结果覆盖 |
| 旧 SW/ABA 成功 | [6cb31fe9 汇总](C:/Temp/h6sw-6cb31fe9/completed-run-summary.json)：旧源码 canonical6/ABA2 及 build/canonical/rollback/verify 边界通过；旧 SW21 canonical `7ea8ad20c20ef01f5f5acdcb7e5411fa4b7447695b6b38b703cc8aa0dd7d164c`，不冒充后续身份修复后的源码 |
| 当前 cross4 | [22824ab3 汇总](C:/Temp/h6cs-22824ab3/cross-run-summary.json)、同根 `cross-playwright-report.json`、`test-boundary.json`、`verify-boundary.json`：4/4 与边界通过，2104 源码项不变。仅 A 页面退场后的富 v13→v16 写入/dirty→clean/cache，以及目标校验失败隔离/源可恢复两个场景×两浏览器；其余 11 场景/浏览器未执行，不证明同时存活旧页写栅栏或降级写回 |
| 当前 SW6/ABA2 | [39f0c6bd 汇总](C:/Temp/h6sw-39f0c6bd/completed-run-summary.json)、同根 `canonical-fixture-summary.json`、`aba-playwright-report.json` 及四份 `*-boundary.json`：build3、canonical6、真实 worker A→B→A 两项、final verify 全部通过，2104 源码项不变；当前 SW21 canonical `2f902de5d4628bfc73e756bb65925a17ba2d9ccd2e0d8c165bc72eace523a36d` |
| 旧完整 Vitest | C6 212/2752 见固定归档；`sw-request-receipt-full-vitest-run2/summary.json` 为中间 SW 修复的 212/2754、935 输入稳定。`sw-request-receipt-full-vitest-run1` 因不支持 `--minWorkers` 停在 CLI，测试主体未开始。均不替代当前 213/2795 |

当前 cross/SW 是单独生成的本地夹具，运行时保护当时的 C8 产物；不能改写为 C9 默认产物的跨代验证，也不证明真实历史分发产物兼容、HTTPS 部署或公开发布。

## 1222–1224 验收的实际覆盖

下列普通单测属于本轮完整 Vitest 的配置范围与源码对照；浏览器范围按连续流程及恢复 spec 的实际断言限定，不因总数而扩大。

| 条款 | 精确证据与限制 |
| --- | --- |
| 1222 空状态 | [dashboard 单测:82](C:/Users/Administrator/Documents/哈基米算命/apps/web/src/pages/dashboard-page.test.tsx:82) 核对空白、演示、CSV 入口。[连续流程:1524](C:/Users/Administrator/Documents/哈基米算命/apps/web/e2e/web-v1-continuous-flow.spec.ts:1524) 清空后及 1540 起的新 profile 数据页核对 16 分区全 0；该 spec 已在 C8/C9 实跑。不是所有主要页面首次空态的逐页浏览器证明 |
| 1223 非法备份 | [backup 单测:2226](C:/Users/Administrator/Documents/哈基米算命/packages/backup/src/full-backup.test.ts:2226) 严格 UTF-8 拒绝；2409 起摘要不一致写前拒绝且 clear 未调用；2184 起关联错误拒绝且 destination snapshot 不变。C8/C9 合法 ZIP 往返与这些契约证据分开；非法 CSV 行不能代替非法 ZIP 浏览器提交 |
| 1224 重复操作 | [数据页:1180](C:/Users/Administrator/Documents/哈基米算命/apps/web/src/pages/data-management-page.tsx:1180) 同步提交闸、1011 操作锁、1038 提交后锁、1047 清除 pending restore 已有实现。[数据页单测:441](C:/Users/Administrator/Documents/哈基米算命/apps/web/src/pages/data-management-page.test.tsx:441) 覆盖重复安全下载重置确认，619 起覆盖未知恢复锁写/单次调用，1071 起覆盖提交后处理失败。C8/C9 boundary 与连续流程有恢复、重开和 payload 往返证据；执行中或已完成后的直接 double-click 浏览器断言未执行，不宣称该完整场景已覆盖 |

不为测试计数新增平台或重复相同全量测试。初次 [T7 八状态审计](C:/Temp/hakimi-delivery-audit-20260906/t7-state-coverage.md) 是当时快照，其时间性缺项由本页当前证据补充，旧文件不改写。

## 仍未取得的完整门

3 个 source_requirements family 不可用；三个 Node 组未整组运行，动态攻击重现用例未执行；远端 exact HEAD CI 未验收。历史 v2 manifest 的 11 项 BOUND_READINESS_BASIS_DRIFT 保留，缺少 39,595 字节、SHA-256 `9e6420e8c6c5b3aafd892fdb3c5363af81ea9d9e24ebff6e11897300053524b0` 的旧 knowledge-core 原件，不伪造或替换 pin。

真实材料冻结仍 0/12，独立专家仍 0/2，current expert 未选定；结构原件计数不等于资格、真实性或独立性。真实旧发布兼容范围和 HTTPS 所有者批准、部署/回滚证据仍缺。当前本地验证完成不提升这些权限，也不将外部缺项扩展为新的工程空包。

[C6 固定归档](delivery-validation-20260905-candidate6-baseline.md) 保持原字节与索引 SHA；本页仅补充后续记录，不修改历史签名或已签摘要。
