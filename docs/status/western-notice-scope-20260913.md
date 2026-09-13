# Western 构建许可证观察：当前与历史分项验证

日期：2026-09-13。基线为 `b8de58c22759428fe8f07da0862eac51eaf78051`，修复位于 `codex/western-notice-scope-20260913`。本批只修改验证工具、对应测试与原始输入夹具；既有 c15ef/5188、905/5189 和 4de 修复包均不重建、不切换。

## 首错与修复范围

默认 `check:western-isolated-build-license-notices` 原本将当前两份构建结果及当前源文件与 2026-08-30 的固定观察记录比较。9 个记录输入中，rules-preview HTML 已由 19202 字节变为 19411 字节，包含黄道方法说明及模板版本更新。因此当前构建观察成功，但默认 CLI 和历史正例失败。

原 HTML 已从 Git blob `1263d3a2b63f0e00322b078abe48d92281be363b` 找回，SHA-256 为 `44e4f245ccea8b6e0d35f0a85c69583e86cac90b337c3b9017127ec220e880d8`。在同一隔离检出、同一运行时和依赖下，原 HTML 通过原默认 CLI；当前 HTML 只通过当前构建观察，不符合历史输入。此因果对照保存在上一批 `remote-ci-34729048641/historical-replay-v1`。

本次默认 CLI 依次执行并分别报告：

1. 当前源码的两份实际受控构建及当前 9 项 basis 摘要。
2. 精确历史输入对应的两份独立受控构建，以及未修改的原 v1 观察记录核验。

任一部分失败，默认命令仍失败。返回对象用 `currentBasisArtifacts` 和 `historicalEvidence` 分开表达，历史部分明确 `currentSourceApplicabilityEstablished:false`。没有生成或选中新的 observation child，没有把旧摘要签到当前源码。

底层 `runWesternIsolatedBuildLicenseNoticeVerification()` 原有默认行为保留：当前源码冒充历史输入仍被拒绝。既有冻结消费者不会通过新 CLI 的结果被静默提升。对应拒绝负例已加入完整测试文件。

## 历史重放的实际边界

`scripts/fixtures/western-notice-v1-original-inputs.zip` 包含 9 份原始 basis 文件和原观察 JSON，共 10 项、19352 字节，ZIP SHA-256：

`f33a182d6d304c422fd826d19f6abcb37cc2b1cf4b3f01ace4d3e176ac97fa4f`

先核对 ZIP 精确身份、完整路径集合和每个输入身份，再在专用临时目录重放。只有已变化的 HTML 来自历史；另外 8 项固定配置、锁和许可证仍要求与当前对应文件逐字节相同。辅助代码从当前三个相关包复制，未安装归档依赖，也未恢复或宣称得到完整历史源码提交。重放只支持原记录明确列出的许可证资产、HTML 链接和 worker 标记观察，不建立当年完整应用或构建的来源证明。

临时源目录位于预先存在的 `scripts/fixtures/western-notice-replay-work` 下，输出另存受控临时目录，检查完成后仅清理自身持有的目录。没有写入当前 HTML 或历史 JSON。测试核对当前源字节、原记录字节、项目根目录 mtime/ctime 及临时目录集合前后不变。

原观察 JSON SHA-256 仍为 `98525929045505831e6f62feaa6a3a9802c5e5680637463464f4f1030e7e45d9`。许可证语义、权利、再分发、专家及公开发布授权标志全部保持 false。

## 验证结果

| 范围 | 结果 |
| --- | --- |
| 完整 Western notice 测试文件 | 29/29；无跳过、取消或 todo；保留原正例、假回执、越界、链接、许可证篡改负例，新增归档篡改与原接口拒绝当前输入两项 |
| 默认 Western CLI | 实际完成当前及历史分项检查，退出 0 |
| 后续 Ziwei notice CLI | 退出 0 |
| 工作流治理 CLI | 退出 0 |
| Node 文件清单检查 | 190 个路径注册正确；仅证明清单，不冒充执行 |
| 完整 independent-system-evidence 基线 | 74 文件，1395 项：955 通过、383 失败、57 取消、0 跳过；7 个文件初始化阶段缺少结果摘要 |
| 修复后完整相关组 | 同一 74 文件，1397 项：959 通过、381 失败、57 取消、0 跳过；缺少摘要的仍为同一 7 个文件 |

逐项对照保留文件、层级、测试类型、重名出现次数，仅显式归一化两个工作区路径及改名的历史正例。恰好关闭上述两项 Western 失败，新增两项测试通过；其余结果身份、剩余失败消息和初始化缺失集合相同。没有删测试、筛选完整组或把这些结果从原 current-governance 的 249 项中扣除。

完整组仍然不合格；381 项失败、57 项取消及 7 个初始化缺失结果继续保留。定向通过也不代表完整四体系历史组或正式准入通过。

## 首次失败与未证实事项

首轮定向运行 26/29：解压库返回 Uint8Array，原严格 JSON 入口要求 Buffer。显式转换为 Buffer 后完整重跑 29/29，未放宽解析器。

首轮完整候选组为 958 通过、382 失败、57 取消，另有一项基线没有的 Vedic CLI `RUNTIME_PROPOSAL_CLOSURE_INVALID`。进一步实测发现，新重放过程在项目根目录创建临时目录，确实改变根目录元数据；已改到专用父目录，并加入根目录元数据保持不变的断言。修复后完整组不再出现该结果差异。没有捕获首次 Vedic 失败的最内层 cause，因此不将根目录干扰宣称为那一次失败的唯一已证实原因，也不丢弃首轮结果。

## 复验与记录

```powershell
node --test --test-reporter=tap scripts/verify-western-isolated-build-license-notices.test.mjs
node scripts/verify-western-isolated-build-license-notices.mjs
node scripts/run-node-test-group.mjs independent-system-evidence
```

原始日志、三轮完整组、逐项对照、首次失败及根目录元数据探针在 `Z:\HakimiBaziBackups\LocalDelivery\2026-09-13\western-notice-scope-v1`。提交后的远端 CI 必须绑定该提交另行记录；以上本地结果不替代远端结论，也不更改安装入口或专家计数。
