# Revision 下游计算收据与复演协议 v0.1

> 状态：Schema 15 持久化、full v1.2、单盘报告 v1.4.0 与 ResearchQuery 来源追溯已实现；Edge + Chrome v14→v15 18/18、隔离 v13→v15 成功跳代 4/4、direct 十六分区全非空连续 Web v1 2/2 通过，默认生产代仍为 v13  
> 日期：2026-08-03  
> 适用：关系、起运和 Transit 等依赖本命 Revision 的确定性下游计算

## 1. 为什么需要独立收据

`RevisionRecord` 是不可变的本命盘快照。关系、起运和 Transit 的输出不能直接追加回 Revision：Transit 依赖用户明确选择的目标瞬时点，同一 Revision 可以有多个目标；重写 Revision 还会改变其快照摘要，破坏既有引用、正式对照与报告证据。

因此采用独立、只追加的 `revisionCalculationReceipts` 分区：

- Revision 本体和本命 `resultHash` 永久稳定；
- 创建 Revision 时可原子保存一份关系/起运基线；
- 用户明确请求某个 Transit 瞬时点后，再追加一份计算快照；
- 历史结果和今天按相同执行器重算的结果可以逐组件比较；
- 报告和界面必须区分“历史已保存结果”和“当前显式投影”。

## 2. 语义边界

### 2.1 创建基线

`revision_creation_baseline` 必须与新 Revision 使用同一个 `caseId`、`revisionId`、`revisionNumber` 和创建时刻，并在同一个 IndexedDB 事务提交。它保存关系与起运结果，但没有用户指定的 Transit 目标，因此 Transit 必须是 `not_requested`。

当性别为 `unspecified` 且用户没有明确顺逆时：

- 关系可以保存；
- 起运保存 `manual_direction_required`；
- 系统不得猜测顺逆；
- 用户以后明确选择方向时，追加一份显式计算快照。

### 2.2 显式计算快照

`explicit_calculation_snapshot` 必须至少包含以下一项：

- 规范 UTC 瞬时点 `atInstant`；
- 用户明确选择的 `manualDirection`。

拖动时间控件、打开页面或后台刷新不得自动写收据。只有用户执行明确的“保存此计算快照”动作时才能追加。

### 2.3 旧 Revision

Schema 15 之前的 Revision 没有创建时下游收据是合法历史状态，应显示“历史输出未保存”。迁移和旧备份恢复只能创建空分区，禁止运行今天的执行器回填并冒充原始结果。

## 3. 收据内容

首版使用自包含 envelope：

```text
RevisionCalculationReceipt
  schemaVersion
  recordType
  id
  createdAt
  captureKind
  requestFingerprint
  sourceRevision
    caseId
    revisionId
    revisionNumber
    snapshotDigest
    natalResultHash
  projection
    exact profile and executor descriptors
    normalized request
    relations result and resultDigest
    luck result and resultDigest
    transit result and resultDigest, or not_requested
    projectionDigest
  receiptDigest
```

`requestFingerprint` 只绑定源 Revision、捕获类型、完整执行器 Profile 和规范请求，用于幂等去重；不绑定随机 ID 或写入时间。`receiptDigest` 绑定除自身以外的完整收据内容。

摘要是内容完整性证据，不是数字签名。强真实性结论仍需读取源 Revision，并用精确匹配的历史执行器重新计算。

## 4. 两层验证结论

必须分开报告：

1. **存储完整性**：精确结构、组件 `resultDigest`、`projectionDigest`、`requestFingerprint`、`receiptDigest` 和内部 Transit `resultHash` 均一致。此层不要求历史执行器代码仍在安装包内。
2. **精确复演比较**：源 Revision 的身份和快照摘要一致，完整 executor descriptor 在 append-only registry 中精确命中，重新计算后与已存结果逐组件比较。

聚合来源与复演结论是两条独立轴。共享 resolver 只返回两种可计算来源：

| 来源 | 含义 |
| --- | --- |
| `stored_receipt` | 真实账本中存在与源 Revision、捕获类型、完整 Profile 和规范请求指纹精确一致的收据；结果取自收据，不代表复演一定一致 |
| `explicit_projection` | 没有精确收据，结果由列明的当前精确执行器按冻结 Revision 即时投影；`storedHistoricalOutputCompared=false` |

单盘报告在即时投影本身无法执行时另输出 `not_evaluable`，不伪造空结果；ResearchQuery 则记录 `kind=not_evaluable` 的诊断，并让需要该组件的命中失败关闭。`not_evaluable` 不是历史来源的别名。

对 `stored_receipt` 的复演结论只有三种：

| 状态 | 含义 |
| --- | --- |
| `matched` | 已存历史结果与精确执行器重算一致 |
| `mismatch` | 执行器可用，但至少一个确定性组件发生差异 |
| `exact_executor_unavailable` | 收据内容可验，但安装包未保留所需精确执行器；禁止回退当前版本 |

执行器缺失不能误报为“数据损坏”，也不能显示“复演一致”。

关系、起运与 Transit 必须逐组件保留状态。报告组件状态为 `projected`、`unavailable`、`not_requested` 或 `not_evaluable`；查询来源进一步保留每个组件的 `projectionStatus`、`replayedStatus` 与 `comparisonStatus`。聚合 `mismatch` 或 `exact_executor_unavailable` 不得抹掉各组件差异，也不得静默换用当前结果。ResearchQuery 只有在实际参与筛选的 stored-receipt 组件为 `matched` 时才允许使用；否则写入不可评估诊断并排除该命中。

## 5. 持久化不变量

- 普通业务只允许 `add`，禁止更新或覆盖既有收据。
- 同一 `requestFingerprint` 只能保存一次；重复操作返回既有结果或明确重复错误。
- 新 Revision、出生指纹和创建基线任一计算或写入失败时，整次提交回滚。
- Case 软删除保留收据；永久删除 Case 时级联删除。
- 全量隐私清空必须清空收据。
- 孤儿收据、源 Revision 摘要失配、重复请求、描述符伪造或结果摘要不一致必须在写入前拒绝。
- 来源解析必须深验同一原子快照中的全部候选收据，并按完整请求指纹唯一选择；重复 ID、重复请求指纹、多条精确命中、损坏收据或源 Revision 失配都失败关闭，禁止跳过坏行后继续声明历史来源。

## 6. 数据库与备份发布顺序

现有 v14 已冻结为“只新增两个案例活动流索引”，不能再塞入第 16 个用户分区。发布实现保留两条彼此隔离、不可由环境改写的候选路径：

```text
相邻路径：v13 bridge
  → production-v14 确认为源代
  → Schema 15 影子代（v14 → v15，追加空收据 store）

直接路径：已确认的 v13 bridge
  → Schema 15 影子代（v13 → v15，一次形成 v14 索引与空收据 store）

两条路径
  → full backup 1.2（十六分区）
```

直接路径不创建中间 v14 物理数据库，也不能跳过源代确认：若 release-control 缺失但物理 v13 与 v13 Service Worker/缓存壳已确认，必须由**已确认 v13 壳先重建 committed control，再发起升级**，不得写成 v15 自行 bootstrap。迁移结束后 lease store 按协议保留一条已过期 fencing row，不能按空表处理。

无论使用哪条路径，Schema 15 之前的旧 Revision 都不得回填历史计算输出。直接门中的旧 R1 仍无收据，升级后新建 R2 才原子产生唯一一条创建基线。

full backup 1.1 必须继续按冻结的十五分区结构验签。恢复 1.1 时，在完整验证旧 payload 后补一个空收据分区；不得生成任何计算输出。含非空收据的 1.2 备份不能由 v13/v14 静默降级导入。

当前实施状态：full v1.2 已完成十六分区计数、规范排序、分区/总摘要、安全快照、并发 CAS 与单事务恢复；Schema 15 会深验收据及其源 Revision 绑定，Schema 13/14 只接受空收据分区。core v0.2 不携带该账本，遇到非空收据仍必须失败关闭。两个 v15 candidate 都只输出到各自 `tmp/release-config-*` 目录；普通 `npm run build` 与 `dist/web` 仍固定 `legacy-v13`。

## 7. 产品呈现

单盘研读页现已提供两个明确入口：

- “查看历史计算收据”：读取已保存结果，显示保存时间、执行器版本和完整性状态；
- “按指定版本重新复演”：只读重算，并显示与历史收据的逐组件比较。

当前无收据时只能称为“显式版本投影”，不能使用“历史结果一致”等措辞。只有收据内容验真、重新读取源 Revision，并按保存版本完成精确比较后，界面才显示历史输出一致；这仍不等于专家金标。

单盘报告当前 `formatVersion=1.4.0`：本命事实固定标为已校验冻结 Revision，下游聚合来源为 `stored_receipt`、`explicit_projection` 或 `not_evaluable`，并逐组件展示状态、执行器和比较结论。Schema 13/14 明确携带 `receiptLedgerStatus=schema_unavailable`，因此只能产生即时投影；Schema 15 携带 `available`，但仍须精确请求指纹命中真实收据后才能成为 `stored_receipt`。匿名报告保留来源分类、账本状态和复演结论，移除收据 ID、请求指纹、收据/投影/组件摘要及保存时间；完整模式才保留这些本地审计字段。

ResearchQuery 当前执行器为 `0.2.0`、查询快照导出为 `1.1.0`。关系或 Transit 派生条件统一消费同一 resolver；结果、严格 DTO、`dataEpoch`、`resultDigest` 与导出均纳入账本状态、经验证收据和逐组件来源。Schema 13/14 与无精确收据的 Schema 15 命中均诚实标为 `explicit_projection`；精确收据存在但所需组件不是 `matched` 时，查询失败关闭而不回退当前投影。

## 8. 发布门

- v14 → v15 时原有物理 store 全部逐行、逐字节不变，只新增空收据 store；
- 新建和追加 Revision 的收据写入成功/失败均证明原子性；
- unspecified 性别不猜方向，创建时不伪造 Transit 目标；
- 同一请求去重，不同 Transit 瞬时点可并存；
- 永久删除、隐私清空与 full backup 1.2 往返一致；
- 历史执行器缺失时显示“内容可验、不可精确复演”；
- 单盘报告 v1.4.0 的匿名/完整组件门覆盖来源分类、逐组件状态及收据字段脱敏；v14 事件时间迁移门断言 `schema_unavailable → explicit_projection`，v15 富数据升级门在 Edge 与 Chrome 均断言基线收据为 `stored_receipt + matched`；
- ResearchQuery 0.2.0 / export 1.1.0 的定向回归覆盖精确收据命中、无收据投影、逐组件不可评估、摘要/数据世代变化及异常失败关闭；
- Edge 151 与 Chrome 150 的 v14→v15 升级/恢复矩阵已各通过 9/9；
- 隔离的 v13→v15 成功跳代门在 Edge 151 与 Chrome 150 各跑“已有 committed control 的富 v13”和“已确认 v13 壳先重建 control”两种源态，共 4/4。真实 note/event/attachment 及源分区逐项不变，中间 v14 物理库不存在，v15 同时具有两个活动流索引与空账本，旧 R1 无收据、新 R2 仅 1 条基线；完整 descriptor、迁移与回执摘要、`BOOT_ACK`、刷新和零意外外网均通过，缺失 control 场景只白名单接受控制库自动关闭的唯一预期 warning；
- 面向当前 v13 用户的冻结 direct production-v15 连续 Web v1 在 Edge 151 与 Chrome 150 各通过 1/1、共 2/2：十六分区全部非空，7 个 Revision 产生 7 条创建基线，ResearchQuery 命中 `stored_receipt`；断网报告、清空、全新 context 恢复、二进制附件逐字节下载、活动规则包、两类迁移关系及二次导出稳定摘要均通过；默认 v13 Edge 与原 Chrome→Edge 迁移回执备份门同期各重跑 1/1；
- 最终工程门为定向 release tests 8/8、全量 Vitest 113 文件 / 1306 项、TypeScript typecheck、直接 candidate 构建与普通构建通过，普通产物 descriptor 仍为 `legacy-v13`；
- 上述证据关闭成功跳代与 direct 十六分区连续门。Schema 15 成为默认生产代前，仍须唯一化生产谱系，完成无旧 Service Worker 壳恢复、Firefox、固定 Android Chrome/WebView、direct 回滚/长期重发矩阵与最终默认切换。

此前单盘报告 v1.3 的 Event 时间迁移回执、离线 390px、Markdown front matter、2160px PNG 与 7 页 Edge 打印产物继续作为冻结历史证据保留；它不证明当前 v1.4.0 的下游计算来源契约，当前证据以上述 v1.4 定向组件与跨 Schema 门为准。
