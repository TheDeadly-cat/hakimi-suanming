# 专家命令职责拆分验证记录

本次源码基于 `3a6fa1e3dd7edad26dde203205bf98eaf34e4956`，分支为 `codex/expert-command-separation-20260913`。设计见[专家命令职责决策](../decisions/expert-command-roles-20260913.md)。这是独立草稿改动，尚不满足合并或正式发布条件。

结构检查与进度报告可在真实当前任务包验证通过后退出 0；无私有输入时明确报告本次输入为空、收到 0/2、合格 0，正式准入仍拒绝。原正式 CLI 与新增正式别名保持同一实现。Quick CI 分列工程聚合与正式聚合，后者仍要求专家准入。默认 npm 正式生命周期未改为工程检查；完整工程正文继续使用已有诊断入口。

## 本地执行结果

执行日期：2026-09-13。独立工作区：`C:/Temp/hakimi-expert-gates-20260913`。

| 命令 | 结果 |
| --- | --- |
| `node --test --test-reporter=tap scripts/verify-bazi-scoped-current.test.mjs scripts/verify-bazi-expert-inspection.test.mjs` | 50/50 通过，失败、跳过、取消均为 0；包含 37 项原有当前对象验证与 13 项命令职责测试 |
| `node scripts/run-node-test-group.mjs ci-contracts` | 完整组 5 个文件、56/56 通过，无缺失文件结果或跳过 |
| `node --test --test-reporter=tap scripts/verify-release-governance.test.mjs` | 完整文件 228 项：208 通过、20 失败，跳过、取消均为 0 |
| `node scripts/verify-release-governance.mjs` | 退出 0；实际配置验证通过，所有专家与公开部署授权仍为 false |
| `node scripts/run-diagnostic-stage.mjs typecheck` | 完整源码图正文通过，`programStarted:true`、退出 0 |
| `node scripts/run-diagnostic-stage.mjs build` | 完整 Web 构建正文通过，`programStarted:true`、退出 0；只生成本工作区产物，未安装 |
| `node packages/bazi-core/scripts/verify-historical-natal-runtime-closure.mjs --check` | 退出 0 |

两层聚合测试实际调用 Bash：逐个依赖注入 failure、skipped、cancelled 和空结果，两个聚合均拒绝；工程依赖全成功而专家失败时，工程聚合通过，正式聚合仍失败。当前对象篡改、虚构资格、错误参数、预加载环境与私有错误信息泄漏的拒绝边界也纳入测试。

本次未在本地重跑完整 Vitest 或浏览器；CLI/CI 检查不能替代同产物浏览器验收。推送后的远端运行必须按精确提交另行记录，不以本地通过推定远端成功。

## 保留的失败与边界

首次新增命令测试为 12/13：测试将私有请求错误写成对象；原消费者要求 JSON 数组。修正为 `[]` 后 13/13，再与原验证一起取得 50/50。没有放宽消费者格式。

首次工作流治理回归为 206/228、22 失败。新增工程聚合后，两项旧测试按全文件首个匹配行删除依赖，误改了工程块，却期待正式块的错误。现改为逐个聚合块分别删除依赖、结果绑定和失败循环入口，未削弱生产验证。

最终 20 个失败名称与 2026-09-10 基线中该测试文件的 20 个失败名称完全一致，新增失败名称为 0。这只确认失败集合相同，不代表全部历史根因已解决；整个 current-governance 组原有 269 项失败仍需单独分类和复验，不能用本次定向结果替代。

根 `package.json` 增加命令后，当前运行时闭包清单只更新该文件的字节数、SHA-256 与总摘要。历史原件锁、旧专家意见、current 选择和正式 npm 闭包未改写。阻断登记只增加独立专家 CI job 名称，原授权及历史失败记录保持原值。未改现用 c15ef 安装、5188 入口或浏览器资料。

原始日志、逐命令退出码、SHA-256、失败集合对照及提交备份保存在 `Z:/HakimiBaziBackups/GithubSync/2026-09-13-expert-command-separation-v1/`；首次检查日志保存在 `Z:/HakimiBaziBackups/LocalDelivery/2026-09-13/expert-command-separation/focused-checks-v1/`。原始资料和私有专家材料不随本次源码提交上传。
