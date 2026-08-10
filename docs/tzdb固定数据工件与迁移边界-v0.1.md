# tzdb 固定数据工件与迁移边界 v0.1

> 日期：2026-08-03  
> 状态：IANA 2026c/2025b 已进入追加式随包注册表；Event 可按原工件只读复核，CandidateSet 可按两份数据并列复算，本命盘只读复演 v1 可用精确 bazi 0.4.0 executor 重算 exact Revision。relations/luck 已有严格 composite descriptor registry，Transit 1.2 已有绑定 bundled 2026c resolver 的完整快照 executor；它们当前只用于显式版本派生投影，不是老 Revision 的旧输出比对。Web v1、Android 与 APK 仍未完成

## 1. 为什么不再依赖浏览器 Intl

网页标准要求实现使用 IANA 时区数据库，但没有向网页 JavaScript 暴露具体 tzdb 版本。浏览器版本、UA、ICU 版本或少量行为探针都不能证明实际参与计算的是某个完整 IANA release。

因此，哈基米的新时间推导不再把 IANA 名称交给宿主 `Intl` 或 Temporal 的命名时区实现。应用随包发布一份固定、内容寻址的数据工件，并通过窄适配层执行 `instant → local` 与 `local → unique/overlap/gap` 解析。Temporal 仍可用于 ISO 日期算术，但不负责命名时区数据。

## 2. 当前官方工件注册表

| 字段 | 活动工件 | 保留工件 |
| --- | --- | --- |
| 工件 Schema | `1.0.0` | `1.0.0` |
| IANA release | `2026c` | `2025b` |
| npm 数据包 | `moment-timezone@0.6.3` | `moment-timezone-2025b` 别名，即 `moment-timezone@0.5.48` |
| 数据来源 | `moment-timezone/data/packed/latest.json` | `moment-timezone-2025b/data/packed/latest.json` |
| 数据 SHA-256 | `43f7878a298740ff6acabb9c726c7e5431a94bdca79abad274a6fe6e355bfe81` | `b1ad1446fbc94459f86c8e3f4ffadfc4170ad2af9cbd2a9b85c75d5436ce6425` |
| 原始字节数 | `715527` | `727104` |
| 解析器 | `hakimi-tzdb-core@1.0.0` | `hakimi-tzdb-core@1.0.0` |
| 隔离适配器 | `moment-timezone@0.6.3` | `moment-timezone@0.6.3` |
| 声明支持区间 | `1900-01-01` 至 `2100-12-31` | `1900-01-01` 至 `2100-12-31` |
| Zone / Link 数量 | `340 / 257` | `340 / 257` |
| snapshot ID | `iana-tzdb@2026c/sha256:43f7878a298740ff6acabb9c726c7e5431a94bdca79abad274a6fe6e355bfe81/hakimi-tzdb-core@1.0.0/moment-timezone@0.6.3` | `iana-tzdb@2025b/sha256:b1ad1446fbc94459f86c8e3f4ffadfc4170ad2af9cbd2a9b85c75d5436ce6425/hakimi-tzdb-core@1.0.0/moment-timezone@0.6.3` |

官方工件注册表采用内容寻址、追加式随包策略：2026c 是唯一用于普通新写入的活动工件；2025b 可用于历史记录的只读复核，也可在用户明确发起 CandidateSet 并列研究时作为目标数据工件。保留数据按需动态加载到独立 resolver；实现不会调用 `moment.tz.load`，不会改写全局 singleton，也不会用宿主 `Intl` 解析命名时区。未来替换解析器或适配器时，其身份必须进入新 snapshot ID，不能冒充同一个计算环境。

官方工件不新增 IndexedDB 用户分区，也不把原始字节塞入 full backup。每个后续 Web/PWA/APK 构建必须继续重发注册表中的全部官方工件，并由 Service Worker 预缓存；如果以后允许用户安装或远端下载第三方工件，才需要另设持久化分区、信任策略和备份格式升级。

## 3. 进入快照与哈希的范围

当前新写入统一保存 `tzdbVersion=snapshotId` 及完整 `timeZoneDatabase`：

- 精确分钟 Revision 的命盘 Manifest；
- 未知时辰 CandidateSet 及其每个候选盘；
- `zoned_minute` Event 时间上下文；
- `TransitSnapshot`；
- 设置页诊断与单盘研究报告。

命盘结果哈希使用 `hashSchemaVersion=2.0.0`，规范载荷包含 tzdb snapshot；只更改合法快照身份而不重新计算哈希会验真失败。启动烟测同时锁定一个确切命盘结果哈希、IANA release 和数据 SHA，工件身份或计算结果变化时不会发送成功启动信号。

本命盘只读复演使用独立的追加式 executor registry。当前唯一条目是 `hakimi-bazi-core:natal-chart-executor:0.4.0`；选择时精确核对 `name`、`version`、`upstreamName`、`upstreamVersion`、`upstreamTagCommit`、`upstreamIntegrity` 六字段，而不是只看版本号。单盘执行器可在精确 bundled 2026c 或 2025b 下，从冻结输入重算 time calibration、起运规则快照、历法/四柱 facts 和 result hash。它只声明本命盘计算首切片，不包含关系、运势、流年或 Transit 的历史算法。

下游模块保留不同边界。relations 与 luck 的 registry 都按严格 composite descriptor 选择历史 executor，描述符会同时绑定各自输出/规则 Schema、规则或算法身份、内嵌表/事实算法及完整 engine/upstream integrity，未知或部分描述符不得回退。Transit 1.2 的完整快照 executor descriptor 还精确绑定 bundled 2026c `timeZoneDatabase`；所有命名时区转换、节点墙上时间与本地柱统一走该随包 resolver，禁止宿主 `Intl` 或 Temporal 命名时区 TZDB 参与。`Africa/Casablanca` 的版本行为差异作为哨兵，防止输出标为 2026c、计算却偷用宿主规则。Transit 1.1 仍只有 node-ref 验真 allowlist，不登记没有实现与证据的完整快照 executor。

## 4. 历史兼容与迁移规则

`browser-intl-unreported` 只表示历史数据当时未能识别具体 tzdb，不得追溯改名为 2026c。

- 历史命盘 hash 1.0.0 继续按原始载荷验真、查看、比较已有事实和导出，但不猜测工件或进入本命盘复演；
- `browser-intl-unreported` Event 时间上下文继续按历史结构验真，不使用当前 2026c 完整重放或重签；
- 只有完整性先验通过、hash 2.0.0、精确 bazi 0.4.0 六字段 descriptor、精确 bundled tzdb、受支持规则与分钟/秒输入且 DST 选择已冻结的 Revision 才标记为 `replayable_exact`；其他 Revision 失败关闭，并可引导用户派生新版；
- 恢复旧备份时保持历史 snapshot/ref 身份，不在导入事务中静默重算；
- 任何未来 2026c→新 release 的迁移都必须新增结果或修订，保留旧版本，不得覆盖。

当前保留两条相互独立的非破坏派生链：

- CandidateSet：源记录保持原 ID、内容、`updatedAt` 与规范摘要不变，目标使用新 ID。当前 `time-core` / `bazi-core` 执行器会从 registry 加载指定的 2025b 或 2026c resolver，并把同一目标完整描述符传入范围探测、13 个探针、DST 变体、每个候选盘 Manifest 和顶层结果；因此它是“当前执行器 + 保留 IANA 数据”的并列研究复算，不是旧 App 或历史旧程序的原始输出。新 `comparison 2.0.0` / receipt v2 除状态、DST 选择、瞬时点、偏移和四柱外，还逐探针绑定 `time_resolution_candidates` 与完整 resolution fingerprint；旧 receipt/comparison v1 继续按冻结的 v1 语义验真并在 UI 标注覆盖限制，不会被静默改写为 v2。目标 snapshot ID 和完整描述符必须与随包 registry 精确一致；未知工件、自签描述符和 descriptor mismatch 均失败关闭。仓储遍历整条只追加谱系，禁止重复 snapshot/result/规范快照，因而 A→B→A 也会被拒绝。此前基于 `browser-intl-unreported` 的 Edge 夹具仍只证明旧 v1 派生机制和 hash-only 路径，不冒充历史浏览器 Intl 或本轮真实双工件浏览器验收。
- Event：只接受 `legacy_floating` 源，并要求本地用户显式确认。仓储先以完整源记录摘要执行 CAS，再在同一事务创建新 ID 目标与 append-only `eventTimeMigrationReceipt`，源记录完全不改写。分钟源由用户选择 IANA 时区及 DST 决策，目标固定到当前 IANA 2026c `zoned_minute`；非分钟源只能派生为 `calendar_date`。同一源可保留多个不同 IANA/DST 解释；完全相同的源+目标快照重复派生会拒绝，且一个目标只能归属一条回执。

Event 回执冻结两端的日期精度、起止日期、时间上下文、Case、Revision 与 TransitNodeRef；这些字段不得在同一 ID 上覆盖。标题、标签、来源引用、反馈、正文及软删除/恢复等生命周期仍可编辑，Citation 与 Attachment 不会自动复制或改绑。完整单盘报告 v1.3 会纳入与所选事件有关、端点投影一致且冻结快照正文 SHA-256 重新计算通过的回执；匿名报告同时移除事件时间上下文和回执。

当前 Event 读取会把完整描述符分为 `current_exact`、`retained_exact`、`legacy_unidentified`、`artifact_unavailable` 或 `descriptor_mismatch`。活动 2026c 与保留 2025b 都可按各自工件严格重放；未知 snapshot、缺失工件或同 snapshot ID 下的完整描述符冲突均失败关闭，不得替换为当前 2026c。真实行为差异 fixture 使用 `Africa/Casablanca`：同一 `2026-10-01T00:00:00Z` 在 2025b 为 `UTC+01:00`，在 2026c 为 `UTC+00:00`；另有 100 组并发 A/B/A 计算证明 resolver 不互相污染。该 fixture 是工程回归证据，不计入 360 例专家金标。

这条生产竖切现在分成两个不同口径。Event 是按记录原描述符做只读复核：工程合成的 2025b Casablanca Event 得到本地 `12:00 → 11:00Z / +01:00`，2026c 得到 `12:00 → 12:00Z / +00:00`，复核前后不写回。CandidateSet 则从源记录提取冻结输入/规则，用今天的同一执行器分别加载两份内置数据生成并列目标；Casablanca `2026-10-01 12:00` 同样呈现 2025b 的 `11:00Z / +01:00` 与 2026c 的 `12:00Z / +00:00` 真实差异。两者都不表示项目恢复了某个已发布旧 App 的原始计算环境。

full v1.2 会保存完整描述符、规范 UTC/DST 选择、CandidateSet 的 v1/v2 回执、Event 时间迁移回执及 Schema 15 的 Revision 计算收据；备份仍不携带官方工件字节。冻结 full v1.1 必须先按原十五分区的严格 Schema、计数、摘要与关系验真，随后才补空计算收据分区迁入 v1.2，旧 Revision 不回填。`chart-integrity` 对 Revision 先做完整结构与摘要验真，再分类 executor/tzdb/rule/input/DST 能力；未知 engine、legacy tzdb、工件缺失、descriptor mismatch、不支持规则/精度或未冻结 DST 选择均失败关闭。本命精确复演从冻结输入重算 time calibration、luck rule、facts 与 result hash，因而能发现攻击者同时改写 facts 并重签 hash 的篡改。研读页只对 exact 能力显示本命复演按钮，操作本身不创建 Revision。

老 Revision 没有持久化 relations/luck/transit 的原始输出或 executor 绑定，因此无计算收据时不能比较不存在的历史输出。它会在本命精确复演匹配后，按用户显式选择的已登记版本重新派生关系、起运和可选 Transit 投影，固定声明 `storedHistoricalOutputCompared=false` 和“不是旧输出比对”。Schema 15 新 Revision 会原子写入创建基线；用户也可明确保存带 Transit 目标或人工顺逆的计算快照，成为不修改 Revision 的 append-only 收据。之后可分别验证收据冻结内容、精确执行器可用性和逐组件复演差异；这只证明所记录版本的工程输出，不证明更早的无收据 Revision 当年运行过它，也不增加专家金标。Transit 1.1 仍只接受 node-ref 验真；其他历史 bazi engine、更多下游历史代及跨代 registry 审计仍缺，因此 P0-04 仍是“部分通过”。

## 5. 工程门命令与现有证据

```powershell
npm run audit:tzdb
npm run test:tzdb
npm run test:e2e:boot
npm run test:e2e:tzdb:edge
npm run test:e2e:event-time:migration
npm run test:e2e:cross-schema-v14-v15
npm run test:comparison-golden
npm run typecheck
npm test
npm run build:production-v15:candidate
npm run build
```

固定工件、历史 Event 与 CandidateSet 并列复算证据：

- 工件注册表门确认两份 exact package、lockfile integrity、IANA `2026c/2025b`、原始字节 SHA、字节数及各自 `340 Zone / 257 Link`；并锁定 Casablanca 的真实行为差异；
- `test:tzdb` 当前 58/58 通过，覆盖真实差异、并发隔离、descriptor mismatch、未知工件失败关闭、历史 Event 复核，以及同一指定 descriptor 贯穿 CandidateSet 顶层和全部候选盘；
- 新 CandidateSet 契约/仓储回归覆盖 comparison/receipt v2、完整 resolution fingerprint、精确目标 registry 描述符、源记录不变、只追加回执、谱系去重与 A→B→A 阻断；backup 预检同时按 v1/v2 冻结语义复算。此前真实 Edge CandidateSet 流程 1/1 从 UI 建立 Casablanca 未知时辰源，按 IANA 2025b 并列复算，核对真实 behavior change、源不变、目标完整 descriptor/候选 Manifest、回执和 full v1.1 跨全新 context 恢复；
- 本命盘复演服务回归覆盖当前 2026c 和保留 2025b Casablanca、所有失败关闭分类，以及 facts+hash 同时重签的篡改检测；Edge tzdb 门 1/1 覆盖 2026c UI 复演和 390×844 无横向溢出；
- 下游定向回归覆盖 relations/luck composite descriptor 精确查找与未知/部分描述符失败关闭、Transit 1.2 bundled 2026c resolver 贯穿完整快照、Casablanca 宿主规则偏差哨兵，以及显式投影的本命复演先验、组件/aggregate 摘要验真、请求变化失效和 Revision 数量不变；
- Schema 15 / full v1.2 当前工程门覆盖 Revision 创建基线、显式计算快照、请求指纹去重、存储内容与精确复演分层、冻结 v1.1 验真后空分区迁移，以及计算收据进入 Worker、规范排序、四层摘要、安全快照、恢复 CAS 和十六分区事务；Edge 151 与 Chrome 150 的 v14→v15 专项门各 9/9、共 18/18 已通过，Schema 15 尚未成为默认发布代；
- 本命盘首切片里程碑当时的全量 Vitest 为 101 个文件 / 1168 项，TypeScript typecheck、`test:tzdb` 58/58、依赖审计、固定 production-v14 构建和普通默认构建均通过；最后一次普通构建把 `dist/web` 保持为安全的 Dexie v13 bridge；该历史计数不冒充本轮下游投影改动后的最终全量；
- 合法合成 native Dexie v7 / Event v1 的真实 Edge Event 门为 1/1：覆盖 v13 升级、DST earlier、`calendar_date`、源摘要/`updatedAt` 不变、两条回执、390×844 焦点/Axe、full v1.1 及全新 Edge context 恢复；
- 历史工件真实 Edge 门为 1/1：Service Worker 控制页面后切断网络，再动态加载 2025b 并执行结构/行为哨兵，设置页报告 `1/1` 可离线复核；原始字节 SHA 由 Node 发布门核对，浏览器按钮不冒充重新计算该 SHA；诊断 JSON 列出追加式策略、活动 2026c 与保留 2025b；
- 此前 Event 里程碑的 full v1.1 定向门为 119/119，其中非空 2025b Event 在导出、预检、事务恢复、二次导出后保持完整描述符与 `11:00Z / +01:00`，并重新按 2025b 工件复核；CandidateSet v2 的当前实现事实不借用该旧计数；
- 此前备份/升级/离线/Chrome→Edge 组合门为 4/4：覆盖 Edge v9/v10→v13、390px Service Worker 首次进入数据页后的离线导出/清空/恢复，以及 Chrome 150→全新 Edge 151 的 full v1.1 混合非空回执恢复/再导出；它仍是上一代浏览器证据；
- 此前定向与全量门覆盖 minute/day 派生、IANA/DST 解析、源摘要 CAS、同源并列解释、目标唯一性、时间/研究谱系冻结、内容/生命周期可编辑、历史 `different_snapshot` 不经当前 tzdb 重放、full v1.1 关系复核及单盘 v1.3 匿名/完整回执与正文摘要边界；当前 full v1.2 在保留这些规则的同时增加 Revision 计算收据的完整性和来源绑定复核。

production-v14 将 2025b 独立输出为按需 chunk，大小 `724606 bytes`；full-backup Worker 为 `1555487 bytes`，较结构解耦前减少 `192138 bytes / 10.99%`，且静态检查不含 Dexie、IndexedDB、数据库 singleton 或 2025b 工件。完整时区数据随包仍有体积成本，后续可以按已知 zone 子集和执行器代际继续优化，但不能以重新依赖宿主 tzdb 来换体积或破坏历史复核。

## 6. 尚未通过的发布门

- Chrome、Firefox 的同工件生产门；
- Android Chrome、固定 Android WebView/真机及离线冷启动；
- Capacitor 壳、APK 安装/升级/回滚、原生分享/打印、返回键与字体；
- IANA 新版本发现、来源审阅、差异报告、工件升级、注册表只追加审计、跨多代构建持续重发与回滚 SOP；
- CandidateSet 与本命盘复演的 Chrome/Firefox/固定 Android 同构门；bazi 0.4.0 之外的历史 executor，以及关系、luck、流年与 Transit 历史执行器的长期保留；
- `browser-intl-unreported` Event 的可识别历史工件迁移；用户安装或远端 tzdb 工件的持久化、分发、信任、备份与回滚；
- Dexie v12→v13 与 frozen full v1.0→v1.1 的中断/旧标签页兼容门，以及 Firefox、固定 Android/WebView 的 v14→v15、full v1.1→v1.2 与三类非空回执/收据恢复；
- 单一连续场景：新命盘/新 Event→离线→完整备份→另一浏览器恢复→hash/snapshot 一致；
- 多 IANA、历史 DST、日期线及完整四柱的独立外部真值与 360 例现实金标；
- Chrome、Firefox、固定 Android WebView/Android Chrome 上对上述启动失败关闭门的同构复验。

因此当前可以声明：“普通新计算锁定 IANA 2026c；2025b 是官方保留工件；Event 可按原描述符复核；CandidateSet 可并列复算；完整性通过且精确匹配 bazi 0.4.0 + bundled tzdb 的 Revision 可执行本命盘只读复演 v1；Schema 15 可为新 Revision 原子保存基线并按用户请求追加可验真的下游计算收据，full v1.2 可完整迁移这些记录。”不能把该切片扩大为“所有历史 engine、无收据旧 Revision、关系/运势/流年/Transit 或完整命盘 replay 已完成”，也不能声明 Schema 15 已默认发布、完整跨浏览器、Android 或 APK 已完成。

## 7. 权威依据

- [ECMA-402：使用 IANA 时区数据库](https://tc39.es/ecma402/#sec-use-of-the-iana-time-zone-database)
- [ECMA-402：`resolvedOptions()` 暴露范围](https://tc39.es/ecma402/#sec-intl.datetimeformat.prototype.resolvedoptions)
- [Temporal：处理时区数据库变化](https://tc39.es/proposal-temporal/docs/zoneddatetime.html#handling-changes-to-the-iana-time-zone-database)
- [IANA tzdb 2025b](https://www.iana.org/time-zones/releases/2025b)
- [IANA tzdb 2026c](https://www.iana.org/time-zones/releases/2026c)
