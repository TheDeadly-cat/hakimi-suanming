# 阶段 D：非技术专家 Synthetic 双浏览器 Clean-Profile 运行观察 v1

日期：2026-09-04（Asia/Shanghai）

## 结论

本轮只闭合了一条**协调人使用的合成页面工程运行证据**：在本机已安装的 Chrome 与 Edge 中，固定 synthetic A/B 页面各完成一次 exact-pin clean-profile CLI probe，并且都在页面观察后通过 CDP `Browser.close`、直接 browser child code 0、无强制终止兜底、server 关闭，以及删除尝试后有界重复路径缺失的条件下输出 final observation 与 `SESSION_CLOSED`。

这不是现实专家测试。没有读取或输入真人专家回件、身份、资质、联系方式、命盘或第三方私有材料。当前现实账仍为：

| 账本 | 当前事实 |
|---|---|
| Binding 正式冻结 | `0/12` |
| 已核验且彼此独立的现实专家 | `0/2` |
| 内容真值 | 未建立 |
| 专家真值 | 未建立 |
| 专家与 AI 准确度比较 | 未开展 |
| 作品层／版本层／载体层权利结论 | 未闭合 |
| 发布就绪 | 否 |
| 公开部署授权 | `false` |
| 专家背书声明授权 | `false` |
| 发布治理 | `legacy-v13 / targetSchema 13 / migrationId null` |

## 本轮实现

- clean-profile launcher 新增 `--probe`，使用系统随机 loopback 端口、新建 system-temp profile、`DevToolsActivePort` 和 loopback CDP。
- attach 前只检查一次 `/json/list` 快照：一个精确 synthetic page target；其他当时已见 target 仅允许固定 Omnibox `browser_ui` 闭集。
- page session 启用 Page／Runtime／Network／Log 后绑定新 main-frame reload；观察精确页面身份、无外部回件输入面、固定 `58/54/4/0`、390×844 页面级无横向溢出，以及明确列举的 SW／storage／warning／error／URL 事件。
- 页面观察先形成进程内 provisional capability；只有 same-run 关闭与清理条件全部满足后，才形成 final runtime observation。Test adapter、序列化 clone、跨 run 拼接或失败清理均不能签发 final。
- Windows 正常收口先使用 CDP `Browser.close`。`taskkill /T /F` 仅为失败清理兜底；使用兜底的 run 不能得到 final observation。
- provisional 与 final 两种 record type 都加入 formal successor deny inventory；直接输入、opaque base64 包装和 v4 解密后的 inner-type 重包装均不能转成 formal evidence。
- 新增显式、非默认的 `npm.cmd run test:real-browser-probe`，只有机器空闲并允许弹出全新临时浏览器窗口时才运行；未运行必须记 `NOT_RUN`。

## 冻结观察身份

固定 12 文件 source bundle：

`2ffec53752fd3b346fe13e2f9a90a80d08b55d04cd64064ab6dd9a87251d36f3`

| Browser install candidate | executable raw SHA-256 | final run |
|---|---|---|
| Chrome | `bda33d5c0634050dc77dbd73a97c25c4b3ded0d385d08277e02ac1165f6fab1d` | exit 0；final observation；`SESSION_CLOSED` |
| Edge | `bf9cb9e184d1719e2ebb7ce66b1fad2efaca215bd86796ed474d0a025b6882ab` | exit 0；final observation；`SESSION_CLOSED` |

两次 final observation 均为：

- `recordType=bazi_review_ui_synthetic_pair_cdp_runtime_observation_candidate_v1`
- `purpose=synthetic_pair_viewer_visual_qa_only`
- `evidenceClass=engineering_runtime_observation_only`
- `admissionEffect=none`
- `testAdapterUsed=false`
- `comparedFieldCount=58 / exactMatchCount=54 / unresolvedDifferenceCount=4 / formalTwoOfTwoCountDelta=0`
- `mobileViewport=390x844 / mobileClientWidth=375 / mobileScrollWidth=375`
- `Browser.close` command response observed；直接 child code 0；`forcedTerminationFallbackUsed=false`
- 删除尝试前初始 endpoint identity 匹配；删除尝试后有界重复路径缺失

本次显式观察中，Chrome 的 auxiliary UI／request／response／resource count 为 `2/8/8/7`；Edge 为 `0/7/8/6`。这些 count 只描述各自一次 page-session 观察窗，不能推导 request-response loader correlation 或 browser-wide network 完整性。

## 验证账

| 验证 | 结果 | 能说明什么 |
|---|---:|---|
| Pilot Node 全集 | `102/102` | 合成合同、封存／回件、双席并列、无代码单条演练与 launcher 边界 |
| Launcher 定向 Node | `22/22` | 包括 close-before-response 竞态、adapter／clone、失败关闭与 cleanup 身份边界 |
| Real-browser CLI | Chrome + Edge `2/2` | 本机真实 executable 的 synthetic clean-profile final 路径 |
| Pilot Playwright Chrome | `18/18` | 页面交互与 390×844 等浏览器行为 |
| Pilot Playwright Edge | `18/18` | 同一页面测试在 Edge executable 下通过 |
| Formal successor strict TypeScript | 通过 | 本轮 formal deny 变更类型可检查 |
| Formal successor Vitest | `3 files / 216 tests` | provisional／final 均不能进入 formal intake |
| `check:release-governance` | 通过 | 继续为 `legacy-v13 / 13 / null`；公开部署和专家声明授权仍为 false |
| `check:system-contract-draft-boundaries` | 返回既有 17 条红项 | 与接手时相同，没有新增本 tranche 红项；含受限文件明确未检查 |

未运行全仓 typecheck、默认 Web build 或 `check:web-storage-import-boundary`。本轮只改 isolated expert-review 相关草案、测试与本记录，未改生产 Web；已知受限文件 `apps/web/src/lib/local-user-data-cleanup.ts` 未读取、未修改。全仓 typecheck／默认 Web build 的既有阻塞没有因此被解决。

## 失败历史与修正价值

本轮没有把中间失败隐藏成成功：

1. Chrome 的 Omnibox `browser_ui` target 使“唯一 target”假设失败，随后改为精确辅助 target 闭集。
2. component extension Service Worker target 暴露仅使用 `--disable-extensions` 不够，加入相应 component-extension 参数；这仍不是持续 target discovery 证明。
3. app-mode favicon 请求产生 404，改为固定 bundle 内 SVG icon 和精确 server allowlist。
4. 旧 `loadEventFired` 可能让初始 DOM 过早读取，改为新 main-frame loader 绑定和 ready-state 轮询。
5. Windows `taskkill /F` 会让直接 child 以 code 1 退出，因此不能把强制终止误作正常通过；改为 CDP 优雅关闭，强杀只作失败清理。
6. 修复 adapter Proxy／clone 伪装、停止期间首次观察到非零退出、CDP reload waiter rejection、连接先关闭时 command-response 标记反转等竞态。
7. 将 target、network、storage、process 与 cleanup 字段收窄到实际观察范围，避免从局部窗口外推全局保证。

## 临时路径分账

最终成功运行没有新增 `hakimi-bazi-pair-synthetic-*` 残留；延迟检查也没有发现仍绑定这些路径的 Chrome／Edge 进程。

system temp 中仍有四个早期失败／旧逻辑 run 的 synthetic-only 历史目录：

- `hakimi-bazi-pair-synthetic-CMc14P`
- `hakimi-bazi-pair-synthetic-jnDFSU`
- `hakimi-bazi-pair-synthetic-Tu2Xla`
- `hakimi-bazi-pair-synthetic-VgCVfZ`

它们不含本轮现实专家或私有回件；此前精确删除尝试未获执行，本轮没有绕过策略继续删除。因此不能声称物理擦除，`cleanupAtomicityEstablished=false / physicalErasureEstablished=false` 保持不变。

## 专家不懂 AI 或代码时怎么复核

专家无需审查程序，也不需要理解 hash、JSON、CDP 或模型内部。专家只负责自己擅长的六件事：规则是否成立、适用条件、反例、流派边界、材料是否足够、表达是否过度确定或有风险。技术动作由协调人与工程工具承担。

推荐现实流程仍应是：

1. 协调人把一条 Binding 转成中文单席题面，只放已获准提供的材料和合成边界案例。
2. A、B 两名专家分别完成；任一席完成前不能看到另一席意见。
3. 专家选择“支持／反对／材料不足”，并说明条件、反例、流派和建议改写。
4. 不会打字时由协调人逐字代录，不总结、不润色、不替专家选答案；完成后逐项读回，由专家确认。
5. 两份原始意见分别保存与封存，不覆盖。补充、更正、撤回应追加记录。
6. 两席完成后才逐字段并列；分歧默认保持 unresolved。不能多数表决、求平均或让生成模型自动选赢家。
7. 只有两位专家对同一修订文本分别重新明确认可，才可形成共同接受的候选；否则 defer 或 reject。

“专家准确度与 AI 差不多”目前只能作为待研究假设，不能由专家复核流程证明。专家复核首先检查规则／来源／表达，不是准确度竞赛。若要比较 AI、专家、以及专家复核后的 AI，必须另开盲法、预先固定指标和结果标签的 accuracy study，并把它与本项目的 formal expert gate 分账。

启动首个现实试点之前，仍需 owner 明确真实资料处理授权、仓外保管人和位置、保留／删除／撤回／事故流程、两名专家的身份／资质／scope／利益关系／现实独立性核验、参与同意、完全相同且冻结的输入材料，以及可信分发／first-seen／custody 流程。第一轮应只选一条 Binding 和合成案例，不使用真人命盘。

## 明确不能外推

本观察不证明首次 `--app` 导航、连续 target discovery、browser-wide network、response body digest、loader correlation、`fromServiceWorker` 排除、browser profile 系统级隔离、全部浏览器进程树退出、endpoint 与 spawned process 因果绑定、可信启动、同权限竞态排除、ABA、原子清理或物理擦除。

它也不证明真人参与、专家身份／资质／独立性／意见真实性、内容真值、命理准确度、来源许可、权利法律结论、发布就绪或公开发布授权。
