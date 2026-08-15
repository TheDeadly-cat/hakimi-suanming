# 跨 Schema 数据库与 Service Worker 发布协议 v0.1

> 状态：历史回归证据保留 production-v14 Edge 8/8、v14→v15 Edge + Chrome 18/18 与 direct v13→v15 20/20；当前隔离 direct v13→v16 候选在 Edge、Chrome 各完成 13/13（2026-08-11 复跑共 26/26），v13→v16 Web v1 候选双浏览器 2/2（2026-08-10 记录），Schema 16 clean 万条容量门双浏览器 2/2（2026-08-11 复验）；普通 `npm run build` 与默认发布身份仍为 `legacy-v13`  
> 日期：2026-08-11（更新）；2026-08-10 为首版  
> 适用：Web/PWA 从一个已确认数据库代际迁移到不兼容的新代际

## 1. 结论与边界

浏览器的 Cache Storage、IndexedDB 和 Service Worker 生命周期不能加入同一个事务。本项目因此不声称“跨 API 严格原子提交”，而采用**可恢复两阶段发布协议**：任何时刻，用户页面只能绑定一个完整、可验证的已确认代；失败时保留源代，提交后所有旧页面只允许收敛到目标代。

普通 `npm run build` 仍固定输出 Dexie v13 bridge 与 `legacy-v13` 发布描述符，避免残留环境变量意外触发迁移。当前 Schema 16 只能通过显式 `npm run build:production-v13-to-v16:candidate` 构建，产物写入独立的 `tmp/release-config-production-v13-to-v16`，不会提升或覆盖默认 `dist/web`。production-v14、v14→v15 与 direct v13→v15 构建继续保留为冻结的历史回归候选，不是当前默认发布谱系。

v15 把 `revisionCalculationReceipts` 作为第十六个用户分区；v16 保持 full v1.2 的十六个用户分区不变，只新增不进入用户备份的内部 `mutationState`，用于持久化 `epoch`、`verifiedEpoch` 与完整性缓存/CAS 状态。当前对外待验候选谱系是 **v13→v16 direct**，但它仍只是隔离 candidate，不是默认生产代，也没有授权把 v15 或 v16 提升为普通构建身份。v14/v15 候选不得与 v13→v16 candidate 在同一生产 origin 混用；正式发布前仍须按外部部署记录确认真实用户谱系，若 v14 或 v15 曾进入生产，必须改为分阶段发布或实现真正的多源升级协议。

## 2. 发布不变量

1. 源库 A 在迁移、校验和目标确认前不原地升级、不删除。
2. 目标库 B 使用独立名称；只有完整迁移并通过摘要校验后才可进入 `ready`。
3. 控制指针、迁移日志、租约和签名回执位于独立控制库；控制库内的指针提交是一个 IndexedDB 事务。
4. 迁移开始前，所有已知 A 页面必须确认冻结；冻结后仓储写入由 DBCore 写锁明确拒绝。
5. 任一页面未确认、租约失效、事务中止、摘要不符或目标被陈旧标签页阻塞，均不得提交 B。
6. B 提交后，Service Worker 不得重新开放 A 写入；旧页面只能重载并绑定 B。
7. B 页面完成路由、存储、计算、首帧和代际探针后，才能发送完整 `BOOT_OK`；Service Worker 重新读取控制回执并返回匹配 ACK 后，B 才解除写锁。
8. 失败或取消产生的未确认目标库必须隔离或清理；A 的用户数据和已确认应用壳保持可用。

## 3. 正常路径

```text
读取已确认 A
  → 控制库创建迁移记录并取得带 fencing token 的租约
  → Service Worker 要求全部 A 页面冻结并收齐 ACK
  → 从 A 生成完整备份、分区摘要与总摘要
  → 写入独立影子库 B
  → 重新导出 B 并逐分区验真
  → 控制库把 B 标记 ready
  → 原子提交控制指针 A → B
  → B 页面完成启动探针并发送完整 BOOT_OK
  → Service Worker 复核控制回执并 ACK B
  → B 解除写锁；旧 A 页面重载并收敛到 B
```

冻结期间每 8 秒续租；续租失败会取消准备并禁止提交。新打开的导航若仍指向 A，会收到禁止缓存且自动刷新的等待页，不会继续得到可写 A 壳。

## 4. 恢复规则

| 失败位置 | 可见结果 | 数据处理 |
| --- | --- | --- |
| A 页面未全部冻结 | 保持 A | 不创建可提交 B，解除已冻结页面 |
| 迁移事务中止 | 保持 A | Dexie 回滚 B 事务，清理/隔离 B |
| B 摘要或结构校验失败 | 保持 A | 控制记录失败，清理/隔离 B |
| 提交前租约/心跳失效 | 保持 A | 禁止提交，解除 A 冻结 |
| 控制指针已提交、页面未确认 | 收敛 B | 刷新后按控制回执继续 B；不得回开 A |
| B 已提交后续租/旧 ABORT 到达 | 收敛 B | 忽略回退请求，旧页重载 B |
| 控制回执损坏或代际未知 | 失败关闭 | 不解锁任何写入，显示恢复入口 |

## 5. 当前自动证据

### 5.1 v13 → v14

`npm run test:e2e:cross-schema-upgrade` 已在本机 Microsoft Edge 通过 8/8：

1. 全新浏览器没有旧数据库或旧 Service Worker 时，直接安装 v14 并从空 v13 源代完成确认；
2. A(v13) → B(v14) 成功，源数据逐行/逐字节保持，目标仅新增两个真实复合索引；
3. 多标签页冻结，迁移期间真实仓储写入返回明确写锁错误，提交后旧页收敛 B；
4. 容量准入失败时不创建 B、不移动控制指针，也不发送 `BOOT_OK`；
5. 真实 Dexie 13→14 事务中止，B 回滚且 A 不变；
6. 目标结构/摘要校验失败，B 清理且 A 保持确认；
7. 控制指针在 `BOOT_OK` 前已提交时刷新，页面继续收敛 B；
8. 陈旧目标标签页造成 `versionchange` 阻塞时失败关闭，不触碰 A。

该里程碑的历史基线为 Vitest 100 个文件 / 1132 项、TypeScript typecheck、普通 v13 bridge 与固定 production-v14 两种 2002 模块生产构建、启动边界 6/6、同 Schema Service Worker 3/3、PWA 1/1、Web v1 连续流程 1/1 均通过。生产 v14 的 HTML、Service Worker、入口代码与控制回执携带同一个固定描述符，启动门还会显式核对两个复合索引的 keyPath、compound、unique 与 multiEntry 属性。

### 5.2 v14 → v15

`npm run test:e2e:cross-schema-v14-v15` 已在本机 Microsoft Edge 151 与 Google Chrome 150 各通过 9/9，共 18/18：

1. 全新浏览器直接安装 v15 时，先建立空 v14 源代，再建立带空收据账本的 v15 并完成确认；
2. 富 v14 数据无损迁移到 v15，旧 store 行与索引逐项保持；新 Revision 同事务写入基线收据，用户显式保存快照，重启仍完成 `BOOT_OK`，非空 full v1.2 可在全新 v15 context 恢复并稳定再导出；
3. 两个既有 v14 页面与迁移导航页全部冻结，真实仓储写入被拒绝；提交后所有旧页只收敛到 v15；
4. 影子物化容量不足时不创建目标、不移动源指针，也不发送 `BOOT_OK`；
5. 目标启动校验失败时记录失败并完成目标隔离，v14 指针与源数据保持不变；
6. 真实物化完成但传入验证阶段的摘要被篡改时，生产校验器拒绝并删除目标；
7. 控制指针已提交但一次 `BOOT_OK` 请求被中断时，页面在 ACK 前保持写锁，刷新后继续收敛到 v15 并安全解锁；
8. 陈旧标签页持有 v15 target 的 `versionchange` 时超时失败关闭，不提交目标也不改 v14；
9. 真实 Dexie v15 升级事务失败时，影子事务与控制状态回滚，v14 保持可用。

这轮还新增了失败隔离幂等回归：若第一次清理在租约中断后留下 `failed/pending`，外层恢复必须再次完成目标隔离，不能把“日志已经失败”误当成“清理已经完成”。

### 5.3 v13 → v16 隔离候选

`npm run test:e2e:cross-schema-v13-v16` 使用与普通构建隔离的冻结描述符。2026-08-11 在当前源码复跑：Edge **13/13（约 5.3 分钟）**、Chrome **13/13（约 5.1 分钟）**，共 **26/26**。十三个场景与当前 spec 一一对应：

1. 两个旧 v13 页面中，一页已完成 `BOOT_OK`，另一页仍在万条案例慢审计；新 v16 Worker 通过正常更新生命周期接管后，两个旧页自动收敛到 v16；
2. 首个 v16 试运行页在源冻结被慢旧页拖过 5 秒时限后自动重试并完成收敛（2026-08-11 新增：已确认 v13 页主线程被测试占用 8 秒，v16 页首次冻结失败后按 2～6 秒退避最多重试 5 次，随后完成迁移、`BOOT_OK`/ACK、写解锁，不出现失败页）；
3. 全新浏览器从空 v13 建立完整 v16 目标并确认 clean epoch；
4. 富 v13 数据无损直升 v16；业务写入只通过受支持仓储路径把 epoch 标为 dirty，全审计后恢复 clean，再次启动命中完整性缓存；
5. 多个 v13 页面在迁移期被冻结，真实仓储写入被拒绝，提交后旧页只收敛到 v16；
6. 影子物化容量不足时保留 v13，v16 目标零创建、控制指针零移动且不发送 `BOOT_OK`；
7. v16 目标启动校验失败时隔离影子库并保持 v13 可恢复；
8. v16 目标完整审计摘要不符时删除目标并保留 v13；
9. 真实 Dexie v16 迁移事务中止时回滚 shadow，`mutationState` 不留下半代；
10. 控制指针已提交但一次 `BOOT_OK` 中断时保持写锁，刷新后继续完成 clean 收敛；
11. 陈旧页面持有 v16 target 的 `versionchange` 时超时失败关闭，不提交目标也不改 v13；
12. dirty v16 全审计期间并发受支持写入使 CAS 失败；旧审计结果不得覆盖新 epoch，随后重新全审计恢复并命中 clean cache；
13. 目标隔离受阻后，同一 `migrationId` 只允许继续清理、不得续跑迁移；清理完成后，新的 `migrationId` 可从完整 v13 长期重发。

上述失败路径均以源 v13、控制指针、目标存在性、`BOOT_OK`/ACK 与 epoch/CAS 状态为失败关闭断言；v16 数据只能经生产仓储与迁移路径形成，不以绕过 mutation epoch 的 raw IndexedDB 写入伪造。2026-08-11 还加入两类防御性生产修复：源冻结失败有界重试（避免慢旧页拖过 5 秒冻结时限后让合法 v16 试运行页死页），以及“同代迁移在途”（`MIGRATION_SESSION_ACTIVE`/`LEASE_HELD`）有界等待后自动绑定已提交代；失败页不再错误停留在 `pending`，影子启动预算提高到 300 秒。`npm run test:e2e:web-v1-flow:v13-to-v16` 在 2026-08-10 于 Edge 与 Chrome 各通过 1/1、共 2/2，证明隔离 candidate 可完成连续 Web v1 数据流（2026-08-11 因本机持续高负载未能在 45 分钟内完成单浏览器复跑，保留历史证据）。Schema 16 clean 万条容量门 2026-08-11 双浏览器复验通过：首次完整审计后 `epoch=verifiedEpoch=1`，第二次 clean boot 分别为 Edge 1.300 秒、Chrome 1.213 秒，均在 5 秒预算内。

这些结果只证明当前代码与固定浏览器环境中的工程复现；不把 v16 提升为默认发布代，不等于整个 Web v1、Firefox 或 Android 已通过，也不构成命理专家真值。

### 5.4 历史 v13 → v15 直接跳代候选

`npm run test:e2e:cross-schema-v13-v15` 使用与普通构建隔离的冻结描述符，在本机 Microsoft Edge 151 与 Google Chrome 150 各通过 10/10，共 20/20。十个场景与 spec 名称一一对应：

1. 已提交 control 的富 v13 数据成功直升 v15；真实 note、event、attachment 行与所有源分区逐项不变；
2. release-control 缺失但已确认 v13 Service Worker/缓存壳仍在时，由**旧壳先补建 committed control，再发起直接升级**；v15 不在缺失 control 时自行 bootstrap；
3. 容量不足时不创建目标、不移动 v13 指针，也不发送 `BOOT_OK`；
4. 目标启动校验失败时隔离影子库并保留 v13；
5. 物化后摘要不符时删除目标并保持 v13 可恢复；
6. control 已提交但一次 `BOOT_OK` 中断时，刷新后继续收敛到 v15；
7. 旧页面持有 target 的 `versionchange` 时超时失败关闭，不提交目标也不改 v13；
8. 真实 Dexie 迁移事务失败时回滚 shadow，并保持 v13 指针与源数据；
9. 目标隔离受阻后，同一 `migrationId` 的终态日志只允许继续隔离清理、不得偷偷续跑迁移；隔离完成后，新的 `migrationId` 可从干净 v13 长期重发；
10. 已成功迁移的用户收到新 `migrationId` 应用壳时，若新壳显式接受旧提交谱系，则沿用原提交，不创建第二条迁移日志，也不二次迁移目标库。

成功路径仍核对完整 release descriptor、source/target/verified digest、migration/control receipt digest、完整 `BOOT_OK`/`BOOT_ACK` 与刷新收敛；迁移不创建中间 v14 物理数据库，v15 一次形成两个活动流复合索引和 `revisionCalculationReceipts` store，旧 R1 不回填，新建 R2 只产生 1 条 `revision_creation_baseline`。迁移结束后，lease store 按 fencing 协议保留一条**已过期**租约行；它是重放与栅栏证据，不应被误写成空表。

`acceptedCommittedMigrationIds` 是新应用壳对**同一目标 generation、数据库名与可读 Schema 范围内，允许继续承认的既有 committed migration ID** 的显式白名单。当前壳自己的 `migrationId` 仍必须包含在白名单中；当新壳发布新的 `migrationId` 时，只有把上一版已提交 ID 同时列入，Service Worker 才会接受旧控制指针和旧提交回执，并只更新已确认应用壳，不重做物理数据库迁移。它不是跨来源、跨 generation 或任意旧 ID 的自动兼容。

### 5.5 历史精确 v15 连续 Web v1

`npm run test:e2e:web-v1-flow:v15` 在冻结的 v14→v15 相邻候选上由 Edge 151 与 Chrome 150 各通过 1/1，共 2/2。两浏览器均在同一连续流程中生成 7 个 Revision 与 7 条创建基线收据，ResearchQuery 精确命中 `stored_receipt`，断网报告成功生成，并完成 full v1.2 十六分区备份、清空、全新 context 恢复及逐项验真。

面向当前 v13 用户的 `npm run test:e2e:web-v1-flow:v13-to-v15` 使用冻结 direct 描述符，在 Edge 151 与 Chrome 150 各通过 1/1，共 2/2。它在同一流程形成 4 Case、7 Revision、3 CandidateSet、1 Note、3 Event、1 SavedView、1 KnowledgeDocument、3 Citation、1 SourceRights、1 ResearcherProfile、1 AppSettings、1 二进制 Attachment、2 RuleRegistry、1 TzdbMigrationReceipt、1 EventTimeMigrationReceipt 与 7 RevisionCalculationReceipt，十六个分区全部非空；随后断网导出、全量清空、全新 context 恢复，并复核附件逐字节下载、活动规则包、两类迁移关系、payload、总摘要及十六个分区摘要。默认 v13 Edge 同期重跑 1/1，原 v13 Chrome→Edge 迁移回执备份门也重跑 1/1。本次变更另通过全量 Vitest 116 文件 / 1332 项与 TypeScript typecheck。

### 5.6 R0：无旧壳的精确 v13 只读恢复

`npm run test:e2e:orphaned-v13-recovery` 已在本机 Microsoft Edge 151 与 Google Chrome 150 各通过 1/1，共 2/2。该门只覆盖以下严格前提：没有 release-control、没有已确认旧 Service Worker 壳，且浏览器库存中只存在一个原生结构精确匹配 v13 的源库。

恢复启动路径在加载正常应用、数据库协调器或 Service Worker 生命周期前完成库存判定。精确命中时只开放脱敏诊断和只读 ZIP 导出：测试核对 `/sw.js` 请求为 0、Service Worker 注册与 controller 为 0、control/v14/v15 新数据库为 0，且源 v13 原生快照在导出前后逐项不变；下载得到的 full v1.2 ZIP 还在隔离的 v13 context 中通过十六分区只读预检。若存在多库、未知库、结构不精确或判定期间状态变化，状态归为 `ambiguous`，界面只显示脱敏诊断并失败关闭，不自动迁移、恢复、删除或导出。该 2/2 只关闭精确 R0 恢复门，不扩大 direct v13→v15 的 20/20 结论，也不证明 Firefox 或 Android 行为。

## 6. 尚未关闭的发布门

- 唯一生产谱系的外部部署确认；若 v14 或 v15 曾进入生产，必须先实现分阶段或多源协议，不能把 direct v13→v16 直接解释为全部用户的自然升级路径；
- v13→v16 的 Firefox、Android Chrome/WebView 同构协议门，以及固定 Android 设备上的后台回收、系统 WebView 升级、多进程恢复、极端容量与长时间后台恢复；
- P2-05 仍需固定中端设备、重 CandidateSet、长备注、专项 ResearchQuery、真实取消、内存/长任务/存储报告与更极端大库；当前 clean 万条结果只关闭一个子门；
- 操作系统安装后 standalone 启动、Android 文件/分享 adapter、APK 验收，以及任何把默认构建从 v13 提升到非 v13 代际的独立发布演练与授权。

因此，当前代码已经关闭 direct v13→v16 隔离 candidate 在 Edge 与 Chrome 各 13/13（2026-08-11 共 26/26）的双旧页自然接管、慢旧页拖过冻结时限后的自动重试、富数据、写锁、容量、事务中止、目标校验/摘要、`BOOT_OK` 中断、陈旧 target、dirty epoch/CAS 恢复、同 ID 清理与新 ID 长期重发矩阵；同一候选的 Web v1 双浏览器 2/2（2026-08-10 记录）与 clean 万条容量子门（2026-08-11 双浏览器复验通过）也已关闭。v14/v15 结果只作为历史回归证据保留。普通 `npm run build` 与 `dist/web` 的发布身份仍固定为 `legacy-v13`；这些工程证据不等于 v16 已成为默认生产代，不等于整个 Web v1、Android APK 或专家真值已经完成。
