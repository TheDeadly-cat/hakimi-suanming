# 第一阶段接续审计：阅读返回与摘要版本绑定

日期：2026-10-29。接续两份当日实施附件，第 12 节六项任务范围不变。前一目标轮次属于 progress：已交付界面、合同设计和定向证据；本轮再次发现并修复两个可独立推进的缺口，不能用等待真人试用掩盖它们。

## 当前交付

- 新固定构建 `b57972ffe0ce`，报告仍为 0.22.3，白话展示版本 `hakimi.plain-summary/0.1.1`。
- 独立目录 `C:\Users\Administrator\HakimiBaziWorkbenchCandidates\app-stage1-audit-20261029-b57972ffe0ce`，入口 `http://127.0.0.1:5245/new`。启动脚本校验内容及端口占用，依赖本机既有 Node/Vite。
- 先前 `759e7d6d3771`（5244）和 0.22.3 原试用副本（5231）保留；未替换原日常安装、浏览器资料或桌面入口。
- 实际工作树与分支不变，基底 `92d9112d8e22f6e27e72831868e24c23f07bf371`。固定副本建立时源码尚未提交；本轮源码与文档已纳入 [GitHub 同步范围](app-reading-stage1-github-sync-20261029.md)，副本原有构建身份保留。

## 已复现的问题及修复

### 读完整结论后看不到正文，也回不到原卡片

在前一固定副本的 390×844 浏览器中，点收入摘要的“读完整结论”后，正文上沿位于视口 y=-329，焦点落到 BODY，没有返回原摘要按钮。再点“一页摘要”时，原卡片位于 y=1242，超出视口。

现在打开完整结论会把焦点和视口定位到对应标题，提供“返回刚才的摘要/列表”。摘要保留挂载但在详情时隐藏，所以展开条件仍保留；返回恢复原按钮焦点与原滚动位置。月份列表保持当前年与分支。专题切换和报告搜索也定位到相应结果或需选择的阅读区域。

实际新固定副本验证：标题 y=159.89；返回前后 scrollY 都为 2428，原按钮位置一致，已展开条件保持，页面错误为 0。仅此具体阅读内返回得到验证；跨路由、Android 系统返回和进程恢复未因此获得验证。

### 旧或未知规则版本可能套用当前白话模板

前一投影按 selector/selection 或短 ruleId 匹配，没有核对 producer/provenance 版本；测试甚至允许 `rules/1`、`prose/1` 这样的非真实生产者标签得到 mapped。

现在明确支持已核对的 provenance `0.1.0`、concrete-natal-prose `0.2.0`、natal-life-story `0.3.0` 和 natal-adopted-conclusion `0.2.1`。结论及快照均须绑定对应来源版本；同一 selector 必须唯一，ruleId 必须正确。取用条目还须匹配结论 key、title 与 decision。

未知、旧、未来或不一致版本退回原文入口，不借别条结论补写。个人原文仍不获得自动规则/引文背书。投影保留来源报告版本和来源版本列表，展示版本提升到 `0.1.1`；旧存储协议未改。

## 验证范围

| 检查 | 当前结果 |
|---|---|
| 五个定向文件：摘要、阅读交互、术语、旧索引、双分支 | 51 项通过；之后补专题定位，工作台 24 项复测通过，不累加重复项 |
| 真实合成命盘的当前规则匹配 | 保持 mapped；错误版本、伪造同名 ID、重复 selector 等均回退 |
| 手机阅读内打开/返回/专题定位 | 开发页与固定副本均通过，焦点、滚动及条件展开状态已验证 |
| 固定副本读取旧报告 | 原有合成 cases/revisions/researchNotes/candidateSets 各 1 条逐项 JSON 一致，正文未重算覆盖 |
| 全仓 `npm run typecheck` | program 阶段通过；governance 因 `EXPERT_QUALIFICATION_RECEIPT_LOADER_UNAVAILABLE` 失败，整体退出 1 |
| 默认 `npm run build` | prebuild/program 阶段通过；同一 governance 原因使整体退出 1 |
| 真人理解、Android 真机、专家准入 | 尚未达成 |

Browser 插件未提供，使用仓库 Playwright 与独立 Edge headless 资料区。固定副本验证使用从前轮自动化状态复制出的合成夹具；这不代表浏览器到 App 的正式备份迁移已通过。jsdom 不实现真实滚动，位置结论依据浏览器测量，不把单测模拟当真机证据。

恢复了两份既有测试的原 CRLF 行尾，去掉上轮行尾转换造成的整文件差异；没有改变那些旧断言的意义。空白检查按 Windows CR-at-EOL 口径执行，未改 Git 全局设置。

证据目录：`C:\Users\Administrator\HakimiBaziWorkbenchCandidates\validation\20261029-app-stage1-audit`。包括修复前后位置 JSON 与截图、`focused-final.log`、`topic-focus-tests.log`、`typecheck-final-receipt.json`、`build-final-receipt.json`、`fixed-reading-return.json`、`fixed-old-report-readback.json`。

## 完成审计与下一步

六项第一阶段的代码、范围保存合同设计、前后界面、交互状态、对应测试和真人任务表均有工程交付。原报告格式、来源状态及受限文件边界保持。前一交付的验证范围见 [第一阶段记录](app-reading-stage1-20261029.md)。

仍缺用户/真人实际记录、原测试者版本、Android 真机与专家准入证据。附件中的范围保存实现、Android 原生壳及后续内容阶段没有被本次工程补漏替代，也未被标记完成。后续三轮核对确认真人记录仍未回传，整体目标已标记 blocked；这次 GitHub 同步不改变其验收状态。
