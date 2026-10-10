# 本地交付目标与验收台账

## 后继候选包准备摘要 · 2026-10-11

**`f0430d400b64 / package revision 1` 已完成独立安装包与隔离验收，尚未启用。** 来源为 PR #16 的 `2482941f46acafc6fe0b331f536db06a45710fc8`，打包工具为 `3adab36e0452a827ac5e65ea1be0676bc3cf6b5b`；复用已验的 137 文件应用和原锁，零重建、零重签。149 文件安装包、实际 ZIP 解压复验、原 Windows 安装器两份独立副本、安装合同 18/18、隔离启动器 4/4、ZIP 安装副本 Edge/Chrome 10/10 均通过；旧 ab0 合同另为 18/18。逐字节服务验证 136 文件，并在同一临时端口核对应用壳/服务回退。

完整 SHA、清单与 ZIP 摘要、严格输入/拒绝合同和剩余验收见 [本批交付记录](./local-candidate-f0430d400b64-20261011.md)。后继分支为 `codex/event-index-candidate-20261011`，Draft PR 的 base 保留 PR #16 工作分支；应用源码与后继工具/交付 head 分别记录，旧 2482941 CI 不转签到新 head。

日常 5189 仍归属用户已批准的 **ab0 / 修订 1**，本人使用 **Codex 内置浏览器**；原包、四个相关桌面入口、5188 和资料空间保留。当前本批只在独立验收根安装 f043，没有切换入口、迁移/恢复真实资料、合并 main 或公开发布。新包的启用操作另见 [f043 安装说明](../../LOCAL-EVENT-INDEX-CANDIDATE-INSTALL.txt)，需在单独选择后保护实际浏览器当前备份；直接应用回退对象是现用 ab0。

## 当前启用验收摘要 · 2026-10-10

**`ab0f35c0d9d1 / package revision 1` 已在本人 5189 启用，本机最小现场验收通过。** 用户在完整备份可读且预检通过后，单独批准本包切换及新增明确标记的合成验收案例。实际浏览器为 Codex 内置浏览器；用户随后明确选择继续将其作为本人日常 5189 资料入口。该资料空间不自动共享给桌面入口所调用的系统默认浏览器。正常重新载入已确认清单仍为九条记录、ab0/Schema 13 与控制器确认；没有转移资料或更改桌面默认浏览器。

| 对象 | 本次实际结果 |
| --- | --- |
| 冻结产物 | 应用源码 `564f88e7f47844d10e26bbc79c34e1ce48edf77a`；工程/工具基线 `c77c90cf16a69b1085f8bd62bc95bd8e7dfdb29e`。仍为 `legacy-v13 / Schema 13 / migrationId null`，137 个应用文件、152 个包文件；验收期间没有重新构建。 |
| 原锁、包清单和 ZIP | 原锁 SHA-256 `78ab59d932cbfec75c63a2f94eaa91f7ae24e2a066eaaaa54a210e8e9773ecc9`；包清单 `27c836c924745939d6e68e68192a7f697592496a84bf182c1a0bafe008cfb8f4`；安装 ZIP 2,428,913 字节、SHA-256 `6cd9c78c6973696b93661225e323c7b2c2373ab7b9ff27eb3382bd71c7d92870`。安装后完整包再次逐文件核对一致。 |
| 资料保护 | 启用前实际浏览器完整 ZIP 已落盘、解压可读并只读预检；切换前再次确认摘要一致。最终备份中的原五条记录按精确 ID 和完整规范化记录 SHA-256 与原备份核对，均未改变。没有执行恢复、清库或真实资料更正。 |
| 入口和服务 | 已保存的 Candidate (5189) 入口指向 `ab0f35c0d9d1-package-v1`；新服务仅监听 `127.0.0.1:5189`。核对快捷方式属性、对应原生启动器启动及重复调用，同一进程被复用；没有把启动器调用表述为实际桌面双击。5188 的原入口及监听状态未变。 |
| 实际页面与控制器 | 初次更新保留旧缓存页面并冻结写入；正常重新载入后，实际页面构建与工程证据标识匹配新包，Service Worker 已控制页面并完成对应构建确认，启动就绪、写入冻结解除。没有手动注销控制器或清缓存。 |
| 合成来源编辑 | 仅新增一条明确标记的合成案例及其初始修订、笔记、事件，共四条记录。笔记、事件分别只追加第三条来源、只更正第二条来源，四次独立保存；重新打开后来源数组、内部顿号/逗号/分号/换行、正文、标签、记录 ID 与修订关联均一致。 |
| 实际导出与预检 | 验收后实际完整 ZIP 可读，内容核对原五条记录与四条合成记录；页面显示“预检通过，尚未写入”，导入/当前 payload 摘要一致、十六个分区差异为零。取消恢复，无写入。浏览器回执为 requested，物理文件核对另行完成，不冒充平台确认写入。 |
| 旧包与回退 | 原 `8f67`、`4de42`、`fbe` 包逐文件核对未变；原 5189 入口已保留并额外备份。直接应用回退对象仍为 `8f67be033617-package-v1`；应用回退不得自动导入旧备份覆盖后续研究。 |

本机原始执行材料保留在 `%USERPROFILE%\HakimiBaziWorkbenchCandidates\validation\20261010-ab0-activation-061032\`，包括 `ACTIVATION-ACCEPTANCE.txt`、`completion-audit.json`、`final-installation-state.json`、`final-ui-preflight.json` 及原始失败/过渡观测。真实备份、案例内容、原记录 ID、私有 payload 摘要和指纹不提交 GitHub；本节只同步工程身份及结果摘要。

第二台 Windows、新包人工原生保存弹窗、真实更正后的新修订仍未测；用户暂无更正，保留原盘。来源移除、100 行/500 字符边界及完整键盘焦点矩阵属于后续非阻断补强。现场窄视口部分操作使用键盘 Enter，不宣称完整鼠标或响应式交互矩阵通过。

个人本机启用完成不改变正式专家、来源权利或公开发布状态；资格凭证加载器与独立原始意见仍有缺口。PR #14 保持 Draft、原 base 不变，没有合并 main、公开安装 ZIP、提升 Schema 或修改机器 current-index。以下工程准备及各日期快照保留原时间和输入；其中“尚未启用”仅指当时状态，不能代替本节。

日常打开方式及资料空间见 [README](../../README.md)。[候选安装与回退说明](../../LOCAL-CANDIDATE-INSTALL.txt) 保留原包说明；**安装说明保留打包时的启用前快照；本人当前启用状态以最新现场验收摘要为准，其他机器仍须独立完成批准与验收。** 包文件、安装 ZIP 和清单均未修改或重签。

### f88718c 对应 CI 已终结

以下结果固定绑定 `f88718c548536251610da5e2e34b5de3e2b12089`，原始运行、日志和六份下载报告已核对，不沿用旧 c77 的通过：

| 运行 | 终态与核对范围 |
| --- | --- |
| [Quick CI 38042005696](https://github.com/TheDeadly-cat/hakimi-suanming/actions/runs/38042005696) | 已结束，整体 failure；12 个工程任务含工程汇总成功。完整 Vitest 214 文件、2862/2862，日志文件 38 项、程序退出 0；完整类型检查、默认 v13 构建及产物清单验证成功。正式专家及正式汇总失败，仍为 `EXPERT_QUALIFICATION_RECEIPT_LOADER_UNAVAILABLE`，不写成全部绿灯。 |
| [Historical governance 38042005709](https://github.com/TheDeadly-cat/hakimi-suanming/actions/runs/38042005709) | 已结束 success；29 文件、825/825，登记文件集合及每条结果核对完整，失败/跳过/取消/缺失均为零。实际直接检出 f88718c。 |
| [Migration CI 38042005669](https://github.com/TheDeadly-cat/hakimi-suanming/actions/runs/38042005669) | 已结束 success；五个独立组共 45/45，六个任务含汇总成功。五份实际 results.json 通过原严格验证器：精确项目/标题完整，零重试、跳过或 flaky；checkout 回执均绑定本次 head。仍是隔离合成迁移诊断，`formalReleaseAuthorized=false`。 |

Quick/Migration 实际 PR 合成检出为 `03250e36a3097dff145458a38ee15fedb848aed4`；其 tree 与 f88718c 同为 `dfd124b1d2791423697c5e5e9f94dd67556daf65`，经 API 核对。源码身份不能代替本机 ZIP 字节验收。两项此前未结束的 CI 均已终结，无需为它们设置每小时监看；未重跑掩盖失败。

本次文档同步会产生后继提交，其自动检查按新 head 单独读取，不把上述 f887 终态转签。原始审阅包、其当时运行中/排队的观测和启用前材料均保留，不覆盖成后来成功。

## 2026-10-10 工程准备快照（10-09 来源完整性审阅收尾，启用前）

本批修复笔记、事件的来源引用编辑，并保留既有标签修复。旧 `fbe0180702f2` 的正文往返通过，不能证明编辑来源字段也无损；它的原包、回执和失败均保留。本批另构建 **`ab0f35c0d9d1 / package revision 1`**，不是给旧产物增加包装修订号。

| 身份 | 本批记录 |
| --- | --- |
| 应用构建源码 | `564f88e7f47844d10e26bbc79c34e1ce48edf77a`，tree `f77179fa2e50252b487b7b08035d2e766248f25f`。生产范围为来源数组表单、局部样式与受影响依赖；另刷新明确属于当前检出的历史计算运行时 sidecar。历史源锁、固定断言及 Schema 均未改。 |
| 应用产物 | `ab0f35c0d9d1`；`legacy-v13 / Schema 13 / migrationId null`；137 文件；evidenceId `hre1-8b9009e2be973f93113abb9fded99932`。 |
| 产物锁 | SHA-256 `78ab59d932cbfec75c63a2f94eaa91f7ae24e2a066eaaaa54a210e8e9773ecc9`；文件集合摘要 `45b1b94bedb1995f031cf025f25b349917dadabefc07916fca36b478c83c3459`。 |
| npm 锁 | SHA-256 `ceb0276477547cbf209e7937f9a5dcdc05a34ae21869af44b1f92825576c3e19`；Node `24.16.0`、npm `11.13.0` 保持固定。 |
| 浏览器测试工具 | `d17743faa178cbf9711334a337cf1f7089b07629`；追加、修改来源分两次独立保存。后续打包与治理工具变化另记，锁定应用没有重建。打包来源 `9b02e36` 的八个运行文件与最终工具提交仍逐项对照；实际 CI checkout 另外记录在本批 PR 描述和本机收尾记录。 |
| 安装包 | 152 文件；清单 SHA-256 `27c836c924745939d6e68e68192a7f697592496a84bf182c1a0bafe008cfb8f4`。ZIP `hakimi-ab0f35c0d9d1-package-v1.zip`，2,428,913 字节，SHA-256 `6cd9c78c6973696b93661225e323c7b2c2373ab7b9ff27eb3382bd71c7d92870`。 |
| 已保存入口和回退 | 桌面 Candidate 快捷方式仍指向 `8f67be033617-package-v1`。本轮未打开真实浏览器确认当时运行版本；启动验收只使用独立端口。旧 `8f67`、`4de42`、`fbe` 完整清单/文件与两份桌面快捷方式保留。5188 固定 `c15ef05bb165` 不动。 |
| 权限 | 本轮验证工具获准只读访问 `local-user-data-cleanup.ts`，未手动检查、修改或公开其内容。未取得新包启用、main 合并或公开发布授权。 |

来源不再从数组拼入单行输入框再按标点拆回。现在每条来源一个编辑框，复制原数组进入草稿；保存按条去除首尾空白、忽略空框，内部标点和换行保留。沿用最多 100 条、每条最多 500 字符及仓储去重/校验规则；不批量重写旧资料。合法标签内顿号继续保留，标签语法未扩宽。

同一锁定产物的 Edge、Chrome **2/2** 检查分别执行：正文独立保存两次；标签独立保存一次；只追加第三条来源；只更正第二条来源；三次原生关闭并重开。逐项比较笔记/事件 ID、修订与节点锚点、标签和来源数组。取消后十六个 store 不变；真实 IndexedDB `put` 前中止事务的保存失败也保持十六个 store 不变，并出现“写入结果未知”锁定。最终实际 ZIP 完整 payload 只允许这些明确编辑字段变化；预检零写入，第二个全新隔离 profile 恢复后十六个 store 与 payload 摘要一致。测试资料全部为合成案例。

桌面和 390px 来源编辑截图已检查，无横向溢出。长表单截图会捕获当时的固定导航，故另核对窄屏保存/取消按钮实际可操作位置，并保存完整视口截图；这两次试点击不产生额外保存版本。PWA 安装性及离线深链冷启动 **2/2**，下载、实际 FileSystemFileHandle 改名/取消、千案例备份与持久重开矩阵 **12/12**，均零重试、跳过或 flaky。自动替代系统选择器仍不等于人工 Windows 保存弹窗验收。

失败诊断改为统一保留首错、诊断错误、清理错误和生命周期附件错误；截图失败不阻止后续附件，最终附件失败也不会覆盖原操作错误。六项故障合同覆盖截图、附件、诊断枚举、关闭与最终证据失败及 falsy 抛出值，不吞掉清理失败。

### 依赖审计归因与限定处置

10-09 在旧 `3e17fea` 锁下，全部审计为 **6 个受影响包条目（4 moderate、2 high）**，生产审计为 **2 moderate、0 high**。同一 advisory 在 Vitest 与 mocker 有两个包条目；这个数量不是六个已证实可利用漏洞。完成以下范围内升级后，`npm audit --json` 和 `npm audit --omit=dev --json` 都为 **0 告警、退出 0**。四份原始 JSON、依赖链和前后锁差异保留。

| 依赖链/表面 | 原版本 → 新版本 | 告警与本项目触发条件 |
| --- | --- | --- |
| 生产 `@hakimi/backup → fflate` | `0.8.2 → 0.8.3` | [畸形 ZIP64 解压循环](https://github.com/advisories/GHSA-px8p-9vwx-vf98)。现有备份路径在 `unzipSync` 前拒绝 ZIP64 sentinel/额外字段；保留这些检查并升级补丁。 |
| 生产 `@hakimi/tzdb-core → moment-timezone` 当前/2025b → moment | `2.30.1 → 2.31.0` | [非字符串 locale 路径遍历](https://github.com/moment/moment/security/advisories/GHSA-4p3w-j4w9-5jqw)。支持路径使用 Zone/zone 查询，没有建立不可信 locale 对象输入路径；两套时区包、数据及适配器保留。 |
| 开发 Vitest/mocker | `4.1.10 → 4.1.11`（匹配全部内部包） | [独立 mocker 重定向读取](https://github.com/advisories/GHSA-82fw-gwwq-j7x9)。本项目 jsdom run 配置不启用相应独立服务，静态交付包也没有该服务器。 |
| 开发 Vite/PostCSS、jsdom/css-tree → source-map-js | `1.2.1 → 1.2.2` | [恶意 indexed source map 偏移导致阻塞](https://github.com/advisories/GHSA-68fv-2mgg-jv7q)。生产安装包不复制 node_modules，也不提供 source-map 解析入口；构建/测试表面仍做补丁升级。 |
| 开发 jsdom `30.0.1 → npm undici` | `8.9.0 → 8.11.2` | 原 JSON 包含 WebSocket、响应/缓存、重试及 [BalancedPool TLS 选项丢失](https://github.com/nodejs/undici/security/advisories/GHSA-w293-vg96-wgc3) 等条目，修复阈值为 `8.10.2`。配置相关的工具网络可达性未做运行时漏洞验证，静态归因保留 `needs_review`；受影响 npm 版本已替换。 |

锁只变更 12 个受影响 node_modules 条目及根/backup 清单对应元数据；意外带入的无关更新已撤回，Vite `8.2.0 / web 7.3.6`、PostCSS `8.5.25`、Rolldown `1.2.1` 保持基线版本。最小锁上的 `npm ci` 成功；未使用 `audit fix --force`。当前运行时 sidecar 因根清单和 moment 身份变化而重建，源锁及冻结历史材料未重签；相关包合同 **44/44** 通过。

这是针对原审计条目的静态归因及依赖维护，不是整仓安全扫描或已证实攻击复现。Node 自带 undici 仍为另一身份 `7.25.0`，没有随 npm undici 升级；零 npm 告警不能证明该内置组件或整个运行环境不存在风险。

### 本地产物和安装证据

原始日志、实际合成 ZIP、前后失败、截图和通过结果在本机 `HakimiBaziWorkbenchCandidates/validation/20261009-source-integrity/`。包只包含应用、八个安装运行文件、原锁和五份原始浏览器结果，不包含 profile 或私人案例/备份。计数摘要不含产物身份时可能与旧结果字节相同，必须同时读取新运行日志中的锁和原始详细结果；不能单独转签摘要。

| 执行 | 本批结果及文件 |
| --- | --- |
| 完整类型检查、完整 Vitest、默认 v13 构建 | 程序退出 0；**214 文件、2862/2862**。正式 npm 生命周期聚合仍为 1，独立原因是 `EXPERT_QUALIFICATION_RECEIPT_LOADER_UNAVAILABLE`。`typecheck-repaired.log`、`full-vitest-repaired.log`、`build-repaired.log`；测试调整后的完整类型检查程序亦退出 0（`typecheck-final-program.log`）。 |
| 研究日志/写锁合同 | 日志 **38/38**；日志与写锁 **47/47**。浏览器关闭、profile、报告器、首错与测试清单合同 **46/46**；包身份调整后的首错/探测合同 **12/12**。 |
| 同锁浏览器 | 日志 **2/2**，下载 **12/12**，PWA **2/2**。`journal-browser-mobile-actions.log`、`journal-browser-mobile-actions-completeness.json`、`persistent-delivery.log`、`pwa-run.log`；原始输出在相应 `*-browser-evidence/`。 |
| 完整包/ZIP | `package-created.json`、`zip-extracted-verification.json`、`zip-sha256.json`；打包逐字节复制，无重建。实际 ZIP 解压后完整清单相同；另从解压目录运行原 Windows 安装器到第二个独立根目录。 |
| 安装集成和原生安装 | **18/18**（`installation-contracts/results.json`）。原 PowerShell 安装器 `-NoShortcut` 首次安装及重复只读复用均通过，`native-install-first.json`、`native-install-second.json`、`native-install-from-zip.json`。 |
| Windows 原生启动器 | 临时端口 `61104` 上 **4/4**：冷启动、同 PID 复用、未知监听拒绝并保留、坏包零启动。仅映射库中一处 origin 和启动器七处端口字面量，并更新一次性副本清单；应用、锁及正式包不改。`native-launcher-results-v2.json`。不是 5189 现场回执。 |
| 实际安装服务与回退 | 136 个可提供应用文件逐字节匹配，`_headers` 正确拒绝。旧 `8f67` 应用壳/服务在同一临时端口 `61108` 验证回退；原包保留，未开真实浏览器或恢复旧数据。`installed-and-rollback.json`。 |

首轮全量验证曾因当前运行时 sidecar 未刷新而阻止构建，并发现已有写锁夹具在 drain 后继承 `active=false` 的 Dexie 事务。只用既有 `Dexie.ignoreTransaction` 隔离那两次独立测试写入，保留锁错误断言并增加零记录断言；没有修改写锁运行时。首轮浏览器中事务工厂故障注入被 Dexie 缓存绕开，合成保存确实发生并令测试失败；改为活跃 store 的原生 `put` 前中止后通过。最终执行另一次遗漏显式 evidenceId 的调用被入口拒绝，记录保留；补齐身份后两浏览器通过。所有失败均未改成通过或移除。

### 依赖升级后的新版本机械绑定

首个推送头 `9b02e36` 的 [Quick CI 37958856652](https://github.com/TheDeadly-cat/hakimi-suanming/actions/runs/37958856652) 已终结：类型检查、214 文件/2862 项 Vitest、默认构建、产物及其余工具检查通过；八字 current manifest 和 current-index 检查因 `COMPONENT_FILE_IDENTITY_DRIFT` 失败，工程汇总因此失败。实际 checkout `6ab4dc23c2e769735926bb99178aa27a397c52c6` 与 source tree 都为 `93d4d92389dda2085979208c433c0301324dd599`。该远端独立构建为 `84ea9a7a83d9`，不是本机锁定 `ab0` 包的逐字节证明；正式专家及正式汇总仍失败。原日志全部保留。

直接原因是 v2.3 清单绑定旧锁 `176276 bytes / fd94ca9b…`，本次审计限定升级后的锁为 `176278 bytes / ceb02764…`；其余 27 个独立组件文件一致。用户随后明确授权“建立新版本工程绑定并复验”，没有扩展专家、发布或启用权限。

新 **domain manifest v2.4.0** 只更新 `execution_rules` 下的锁文件身份及后继元数据，报告合同、解释规则、来源、权利、专家计数和所有 authority 字段保持原值。新清单为 23347 bytes，SHA-256 `d630c555ec7441a7547d49878e25aac4d6d9481d929178f8369937a282b66689`，manifestDigest `7984b2304c0e7b25dfc8f3c23229de68129fb3fdf4d8847adb83e0ba400f2d0a`。新 loader 重验全部 28 个组件，拒绝旧锁、普通对象/clone 及自行重算摘要的权限提升。历史 v2.3 原文件和 verifier 没有改签；它在真实当前检出上仍应拒绝旧组件绑定。

原八项 v2.3 测试的断言和标题原样保留，只把输入根改为隔离的原始字节上下文；旧锁来自 `3e17fea` 的精确 Git blob，校验 archive 与单文件后作为数据读取，不执行或安装旧依赖。其他 27 个组件先核对未变。新 v2.4 六项测试单独验证当前绑定与拒绝边界；当前选择测试仅把明确的当前版本/计数预期更新为新值，没有放宽历史或失败断言。

当前 index 显式选中 v2.4，保持其余选择和非版本化专家包不变，raw SHA-256 `ae93fc41599aa01b865be20b4e8a03ac81c49452e03dce744336045cf8a6da64`，indexDigest `99810764c3f9b9ed900207b8b5860ccf86752454359ce37613a3061e041a33ba`。既有 writer 仍只重建登记并固定身份的选择，不按最新文件名自动提升。首次直接改选择版本被 `INDEX_RAW_DRIFT` 拒绝；改为核对原 index、只构造获授权的 domain 选择与新 checkpoint、固定新身份后，由原 writer 完整复验，未削弱这个拒绝条件。

增加 **history-checkpoint v3**，25 族/79 成员，保留 v1、v2 原文件；完整历史验证保留 v2 的 78 个成员。v3 raw SHA-256 `564d810dcb4e2f2e7864d9206887e8c6e23919ffd8eafde975cc79466eaa2a89`，checkpointDigest `7c2177c1179680b02a1a0162d51936ef02dd1ea49889e9a84824a4815cab0864`。当前投影与 README 由同一边界核对；一次过期投影预期拒绝和一项仍期待 v2.3 的当前 CLI 断言失败已保留并定向修正。

这些仓库治理工具与元数据不进入已锁定的 Web 应用或八个安装运行文件；本地包仍按 `564f88e` 应用、`9b02e36` 打包来源交付，不用后续治理提交冒充应用重新构建。当前与历史、工程与准入继续分别验证；本批最终远端运行在 PR 描述中固定绑定。

### 远端归属与保留项

[Draft PR #14](https://github.com/TheDeadly-cat/hakimi-suanming/pull/14) 继续基于 `codex/journal-tag-roundtrip-20260929`，继承 #13 并复用 #11 的打包器；本批普通快进更新其开发分支，不合入 main。该 PR 本批描述记录最终 head、实际 checkout/tree 与固定 CI 运行链接；本摘要的本地包不冒充远端重新构建的逐字节产物。

纠正旧状态：旧 `3e17fea` 的 [Migration CI 37026776207](https://github.com/TheDeadly-cat/hakimi-suanming/actions/runs/37026776207) 已终结为成功，五组与汇总通过；不再记为运行中。旧 Quick CI 实际 checkout `a780c8cd247a7e775c2244ffd6c460241411a8f2` 与旧 source tree 同为 `127a2030d104fba484713df8d0a3e50f71d91ea0`。这两项只属于旧提交，新 CI 按本批最终 head 另读，不借用旧通过。

正式专家门仍要求两名合格独立专家，绑定原始意见及合格意见均为零，资格凭证加载器不可用；既有来源权利门和公开发布门未关闭。本批工程通过不会改变这些状态。第二台 Windows、新包人工 Windows 保存弹窗、生产 5189 启用没有执行；用户没有真实资料更正，真实新修订保存保持未测、原盘保留。

候选已具备本地启用决策的工程证据。实际启用仍须用户对 `ab0f35c0d9d1 / 修订 1` 另行批准，并从实际使用浏览器导出和预检当前完整备份；步骤见 [候选安装说明](../../LOCAL-CANDIDATE-INSTALL.txt)。应用回退不能自动导入旧备份覆盖后续研究内容。

## 当前交付摘要 · 2026-10-02

本批范围是将 PR #13 已有标签修复交付为新的默认 v13 本地候选。下方各日期是原始历史记录；此前的“空资料库”“首次启用”“尚无真实使用反馈”不再代表现状。

| 对象 | 本批明确身份与边界 |
| --- | --- |
| 应用源码 | `32c54490b7ad08b59e4294d32d868fd2091707fe`，tree `e944dfc208b6a2608f3d02b10ef91f0af856842e`；继承 PR #13 `f43c7eb` 和 PR #11 `48fac10`。生产修改仍只有笔记、事件编辑标签的分隔符与占位提示；新增取消、失败和同产物回归。 |
| 新候选 | `fbe0180702f2 / package revision 1`，`legacy-v13 / Schema 13 / migrationId null`。evidenceId `hre1-ffb3f471c72833481fb1d4855f601fd8`；应用 137 文件，lock SHA-256 `2f783541be491e8c0fef93f6e083d4a65be8cf16b9353e2b6a8d84d46a8c93eb`，文件集合摘要 `8ebf902e9f430b2ddbf8fd88d5d1fa7f71d2950ea128106ae686be0f337af574`。不是旧 `8f67` 的新包装。 |
| 当前实际安装 | 5189 仍为 `8f67be033617-package-v1`，应用来源 `1205cda6067a56d3045bdbaf326dec79423d6a88`。用户已于 09-27 批准启用，09-29 完成真实研究保存和备份核对。现用安装尚不含 PR #13 标签修复。 |
| 回退保留 | 下一次切换的直接回退对象为现用 `8f67be033617-package-v1`；更早的 `4de42e9db980-package-v2` 继续保留。5188 固定 `c15ef05bb165` 不动。两个候选的完整清单和两份快捷方式均已核对。 |
| 权限 | 用户本轮仅授权验证工具只读访问 `local-user-data-cleanup.ts`；未修改或公开内容。没有下一产物的安装启用、main 合并、公开发布、专家声明授权。 |

本地 `npm run typecheck` 的完整 TypeScript 程序退出 0；`npm test` 的完整 Vitest 为 **214 文件、2860/2860**；`npm run build` 的历史源锁/运行时前置与 Vite 程序退出 0。三条正式 npm 生命周期的聚合退出仍为 1，原因是独立的 `EXPERT_QUALIFICATION_RECEIPT_LOADER_UNAVAILABLE`，未把诊断或程序通过冒充正式准入。研究日志定向 36/36；相关浏览器关闭、profile、报告器与探测 Node 合同 39/39。原始日志在本机 `HakimiBaziWorkbenchCandidates/validation/20261002-v13-tag-delivery/`。

新产物的同产物标签闭环 **Edge/Chrome 2/2**、既有下载/另存为/持久重开矩阵 **12/12**、PWA 安装性与离线冷启动 **2/2** 通过；零重试、跳过或 flaky。两个隔离资料空间的十六分区、完整备份 payload、案例/修订、笔记/事件 ID、锚点、标签和来源逐项一致。普通下载核对了实际保存文件；另存为自动化仅替代系统选择器，真实 FileSystemFileHandle 读写仍执行，不冒充人工 Windows 弹窗验收。

首次两浏览器尝试停在下拉框标签定位；第二次及一次单浏览器诊断停在含原正文的 textarea 精确标签定位。截图确认编辑界面和记录均存在，没有应用错误。原失败、诊断、截图及通过结果全部保留；修正仅涉及测试工具，未重建应用。完整测试工具提交 `ed36887836fe50f82fa6347ed1306b8cc6abf353` 的 [Quick CI 37025161151](https://github.com/TheDeadly-cat/hakimi-suanming/actions/runs/37025161151) 已终结：工程聚合与各工程任务通过，正式专家及正式聚合失败。这一结果不自动转签给后续打包提交。

安装包共 **152 文件**，清单 SHA-256 `2b976ade0ef0c02077dfb2301962f0d85b4a037a0ff0b956c66cdb38a52684f4`；ZIP `hakimi-fbe0180702f2-package-v1.zip` 的 SHA-256 为 `e9a6af1ba3394b9f97e89f28f5e13d7d09429c2e6a3d485f55c3b187679f4486`。ZIP 解压复验与独立 Windows 安装副本身份一致，重复安装 `reused=true`。安装集成 **18/18** 通过；实际安装服务的 136 个可公开提供文件逐字节核对，另一个 `_headers` 文件正确不提供。

原生 PowerShell 启动器在一次性端口映射副本上 **4/4** 通过：冷启动、同 PID 重复复用、未知监听拒绝并保留、包身份错误时零启动。只映射打包库的一处 origin 和启动器七处端口常量，并更新测试副本清单；应用、原锁和正式安装包未改，端口为 `60073`，结束后仅关闭本轮所有进程。首次夹具正确拒绝损坏包，但测试预期的错误包装文字与 PowerShell 直接错误不同；原失败保留，修正断言并新增无监听检查后通过。这个结果不是生产 5189 现场启动回执。

新安装副本与旧 `8f67` 在同一临时端口 `59761` 完成应用壳/服务回退核对；旧包原字节保留，未打开真实浏览器或导入备份。现用服务、快捷方式及资料没有切换。安全启用和失败回退的具体步骤见 [安装说明](../../LOCAL-CANDIDATE-INSTALL.txt)。工程候选已具备用户启用决策所需本地证据；现场启用仍须单独批准。

| 本地执行 | 结果与原始记录（均在上述 20261002 目录） |
| --- | --- |
| `npm run typecheck`；最终测试调整后 `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json` | 完整程序退出 0；生命周期聚合 1（正式专家门）。`typecheck.log`、`typecheck-final-program.log` |
| `npm test` | 214 文件、2860 项通过；程序 0，生命周期聚合 1。`full-vitest.log` |
| `node --test scripts/local-research-probe.test.mjs scripts/owned-browser-shutdown.test.mjs scripts/persistent-file-delivery-reporter.test.mjs scripts/release-persistent-profile.test.mjs` | 39/39。`node-contracts.log` |
| `npm run build`；`node scripts/verify-built-release-storage-manifest.mjs dist/web --expected-channel default-v13`；`node scripts/release-artifact-identity.mjs --write --dist dist/web --lock tmp/release-artifact-identity.json` | Vite、前置、manifest、锁通过；build 生命周期聚合 1。`build.log`、`manifest.log`、`lock.log` |
| `node node_modules/@playwright/test/cli.js test --config apps/web/playwright.journal-tag-artifact.config.ts` | 2/2。`journal-browser-final.log`、`journal-browser-completeness.json`、`journal-browser-evidence/` |
| 同一 Playwright 命令，配置 `apps/web/playwright.persistent-file-delivery.config.ts`、`apps/web/playwright.release-pwa-artifact.config.ts` | 12/12、2/2；严格报告器通过。`persistent-delivery.log`、`persistent-browser-evidence/`、`pwa.log` |
| `node scripts/local-research-candidate.mjs package --artifact-workspace . --output <QA>/package`；`node scripts/validate-local-installation.mjs --candidate --package-root <QA>/package --output <QA>/installation-contracts` | 打包零重建，18/18。`package-created.json`、`installation-contracts/results.json` |
| 原 PowerShell 安装器 `-NoShortcut -InstallRoot <QA>/isolated-install` 两次；本机 `verify-launcher-isolated-v2.mjs`、`verify-installed-and-rollback.mjs` | 安装首次/复用、原生隔离启动 4/4、服务文件与回退通过。`native-install-*.json`、`native-launcher-results-v2.json`、`installed-and-rollback.json`、`zip-readback.json` |

合入关系：PR #11 基于整合分支；PR #12（旧包身份）与 PR #13（标签修复）都基于 PR #11。[本批 Draft PR #14](https://github.com/TheDeadly-cat/hakimi-suanming/pull/14) 继承 #13，复用 #11 已具备、与 #12 相同的打包程序，只重新绑定新产物身份。不要机械把 #12 旧常量覆盖到新候选；多个 PR 各自的通过也不证明任意合并组合通过。建议依次审查 #11、#13、#14，保留 #12 为旧安装归属；实际合入仍须针对最终合并结果验证和另行批准。

旧 main 仍为 `c2d18ca453971d3087abe53e21872cd707ea7d42`；最近定时 [Nightly 36936529679](https://github.com/TheDeadly-cat/hakimi-suanming/actions/runs/36936529679) 在这个 main 上失败。它不是本开发分支或 `fbe0180702f2` 的结果。本批没有改变 main、工作流目标、定时配置或失败通知。

保留事项按影响区分：正式专家资格、原始意见和来源权利仍阻断相应准入、专家声明与公开发布；同机隔离验收不能代替第二台 Windows。用户没有需要更正的真实资料，真实新修订保存继续记为未测并保留原盘，此项不阻断本批合成资料工程收尾。新候选启用须另获批准并从实际使用浏览器导出、预检当前备份；安装回退仅回到旧应用壳和服务，不能自动恢复旧数据覆盖后续研究内容。

## 当前交付摘要 · 2026-09-25

### c0f9fdc 联合结果与新页面启动诊断

`c0f9fdc87d192e30fa8e18b3fdd74afa4c9b883b` 的 [Quick CI 36044276117](https://github.com/TheDeadly-cat/hakimi-suanming/actions/runs/36044276117) 工程聚合通过，完整 Vitest 为 214 文件、2834/2834，无未处理错误；正式专家门独立失败。实际合并预览为 `ee72d85e6aadab49c30aea0eafc0d2c11cb43b47`，与源码 tree 同为 `82936acb941b4bd542ed4108cfeddfeb206ac008`，逐路径无差异。本地默认 v13 构建 `4955f5334a88`、类型检查正文、产物检查、CI 合同 74/74、包合同 44/44、发布证据 718/718、固定包副本隔离安装 18/18 通过。

同头 [完整历史 36044276000](https://github.com/TheDeadly-cat/hakimi-suanming/actions/runs/36044276000) 明确检出 c0f9fdc，远端与本地均为 28 文件、819/819；按文件、标题及同名次序逐项比较完全一致，保留 B 的 801 项、新增 18，删除／退化／跳过／取消／缺失均为 0。远端报告 SHA-256 `13294892597de6ec5b4cdc04f7bf223ffbc13d6788c4de07d66363de92f9231b`；本地报告 `3c759891e9bc62122886fb6d72e94279e899cdfa64815f6666708a9ada194967`。

[迁移 36044276249](https://github.com/TheDeadly-cat/hakimi-suanming/actions/runs/36044276249) 中，v13→v15 6/6、v14→v15 6/6、孤立恢复 4/4 已完成并逐项核对。v13→v14 为 2 通过、1 失败：全新页面的数据库已 committed、容量 admitted，但 SW 启动确认在原 25 秒内未出现。原 trace 显示尚无首次 controllerchange 的页面冻结标记，不能将其归为数据库提交失败或已确认的首次接管竞争。该组目标构建为 `f12b891f08b1`；v16 完整组和最终聚合按 PR 的固定运行结果读取，不提前写成 45/45。

一次原场景本地隔离观察通过，目标构建 `73b0f1196e13`；入口脚本 SHA-256 与远端同为 `48cafc7ead85f5441c8dbdc99a31b7131f6a99df2353711861b45d93a146a9a6`，但不能据此声称整个构建字节相同。本地安装到激活约 0.4 秒；远端 trace 没有完整的 worker 状态时间线，旧失败原因尚未确定。本次仅在现有新页面边界测试内记录浏览器产品、安装／激活事件及结束时注册和页面状态，并随现有产物上传；不修改应用、请求、接管权限、断言或 25 秒时限。加入记录后的同一原场景本地通过，不能替代原远端失败，也不能称为运行时修复。

### 慢审计运行时修复与本轮验收

针对下方已记录的续租逾期，完整快照继续在第一次异步等待之前同步捕获；随后按每批 250 条验证修订，在目标写事务之外让出页面任务。迁移 coordinator 在预校验完成后再次检查源冻结和容量准入，再按原事务权限执行原子替换，提交时 CAS 保持不变。

性能记录还确认每条修订重复创建／编译相同的验证规则。现在只按精确时区解析函数身份复用私有 schema 定义；每条记录的描述符、结构、规则及结果摘要仍重新验证，没有缓存通过结果，也不跨当前／保留时区规则复用。隔离万条页面的完整核验由约 39 秒降至约 20 秒；这只是定位对照，不替代迁移验收。

原双旧页万条慢审计场景已在 Edge `153.0.4234.48`、Chrome `154.0.8037.57` 各一次通过，零重试、跳过或 flaky。共同目标构建为 `7dfcf79f39f3`，两个页面均为 committed、BOOT_ACK=true、attemptCount=1；prepared 到 committed 分别约 72.5／74.0 秒。原 180 秒收敛断言、源数据与索引保留、旧页写保护、唯一目标检查均保留。完整测试时长还包含造数和断言，不能与收敛区间混用。结果 JSON SHA-256 `ea39b76406164fc98bb430d1601f7a98c073ce959892123647ac130239db200b`，本机目录 `C:/Temp/hakimi-v16-schema-reuse-original-both-20260925/`。

定向合同 31/31 和 coordinator／接管写栅栏 81/81、完整类型检查正文、历史运行时边界检查通过。新增合同覆盖捕获后调用方变更、晚修复无效数据、准备阶段不获写权限、并发目标 CAS、解析器身份隔离及每条记录重新验证。`c986fcc` 的远端 Vitest 虽然 2827 项断言通过，但两个接管测试留下异步导入，在环境销毁后产生未处理错误，工程聚合因此失败；现已让这两个测试等待真实构造初始化，不删除断言或压制错误。

上述两个慢场景通过不是完整 26 项或五组 45 项结论。完整默认图 Vitest、默认 v13 构建与产物、current-governance、五组迁移／恢复及相关合同继续归属本次修复后的同一源码提交；实际 head、检出身份和最终结果在 [PR #7 检查](https://github.com/TheDeadly-cat/hakimi-suanming/pull/7/checks)及其描述中核对。正式专家门独立保留，main、默认 Schema 13 和已安装的 5188／5189 均不变。

首个修复提交 `d32b330` 的本地完整 Vitest 为 **214 文件、2834/2834**，远端对应任务亦通过；默认 v13 构建 `4955f5334a88`、产物检查、包工具 44/44、固定包副本安装检查 18/18 通过。联合门同时正确发现现有 SW 夹具仍绑定修复前 coordinator／storage 的源码指纹，导致 CI 合同、发布证据及历史组不能完整通过，迁移工作流在浏览器执行前被拒绝。远端历史组保留失败；本地重复历史组在确认同一原因后主动结束，其部分结果不作为完整验收。

现只更新该当前夹具清单中这两个已修复文件的大小及摘要，以及清单摘要和模块自校验绑定；原 21 条路径、角色和其余 19 条绑定不变，未改写旧回执或历史测试内保存的原始身份。旧集合 `9d88c594…` 不能冒充新集合 `a34ddb48…`。绑定修正后的现有定向合同 **295/295** 与发布检查通过；仍需在最终提交上取得完整联合结果，不把这次绑定更新当成历史证据重签。

### 整合头 dc15e1d 的联合结果

已推送的工程源码基线为 `dc15e1d47e743bcfd008cf8e31c597c6d14a59d2`。以下结果属于这一源码身份，不能自动转移到后续修复：

| 联合检查 | 实际结果与身份 |
| --- | --- |
| [Quick CI 36021692429](https://github.com/TheDeadly-cat/hakimi-suanming/actions/runs/36021692429) | 工程聚合通过；完整类型检查正文、213 文件 / 2827 项 Vitest、默认 v13 构建及产物检查通过。CI 合同 74/74、包产物 44/44、发布证据工具 718/718。正式专家及正式聚合独立失败。实际 checkout `d493b5d918f83aac8df7a428e6783332ff6d637b` 与 source 的 tree 同为 `9c1c4855263f82ef776fc8d481e58c35f85d659f`，逐路径差异为空 |
| [完整 current-governance 36021692439](https://github.com/TheDeadly-cat/hakimi-suanming/actions/runs/36021692439) | 精确 source head 上 28 文件、819/819，失败／跳过／取消／缺失均为 0；保留 B 的 801 项，新增 18 项发布治理合同，删除和结果退化均为 0。本地与远端 819 项身份及结果相同 |
| [五组迁移与恢复 36021692431](https://github.com/TheDeadly-cat/hakimi-suanming/actions/runs/36021692431) | **43 通过 / 2 失败 / 45 已执行**。历史边界 3/3 + 6/6 + 6/6、只读恢复 4/4；v16 为 24/26，两个浏览器的首项万条慢审计均未收敛。严格报告器、完整性检查和聚合保持失败 |
| 本地工程与安装合同 | 同源码的类型检查正文、Vitest 2827/2827、默认 v13 构建及产物检查通过，默认构建 `d6bea35f4c1d`；上述 CI／包／证据工具合同亦通过。对固定包副本做隔离安装检查 18/18；原包及已安装应用没有替换 |

完整联合迁移验收尚未完成。远端 v16 日志已经核对，76 MB 失败产物下载因连接 EOF 未完整取得，不能声称已审过该产物中的全部控制日志。四个成功组的产物已下载核对。

### 09-25 早先定位记录（保留原失败）

dc15e1d 的单次本地双浏览器诊断为 Edge 通过、Chrome 失败，源／目标构建均为 `6ee914c98c54` / `b40fb1c9fece`。随后在隔离 Chrome 中增加临时观察，已直接记录到同一页面、requestId 和 migrationId 的续租时序：最后成功 ACK 的租期截止于 `1790267613053`；页面从 `1790267589576.6` 起出现 26,303 ms 长任务；下一次续租在 `1790267615887` 才发出，晚于已确认截止时间 **2,834 ms**，随后收到 `PROTOCOL_MISMATCH`。这证实了该次本地失败中的页面长任务与续租逾期，不能据此补写其他旧失败缺失的消息时序。

原始观察保存在本机 `C:/Temp/hakimi-v16-lease-observer-20260925/lease-observations.json`，SHA-256 为 `e6cb084104711411db3f28adbad7397c1572067599d81cff233b370c9c78b459`。观察没有改变原万条种子、故障注入、180 秒收敛断言、30 秒冻结租约、8 秒续租间隔或零重试。

早先本地尝试先引入分批验证和事务外预校验，尚未复用验证规则。其小型真实 IndexedDB 页面通过，但原升级场景仍失败；阶段观察确认预校验和万条目标写入完成，随后未完成目标完整性核验。当时未将该补丁提交为已验收版本。临时诊断代码和这些失败结果不作为工程通过或安装交付依据；后续加入规则复用后的新结果见上方。

该阶段观察中，预校验约 30.5 秒、目标写入约 9.9 秒、原子快照读取约 2.7 秒；后台核验未在原收敛时限内返回。单次 Chrome 原场景失败，journal 为 materializing、attemptCount 1、failure=null，尚未发送 BOOT_OK。该记录不能归因为先前另一补丁的 TransactionInactiveError，也不能证明后台核验永久挂起。对应本机结果为 `C:/Temp/hakimi-v16-integrity-stages-20260925/results.json`，SHA-256 `56e856d4bec6f7191d64119cce68a32dca14dfea965b15a27dafdc86b5cdf40f`；临时日志代码已移除。

### 已整合专题及保留边界

按新一轮审阅授权，三个已审查的精确头已依次纳入 [整合 PR #7](https://github.com/TheDeadly-cat/hakimi-suanming/pull/7) 的 `codex/local-delivery-integration-20260920`：B `879039ac1256106e3f4d4af9bfefe0017d36c273` → C `0cdcb50c3a3ab6d9b7babd1aaeb4adfe549685ad` → A `ae3b44cdfc6c4ff8c89a6d83bbbe8b711a2e2c2b`。三个合并提交分别为 `86c3e91`、`3e45497`、`5c7a0e0`，没有冲突。#7 继续保持 Draft，main 保持 `c2d18ca453971d3087abe53e21872cd707ea7d42`。

本轮联合验收归属 #7 的同一整合头：完整默认图类型检查、完整 Vitest、默认 v13 构建与产物检查、完整 current-governance、五组迁移／恢复及安装与 CI 合同。实际检出、逐项统计和原始产物以 [#7 检查](https://github.com/TheDeadly-cat/hakimi-suanming/pull/7/checks)及 PR 描述中的固定运行链接为准；下表为整合前专题证据，不能相加代替联合验收，也不把历史总数固定为 801。

五组迁移现在共同执行小型 JSON 完整性检查：核对预期浏览器和逐项测试标题，拒绝缺项、替换、重复、跳过、取消、异常、重试及减少执行数量。检查在浏览器失败时仍执行，原 v16 严格报告器及零重试保持不变。

| 本轮专题 | 已提交范围 | 验证归属 |
| --- | --- | --- |
| [A：迁移验证与失败材料 #9](https://github.com/TheDeadly-cat/hakimi-suanming/pull/9) | `ae3b44c…`；五组独立执行、有限并行、隔离上传和实际检出身份；历史拒绝／自然激活／新页面路径及恢复页修复 | 本地合同 256/256、类型检查正文通过。最终远端五组 **45/45**：历史边界 3/3 + 6/6 + 6/6、v16 候选双浏览器 26/26、只读恢复 4/4；零跳过、重试或 flaky，聚合通过。五份上传产物已下载核对；[完整运行](https://github.com/TheDeadly-cat/hakimi-suanming/actions/runs/35893945050) |
| [B：事实回执历史／当前合同 #10](https://github.com/TheDeadly-cat/hakimi-suanming/pull/10) | `879039a…`；98 个固定原输入、维护中的验证器与生产者重放、明确的 historical-v1 入口 | 本地 Windows 与[远端完整历史组](https://github.com/TheDeadly-cat/hakimi-suanming/actions/runs/35892399989)均为 **28 文件、801/801**，零跳过、取消或缺失。对照原 795 项：删除 0、旧七项失败全部关闭、其余 788 项不变、新六项通过；原九个回调逐字节相同。实际 current 入口仍拒绝历史成功；定向事实与导入边界 103/103，默认构建通过 |
| [C：历史 CI 触发与本交付入口 #8](https://github.com/TheDeadly-cat/hakimi-suanming/pull/8) | 检出规则、Node/npm 配置和依赖清单／锁单独修改也触发完整历史组；无关页面文案不触发 | 本地路径合同 14/14。本分支未包含 B，其历史组不能借用 B 的通过结果；最终 head 与检查见 [#8 checks](https://github.com/TheDeadly-cat/hakimi-suanming/pull/8/checks) |

### 三种身份分别读取

1. **请求审查的 PR head**：A/B/C 的 source head 分别记录在各 PR；历史工作流明确检出请求的 head。#7 原 `93f91d4` 的 [历史运行 35474203805](https://github.com/TheDeadly-cat/hakimi-suanming/actions/runs/35474203805) 仍是 795 项、788 通过／7 失败，不因 B 的新结果被改写。
2. **实际检出的合并预览**：迁移 CI 保留默认 PR checkout；A 的每组 `checkout.json` 保存 requested head/base、workflow SHA、实际 checkout 和 parents，构建身份及全量结果也在同组产物里。请求 head 与合并预览不是同一个身份；修改目标分支后必须重新验证。A 的 [运行 35893945050](https://github.com/TheDeadly-cat/hakimi-suanming/actions/runs/35893945050) 已完整通过；五组实际检出均为 `ecca08297b38326fd3c8677b25e43b3cbbab7619`，两个父提交为请求 base `93f91d4…` 和请求 head `ae3b44c…`。
3. **实际已安装产物**：本轮没有重新打包或替换已安装应用。5189 继续按 `4de42e9db980 / package-v2` 原启用记录归属，5188 按 `c15ef05bb165` 原记录归属；应用源码、安装工具源码、ZIP、原浏览器回执及备份位置见下方 09-20 快照。A 中恢复页 CSS 修复已纳入整合源码，并未自动进入现有安装。

默认发布仍为 Schema 13。原旧 v14/v15 自动接管数字保留历史范围；新 boundary 套件通过不能改称旧 8/20/18 项通过。原容量、事务、并发、失败恢复与当前 v16 的逐项映射，以及 v15 独有而未重跑的组合，集中在[迁移支持表](https://github.com/TheDeadly-cat/hakimi-suanming/blob/139a8efce13ce5ccc5794cc9c25046fcb3bee5a5/docs/跨Schema数据库与ServiceWorker发布协议-v0.1.md)。普通 `typecheck` 的正式专家前置门仍拒绝；类型检查正文通过不能改称整个生命周期通过。

保留本地早先 v16 24/26 的两项慢审计失败、远端首轮 LF/CRLF 变异测试问题、浅检出父提交缺失及短路径准备失败，不把它们改写成成功；远端 26/26 不证明本地慢审计问题的根因已修复。用户已确认暂时没有真实研究反馈或第二台 Windows，这两项继续待完成。来源、权利和现实专家材料仍按实际收到的内容验收。无需重复启用修订 2，也不新增 current-index 或 observation child。

最终 B 远端 JSON SHA-256：`39d2ec711a244576d61cee3df041c03f2c7b32d57741a3b0759f4753f556cd1d`；最终 A 的 v16 JSON：`1fe6420eded662e0705c2161ac1ee260760ceb91ae764423694eca0b9b4a7286`。A/B 的最终工程聚合通过，正式专家与正式聚合仍失败；本轮不授予正式发布或专家声明。C 专题原运行未整合 A/B，其旧七项失败归属不变。

### 慢审计差异的证据与限制

- 两次运行均为 Playwright 1.62.1。Edge 均为 `153.0.4234.48`；Chrome 本地为 `154.0.8037.57`、远端为 `.58`。Edge 版本相同仍有不同结果，不能用 Chrome 补丁差异解释全部失败。
- 原本地失败 trace 保存的 v16 测试、跨代 helper、备份 helper、容量种子 helper，与整合前对应文件在统一换行后完全相同。万条种子为案例／修订／指纹各 10,000，候选集 0；故障注入是扣留旧 v13 审计结果，待 controllerchange 后 500ms 释放，不是 CPU 限速。原断言和 180 秒收敛上限不变。
- 原本地源／目标构建为 `715aa1ed03ca`／`3f5a93194838`。其精确完整源码快照未记录；A 远端检出 `ecca08297b38326fd3c8677b25e43b3cbbab7619`，成功 trace 未保留，不能从另一步候选构建的版本号推定浏览器 fixture 的构建身份。已核对 `93f91d4` 到 A 再到 `dc15e1d` 的生产 worker、迁移 coordinator 字节未变；该结论不覆盖上方后续运行时修复。
- 旧本地 Chrome 在 prepared → materializing 后约 39.3 秒记录 `旧标签页写锁续租被拒绝：PROTOCOL_MISMATCH`，随后 failed，目标隔离 complete，attemptCount 1；Edge 留下 pending、journal=null，不能假定两者同根因。续租拒绝可由会话不存在／非 prepared、发起页身份或 requestId/migrationId 不符导致；这些旧记录未保存完整消息顺序，当时的 30 秒租约和 8 秒心跳只是线索。上方 09-25 新观察直接确认了新一次运行中的续租逾期，但没有补齐旧运行证据。
- 复用 `attachForwardMigrationFailureState()`：原失败附件保持；第一项慢场景成功断言全部完成后也保存同样的页面、构建及 journal 信息，以便比较成功与失败。没有加入运行中 worker 轮询、消息拦截、重试或放宽接管。本轮原矩阵仍逐项验证旧页写保护、源库保留、唯一目标、未知提交后不盲目重放及失败恢复。

该风险限于隔离的 v13→v16 候选慢审计接管，尚无证据将其定为“本机太慢”或已修复；即使新的联合运行成功，也仅是新的成功观测。默认仍为 v13，v16 不因此取得默认启用资格。工程联合结果完成后本轮结项；真实研究、干净 Windows 与独立内容线按现有待办保留。

## 2026-09-20 交付快照（保留原时间和输入）

本节更新 09-13 的原台账，旧表保留为历史快照。当前审阅分支为 `codex/local-delivery-integration-20260920`；已取得下列完整远端结果的整合提交是 `12f6cbcaf748a49a546ea2df2839345d494f82e9`（历史接入 `547a30b`、安装工具修订 `60ee63d`、独立历史工作流 `0983bc7`）。本页后续文字更新与该检查输入分别记录。[最终整合 Draft PR #7](https://github.com/TheDeadly-cat/hakimi-suanming/pull/7) 的 [实际检查](https://github.com/TheDeadly-cat/hakimi-suanming/pull/7/checks) 提供实时 head 与远端状态；中间提交结果不转签。

| 当前对象 | 已核对状态 |
| --- | --- |
| 已确认的远端工程回执 | `12f6cbc…` 的 PR 事件 [Quick CI 35472925161](https://github.com/TheDeadly-cat/hakimi-suanming/actions/runs/35472925161) 已结束：工程聚合通过；正式专家及正式聚合失败，首错 `EXPERT_QUALIFICATION_RECEIPT_LOADER_UNAVAILABLE`。完整类型检查、构建、Vitest 213 文件 / 2827 项、发布工具 718/718、安装工具 44/44、CI 合同 57/57 通过。先前 `547a30b` 的 [运行 35469783327](https://github.com/TheDeadly-cat/hakimi-suanming/actions/runs/35469783327) 保留原提交归属。 |
| 最新完整历史组 | 28 文件、795 项：788 通过 / 7 失败，0 跳过、取消或缺失；原 58 项关闭 51，原 269 项累计关闭 262。原 53 个测试函数体与冻结摘要不变，新增 12 个拒绝测试；[逐项归属与剩余责任](four-system-history-contexts-20260920.md)。最终 JSON SHA-256 `f6c89957887fb1351a5494c42c2601f10b9eb8f40eca7a38fc7c26424adf7cd4`。 |
| 历史 PR 独立验证 | `12f6cbc…` 的 [Historical governance 35472925156](https://github.com/TheDeadly-cat/hakimi-suanming/actions/runs/35472925156) 已完整执行：28 文件 / 795 项，788 通过、7 失败、0 跳过/取消/缺失。按 file/name/同名次序与本地逐项比较，新增、删除、结果变化均为 0。远端 JSON SHA-256 `6f40e4021b4a7b3487f73c4afad77e56b4a0adb2c44dff89b76b3a2814fba150`。工作流仅针对历史相关 PR 触发，独立于普通页面构建；history checkpoint 不替代完整组。 |
| 迁移 CI 的独立缺口 | `12f6cbc…` 的 [Migration CI 35472925162](https://github.com/TheDeadly-cat/hakimi-suanming/actions/runs/35472925162) 已结束为 failure：v13→v14 浏览器组 0/8；后续 v13→v15、v14→v15、v13→v16 及 orphaned-v13-recovery 四组未执行。这八项不与历史七项混算，也不构成默认 Schema 13 已启用候选的升级验收。 |
| 日常入口 5188 | 仍为 `c15ef05bb165`；固定产物锁、全部 137 个应用文件和原日常快捷方式均按切换前身份复验。 |
| 候选入口 5189 | 用户明确选择后已启用 `4de42e9db980 / package-v2`；实际桌面 Candidate (5189) 快捷方式已切换，固定监听身份匹配，冷启动及实际快捷方式复用通过。安装器重复运行复用一致目录和入口。 |
| 旧候选与退路 | `9057371baf85-package-v4` 原安装目录保留；旧包和三个相关快捷方式已复制并核验到外部新备份目录。用户明确答复无待保留真实研究资料；未迁移、清空或读取日常浏览器资料。 |
| 修订 2 的范围 | 应用仍为 `4de42e9db980`，应用源码 `d3ff1bdcc64d0917dcc604f753ac896eb62a9c1e`；安装工具源码 `60ee63d6bdb1e334690fb4f14ec792d49f28c298`。137 个应用文件、原锁及 6 份原浏览器回执/结果共 144 文件与修订 1 字节相同。原回执未重签。 |
| 本轮安装与浏览器验收 | 实际安装副本在 Edge/Chrome：完整 boot 16/16、PWA 2/2、完整研究/十六分区备份恢复 2/2；随机端口 `50752` 已关闭。固定 5189 的补充验收 2/2：保存、关闭页面重开、全量资料一致及隔离恢复；使用独立测试浏览器数据，未使用日常 profile。桌面 1280×800 / 手机 390×844 页面身份、非空、错误层、控制台和交互检查通过。 |

修订 2 ZIP SHA-256：`9856e3e94a635c9ddbf49809bb81d1b180475f3636c600e9b4f670c94d23b1f9`；安装清单 SHA-256：`034e68da64f6d7aa4a6c07fc6b6be52af5f189c435c003dea2782e78752262f3`。新证据目录：`Z:/HakimiBaziBackups/LocalDelivery/2026-09-20/local-delivery-integration-v1/`；09-13 及本日早先的历史证据目录保持原样。大响应探测采用长度预检、流式计数和超限取消，保留原 2 秒超时、禁止重定向和摘要验证；定向响应测试 6/6、安装工具完整组 44/44、真实包集成检查 18/18、CI 合同 57/57。首次超时异常名及沙箱符号链接跳过记录均保留，不把初次失败抹去。启用脚本首次读回误把 Windows 路径斜杠形式当成不同入口，规范化后通过；固定地址补充测试首次误比较含导出时间的 envelope 摘要，数据 payload 已一致，改为完整预检、十六分区与 payload 摘要核对后 2/2。两次脚本失败原文保留，未改应用字节。

迁移失败的已知责任范围：一项在已报告 `dbMigrationPhase=committed`、`swBootAck=true` 的新 v14 页面上仍要求文档临时字段 `dbStorageAdmission=admitted`，实际为 null；这不足以证明持久迁移失败或容量门被绕过。另七项等待 v14 worker 自动激活，但当前页面和 worker 的自动前向接管合同明确仅接受 `legacy-v13 → Schema 16`。这两个限制函数与旧开发基线 `3a6fa1e3…` 字节相同；须先对齐旧迁移矩阵与支持范围，不能以放宽接管权限或 CDP 强制 skipWaiting 代替真实协议验收。远端只上传了运行日志，截图/trace 仅有已失效的 runner 本地路径，不能声称已审过这些界面证据。

### 最终整合的专题归属

以下六个 Draft PR 的 head 均为本整合分支的祖先；保留原 PR，未合并或重写 main。最终 Draft PR 采用共同开发基线 `codex/legacy-v13-governance-sync-20260904`（`3a6fa1e3…`），汇总审查这批后续改动。

| 专题 | 原 PR / head |
| --- | --- |
| 固定本地安装 | [#1](https://github.com/TheDeadly-cat/hakimi-suanming/pull/1) / `3361efb77511c3aedd03a223642dcba5c77ceeb5` |
| PWA 资料目录合同 | [#2](https://github.com/TheDeadly-cat/hakimi-suanming/pull/2) / `ef13e3661708c7551967054815e595e783688a07` |
| 专家职责拆分 | [#3](https://github.com/TheDeadly-cat/hakimi-suanming/pull/3) / `e4690753c24abb4a8d81da51f667bd9ce56b9846` |
| Windows 检出与历史输入 | [#4](https://github.com/TheDeadly-cat/hakimi-suanming/pull/4) / `3eb280d5f835283fd24ed807ac3d291a45bf77f5` |
| 案例库焦点和对比度 | [#5](https://github.com/TheDeadly-cat/hakimi-suanming/pull/5) / `c085b75e20de0e781f1568474be53d75ae5f5ad0` |
| 当前/历史许可检查 | [#6](https://github.com/TheDeadly-cat/hakimi-suanming/pull/6) / `35358d35528c2c782b2ded7af142c42364ebe4d4`；原基线为首次控制器打包分支 |

相对旧开发基线，应用运行时修改限于首次控制器确认输入门、案例库操作后焦点和筛选对比度；其余包括安装/许可验证工具、专家职责、CI、历史输入/测试及文档。相对修复应用源码 `d3ff1bd…`，`apps/web`、`packages`、`content`、依赖清单/锁与 tsconfig 范围仅三个组件测试文件不同，没有应用运行时变更，故沿用原修复应用。测试源码使用 `0983bc7…`；后续状态文档提交不冒充新的应用构建身份。

### 接下来的三项工作

1. 按已取得的真实失败身份审阅七项事实回执的历史消费者合同，以及迁移矩阵八项失败的独立适用范围；不全局退回旧 manifest、不执行旧归档模块、不重签旧回执，保留未执行迁移组状态。
2. 用户在已选 5189 修订 2 完成真实研究周期反馈；另在第二台干净 Windows 验证安装、桌面入口及备份恢复。用户已确认两项目前均未具备；同机隔离浏览器与临时 checkout 不计为完成。
3. 来源校勘、权利依据及两份合格独立专家原始意见继续凭实际材料推进；0/2 进度可读、工程绿灯和 AI 回件不替代正式准入。

## 09-13 起点台账（历史快照）

目标输入：本任务附件 `854f937f-745e-4524-a381-a0e02c995991/pasted-text-1.txt`。起点：`3a6fa1e3dd7edad26dde203205bf98eaf34e4956`。本地使用优先，保留来源权利、真实专家及未来公开发布门。

本页跟踪完整目标，不以单项测试通过代替整体完成。09-10 的源码同步是上一个已完成动作；09-13 新建独立 checkout 开始后续交付，原实施目录与固定 c15ef 安装不变。

| 要求 | 应取得的证据 | 09-13 状态 |
| --- | --- | --- |
| 1 本地入口与可重建安装 | README先说明5188、开发5173及隔离测试入口；从明确清单创建安装；重复启动、端口冲突、身份不符、未知进程与数据空间保护；干净Windows安装记录 | 实现与同机隔离验证已完成：真实包11项集成检查通过，Windows首次/重复安装、冷启动/复用、端口冲突拒绝通过；另一台干净Windows和实际桌面快捷方式验收未取得 |
| 2 PWA测试合同修复 | helper强制使用、临时目录唯一性、日常profile拒绝、并发共享拒绝、创建失败不启动；相关完整测试组无遗漏/skip | 已在独立分支`codex/pwa-profile-contract-20260913`实现；本地发布证据712/712、CI合同56/56、完整类型检查、真实PWA两浏览器2/2通过；远端结果须按该分支head另验 |
| 3 专家结构/进度/准入分工 | 可审阅设计、不同职责CLI、合法0/2可读，正式准入仍拒绝；工程聚合职责明确 | 待实施；已确认现有正式CLI固定失败，不能直接改成成功 |
| 4 269治理失败根因归并 | 每个失败对应首个错误、输入版本、验证目的、责任层、修复和重跑范围；保留旧哈希和缺失原件 | 待实施；原始269失败记录可用，尚未完成逐组归因 |
| 5 远端CI基线 | 分组Draft PR或手动工作流的准确head、终态和失败/未执行记录 | 已取得安装分支cdb8457的Quick/Migration两次终态failure；日志归档，未执行与实际失败分别记录；剩余问题未关闭 |
| 6 下一独立候选产物 | 新源码/构建/同产物浏览器/安装包/新入口的身份链；不覆盖c15ef；另行决定是否替换 | 待前述修复完成 |
| 7 真实研究周期 | 本人实际录入、修订、备注、比较、报告、备份、恢复及反馈；合成测试另列 | 尚未取得本人真实使用反馈 |
| 8 首批binding与真实专家 | 实际原件、校勘与底本/权利依据、真实独立原始意见及资格依据 | 四载体原件已有；AI回件不是现实专家意见，其余缺口保留 |

PR范围分别为：本地入口安装；PWA合同和远端验证入口；专家职责拆分；治理根因与适用关系修复。不得把所有源码、治理和现实材料混成一个合并许可。

新候选的运行时复验须覆盖首次无SW启动、旧控制器、boot commit期间首次claim、排空期间控制器再变、未知提交、后台恢复、两标签页更新、失败后只读导出。c15ef的旧浏览器回执仍仅属于旧产物。

AI工具再用时要求材料集合完整且非空；参数实验只改变目标因素，保留异文，不选权威。公网HTTPS/部署/真实旧版升级及发布回滚保留为后续发布要求。暂缓Schema16晋级、新正式术数入口、云同步/账号/服务端数据库、全仓重写和新增通用证据框架。

当前没有完成目标的充分证据，目标保持 active。真正无法由代码补出的真人意见、个人使用反馈或另一台干净Windows的实测，将按实际缺件记录；不提前把可继续实施的工程项判为阻塞。

本次提交的安装实现与原始失败/复测记录见 [本地入口验证摘要](local-entry-validation-20260913.md)。新的开发分支为 `codex/local-entry-install-20260913`，仅承载第一组实现和上述目标台账。完整TypeScript/Vitest/构建、PWA合同与治理组的旧记录不能转签为本次全部通过。
