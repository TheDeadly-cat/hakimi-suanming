# @hakimi/case-import

DOM-free 的 CSV 案例导入计划生成器。它负责 RFC 4180 解析、字段映射、`BirthInput` 契约校验、稳定去重指纹、预览统计、分块和取消；它不读取文件、不执行单元格文本，也不写 Dexie。首版单文件硬上限为 5,000 个数据记录，空行也计入浏览器安全上限；第 5,001 条会在 parser 继续构造计划前以 `ROW_LIMIT_EXCEEDED` 拒绝。单条逻辑数据记录最多保留 131,072 个 UTF-16 字符；超限后 parser 进入丢弃模式，以 `CSV_RECORD_TOO_LARGE` 标记该行并继续处理后续记录，避免异常单行占满浏览器内存。

首批时间精度只接受 `exact_minute`（精确到分钟）和 `unknown_hour`（未知时辰）。未知时辰的 `time` 必须为空，包不会用中午、子时等合成时间代替。

```ts
const plan = await buildCaseImportPlan(csvText, {
  mapping: {
    alias: "案例名",
    date: "出生日期",
    time: "出生时间",
    timePrecision: "时间精度",
    timeZone: "IANA时区",
    sex: "性别",
    latitude: "纬度",
    longitude: "经度",
    tags: "标签",
    sourceNote: "来源备注"
  },
  duplicatePolicy: "skip",
  chunkSize: 100,
  signal
});
```

`plan.imports` 只是后续 UI/事务层可消费的候选批次。即使 `plan.rows` 中存在坏行，好行仍会进入 `plan.imports`。Web 调用方目前把 `exact_minute` 重新计算为正式命盘，把 `unknown_hour` 重新计算为保留 `time=null` 的 13 探针候选组；这个包本身仍不排盘、不选主盘、不写库。数字列索引可区分同名表头，适合映射界面。预检指纹只是快照提示；调用方必须在真正写库的同一事务内再次执行重复策略。当前 Web 仓库用可重建 `birthFingerprints` 索引完成跨标签页原子复查。
