# v13 交付收敛当前状态

核对日期：2026-09-05。本页依据用户附件中的方案 B，记录当前本地工作与实际验证结果，不产生新的 current 选择、专家意见、来源权利或发布授权。

**当前结论：本轮用户授权内的本地工程验证已完成。候选 6 的完整 TypeScript、独立完整 Vitest 212 文件/2752 项、137 文件诊断构建及同产物浏览器 10 项均通过，末次产物锁核验一致。方案 B 整体仍未完成。** 当前治理仍有三个 source_requirements family 红门，真实旧产物、跨 schema 不反向写回、精确历史依据、现实核验材料、未全跑 Node 组和部署批准仍缺，11 项历史依据失败保留。

## 实施对象与授权

- 实施目录为 `C:\Users\Administrator\Documents\哈基米算命`，分支 `codex/legacy-v13-governance-sync-20260904`，基础 HEAD 为 `b7216a301a74bea0591b364b4dba32aa34409378`。验证对象包含该目录原有及本轮未提交工作；不能归结为该提交本身已通过验证。
- 原有 dirty/untracked 工作保留。本轮未暂存、提交、推送、建立 PR 或触发远端 CI。新工作树 `C:\Users\Administrator\.codex\worktrees\1a6d\哈基米算命` 仍为 `c2d18ca453971d3087abe53e21872cd707ea7d42`，未复制原目录续作。
- 用户已明确允许读取和必要修复 `apps/web/src/lib/local-user-data-cleanup.ts`，并允许完整 typecheck、Vitest、build 和隔离浏览器验证。[授权登记](../release/known-restricted-blockers.v1.json) 为 `source-access-authorized`，活动 `restrictedPaths` 为空；既往阻断观察仍保留为历史记录。
- 默认边界保持 `legacy-v13 / targetSchema 13 / migrationId null`。保留失败关闭和原有 mutation epoch 约束；不替 v13 声称不存在的 epoch 回执。
- 这些授权不包含现实专家声明、来源权利准入、HTTPS 环境发布或回滚操作。

## 本轮修复

清理模块既有类型断言的换行修复已进入完整检查；主入口迁移结果分支增加显式 null guard。Vitest 根入口复用两个 Vedic 包原有的运行环境与 schema 配置，212 个文件分别进入唯一项目，未删减文件或放宽严格字节检查。

恢复预检遇到正式 `FullBackupError / CURRENT_DATA_CHANGED` 时，界面明确提示“恢复预检已过期”，清除旧预检与确认状态，要求重新选择文件和准备安全备份。真正未知的提交结果继续锁定写入，并保留只读导出与“重新打开并核对”；清空数据入口及已有确认控件也遵守该锁定。未知结果不会因同名错误字符串或普通对象而被当作并发冲突。

命盘页在相同输入下切换“行运/研究”视图时复用已有计算结果；实际输入、时间、方向、Revision 或计算上下文变化仍触发计算。对应完整页面测试检查计算次数和输入变化，未通过放宽等待时间掩盖重复计算。

默认 v13 在正常 boot commit 成功之后才注册 Service Worker，接管监听仍同步安装。首次接管先冻结并排空旧页写入；缺少本页正常提交凭据的提前 peer claim 保持只读恢复，不初始化控制库、不盲目重载。已有凭据时，只通过既有原生连接建立 `readonly` 事务、等待完成并复用完整回执验证；关闭、丢失或变更的连接均拒绝，读取不会触发 Dexie auto-open/reopen。随后仍核对发布 tuple、build、migration、receipt 和 controller 身份。旧页不会重新变成可写或 ready，SW 的无效状态拒绝逻辑未放宽。

移动端正式对照表已收紧宽度约束；对照分区锚点根据实际固定导航与切换器高度调整定位，并将焦点交给当前目标。候选 4 连续流程实测暴露的锚点遮挡已修复，完整对照页测试 21/21 通过。候选 5 在 320px forced-colors 检查中报告 22 个 Axe 节点失败；依据具体对比值仅修改 6 行 CSS 系统颜色后，候选 6 两浏览器已通过此前 320px 强制颜色、Axe 和锚点检查，随后完整连续流程也取得 2/2 通过。

## 已取得的工程证据

下列结果保留各自执行时的源码与产物范围；旧一轮通过不代替后续源码变化的最终复验。QA 根目录为 `C:\Users\Administrator\AppData\Local\Temp\hakimi-v13-approved-build-a53fb2e74e364e588e62001315717438`；下文日志路径相对此目录。

| 对象 | 实际结果 | 范围与限制 |
| --- | --- | --- |
| 完整 history checkpoint | 通过；25 族、77 成员及旧专家包固定锚 | 历史不可变校验，不建立 current 语义准入 |
| current-index 与状态投影 | 通过 | 显式选择，不默认选 head，不读取旧专家正文 |
| current/history 普通定向契约 | 29/29 | 仅该普通子集，不代表完整 current-governance 组 |
| `test:ci-contracts` | 5 文件、40/40、0 跳过 | `test-results/node-groups/ci-contracts-eiGhTB/results.json` |
| `test:node-release-evidence` | 26 文件、602/602、0 跳过 | `test-results/node-groups/release-evidence-DVTbIm/results.json`；Node 工具证据 |
| `test:node-package-artifacts` | 3 文件、37/37、0 跳过 | `test-results/node-groups/package-artifacts-mEOIVc/results.json` |
| Node 文件登记 | 186 个文件、6 组 | 只证明精确登记；另三组未取得全组结果 |
| 完整 `diagnose:typecheck` | 通过，`programStarted:true`，退出码 0 | `candidate-6/typecheck-final.log`；完整默认 TypeScript 图，无排除、压制或 xfail |
| 此前已完成的一轮完整 Vitest | 212 文件、2752 项；1 项旧 PWA 静态断言失败 | 该断言已窄修，完整对应文件 4/4 通过；保留此前失败记录。`vitest-candidate3-full.log`、`pwa-files-static-narrowed-88c2de79.log` |
| 候选 6 Vitest 与浏览器并行的一轮 | 4 个文件报告失败后由根任务中止 | 非完整执行结论，原因尚未确立；记录 `candidate-6/vitest-full-interrupted.json`，不因后续独立通过而删除该记录 |
| 候选 6 独立完整 Vitest | 212 文件、2752/2752，通过，退出码 0，322.56 秒 | `candidate-6/vitest-standalone-full.log`；完整图、2 workers，未修改 timeout 配置 |
| SW 初始化、协调器与既有连接读取 | 3 个完整文件、77/77 | `first-install-existing-connection-tests.log`；关闭连接场景为纯契约模拟，无实际删库复现 |
| 对照页锚点与页面回归 | 完整文件 21/21 | `compare-anchor-ref-focused-59ac203e.log`；不代替浏览器复验 |
| 静态边界与诊断相关完整契约 | 97/97 | `boundary-tests-final.log`；包括授权图和精确限定的静态边界 |
| 当前 SW 身份与发布治理 | 233/233、0 跳过 | 当前源码身份与拒绝旧身份契约；未重写历史 candidate 或 receipt |
| 候选 5 诊断构建与 manifest | 通过；137 个文件，默认 v13/13/null | `candidate-5/build.log`、`candidate-5/manifest.log`、`candidate-5/artifact-lock.log`；不是完整 npm 生命周期绿门 |
| 候选 6 诊断构建与产物锁 | 通过并锁定；137 个文件，默认 v13/13/null | 当前最终工程复验对象，身份见下；构建通过不代表完整 npm 生命周期、单元测试或浏览器全绿 |
| 完整 `npm run build` 生命周期 | 已实际运行并失败于根 prebuild 的当前独立来源语义门 | 该次未进入 Vite 主体；拒绝 current 不可用范围，日志 `npm-build-final-lifecycle.log` |
| 候选 6 最新 `current-governance` | 已实际运行，退出码 1 | `candidate-6/current-governance.log`：history、current-index、完整 draft boundary 先通过，随后 `source_requirements` 的三个 family 报 `CURRENT_UNAVAILABLE`；后续检查尚未执行 |

直接诊断构建已实际检查 resolved Vite aliases 及其解析，相关两项标志均为 true。当前 runtime sidecar 的工程维护不改变历史 source-lock、旧算法源码或现实审批身份；此前静态检查中的两个 false 不能继续用来描述这次实际构建。构建仍报告大 chunk 提示，未据此声称性能验收通过。

[命令映射](delivery-command-map.md) 继续保留默认 npm 的完整 pretest/pretypecheck/prebuild 及 workspace prebuild。独立诊断启动完整程序图，但不取消正式前置；Quick CI 的独立语义任务和最终 aggregate 仍要求对应义务通过。没有远端 Actions 运行与当前 exact SHA 的证据，不能写“CI 已绿”。

`current-governance` 27、`bazi-evidence` 51、`independent-system-evidence` 74 个入口完成登记与执行范围核对，三组均未整组运行，其中包含未执行的动态攻击重现用例。不得使用已跑普通子集、语法检查或登记数量替代全组结论，也不得给出未运行组的通过/失败/跳过计数。

## 浏览器结果与产物保存

使用隔离 Chrome/Edge 配置与 loopback 预览，浏览器前后验证锁定产物；测试不重建应用。下表保留候选 4 的运行结果，后文单列候选 5；最终候选 6 必须取得自身结果。

| 候选 4 场景 | 实测结果 | 能证明的范围 |
| --- | --- | --- |
| 双标签恢复预检过期 | Chrome、Edge 通过 | 第二标签真实 UI 创建 R2；旧预检被拒绝，Revision 见证与全部 16 个原生分区不变 |
| 恢复事务失败与回滚 | Chrome、Edge 通过 | 在实际恢复事务清空非空附件表后原生 abort；全部 16 分区及重新打开后的 Revision 一致；未知结果继续锁写，实际恢复核对入口可用 |
| 上述 boundary 完整矩阵 | 4/4 通过 | `candidate-4/boundary-run1.log`、`candidate-4/boundary-playwright-report.json`；记录的控制台错误数组均为 `[]` |
| 启动失败后的正式只读导出 | Chrome、Edge，2/2 通过 | 真实 UI 数据、受控路由资源失败、正式只读接口与 Worker ZIP；生成和交付前后全部 16 分区及原数据库版本不变。`candidate-4/readonly-run1.log` |
| PWA 完整场景 | Chrome 通过；Edge 因 helper 跨重载读取失败未通过 | helper 已修复；候选 5 的后续结果单列于下文。`candidate-4/pwa-run1.log` |
| 连续用户流程 | 两浏览器运行到分区锚点遮挡后失败 | 产品修复已进入候选 5，不能将到达失败点之前的运行写成整条流程通过。`candidate-4/web-v1-run1.log` |

候选 5 的 PWA 两浏览器已完成 2/2，`strictGatePassed` 通过；连续流程通过了此前锚点位置，随后在 320px forced-colors 的 Axe 检查中失败，涉及 22 个节点。6 行 CSS 系统颜色修复已进入候选 6，不能以候选 5 的 PWA 通过代替候选 6 的结果。

候选 6 首轮连续流程在 Chrome、Edge 均通过此前 320px 强制颜色、Axe 和锚点检查，推进至事件检索时因卡片 accessible name 的陈旧定位失败。三处 harness 定位根据 actual DOM 修正后，第二轮完整连续流程已在两浏览器取得 **2/2 通过，`strictGatePassed=true`，用时 4.4 分钟**。该轮只改测试 harness，产物保持同一锁定身份，无需重建；首轮失败与 harness delta 保留。实际回执为仓库内 `tmp/local-v13-qa-a53fb2e74e364e588e62001315717438/candidate-6/web-v1-run2.json`，日志为 QA 内 `candidate-6/web-v1-run2.log`，`screenshots-run2` 保存主线 QA 截图。结果只覆盖该 spec 实际断言，不能扩展为旧 AI 草稿拒绝、Provider 不可用或全部未验证状态均已完成。

候选 6 PWA 在 Chrome、Edge 已完整 **2/2 通过，`strictGatePassed=true`，38.1 秒**；实际回执为仓库内 `tmp/local-v13-qa-a53fb2e74e364e588e62001315717438/candidate-6/pwa-run1.json`，日志位于 QA 的 `candidate-6`。候选 6 boundary 的双标签预检过期与实际恢复事务 abort 两种场景在两个浏览器合计 **4/4 通过，1.4 分钟**；全 16 分区核对属于该 spec 实际断言，报告为 QA `candidate-6/boundary-playwright-report.json`。候选 6 正式只读恢复在两个浏览器 **2/2 通过，21.9 秒**，报告为 QA `candidate-6/readonly-playwright-report.json`；读取、生成和交付前后的全部 16 分区及原数据库版本保持一致。

最终浏览器共 **10 项：连续流程 2、PWA 2、boundary 4、只读恢复 2**，全部绑定候选 6。各专项运行前后及最终锁核验的 evidence ID、lock SHA、artifactSetDigest 和 137 文件一致，末次 verify 退出码 0，日志为 QA `candidate-6/artifact-lock-final.log`。本轮 loopback 预览端口 4197 已停止。

普通本机汇总保存为 QA `candidate-6/local-validation-summary.json`：两份正式浏览器回执所引用的原始 summary 文件 SHA 与回执内副本一致；boundary 四组 console/page-errors 全为 `[]`，只读恢复 unexpected 错误为 `[]`，预期故障注入记录仍保留。该汇总的 `formalReleaseCompleted=false`，只是本轮本地验证记录，不是新的发布治理 schema 或正式发布完成回执。

截图已核对案例/修订离线页和 390px 对照页，页面非空且没有错误覆盖层。320px 截图来自同一候选 6 的连续流程 run1 阶段，并保留该阶段 Axe 0 的来源，不将其改署为 run2。成功连续 run2 因 `retain-on-failure` 未保存 trace，不能声称有成功 trace；主线 QA 截图保留于 `candidate-6/screenshots-run2`。

PWA 中 CDP 可安装性检查、离线冷启动和深链访问是真实浏览器运行；既有 spec 使用合成 `beforeinstallprompt/appinstalled` 事件核对提示和按钮状态，不证明操作系统实际完成 PWA 安装。只读恢复 QA 先完成正常真实 SW 启动，故障阶段才通过页面 CDP 的 `Network.setBypassServiceWorker(true)` 绕过 SW，并精确 abort 已锁定的 `research-query` 资源。此结果不能证明全 origin 写锁、未知旧库恢复、真实旧 v13→v16 迁移或跨 schema 不反向写回。

| 本轮候选 | 保留状态 |
| --- | --- |
| 原目录旧 `dist/web` | 保存于 `previous-dist-web`；不声称为已验证历史发布产物 |
| 候选 1、2、4 | 各自完整产物及原锁保存于 `failed-artifact-1`、`failed-artifact-2`、`failed-artifact-4`；失败日志和源码快照保留，不用后续构建覆盖失败证据 |
| 候选 3 | 仅有源码快照，未构建；不得记作构建成功或失败产物 |
| 候选 5 | 已构建并锁定；PWA 2/2 strictGatePassed 通过，连续流程在 320px forced-colors Axe 检查失败 |
| 候选 6 | 已实际构建并锁定 137 个文件；连续主线 2/2、PWA 2/2 strictGatePassed 通过，boundary 4/4、只读恢复 2/2 通过；末次锁核验一致 |

候选 5 的身份为 evidence ID `hre1-0e6f22821b399120ab91e96d862f3382`、buildVersion `746e36d836ce`；artifactSetDigest 为 `435a7c5a3ffcd15a3c95c18b95ff201839c3cc1c76d7d89e061edaec079ce72b`，锁文件 SHA-256 为 `095068eadc3cf66aa3cc62a90b607a9d2ba485509af7b45ea70fc7d8ebab9cc8`。此身份仅属于候选 5。必须按各候选源码快照区分产物所用源码与后续变化；不能将候选 4 的 6 个恢复场景通过与候选 5 的 PWA 2/2 拼接成候选 6 的最终矩阵。

候选 6 的身份为 evidence ID `hre1-ad01e37df5b4ead6b14201b80cc6db65`、buildVersion `61f997e8d8b3`；artifactSetDigest 为 `78c4a1d370b037d180cdaf02922de84f62611fffbae22caac2a47d04fafb9254`，锁文件 SHA-256 为 `3b3bdef8173689cba02773490cf9926ad8dbd07b4db124feb969f43903108d7c`。共 137 个文件。`candidate-6/source-delta-after-article-harness.json` 记录构建后只有连续流程 spec 变化，其中三处事件检索定位修正属于 harness delta；本次随后收敛的两份状态文档也单列为文档变化，不改写已锁定的构建时源码身份，不重建产物。

## 历史、current 与现实材料边界

权威机械入口仍为 [current-index 状态投影](current-index-summary.md)。本轮观察到 25 个 family 中 16 个显式选择、9 个不可用；八字专家包 current 未选择。所有正式准入、专家声明、发布及公开部署授权仍为 false。

- current-index SHA-256：`c6a51e2a2822b0e94b6ba7fb5f8620941918294d3bfd7db17df9480a87ee178c`。
- 历史 checkpoint SHA-256：`65dceb6bccbe90b5526980f42edc78670587eef5cb27be90780a96c94e9f35ee`，未重签。
- 旧专家包 SHA-256：`ba28de1b95d57de4320913e7a0b00fe780630d15408c5b22b84311977ea29163`，未重签。固定旧专家库和主注册表身份保留；当前依赖按已审查的下游增量登记，不覆盖历史锚。

当前内容登记仍为 7 工程定义、4 传统文本、1 审核规则，冻结 0/12。`binding:policy:weights` 的真实源码已有 `4/2/2/1`，但缺少作者采用理由、来源或创作经过、允许用途及对应版本。`binding:dtt:month-command` 已有具体载体和页码审查对象，书目、权利判断及两名独立专家席位仍缺。

旧专家单份 preflight/bundle 绑定旧 1.5 对象，机械绑定不证明专家身份、资格或独立性。当前消费者仍需绑定真实审查对象、消费现实核验收据并计算合格意见 0/1/2；不能用“已收到”数量、模型代写意见或空材料包替代合格审查。没有新增现实专家意见或权利授权。

v2 manifest 完整文件仍保留 5 通过、11 失败、0 跳过；11 项为 `BOUND_READINESS_BASIS_DRIFT`。旧 knowledge-core 依据要求 39,595 字节、SHA-256 `9e6420e8c6c5b3aafd892fdb3c5363af81ea9d9e24ebff6e11897300053524b0`；当前为 41,040 字节、`85e86d6e28fbaee112a21daa4288be0c613b93d22138a5448a8f78bd33b20837`。可达 Git 历史与换行形式未提供精确旧字节，必须取得原冻结依据或归档来源；不能通过替换旧 pin、伪造旧源或取消失败建立历史验收。readiness 32/32 与 private-import preflight 15/15 的普通离线结果也不填补这一缺口。

## 方案 B 尚余工作

| 任务 | 当前结论 |
| --- | --- |
| T1 生命周期审计 | 静态展开、诊断入口和实际运行结果已分开；候选 6 独立完整 Vitest 212 文件、2752/2752 通过，默认 npm 正式前置仍因 current 语义缺口失败 |
| T2 显式当前选择 | 已实现，不默认选择 head；未将候选提升为已获准发布 |
| T3 历史/当前及专家进度 | 历史与当前入口已分离；现实资格、独立性收据及当前合格意见消费契约未完成 |
| T4 CI/测试映射 | 186 文件登记、三组完整运行和 CI 聚合接入已实现；另三组未整组运行，11 项历史依据失败保留；远端 CI 未验收 |
| T5 默认 v13 产物门 | 候选 6 实际默认构建、137 文件 manifest、全部浏览器前后及末次产物锁核验通过 |
| T6 真实运行矩阵 | 候选 6 双标签与事务失败 boundary 4/4、PWA 2/2、只读恢复 2/2 通过；真实旧产物和跨 schema 不反向写回仍缺，不能将本轮默认 v13 验证扩展为迁移验收 |
| T7 用户主线与八种状态 | 候选 6 Chrome/Edge 完整连续主线 2/2、strictGatePassed=true，4.4 分钟；PWA 2/2、strictGatePassed=true，38.1 秒。旧 AI 草稿拒绝、Provider 不可用等若 spec 未提供对应证明，仍不得记作完成 |
| T8 真实 binding | 未完成，需真实作者/来源、权利及独立审阅材料 |
| T9 HTTPS 部署与回滚 | 未执行；仍缺环境所有者明确授权及真实同产物部署/回滚证据 |

## 候选 6 最终本地验证记录

以下记录仅代表本轮已授权的本地工程范围，均按实际最终候选核对，不以候选 4 或 5 的结果替代。默认 npm 正式前置、未全跑 Node 组、历史与现实材料及部署缺口仍按上文保留。

| 项目 | 最终结果 | 实际日志或回执 |
| --- | --- | --- |
| 候选 6 build、manifest 与锁 | 已实际构建并锁定 137 文件；末次 verify 退出码 0，身份和摘要一致 | QA `candidate-6/artifact-lock-final.log`；evidence、build、artifactSetDigest 和 lock SHA 如上 |
| 修复后完整 TypeScript | 完整默认图通过，programStarted=true，退出码 0 | QA `candidate-6/typecheck-final.log` |
| 修复后完整 Vitest 212 文件 | 已独立完整通过：2752/2752，退出码 0，322.56 秒；未改 timeout 配置，2 workers | `candidate-6/vitest-standalone-full.log`；此前并行中止记录及原因未确立状态仍保留 |
| 候选 6 连续流程 Chrome / Edge | 已完整通过：2/2、strictGatePassed=true、4.4 分钟 | `tmp/local-v13-qa-a53fb2e74e364e588e62001315717438/candidate-6/web-v1-run2.json`；QA `candidate-6/web-v1-run2.log` 与 `screenshots-run2`；保留此前失败及构建后的 harness delta |
| 候选 6 PWA Chrome / Edge | 已完整通过：2/2、strictGatePassed=true、38.1 秒 | `tmp/local-v13-qa-a53fb2e74e364e588e62001315717438/candidate-6/pwa-run1.json`；QA `candidate-6` 日志；CDP/离线/深链与合成安装 UI 事件范围如上 |
| 候选 6 boundary 矩阵 | 已完整通过：4/4、1.4 分钟，含双标签预检过期及实际恢复事务 abort 的 16 分区核对；四组 console/page-errors 均为 [] | QA `candidate-6/boundary-playwright-report.json` 与运行前后 artifact 记录 |
| 候选 6 只读恢复 | 两浏览器 2/2 通过，21.9 秒；16 分区与版本不变，unexpected 错误为 []，预期故障注入记录保留 | QA `candidate-6/readonly-playwright-report.json`；正常 SW 启动后由页面 CDP 绕过 SW，精确注入路由资源失败，运行前后产物一致 |
| 普通本机汇总 | 10 项最终同产物通过，两正式浏览器回执引用的原始 summary SHA 匹配 | QA `candidate-6/local-validation-summary.json`；formalReleaseCompleted=false，不产生正式发布授权或新治理 schema |
| 构建后源码与产物身份 | 产物未重建；已核对连续流程 spec 的 harness 变化，本次另收敛两份状态文档 | QA `candidate-6/source-delta-after-article-harness.json`、`candidate-6/source-delta-final-docs.json`；最终差异仅为该 spec 与这两份文档，不重写已锁定身份 |
| 本地运行环境 | 本轮预览已停止 | loopback 端口 4197 已释放；未执行 HTTPS 部署或回滚 |
