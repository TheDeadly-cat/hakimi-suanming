# 新窗口交接：f043 候选准备完成，等待下一项选择

本次用户请求是“交接到新的窗口”，并要求先更新 GitHub。本说明记录已完成工作与明确边界；新聊天只做一次只读接手，确认本说明及精确工作区后结束该回合，等待用户指定下一项。不要自动创建持续 goal、监看、审计、修复、测试或安装任务。

## 1. 正确工作区与 GitHub

实际交付工作区：`C:\Users\Administrator\.codex\worktrees\journal-event-index-20261010\哈基米算命`。

| 项目 | 绑定 |
| --- | --- |
| 仓库 | `https://github.com/TheDeadly-cat/hakimi-suanming` |
| 当前交付分支 | `codex/event-index-candidate-20261011` |
| 交付 PR | [PR #17：交付：f043 事件索引候选包与独立安装验收](https://github.com/TheDeadly-cat/hakimi-suanming/pull/17)，Open、Draft，base `codex/journal-event-index-20261010`，未合并 |
| 本次交接前 head | `f44affd2bb03d0697a044d7ec1a74a2ccdb9a9bb`；tree `ca5c73c1fad77ed09fa03f3a4d68c70d14a3859f` |
| 本次文档同步后 head | 新聊天首条交接消息及本机 `validation\20261012-window-handoff\handoff-publication.json` 记录完整 SHA；只读核对 `HEAD` 与该值，不把文档提交当成新的应用或工具构建 |
| 应用来源 | [PR #16](https://github.com/TheDeadly-cat/hakimi-suanming/pull/16)，`2482941f46acafc6fe0b331f536db06a45710fc8`，tree `a255053b455288ffa40c1d925fb789eadedba50e`；源码整改已结项，保留该分支 |
| 包内八个运行文件来源 | `3adab36e0452a827ac5e65ea1be0676bc3cf6b5b`；原精确 Git blob 与包文件逐字节绑定 |
| main | `c2d18ca453971d3087abe53e21872cd707ea7d42`，不合并、重置或改写 |

项目保存目录 `C:\Users\Administrator\Documents\哈基米算命` 和旧聊天 cwd `C:\Users\Administrator\.codex\worktrees\6d3f\哈基米算命` 都不是本批实际交付工作区。不要在这些目录切分支、构建、暂存或推送，也不要从默认 main 新建一个空白 worktree冒充续接。后续命令明确使用本节的实际工作区。

本次只同步交接及状态文档；应用、依赖锁、Schema、机器 current-index、包工具、旧安装说明和原安装 ZIP 均未修改。正常非强制推送，原分支和历史材料保留。不要用 `reset`、`clean` 或大范围换行格式化来整理工作区。

## 2. 日常版本与新候选分别记载

日常 5189 已批准的安装身份仍为 **`ab0f35c0d9d1 / package revision 1`**。用户明确选择 **Codex 内置浏览器** 作为其资料入口；地址 `http://127.0.0.1:5189/`。桌面 Candidate 快捷方式调用系统默认浏览器，不共享这份资料。现用包路径为 `C:\Users\Administrator\HakimiBaziWorkbenchCandidates\packages\ab0f35c0d9d1-package-v1`；本轮只读核对完整包清单，SHA-256 `27c836c924745939d6e68e68192a7f697592496a84bf182c1a0bafe008cfb8f4`。

5188 固定 `c15ef05bb165` 不动。旧 ab0、8f67、4de42、fbe 及原入口保留；本轮没有打开真实浏览器、读取研究记录、启动或停止日常服务。服务当前是否在运行、页面与控制器现场状态及当前记录条数未重新确认。10-10 的“原五条记录”不是五个案例，历史九条清单也不能写成当前实时数量。

新候选为 **`f0430d400b64 / package revision 1`，尚未启用**。默认仍为 `legacy-v13 / Schema 13 / migrationId null`：

| 工件 | 身份 |
| --- | --- |
| 应用 | 137 文件，evidenceId `hre1-e735fd9bc9080ab00280ac0feee7f7b4` |
| 原锁 SHA-256 | `ba590e52629a61fba574be0912bc886e00a848b8c45c4778ba8cd7b7d15b40c5` |
| 应用集合摘要 | `d44120bfe3bb41cec77b7871deb6469d25b554778dffa2271f39095a61e33e45` |
| 包清单 SHA-256 | `21deb9baf28edaaf0df0f769bf5197ae102cadb33c13ffb670df6ff55acb8bc8`，149 文件 |
| ZIP | `C:\Users\Administrator\HakimiBaziWorkbenchCandidates\validation\20261011-event-index-package\hakimi-f0430d400b64-package-v1.zip`，2,407,098 字节 |
| ZIP SHA-256 | `c5607981ef3a348931b3f2b7a3f7018f99536db45371127ce032f479161fe5ce` |

应用留在原 `candidate-artifact` 目录，原锁和回执不重签。只有 QA 根中的独立安装副本完成安装，本包没有自动进入日常 5189。本轮再次只读复验 f043 完整包、ZIP 和现用 ab0 完整包一致，不算新的应用测试。

## 3. 已接受整改与验证

PR #16 的来源编辑焦点、校验失败保留草稿并可取消、事件保存后父页同步索引和严格 ID/案例/修订定位已结项。不要因新包准备或文档增量重新要求修复，或制造新的生产代码提交。原失败、固定断言、未知写入锁及负向拒绝证据继续保留。

10-11 候选工程证据：新包安装合同 18/18，旧 ab0 兼容另 18/18，有界探测 6/6，临时端口原生启动器 4/4；实际 ZIP 安装服务的 136 可提供文件逐字节一致，`_headers` 不提供；同一临时端口的应用壳/服务回退指向现用 ab0。此回退没有打开真实浏览器或恢复资料。

实际 ZIP 的独立安装副本在 Edge/Chrome、1280×844 和 390×844 下共 10/10，零重试/跳过/flaky。验证连续保存后的精确事件选择且不重载、正文修改、来源拒绝与取消不写入、原生关闭重开、实际完整 ZIP 与预检、其他案例/不存在 ID 拒绝，以及 PWA 可安装性、请求/完成区分和离线深链。PWA 完成提示的合成事件不等于系统实际创建入口；隔离 profile 不等于日常浏览器现场验收。

## 4. f44affd 的 CI 已全部终结

| 运行 | 已核对结论 |
| --- | --- |
| [Quick 38081448643](https://github.com/TheDeadly-cat/hakimi-suanming/actions/runs/38081448643) | completed / failure，12 个工程任务含汇总成功；完整 Vitest 215 文件、2887/2887，类型检查、默认 v13 构建及产物检查成功；正式专家和正式汇总两项失败 |
| [Migration 38081448629](https://github.com/TheDeadly-cat/hakimi-suanming/actions/runs/38081448629) | completed / success，六个任务含汇总成功；五组原始报告严格复验共 45/45，零重试/跳过/flaky，原始 artifact ZIP 摘要与 GitHub digest 一致 |

实际合成检出 `3f5c06d9ff218c7c8d4e4ffbb125ca545f4cea0d` 与 f44 的 tree 相同，双父为 f44 与 2482941。正式失败仍为 `EXPERT_QUALIFICATION_RECEIPT_LOADER_UNAVAILABLE`，加载器不可用，CI 收到的原始/合格独立意见均为零；这不推断用户现实中没有专家。迁移是隔离合成诊断，`formalReleaseAuthorized=false`，不启用 v16 或扩大日常兼容性声明。

本次没有重跑测试或工作流。先前“迁移排队”的观测与本轮首次 ANSI 页脚采集失败保留，不覆写成后来成功。后继交接文档 head 的自动 CI 独立记载，不能套用 f44 的终态；新聊天不为此自动建立持续监看。

## 5. 本机证据位置

- `C:\Users\Administrator\HakimiBaziWorkbenchCandidates\validation\20261010-event-index\`：源码基线失败、新索引单元/浏览器证据、原构建和原锁。
- `C:\Users\Administrator\HakimiBaziWorkbenchCandidates\validation\20261011-event-index-package\`：f043 安装 ZIP、完整包、独立安装副本、`acceptance-receipt.json`、`source-tool-binding.json`、`zip-verification.json`、安装/启动/回退回执、`browser-installed-final\results.json` 和 f44 Quick 日志。
- `C:\Users\Administrator\HakimiBaziWorkbenchCandidates\validation\20261012-window-handoff\terminal-evidence\`：本轮 GitHub 运行/任务/原始迁移 ZIP、五份 checkout/results、`ci-terminal-verification.json`。
- 同一 `20261012-window-handoff` 根：后继完整 Git SHA、远端复读与新聊天信息；以 `handoff-publication.json` 和 `new-thread-acceptance.json` 为准。

GitHub 只保存工具/状态文档与工程摘要；真实备份、研究案例、记录 ID、私有 payload 指纹与浏览器目录留在本机。没有必要为了接手读取这些资料。

## 6. 接手后的停止点与下一步

先只读核对本说明、外部发布回执及实际工作区的 branch/HEAD/status。若与首条交接消息不符，保留差异并报告，不重置文件。完成这一次接手后结束回合，等待用户给出下一项；不要自动执行下面任何事项。

若用户明确选择启用 f043，才按 [本包安装说明](../../LOCAL-EVENT-INDEX-CANDIDATE-INSTALL.txt) 开始：确认针对本包的启用决定，在实际 Codex 内置浏览器导出并预检当前完整备份，保护原 ab0 包/入口，确认旧进程身份后才切换；正常更新页面和 Service Worker，不清缓存、注销控制器或清库。最小现场验收仅新增明确合成记录，原资料保持；失败直接回到 ab0 应用，不自动导入旧备份覆盖新研究。

若用户选择继续改善或扩大分发，另确定具体范围，在合成资料/独立 profile 验证；第二台 Windows、人工原生保存弹窗、完整鼠标/窄屏/键盘矩阵及真实更正后的新修订仍未测。用户目前无真实更正，保留原盘，不为测试随意改出生资料或规则。

正式专家资格凭证、独立原始意见、来源权利和公开发布仍分别未通过。已有工程成功不是这些门的授权；不合并 main，不公开发布或上传安装 ZIP，不代替专家作真值认定。`apps/web/src/lib/local-user-data-cleanup.ts` 继续禁止人工读取、修改、暂存或提交；既有工具只读授权不能扩大为人工操作。手工交接不需要访问它。
