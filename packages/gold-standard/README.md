# @hakimi/gold-standard

该包把“回归候选”“独立实现交叉检查”“人工确认金标准”分开，防止把同源库输出或商业 App 截图计入发布金标。

当前包含两组彼此独立计数的候选数据：2024 年十二个“节”的前一秒、当刻、后一秒共 36 行，以及 24 个香港天文台公农历权威对照日期对。

项目级 `release-gate` 另把 360 例固定为十二类精确配额。当前两组只能分别映射到“界月规则 36”和“公农历转换 24”，总计 `candidate=60`、`verified=0`、剩余 300；重复案例/语义指纹、跨类别复用、配额溢出、证据伪造或声明计数不守恒都会失败关闭。

节气边界数据：

- 每行使用 `exact_second` 出生时间契约；
- 每行冻结四柱回归快照并可自动复算；
- 当前全部为 `candidate`，`verifiedGoldCaseCount=0`；
- 只有同时记录权威来源、复核人、复核时间和裁决记录，Schema 才允许升级为 `verified`；
- 360 例发布门尚未通过，包会持续返回 `releaseGatePassed=false`。

农历转换数据：

- 24 个唯一日期对，每个执行农历→公历与公历→农历，共 48 个方向断言；
- 24 条都绑定香港天文台日期行、来源版本与原始材料 SHA-256；同机构文本和 CSV 只算一个来源谱系；
- 当前适配器 48/48 匹配；.NET Framework 4.8 冻结运行记录为 23 条匹配、1 条不支持、0 条分歧，`npm run audit:calendar:dotnet` 可实际重跑并核对；
- time-core 固定覆盖 5 类不存在、月份越界或转换后超出产品范围的负例，并锁定结构化错误码；
- 软件差分与人工证据状态分开计数，当前仍为 `candidate=24`、`cross_checked=0`、`verified=0`；
- `calendarQuotaPassed=false`，不会因自动测试通过而升级发布状态。
- 已实现绑定完整 fixture、不可变数据集、来源材料、冻结差分运行、逐案候选与具体审核包摘要的农历双人裁决 envelope；导入在 Zod 前经过声明式 JSON 安全边界，软件 `unsupported/mismatch` 不能冒充正证据；
- 当前审核策略仍为 `candidate-only-v1`：协议预检不等于真实签字，也不会持久化。真实双人裁决尚未纳入新版本 fixture 前，Schema 继续禁止任何案例进入 `verified`。

`npm run test:gold` 会运行整个 `packages/gold-standard/src`，同时覆盖节气候选、审核工作流、农历转换候选、360 配额总账和 P0-03 工程诊断契约。

## P0-03 固定种子工程诊断

`npm run audit:p0-03:differential` 会重新生成五年代 × 四季 × 四昼夜 × 250 的 20,000 个唯一秒级输入，完整排盘两遍，再把同一批公历日期交给本机 `.NET ChineseLunisolarCalendar`。当前冻结结果：

- 内部确定性：20,000 执行、20,000 一致、0 mismatch、0 calculation error；
- 独立历法字段：19,832 matched、7 mismatch、161 unsupported；
- 7 条都是 2089/2097 的一日差异，保持 `unresolved_calendar_table_difference`；
- 完整报告只保存异常输入与内容摘要，避免为 20,000 个成功项复制大体积明文；`--check` 仍会全量复跑并进行字节级比较；
- 固定 `engineering_diagnostic_only`、`countsAsVerifiedGold=false`、`verifiedGoldDelta=0`、`fullP003GatePassed=false`。

这里的 .NET 只对照公历→农历日期/闰月字段，不能当完整四柱 oracle。详见 [P0-03 工程差分报告](../../docs/P0-03工程差分报告-v0.1.md)。

## P0-03 2089/2097 连续历法窗口

7 个固定种子触发样本已扩成版本化数据集 `hakimi-p0-03-calendar-divergence-windows-v1`。两个窗口分别覆盖 `2089-09-03`—`2089-10-04` 与 `2097-08-06`—`2097-09-06`，每个窗口 32 行：边界前后各 1 个全源一致控制日，中间 30 个连续一日差异。因此总计 `64 = 60 divergence + 4 controls`，原诊断中的 7 条仍只作为触发关联，不另算案例或金标。

`npm run audit:p0-03:calendar-windows` 会固定 v1 数据集摘要，重放当前适配器、ICU 78.3 与 .NET Framework 4.8 的 64 行观测，从 HKO 2089/2097 原文解析并逐日核对 64 行，核对 USNO 2089/2097 API 响应并重建两事件规范化摘要，同时复核父 P0-03 计划、报告与 7 个触发映射。四个联网端点使用固定 allowlist、禁止重定向、30 秒超时和 2 MB 流式上限。当前结果固定为 `resolutionStatus=unresolved`、`countsAsVerifiedGold=false`、`verifiedGoldDelta=0`（本轮 `verified +0`）、`fullP003GatePassed=false`；它不改变 `candidate=60`、`verified=0` 和剩余 300 的总账。`npm run test:audit:p0-03:calendar-windows` 是不联网的 runner 失败关闭回归。

来源角色与分裂必须保持显式：

- HKO 是官方历表，也是窗口逐日观测的权威来源；
- USNO 是政府天文 API，只提供独立朔事件时刻，不是完整中国农历表；
- ICU 与 .NET 是独立软件实现，当前适配器是被审计对象，三者都不能冒充人工确认的权威真值；
- 2089 窗口中，HKO、当前适配器、ICU 与 USNO 的朔事件日期倾向同侧，.NET 在另一侧；2097 窗口中，HKO、当前适配器、ICU 与 .NET、USNO 的朔事件日期倾向分裂；两组都接近固定 `UTC+08:00` 午夜，仍须人工裁决。

权利边界同样失败关闭：[HKO 网站使用条件](https://www.hko.gov.hk/en/readme/readme.htm)要求非商业复用遵守署名、声明等条件，[商业使用条件](https://www.hko.gov.hk/en/appweb/commercial.htm)要求事先书面授权；[DATA.GOV.HK 条款](https://data.gov.hk/en/terms-and-conditions)不会自动覆盖 HKO 的 2089/2097 远期网页历表。当前 fixture 只冻结最小审计观测、来源定位与材料哈希，不代表取得了随商业产品复制或再分发整份 HKO 历表的许可。

`calendar-divergence-review` 提供候选包、两份独立逐日审核与第三方裁决三层 API。每份审核和裁决都必须按固定顺序覆盖 64 日并绑定逐日摘要；两位 reviewer 的 ID 与离线身份记录摘要必须分别不同，裁决人还必须与两者都不同。A/B 意见不同时，裁决人可在至少一份有效审核明确支持的结论中逐日选择；两份都未支持的结果不能凭空生成。当前 v1 即使 64 日在结构上全部解决，也固定返回 `identityVerified=false`、`eligibleForCuratedIntegration=false`、`countsAsVerifiedGold=false` 和 `verifiedGoldDelta=0`，只能交给现实身份核验与维护者受控整合流程。

下一步分开推进：36 条节气候选仍需补权威瞬时资料与双人裁决；24 条农历候选已有香港天文台权威对照、可重跑的 .NET 差分及审核协议，接下来要让两位真实复核人使用同一内容寻址审核包完成逐案裁决，并由维护者核验身份、来源后纳入新的版本化 fixture。之后再扩展换日、时区/DST、太阳时、顺逆起运与关系表案例。

## 双人审核工作流

设置页现在可以导出 `hakimi-gold-review-bundle@1.0.0`。审核包包含 36 行候选、工作规则摘要和每行独立的候选摘要，不包含用户案例。复核结果使用 `hakimi-gold-decision@1.0.0`，并绑定：

- 数据集、候选 ID、候选摘要与规则摘要；
- 接受原期望、替换期望或拒绝候选三种明确决定；
- 至少一个带版本/页码或稳定定位的权威来源；
- 两个不同 `reviewerId` 的主复核与第二复核声明；
- 裁决时间、理由以及被替代的旧裁决摘要。

`preflightJieBoundaryDecision` 会拒绝摘要篡改、旧候选套用、规则不匹配、同一人双重复核、接受同时改值，以及“替换”却没有实际变化的记录。

SHA-256 只证明文件内容没有变化，不证明复核人真实身份，也不是数字签名。网页预检不会持久化裁决或增加 `verifiedGoldCaseCount`；只有维护者线下核验身份和来源、把裁决纳入版本化 fixture 并通过代码审查后，才允许进入发布计数。

设置页另有独立的“农历转换候选审核”入口。`hakimi-calendar-conversion-review-bundle@1.0.0` 会绑定完整 candidate fixture、不可变数据集、来源与材料 SHA-256、.NET 冻结运行以及 24 个候选自身摘要；`hakimi-calendar-conversion-decision@1.0.0` 还必须绑定复核人实际使用的审核包摘要。预检会重新计算包内候选，而不是只相信文件自报的摘要；在 reviewer 公钥、现实身份和来源真实性未核验前，固定返回 `identityVerified=false`、`sourceAuthenticityVerified=false`、`eligibleForFixtureIntegration=false` 与 `countsAsVerifiedGold=false`。
