# 首次控制器接管输入保护：4de42e9db980 修复候选

日期：2026-09-13（Asia/Shanghai）。此记录用于源码与候选包交付。既有 c15ef / 5188 日常安装和 9057371baf85 / 5189 候选安装继续保留；本次没有切换服务、快捷方式或浏览器资料。

## 修复与来源

在 905 产物的真实 Edge、Chrome 中复现：首次打开尚未受 Service Worker 控制的页面时，用户可以先输入别名、标签和来源备注；首次控制器接管触发整页导航后，这些未保存输入被清空。

修复复用 `releaseInteractionReady`：生产默认 v13 在首次受控文档完成 BOOT_OK 前保留既有 inert 交互门。数据库启动继续独立完成，以允许 Service Worker 注册；注册失败进入既有恢复界面。没有新增草稿存储、修改数据库代际或放宽接管禁写条件。

新增两个场景进入原有完整 boot 验收组，每浏览器由 6 条扩为 8 条：真实 worker 响应延迟时禁止输入并在控制器确认后开放；注册故障显示恢复界面，恢复响应后正常重试。旧计数 6 仍可按历史结构解析，当前语义要求 8，旧回执没有重签。

## 精确交付身份

| 对象 | 身份 |
| --- | --- |
| 应用源码 | `d3ff1bdcc64d0917dcc604f753ac896eb62a9c1e`，`codex/first-controller-interaction-20260913` |
| 安装工具源码 | 本记录所在的 `codex/first-controller-package-20260913` 提交；与应用源码分开 |
| Web 构建 | `4de42e9db980`，137 文件，`legacy-v13 / targetSchema 13 / migrationId null` |
| Evidence ID | `hre1-8f0e82a7568246e68d2c535527e3431d` |
| 原产物锁 SHA-256 | `d8a12d67f39555ff598a583c4b90ab2746156a4982f2cfbd5a1a6065a08b0f62` |
| 产物集合摘要 | `0ef6aafa437d6d894a232a1789dd8e35d72de9df9dd02982b38bc75609e6c1e5` |
| 安装 ZIP | `hakimi-local-candidate-4de42e9db980-v1.zip`，2,324,541 字节，153 文件 |
| ZIP SHA-256 | `666ac9ac145879f3a06827b32809abb7ab74071d08402d33f4cd91ab52529ccd` |
| 包清单 SHA-256 | `385bed8a9441098ad7347103aaf2ccf1323d0b4f16d606a2b130048fbdd02026` |

包包含原锁定应用、运行脚本、安装说明及 boot/PWA/web-v1-flow 三份原始回执和三份严格结果摘要。没有因安装工具提交而重建应用或更改原回执。源、ZIP 解压副本、实际安装副本在核对时均逐字节一致；这些是端点核对，不宣称整个时间区间排除了瞬时改写。

## 已有实际验证

| 检查 | 结果和适用范围 |
| --- | --- |
| 完整 typecheck | 实际诊断入口通过 |
| 聚焦 Vitest | 5 文件 / 79 项通过，使用 Web 的实际 Vitest 配置 |
| 发布证据工具完整组 | 716/716，通过；无跳过、取消或缺失文件结果 |
| 治理与迁移路径合同 | 240/240，通过；不等于完整 current-governance 全绿 |
| SW fixture 合同 | 20/20，通过 |
| 同一锁定产物完整 boot | Edge 8/8、Chrome 8/8，严格 reporter 通过 |
| 同一锁定产物 PWA | Edge / Chrome 2/2，严格 reporter 通过 |
| 同一锁定产物完整 web-v1-flow | Edge / Chrome 2/2，严格 reporter 通过 |
| 浏览器计数边界 | 上述三组零跳过、重试、flaky；使用隔离上下文，不用日常 profile；覆盖有重叠，不累计为独立案例数 |
| 候选安装包集成验证 | 14/14：完整清单、篡改/伪造回执、目录边界、create-only 和重复安装、HTTP 服务、未知监听器保留、拒绝占用 5188 |
| ZIP 解压复核 | 153/153 文件相同，解压副本自带 CLI 验证通过 |
| 实际 Windows PowerShell 安装 | 从解压副本安装至独立 `C:\Temp` 目录，首次 `reused:false`、再次 `reused:true`；安装文件 153/153 相同；`-NoShortcut`，没有启动服务或操作浏览器 |

上表中的三份原始浏览器回执属于打包前的锁定应用。初次同步时安装副本的浏览器复验尚未执行；后续独立执行结果见下节，没有将原始回执转签。

## 首次失败保留

原 905 上新增场景的首次回归 4 条均失败，保留反例日志。第一份修复构建的 4 条功能检查虽通过，但新建的独立 receipt ID 不被严格 reporter 接受，退出 1；随后将场景纳入既有 boot 全组。扩展 boot 后，第一次发布证据组为 684 通过、32 失败；修复允许计数 8 的 schema 后完整重跑至 716/716。最初漏传 Web 配置的 Vitest 调用也保留为无效测试入口记录。没有删除首次失败或把中间产物转签为最终产物。

当前关键源码清单仅重绑实际变化的 `main.tsx` 一行，并验证旧身份不能验证新源码；历史来源、专家意见和已冻结回执未因此重算。

## 远端 CI 与剩余边界

应用源码 `d3ff1bd` 的 [Quick CI 34727971116](https://github.com/TheDeadly-cat/hakimi-suanming/actions/runs/34727971116) 已终态 **failure**。完整 Vitest（213 文件 / 2827 项）、完整 typecheck、默认构建、产物清单、发布证据工具、current 索引、history checkpoint 和专家结构读取通过。Toolchain 的 Western 固定依赖/构建观察仍不匹配，正式专家准入和两个聚合门失败。本结果只绑定该应用源码，不是后续安装工具提交的 CI 结果。

前一安装工具源码 `98134dd` 的完整 current-governance 记录仍是 740 项中 490 通过、250 失败。相比整合应用源码的 249 个失败身份，多出专家进度测试的一次 `ENTRY_PATH_MISMATCH`；随后独立文件通过不能关闭其未查明根因。另有相同失败身份的错误消息受 Windows CRLF 检出影响。此轮聚焦通过结果不替代该完整失败记录，也不把整组历史材料批量重签。

仍待：用户明确决定是否切换 5189、本人真实研究反馈、第二台 Windows 验证，以及剩余治理根因处理。真实专家资格仍为 0/2；缺失历史原文件、逐字校勘、底本关系与权利审阅继续独立处理。公开发布及旧版本迁移/回滚不是本次 GitHub 同步的完成声明。

## 安装副本复验与安装工具提交 CI

应用源码仍是 `d3ff1bd`，安装工具源码是 `e60368a9d55dde12ac31cf5658ca8ccfd83cbc90`。实际安装目录为 `C:\Temp\hakimi-4de42e9db980-install-20260913\packages\4de42e9db980-package-v1`。其自带服务器在独立随机 loopback 端口 `65471` 提供原包，通过原完整 boot 16/16、PWA 2/2、web-v1-flow 2/2；严格 reporter 全部通过，零跳过、重试、flaky。配置只修改服务来源和输出位置，原测试文件摘要在执行前后相同。

另以 Edge `153.0.4234.32` 验证工作台到帮助页的真实导航：URL 与动态标题正确、主内容非空、无框架错误层、控制台 error/warning 与外部请求均为空。1280×800 工作台和 390×844 帮助页截图已实际检查。完整研究流程包含 CSV、修订、四盘比较、证据、生命周期、检索、离线导出和 full v1.2 恢复。测试使用独立上下文；这些是合成 QA，尚不能代替本人研究反馈。

首次安装复验中 boot 16/16 通过，随后 PWA 0/2：外置配置把带末尾斜杠的地址传给会自行追加斜杠的原 spec，形成 `//`，被包服务器拒绝。修正外置配置以符合原配置的无末尾斜杠约定后，完整重跑上述三组。保留首次失败、日志、截图与 trace；没有改应用、服务器、测试断言或原包。两轮包清单始终为 `385bed8a…02026`，两个临时服务器均已关闭；既有 5189 服务仍为原 PID 48860。

安装工具提交 `e60368a` 的 [Quick CI 34729048641](https://github.com/TheDeadly-cat/hakimi-suanming/actions/runs/34729048641) 已终态 **failure**。完整 Vitest 213 文件 / 2827 项、typecheck、默认构建、产物清单、发布证据工具、CI 合同、current 索引、history checkpoint、专家结构与包工具通过。Toolchain、正式专家和两个聚合门仍失败。本结果不归于后续仅补充此记录的文档提交。

原始安装浏览器证据位于 `repair-package/installed-browser-v1` 与 `installed-browser-v2`；每轮完整 Playwright 附件另存 `playwright-test-artifacts.zip`。对应远端 Job 元数据与原日志位于父目录的 `remote-ci-34729048641`。

## 许可证观察失败的同环境定位

旧 Western notice 记录的 9 个输入中仅 `packages/western-astrology-rules-preview-draft/browser-app/index.html` 不同。原文件 19202 字节 / SHA-256 `44e4f245ccea8b6e0d35f0a85c69583e86cac90b337c3b9017127ec220e880d8`，已从真实 Git blob `1263d3a2b63f0e00322b078abe48d92281be363b` 找回并按原字节备份。当前文件 19411 字节 / `7fb485c5fa7283f71e7416a83708560776149027c1fcd0bec637afc7f384a70d`，实际改动包括黄道方法说明与模板版本，并非换行漂移。

在同一隔离 `e60368a` 检出、同一 Node 与依赖环境中，仅替换为找回的历史 HTML，原默认 CLI 实际执行两份受控构建并成功核验旧记录（退出 0）；换回当前 HTML，原默认 CLI 因记录不匹配退出 1，而 `evidenceMode:none` 的当前构建观察退出 0。完成对照后，隔离诊断目录保留历史 HTML，生产与交付源码未变。

这确立了该 CI 首错的适用范围原因，并补齐该记录的 9 个原始输入。它不代表已修复默认 CI、不代表找回完整历史提交，也不等于找回另行缺失的 20351 字节历史文档。下一步仍需在代码与测试中分开当前构建检查与原历史观察验证，保留历史正例、篡改负例和所有资格边界。

## 复验与备份

```powershell
node scripts/local-research-candidate.mjs package --artifact-workspace ORIGINAL_BOUND_WORKSPACE --output NEW_PACKAGE_DIRECTORY
node scripts/validate-local-installation.mjs --candidate --package-root REAL_PACKAGE --output NEW_QA_DIRECTORY
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\install-local-candidate.ps1 -NoShortcut -InstallRoot "C:\Temp\NEW_ISOLATED_INSTALL"
```

所有原始日志、构建锁、首次失败、严格浏览器回执、截图、ZIP 和安装核对在维护者 `Z:\HakimiBaziBackups\LocalDelivery\2026-09-13\first-controller-interaction-v1`，安装材料位于其 `repair-package` 子目录。GitHub 仅提交源码和不含私人案例的执行摘要；安装包、用户数据与古籍原件保留本地。
