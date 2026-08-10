# @hakimi/comparison-core

无 DOM 的正式命盘对照投影。它只接受 2～4 个已经由存储层验签的 `RevisionRecord`，生成字段对齐矩阵，并在同一 UTC 瞬时点并行计算六层运限。

输出先经过 `formalComparisonProjectionSchema` 的 exact JSON 运行时边界，再由 `verifyFormalComparisonProjectionIntegrity` 独立复算每个 Revision、完整字段矩阵、同步运限快照和最外层摘要。摘要格式使用独立的 `formal-comparison-hash-v1`，不能用重签最外层摘要掩盖内层篡改。

`fixtureVersion 1.1.0` 的工程黄金样本冻结 2/3/4 列场景、当前 96 个字段（含 RuleProfile 与精确规则包 provenance 的独立字段）以及现代/旧 Revision 的运限路径：

```powershell
npm run test:comparison-golden
npm run update:comparison-golden  # 只在审阅语义变化后显式执行
```

普通测试和 `--check` 只读；`--write` 是唯一改写入口。样本的证据等级固定为 `engineering_regression_only`，不是命理金标、专家裁决或吉凶结论。

边界：

- 未知时辰候选组不是 `RevisionRecord`，不能混入正式盘对照；
- 差异只表示字段不相同，不表达吉凶、优劣或推荐；
- 运限结果继续保留 `engineering_preview` 与零金标发布门；
- 本包不读写 IndexedDB，也不持久化对照会话。
