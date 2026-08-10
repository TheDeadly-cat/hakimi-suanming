# Fortel 1.3.4 紫微命名字段差分草案

这是第二个、仍与八字生产应用完全隔离的紫微工程实现探针。它锁定
`fortel-ziweidoushu@1.3.4`，每次在全新 Node Worker 中计算；差分入口同时通过隔离的
iztro 适配器重新运行 `iztro@2.5.8`，再比较语义已对齐的命名字段。外部 JSON 的无密钥
摘要自洽不再被当作固定引擎身份；兼容入口也必须与一次新鲜 iztro 运行的事实摘要一致。

报告读取分成两层：`verifyFortelDifferentialReportStructureAndDigestDraft` 只证明固定结构与无密钥
内容摘要自洽，不认证过去确实运行过 Worker；`reproduceFortelDifferentialReportWithFreshEnginesDraft`
会重新启动两套固定引擎，只对输入、具名检查、稳定源码/闭包身份与投影摘要做复现比较，并返回本次
新报告。历史请求 ID、Worker ID、时间戳和 iztro 整件摘要不会被冒充为已认证。

它不是专家真值、不是多数投票器，也不会给两套实现打总分。报告只保留三种状态：

- `match`：同名字段的工程输出相同；
- `different`：工程输出不同，但不裁定谁对谁错；
- `unsupported`：定义、量表或字段集合尚未对齐，拒绝比较。

当前比较：公历/农历、年日干支、命身宫、五行局、顺逆、十二宫职与宫干、14 主星、
14 辅星、出生年四化及十二段大限。月干支、时干支、亮度、辅助星全集、借宫、流限与
解释层明确不比较。

已稳定观察到的工程分歧包括：

- 戊年化科：Fortel 为太阳，当前 iztro default 为右弼；
- 庚年化科：Fortel 为天府，当前 iztro default 为太阴；
- 壬年化科：Fortel 为天府，当前 iztro default 为左辅；
- 晚子：当前 iztro profile 采用次民用日，Fortel 保持原民用日；定义尚未对齐，差分入口
  以 `UNSUPPORTED_LATE_ZI_POLICY` 失败关闭，不把这类结果计为普通实现差异。

直接查看 Fortel 的规范化投影：

```powershell
npm run demo:ziwei:fortel -- 1995-08-18 6 male
```

同时新鲜运行两套隔离适配器并生成逐字段报告：

```powershell
npm run demo:ziwei:fortel -- --compare 2020-08-18 6 male
```

边界：单引擎投影接受严格公历、`1900-01-31..2100-12-31`、13 个时辰槽、男/女计算字段和
天盘参考。Fortel 的 `withText`、地盘、人盘、弱日期正规化、浮点小时及默认性别全部禁用。
跨引擎报告暂不接受晚子槽。报告不写数据库、不进入 full v1.2、不进入普通 Web 构建。
