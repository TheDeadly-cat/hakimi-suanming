# 2026-09-10 源码同步与本地验证

本次从 `b7216a301a74bea0591b364b4dba32aa34409378` 起点同步现有 `codex/legacy-v13-governance-sync-20260904` 开发分支，包含此前本地 v13 工程、current/history 分离、发布证据工具和相关测试，以及 AI 回件与勘误摘要。本次不合并 main，不替换用户已安装的固定本地产物。

## 实际执行

| 检查 | 结果 |
| --- | --- |
| 完整默认 TypeScript 图正文 | PASS，exit 0 |
| 完整 Vitest 正文 | PASS：213 个文件、2825 项测试，exit 0 |
| Node `ci-contracts` | PASS：56/56；无 skip/cancel/todo |
| Node `current-governance` | FAIL：457 PASS / 269 FAIL，共 726；无 skip/cancel/todo |
| Node `release-evidence` | FAIL：699 PASS / 1 FAIL，共 700；无 skip/cancel/todo |

类型和 Vitest 使用既有 `run-diagnostic-stage.mjs` 的完整默认图入口，未排除受限文件或缩小测试图。上述是本机程序结果，不是完整 npm 准入链或远端 CI 通过；没有把 Node 分组结果相加为独立覆盖。构建与浏览器未在本次重跑，既有产物回执仍归原输入身份。

`current-governance` 的失败涉及跨体系来源 requirements、观察记录及治理断言；已观察到 `LEDGER_MISMATCH` 等错误。此次记录了完整分组失败，没有通过重写旧来源账、选择新 current 或跳过断言消除它们。

`release-evidence` 唯一失败位于 `scripts/release-evidence.test.mjs` 的 “PWA release spec can launch persistent browsers only through the policy helper”：旧正则要求 `userDataDir: testInfo.outputPath`，现有 spec 使用临时资料目录。该合同与实际隔离目录策略仍需单独协调；本次保留失败，不宣称整个发布证据组通过。

因此，**本次是带已知失败记录的开发分支同步，尚未达到全部治理/发布检查通过的状态**。各失败文件计数与原结果哈希见 [机器摘要](../review-data/github-sync-checks-20260910.json)；完整 stdout/stderr、事件和结果保存在用户指定的 Z 盘备份。

## 字节与材料边界

同步前先保存未提交差异和全部变动文件副本；暂存后逐文件验证与本地字节一致。为保留已有记录的字节身份，`.gitattributes` 对七份混合换行源文件/验证文档设置不转换文本。两个普通 CLI 包装器仅删除末尾多余空行，原文件已备份；最终暂存 whitespace check 通过。

已获得用户必要修复授权的 `local-user-data-cleanup.ts` 语法修复随本次源码更新纳入。原始专家/AI 回件、真实协调材料、四份古籍载体和本机备份不进入本次提交；仓库保存 [AI 审阅摘要](../AI辅助审阅与勘误核验-2026-09-10.md) 及文件身份摘要。该摘要不增加真人专家意见、不改生产参数、不授予来源权利或公开部署许可。
