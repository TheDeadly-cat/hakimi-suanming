# Western civil-time input adapter draft

这是一个独立、私有、生产不可达的 Node 测试草案。它只把已通过
`westernBirthInputDraftSchema` 的西洋占星出生民用时间，在调用者明确指定的内容寻址
tzdb snapshot 下解析为 UTC instant、UTC offset 和 DST 歧义决策，并生成进程内可验真的工程回执。

它没有接入根脚本、domain manifest、中央 registry 或 Web 应用；`exports` 为空，
`productionImport` 为 `forbidden`。它不持久化、不联网、不使用宿主 `Intl` 回退，也不做地理编码。

## 输入与失败关闭

- 调用者必须同时提供完整的 `westernBirthInputDraftSchema` 输入和确切 `tzdbSnapshotId`；没有默认 snapshot。
- 原始对象会在首次异步操作之前被复制成有界的声明式快照。accessor、自定义 prototype、symbol、数组、稀疏/别名/循环对象和反射 trap 异常均失败关闭；Zod 只读取快照。
- JavaScript 无法可靠区分透明 Proxy 与其目标对象。本草案不声称绝对识别所有透明 Proxy；它只保证反射 trap 异常被截断，且快照完成后不再读取原对象。若未来要求“零 trap 执行”，入口必须改为经过独立重复键检查的严格 UTF-8 JSON parser。
- DST gap 始终拒绝，不平移；overlap 的 `reject` 拒绝，`earlier`/`later` 分别选择较早/较晚 UTC instant；unique 始终记录为 `unique`。
- registry descriptor、loader 返回的 snapshot 与 resolver round-trip 任一漂移都会失败关闭，绝不换用当前 snapshot 或宿主时区数据库。
- `location.label` 和 `sourceNote` 的摘要绑定对象是契约解析后的 trim 值，不声称保留调用者原始字节身份；坐标不用于推断时区。
- 本包没有为同 realm 的全局/prototype 污染提供完整隔离；若该威胁进入范围，需在 fresh Worker/realm 中运行并单独加固 `tzdb-core`。

## 明确不产生的事实与授权

回执只是一项民用时间到 UTC 的工程观察。它不产生 UT1、TT、TDB、EOP、RAMC、星历、星盘或命理内容；不建立内容真值、专家真值、来源权利法律结论、Release Evidence、发布就绪或公开发布授权。出生时间、坐标及其摘要均按 person-derived 数据处理，`safeToLog`、`safeToPersist`、`safeToPublish` 全为 `false`。摘要是 SHA-256 完整性标识，不是数字签名。

本包不继承八字 `legacy-v13 / targetSchema 13 / migrationId null` 的权威，也不参与任何 mutation epoch；其治理字段保持独立草案、全未授权状态。

## 定向验证

```powershell
npm.cmd exec -- tsc --noEmit -p packages/western-civil-time-input-adapter-draft/tsconfig.json
npm.cmd exec -- vitest run --config apps/web/vitest.config.ts packages/western-civil-time-input-adapter-draft/src/index.test.ts
```
