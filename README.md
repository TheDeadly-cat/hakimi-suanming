# 哈基米八字研究台

面向简体中文八字学习者与研究者的本地优先 Web/PWA。当前处于 **P0/P1 研究闭环工程预览**：已经贯通可信时间输入、候选排盘、案例修订、运限纵向切片、节点绑定事件、个人资料检索引用、来源权利审计、依据覆盖审计、声明式规则包闭环、CandidateSet 与旧 Event 时间语义的非破坏派生，以及包含 Revision 计算收据的十六分区 full v1.2 全量备份恢复；它仍不是完整 v1。

> **当前基线已更新：** 产品已转向面向简体中文八字学习者与研究者的专业研究工具；Web/PWA 先行，先分别完成八字、紫微斗数和西洋占星的 Web 功能与独立质量门，再进入 Android；iOS 与付费暂缓。详见 [产品方向更新 v0.2](./docs/产品方向更新-v0.2-专业研究版.md)。旧文档中的年轻消费用户、付费报告和双产品近期开发安排均视为历史方案。

项目后续工作的统一入口是 [项目完善总纲与实施指引 v0.1](./docs/项目完善总纲与实施指引-v0.1.md)。它集中说明当前基线、产品与领域边界、工程发布门、体验路线、多术数准入、Must/Should/Later、停止线和待确认决定；字段级语义仍以各专项协议为准。

由 DeepSeek 接续开发时，先阅读 [DeepSeek 后续工作启动指引](./docs/DeepSeek后续工作启动指引-2026-08-10.md)。该指引记录 2026-08-10 用户确认的本地保存、内容、Android 顺序、Git 基线授权和部署历史未知等决定，以及第一批安全工作包。

## 本地运行

需要 Node.js 24（当前验证环境为 `v24.16.0`）与 npm 11。

```powershell
npm install
npm run dev
```

开发地址默认为 `http://127.0.0.1:5173`。

### Windows 桌面入口

```powershell
npm run desktop:install
```

该命令在当前用户桌面创建“哈基米八字研究台”快捷方式。双击后固定打开 `http://127.0.0.1:4173/` 的默认生产预览：已运行且首页描述符、Service Worker 描述符与 build hash 均匹配时直接复用；否则在命名互斥锁内执行普通 `legacy-v13` 构建，并用工作区 Vite 7 单进程启动。端口若被其他服务占用会失败关闭，不终止未知进程，也不会改用 v16 candidate。启动日志位于 `%LOCALAPPDATA%\HakimiBaziWorkbench`。需要从终端执行同一入口时可运行 `npm run desktop:launch`。

桌面入口的 `4173` 与开发地址 `5173` 是两个独立的浏览器数据空间；开发调试中的案例不会自动出现在桌面入口。需要转移资料时，请先在来源地址导出完整备份，再在目标地址完成预检与恢复，不要通过清除浏览器数据“同步”。

### 紫微独立 Browser 资料库

```powershell
npm run build:ziwei-browser-workspace
npm run preview:ziwei-browser-workspace
```

该研究预览固定打开 `http://127.0.0.1:4218/`，不进入 `apps/web`，也不会成为桌面入口或默认 PWA 的一部分。它用独立 IndexedDB `hakimi-ziwei-browser-workspace-draft` 保存用户明确确认的不可变 Revision；计算本身不自动保存，重开会验真保存字节而不重新排盘。界面提供单 Revision 导出、该独立资料库的完整备份、零写入恢复预检、create-only 原子恢复，以及唯一删除例外“清空独立紫微档案”。它不读取或改写八字数据库，紫微完整备份也不包含、替代或扩宽八字 full v1.2。所有输出仍是隔离工程草案，不是命理专家真值。

```powershell
npm run typecheck
npm run check:system-contract-draft-boundaries
npm run test:system-contract-draft-boundaries
npm run typecheck:system-contract-drafts
npm run test:system-contract-drafts
node packages/ziwei-iztro-adapter-draft/src/demo.ts 1995-08-18 6 male
npm run demo:ziwei:fortel -- 1995-08-18 6 male
npm run demo:ziwei:fortel -- --compare 2020-08-18 6 male
npm run demo:ziwei:workspace -- 1995-08-18 6 male
npm run demo:western:astronomy -- 2025-03-20T09:01:00.000Z sun,moon
npm run build:ziwei-browser-preview
npm run preview:ziwei-browser-preview
npm run build:ziwei-browser-workspace
npm run preview:ziwei-browser-workspace
npm run build:western-browser-parity
npm run preview:western-browser-parity
npm run audit:ziwei:official-calendar
npm test
npm run deps:audit
npm run audit:tzdb
npm run test:tzdb
npm run test:gold
npm run test:comparison-golden
npm run audit:calendar:dotnet
npm run build
npm run build:production-v14
npm run build:production-v15:candidate
npm run build:production-v13-to-v15:candidate
npm run build:production-v13-to-v16:candidate
npm run test:e2e:a11y
npm run test:e2e:boot
npm run test:e2e:db-upgrade
npm run test:e2e:offline
npm run test:e2e:tzdb:edge
npm run test:e2e:event-time:migration
npm run test:e2e:pwa
npm run test:e2e:privacy-clear
npm run test:e2e:capacity
npm run test:e2e:sw-upgrade
npm run test:e2e:cross-schema-upgrade
npm run test:e2e:cross-schema-v14-v15
npm run test:e2e:cross-schema-v13-v15
npm run test:e2e:cross-schema-v13-v16
npm run test:e2e:schema-v16-clean-start-capacity
npm run test:e2e:orphaned-v13-recovery
npm run test:e2e:web-v1-flow
npm run test:e2e:web-v1-flow:v15
npm run test:e2e:web-v1-flow:v13-to-v15
npm run test:e2e:web-v1-flow:v13-to-v16
npm run test:e2e
npm run preview
```

生产构建输出到 `dist/web`。PWA Service Worker 只在生产构建中注册；请用 `npm run preview` 验证安装与离线重开，不能用开发服务器替代。E2E 使用独立的 `.vite/playwright-web` 构建与 4197 端口，不占用常规预览目录或端口；主要流程使用本机 Microsoft Edge，P1-11 跨浏览器场景另从 Chrome 150 导出并在全新 Edge 151 中恢复。`test:e2e:a11y` 检查桌面/390px、200% 等效 640px 与 400% 等效 320px 核心页面（含 `/settings/data`）的 WCAG 2.0、2.1、2.2 A/AA、重排、强制色彩、键盘焦点与 reduced-motion；`test:e2e:boot` 以路由 chunk 失败、启动中地址切换、`BOOT_OK` 后运行故障隔离、正常 v8 升级、损坏 v8 回滚和旧标签页阻塞六个场景验证两阶段启动、路由身份绑定、时序首错锁、诊断/只读备份出口和 Service Worker 确认边界。

此前 Dexie v12 / full v1.0 的离线、数据库升级、Chrome→Edge 恢复与 CandidateSet 非空回执门只保留为上一代契约证据。普通 `npm run build` 仍固定输出安全的 `legacy-v13`，`dist/web` 也继续保持 v13；v14 与两条 v15 路线只保留为非默认历史候选。当前唯一继续维护的公开升级候选是隔离的 `npm run build:production-v13-to-v16:candidate`，输出到独立 `tmp/release-config-production-v13-to-v16`，不会覆盖默认产物或把 v16 提升为默认版本。v16 在十六个用户备份分区和派生 `birthFingerprints` 之外新增内部 `mutationState`；该运行元数据不进入 full v1.2 payload 或摘要。完整备份的快照规范化、摘要、ZIP/JSON 生成、解压、严格 UTF-8、JSON 解析、旧版迁移和只读预检由版本化一次性 Worker 完成；恢复与影子物化继续执行双次容量准入、并发 CAS 与事务回滚核对。依赖审计固定生成 CycloneDX SBOM 与第三方声明。

新增隔离术数草案之前，最近一次整仓全量回归基线为 Vitest **123 个文件 / 1396 项**全部通过；本轮草案另有独立定向门，避免把轻量契约验证冒充又一次全仓回归。本轮轻量复验为：偏好/恢复/首页/查询取消/最近视图 **6 个文件 / 117 项**，多体系 Help 展示 **2 个文件 / 6 项**，紫微/西洋契约、iztro、Fortel、官方历法、隔离 Revision、Browser 持久化、Astronomy Engine 诊断、西洋占星规则层与规则层预览客户端 **13 个文件 / 88 项**，隔离旁路 Node 定向门 **42/42**，并通过全部草案 typecheck、紫微 Browser 工件构建、紫微独立 Browser 资料库构建、西洋 Browser/Node 一致性构建、西洋规则层浏览器预览构建和普通构建。隔离 v13→v16 发布矩阵在 Microsoft Edge 通过 **12/12（约 4.2 分钟）**、在 Google Chrome 通过 **12/12（约 6.6 分钟）**；`test:e2e:web-v1-flow:v13-to-v16` 又在两浏览器各通过 1/1、共 **2/2（约 2.5 分钟）**。存储回归明确覆盖单条删除只推进一次 epoch、显式 throw/abort 时业务行与 epoch 同事务回滚、mutation marker 不进入用户 payload 或摘要，以及迁移写权限只绑定获授权的 Dexie 事务、不会泄漏给同连接上的无关并发写。普通 `npm run build` 仍是收尾默认发布门，并已保持 `legacy-v13 / targetSchema 13`；这些结果只证明当前工程与浏览器协议，不是命理专家真值，也不等于 Firefox、固定 Android、Web v1 或 APK 已完成。

`test:e2e:capacity` 在固定 Edge 工作站以精确 10,000 Case（9,912 active、88 trash、104 active favorites、0 CandidateSet）验证 50 条 keyset 分页、精确总数、检索、筛选与打开；默认 v13 仍需阻塞式全审计，不能把内容渲染冒充真正可交互。隔离 v13→v16 clean-start 门现已在 Edge 记录首次 migration + `full_audit` **37.692 s**、第二次 clean 启动 **1.072 s**，在 Chrome 记录首次 **35.498 s**、第二次 clean 启动 **1.066 s**；两浏览器首次均为 `epoch = verifiedEpoch = 1`，第二次均命中 `cache_hit`。专业 ResearchQuery 现可由用户主动取消：取消信号会中止正在读取全量快照的只读事务，并继续传入协作式执行器，取消后不保存半成品或改写视图。这关闭的是 v16 clean 数据安全快速启动子门与 ResearchQuery 取消功能，不提升默认代；P2-05 总体仍为部分完成，CandidateSet-heavy、长备注、专业查询容量、其他批量任务统一取消、内存/long-task 与固定 Android 仍未完成，完整边界见 [P2-05 案例库容量基线](./docs/P2-05案例库容量基线-2026-08-04.md)。

`test:e2e:pwa` 在一次性非隐身 Edge profile 中核对安装资格错误为 0、manifest 及 192/512/maskable 图标，并以可控事件验证“接受安装提示”不冒充“已经安装”；清空普通 HTTP 缓存并断网后，关闭旧页再分别冷启 `/settings/data` 与 `/help` 深链，帮助页再次 reload 仍由 Service Worker 正确启动，390px 无横向溢出、关键触控目标至少 44px 且 axe A/AA 为 0。`test:e2e:web-v1-flow` 现使用浏览器原生 channel（不覆盖 UA），在 Edge 151 与 Chrome 150 各连续贯通：`PWA/SW 就绪 → 混合 CSV → 精确 Case + unknown_hour CandidateSet → 从 R1 派生 R2/R3/R4 → 运限粒度/轨道 URL 恢复 → 跨 Case 四盘 → 对照来源 Revision 研读并返回 → 同 Case 四 Revision 与 A 重排 → 回收站恢复 → 研究笔记 → 用户资料导入 → 笔记引用 → 单案例日柱字段引用 → 全局 EvidenceSubject 引用 → 来源权利台账 → 覆盖率诚实边界 → Event → ResearchQuery/SavedView → 断网匿名 Markdown → full v1.2 ZIP → 十六分区清空 → 全新 context 恢复`。单案例字段引用不会抬高全局主题覆盖；主题候选引用只把结构化链接变为 1/36，双人核验和可分发来源仍为 0/36。默认 v13 门恢复后九个用户分区非空，三条引用目标、精确 ID、生命周期、13 探针、两类四盘投影、源包与二次导出的 payload、payload 摘要及十六个分区摘要逐项相等；其余七个分区保持空，意外外网请求与 console warning/error/pageerror 为 0。2026-08-04 的最终双浏览器重跑为 2/2。面向当前 v13 用户的冻结 direct 候选由 `test:e2e:web-v1-flow:v13-to-v15` 在 Edge 151 与 Chrome 150 各通过 1/1、共 2/2：4 Case、7 Revision、3 CandidateSet、3 Event、三类引用、研究者资料、应用设置、二进制附件、两条规则仓库记录、两类迁移回执与 7 条 `revision_creation_baseline` 使 full v1.2 的十六个分区全部非空；ResearchQuery 命中 `stored_receipt`，断网报告、清空、全新 context 恢复、附件逐字节下载、规则包活动状态、迁移关系，以及源包/二次导出的 payload、总摘要和十六个分区摘要均保持一致。

同一条连续门把同批 CSV 中的四个正式 Case（共 7 个 Revision）组成两类 A—D 精确会话。跨 Case 会话冻结 96 个字段与每行四值、7 行同一 UTC 运限、只含四个 `item`、一个 `at` 及可选 `focus=C|D` 的隐私 URL、桌面全局差异筛选及固定投影摘要；每个完成槽位和窄屏当前身份条都可进入对应的确切 Revision 研读页，浏览器返回后原 compare pathname/search/hash、活动盘与投影摘要保持不变。390×844 下另锁定 C/D 切换与刷新恢复、A 固定、当前 A↔活动盘成对差异和筛选、Revision/RuleProfile 身份条、44px 研读入口、原生 table/rowgroup/cell 语义、分组锚点、零根横溢、sticky 长表上下文、键盘顺序与 WCAG 2.0/2.1/2.2 A/AA，320×720 还覆盖强制色彩；重复点击同一分组锚点不会添加视觉相同的历史项。`focus` 只恢复窄屏视图，不进入投影请求或结果哈希；默认 B 不写 URL。主 Case 则从 R1 派生三个输入/换日不同的 R2/R3/R4，自动组成同 Case 四 Revision 会话，把 R3 重排为 A，并证明 URL 顺序和摘要在刷新、full v1.2 清空/恢复后完全一致。含坏 `item` 的链接原样保留并显示拒绝态，不会丢项、截断或启动投影；应用内浏览器也在干净端口冷启动复核了该失败关闭界面。这关闭的是正式四盘 Web 工程子门，不替代 Firefox、固定 Android/WebView 或专家金标。

`test:e2e:sw-upgrade` 在同一 origin 下切换三个真实、不可变的 Vite 生产构建，并为每个场景使用独立持久 Edge profile：已确认 A 在服务器切到 B 后仍返回本代 HTML/入口资源；健康 B 完整预缓存后受控激活，只有同构建页面通过启动探针并发送 `BOOT_OK` 才确认，随后清 HTTP 缓存、断网、关闭全部页面仍可在 390px 冷启案例深链；HTTP 200 但研究组件渲染失败的 B 只获得一次未确认试运行，第二次断网冷启由 B worker 返回最近确认的 A 应用壳；预缓存资源 404 的 B 会安装失败并删除残缺 cache，A 继续离线启动。该门证明的是 **同一 Dexie v13 Schema 下的应用壳升级/回退**，不等于跨 Schema 的 DB/SW 原子回滚。

`test:e2e:cross-schema-upgrade` 进一步在真实 Edge 中把 A 的物理 Dexie v13 迁往独立的生产 B v14 影子库。v14 不新增占位 store，也不改写十五个用户分区，只为 `researchNotes` 与 `events` 新增真实 `[caseId+updatedAt]` 复合索引；仓储在 v14 直接按案例倒序扫描活动流，v13 bridge 保留旧查询路径。独立控制库、租约/栅栏、旧标签页写锁、可验证迁移回执、Service Worker 代际元数据和完整 `BOOT_OK`/ACK 组成可恢复两阶段协议。8/8 场景覆盖全新浏览器直接安装 v14、已有 v13 成功切换、多标签页冻结与写入拒绝、容量不足时 B 零创建/零提交、Dexie 事务中止、目标校验失败、控制指针已提交但页面尚未确认时的刷新收敛，以及陈旧目标标签页阻塞；失败时 A 数据保持不变，确认 B 后旧页只会收敛到 B。Cache Storage 与 IndexedDB 不能共享浏览器事务，因此这里明确证明的是**失败可恢复、页面只见一个已确认代**，不是两个浏览器 API 之间的严格原子事务。

此前跨浏览器门在 Chrome 中经真实界面分别生成 `2 CandidateSet + 1 tzdbMigrationReceipt` 和 `2 Event + 1 eventTimeMigrationReceipt`，连同活动规则包与二进制附件导出同一 full v1.1；关闭 Chrome 后由全新 Edge 恢复并再次导出，十五个分区 payload 与各分区摘要逐项相等。二次导出的 `exportedAt` 会变化，因此不把 envelope 摘要相等冒充为数据无损条件。该 CandidateSet 是上一代 v1 夹具，不替代当前 2025b/2026c receipt v2 浏览器门；Event 门也只用合法合成的 native Dexie v7 / Event v1 证明升级、显式派生和恢复机制，不冒充真实历史浏览器的 Intl 行为。

时区计算发布门见 `audit:tzdb`、`test:tzdb`、`test:e2e:tzdb:edge` 与 `test:e2e:tzdb:migration`：新写入统一绑定 IANA 2026c，registry 保留 2025b。CandidateSet 以当前执行器在两份数据下生成并列结果；comparison/receipt v2 绑定完整解析 fingerprint，旧 v1 冻结兼容，目标精确匹配 registry 且阻断 A→B→A。Event 可按原工件只读复核。Transit 1.2 完整快照执行器精确绑定 bundled 2026c resolver，命名时区计算禁用宿主 TZDB，并以 Casablanca 差异哨兵防止偷用宿主规则；1.1 仍只有 node-ref 验真兼容，不冒充完整快照执行器。新增本命盘只读复演 v1 可精确重算 bazi 0.4.0 + bundled 2026c/2025b 的 Revision。`browser-intl-unreported` 不得冒充已识别快照；Chrome、Firefox 和固定 Android 仍未完成验收。完整边界见 [tzdb 固定数据工件与迁移边界](./docs/tzdb固定数据工件与迁移边界-v0.1.md)。

本命盘现有一个克制的**只读精确历史复演 v1 首切片**：追加式 executor registry 当前只登记 `hakimi-bazi-core@0.4.0`，并按 `name / version / upstreamName / upstreamVersion / upstreamTagCommit / upstreamIntegrity` 六字段完整描述符精确选择执行器；版本号近似匹配或回退当前执行器均被禁止。单盘可按精确随包 IANA 2026c 或 2025b 从冻结输入重算 time calibration、起运规则快照、历法/四柱 facts 与 result hash。`chart-integrity` 先验证 Revision 完整性再分类；未知 engine、`browser-intl-unreported`、工件缺失、descriptor mismatch、不支持的规则语义/输入精度或未冻结 DST 选择都失败关闭。复演能识别攻击者同时修改 facts 并重签 hash 的篡改；研读页只对 `replayable_exact` 显示按钮，全程零写入，不创建新 Revision。服务回归另覆盖 2025b Casablanca。

关系与起运现各有严格 composite descriptor 的历史 executor registry；Transit 1.2 也有精确绑定 bundled 2026c resolver 的完整快照 executor。它们用于研读页的**显式版本派生投影**，不是本命 Revision 复演的一部分：没有历史收据的老 Revision 不能声称比较了旧输出，临时投影固定声明 `storedHistoricalOutputCompared=false`。每次投影先要求本命盘精确复演匹配，再按用户明确选定的版本从冻结 Revision 派生关系、起运和可选 Transit 摘要；默认只在内存中展示。Schema 15 中只有用户显式点击保存，仓储才会从请求重新计算并追加收据，不创建 Revision，也不把页面内存结果直接写库。

下游计算收据现已完成 **Schema 15 非默认候选闭环**：新建或追加 Revision 时，关系/起运基线收据会与 Case、Revision 和出生指纹在同一事务提交；创建时没有用户指定的 Transit 目标，因此固定保存 `not_requested`，性别未指定也固定保存 `manual_direction_required` 而不猜顺逆。用户明确选择目标瞬时点后可追加独立收据，同一请求指纹去重；回收站案例在 UI 与仓储层都保持只读。研读页按 Schema 懒加载历史，逐条内容验真，并用新鲜读取的收据和源 Revision 做精确版本复演；历史执行器缺失时只报告“内容完整但不可精确复演”。full v1.2 已把收据纳入计数、规范排序、分区/总摘要、安全快照、恢复 CAS 与十六分区单事务；v13/v14 只接受空收据，非空恢复失败关闭，core v0.2 继续拒绝遗漏非空收据。真实 Edge 151 与 Chrome 150 的 v14→v15 门各通过 9/9，共 18/18：除旧 store 行/索引不变、基线原子写入、显式快照、重启 `BOOT_OK`、非空 full v1.2 恢复/再导出和升级事务回滚外，还覆盖全新首装、多标签冻结/写锁、容量不足、目标启动校验失败、物化后摘要不符、已提交但 `BOOT_OK` 中断，以及陈旧 target 阻塞；失败时 v14 指针与源数据不变，未确认目标完成隔离。

2026-08-03 又增加了隔离、冻结的 v13→v15 直接跳代候选；它不改变默认 v13 构建。`test:e2e:cross-schema-v13-v15` 现由 Edge 151 与 Chrome 150 各通过 10/10，共 20/20：富 v13 成功直升、已确认旧壳补建缺失 control、容量不足、目标启动校验失败、物化后摘要不符、`BOOT_OK` 中断恢复、target `versionchange` 阻塞、真实 Dexie 事务失败、同 `migrationId` 终态只做隔离且新 `migrationId` 可从干净 v13 长期重发，以及已成功用户收到新 `migrationId` 壳时继续接受旧提交谱系而无需二次迁移。成功路径中真实 note、event、attachment 行及所有源分区逐项不变；迁移不创建中间 v14 物理数据库，但在 v15 同时形成 v14 的两个活动流索引和空收据 store；旧 R1 不回填，新建 R2 只产生 1 条基线收据。两浏览器均核对完整 descriptor、source/target/verified digest、migration/control receipt digest、`BOOT_ACK` 与刷新收敛。

2026-08-10 新增并关闭隔离 v13→v16 候选的当前 Chromium 故障矩阵。`test:e2e:cross-schema-v13-v16` 在 Edge 通过 12/12（约 4.2 分钟）、Chrome 通过 12/12（约 6.6 分钟）：覆盖“双旧 v13 页，一页已 `BOOT_OK`、另一页仍在 10k 慢审计时 v16 worker 接管”的自然升级收敛，以及全新首装、富数据、跨页写锁、容量不足、目标启动/完整性审计失败、Dexie 事务中止、`BOOT_OK` 中断、陈旧 target、dirty 审计期间 CAS 竞争、同 ID 终态隔离和新 ID 长期重发。新 worker 对仍未绑定目标代的合法旧页返回明确的代际收敛信号；旧页保持 `inert` 和写锁，自动 reload 后只绑定已提交 v16，不把旧 `BOOT_OK` 当成目标确认。失败路径保持 v13 源不变、目标隔离或零创建，不产生可写半代。

`test:e2e:web-v1-flow:v13-to-v16` 又在 Edge 与 Chrome 各通过 1/1、共 2/2（约 2.5 分钟），把十六个用户分区全部非空、Revision 计算收据、断网报告、全量清空、全新 context 恢复和稳定二次导出放入同一候选流程。这里的工程命中、恢复与哈希一致只证明软件契约，不增加命理金标或专家验证计数。v16 仍是隔离候选，普通构建和 `dist/web` 继续为 `legacy-v13`。

`acceptedCommittedMigrationIds` 是新应用壳对同一目标 generation/数据库名/可读 Schema 范围内既有 committed migration ID 的显式白名单：新壳必须接受自己的 ID；若还列出上一版已提交 ID，Service Worker 就能承认原控制指针与提交回执，只更新应用壳，不重做数据库迁移。它不等于任意旧 ID、跨来源或跨 generation 自动兼容。这批证据已关闭 direct 候选的成功、逐检查点失败/回滚、同 ID 终态隔离、新 ID 长期重发、旧提交谱系兼容，以及十六分区全非空连续门。默认 `dist/web` 仍为 v13；提升前仍须唯一化生产升级谱系。

`test:e2e:orphaned-v13-recovery` 已关闭“没有已确认旧 Service Worker 壳、没有 release-control、且浏览器中只存在一个结构精确匹配的 v13 源库”的 R0 只读恢复门：Edge 151 与 Chrome 150 各通过 1/1，共 2/2。恢复页全程没有请求 `/sw.js`，没有注册或取得 Service Worker 控制权，也没有创建 control、v14、v15 或 v16 数据库；源 v13 的原生快照在导出前后逐项不变。下载得到的 full v1.2 ZIP 又在隔离的 v13 context 中通过十六分区只读预检。只要库存出现多库、结构不精确或状态竞态等歧义，页面就只显示脱敏诊断并失败关闭，不自动迁移、恢复、删除或导出。Firefox、固定 Android Chrome/WebView、唯一生产升级谱系确认、候选产物验签与任何默认代提升仍未完成。完整边界见 [Revision 下游计算收据与复演协议 v0.1](./docs/Revision下游计算收据与复演协议-v0.1.md)。当前工程总账以 Vitest 123 文件 / 1396 项、v13→v16 Edge + Chrome 各 12/12、v13→v16 连续 Web 流程 2/2 和 clean-start 双浏览器门为准；历史 v14/v15 数据继续作为冻结回归证据。

下游来源现由报告与 ResearchQuery 共同消费同一个严格 resolver。单盘报告当前为 `formatVersion=1.4.0`；ResearchQuery 执行器为 `0.2.0`，查询快照导出为 `1.1.0`。真实账本精确命中标为 `stored_receipt`，无精确收据时标为 `explicit_projection`，即时投影本身不可执行时报告为 `not_evaluable`；关系、起运、Transit 逐组件保留 `projected`、`unavailable`、`not_requested`、`not_evaluable` 或对应比较状态。Schema 13/14 的账本状态明确为 `schema_unavailable`，不得冒充历史收据；Schema 15 也只有源 Revision、Profile、规范请求指纹唯一匹配时才使用收据，`matched`、`mismatch` 与 `exact_executor_unavailable` 另行报告。损坏、重复、歧义或来源失配失败关闭，绝不静默回退当前版本。匿名单盘保留来源类别与复演结论，但移除收据 ID、请求指纹、收据/投影/组件摘要和保存时间。

## 当前工程版能做什么

- 四步排盘流程，当前支持公历、农历/闰月、分钟/秒级精确时间、未知时辰探针、任意有效 IANA 时区与显式 DST 歧义选择；
- 农历日期先经固定版本适配器显式转换为公历民用日期；原农历年月日、闰月标记、转换算法、来源和往返校验结果均保留，不覆盖用户输入；
- 保存原始历法输入、公历民用时间、UTC 瞬时点、实际偏移和候选方案；任何日期、时间、时区或历法变化都会把旧 DST 选择重置为 `reject`；
- 未知时辰保留原始 `time=null` 并生成 13 个代表性探针；DST 重叠并列 earlier/later 变体，空档不平移；候选组可独立保存、重开、检索、记录案例级笔记/事件和导出，但不会被伪装成已确定主盘；
- 经纬度完整时并列地方平太阳时和 NOAA 近似视太阳时，默认不应用到命盘；
- 年/月柱用同一 instant 的固定 `UTC+08:00` 节气候选，日/时柱用本地民用时，时干从最终日干重算；
- 选择 23:00 子初换日或 00:00 午夜换日；需要同盘规则实验时，先从确切历史修订派生并保存新 Revision，再进入正式对照，不用临时预览冒充持久化结果；规则契约拒绝“换日方式”与“子时时干日干基准”互相矛盾的快照；
- 展示四柱、十神、藏干、五行、纳音、十二长生与空亡候选字段；
- 展示天干五合/四冲与地支合、冲、刑、害、破等关系事实；二缺一和待顾问复核表明确标记，不生成合化或吉凶结论；
- 工程预览方式展示顺逆、取节、精确起运折算、交运时刻与十柱大运半开区间；无已签字金标、无吉凶解释；
- 以同一目标瞬时点并行展示大运、小运、流年、流月、流日、流时；可用全景/年/月/日/时粒度聚焦并独立筛选六条轨道，二者只改变视图，不重算或改写 `TransitSnapshot`；小运当前采用“出生时柱相邻、复用大运顺逆、虚岁 1 自出生瞬时点起、固定 `UTC+08:00` 精确立春增龄”的版本化工作口径，旧快照不会静默套用新规则；年/月采用固定 `UTC+08:00` 精确节令，日/时采用修订 IANA 时区与锁版换日；
- 运限目标、所选节点、粒度、轨道筛选与性别未指定时的人工顺逆写入可刷新、可后退、可分享的 URL；明确选择粒度进入历史，连续轨道筛选使用 replace，隐藏所选轨道时仍保留稳定节点与检查器，不把出生资料或事件正文写入 URL；
- 正式事件写入、更新、备份和恢复前都会按绑定 Revision 完整复算运限节点，拒绝重签后篡改算法、时间线、方向、节点类型、起点、节点 ID 或事实哈希的伪引用；
- Event v2 把时间明确分成三种语义：所有旧 Event v1 记录迁移为不带时区、不可换算 UTC 的 `legacy_floating`，新建非分钟记录为 `calendar_date`，新建分钟记录为 `zoned_minute`。分钟事件必须保存 IANA 时区、DST 解析候选/显式选择、偏移和规范 UTC；DST gap 直接拒绝，overlap 必须选择 earlier 或 later，不静默平移或猜测；
- 研读 URL 支持 `event=<uuid>` 精确定位事件，运限节点检查器可进入绑定事件，事件也可返回原命盘节点；事件列表支持关键词、标签、反馈、生命周期及当前修订/节点绑定筛选。新分钟 Event 绑定随应用发布的 IANA 2026c 内容寻址工件、解析器与数据摘要，不使用宿主浏览器 Intl 的命名时区数据；绑定已保留 IANA 2025b 完整描述符的 Event 会显示历史工件状态，并可按原工件只读复核且不改写记录；历史 `browser-intl-unreported` Event 保持只读可验证/可导出，不会在当前 2026c 下静默重签；
- 旧 `legacy_floating` Event 的时间字段禁止同 ID 覆盖。用户在迁移面板明确选择解释并确认后，仓储以源记录摘要 CAS 原子创建一个新 ID 目标和一条 append-only 回执；分钟目标为固定 IANA 2026c 的 `zoned_minute`，非分钟目标为 `calendar_date`。同一源可并列派生多个不同 IANA/DST 解释，目标只能归属一条回执；时间语义和回执绑定的案例/修订/节点谱系冻结，内容与生命周期仍可编辑；
- 内置 2024 十二节 × 前一秒/当刻/后一秒的 36 行边界候选及自动复算器；36/36 回归通过，但 `verifiedGoldCaseCount=0`，不会冒充发布金标；
- 内置 24 个香港天文台权威历表候选并执行 48 个公农历双向断言；当前适配器 48/48 匹配，可重复执行的 .NET 独立差分为 23 条匹配、1 条低于其支持下界、0 条分歧，但逐案例 `cross_checked=0`、人工 `verified=0`，农历发布额度仍未通过；
- 项目级金标总账把首发 360 例固定为十二类精确配额，并从逐案例证据重新计算状态；当前 36 条交节候选只能计入“界月规则”，24 条历表候选只能计入“公农历转换”，合计 `candidate=60`、`verified=0`、仍缺 300 个槽位。未知类别、重复案例/语义指纹、跨类别复用、配额溢出、伪造 verified 或声明计数不守恒都会失败关闭；
- P0-03 固定种子工程诊断已实际执行 20,000 个唯一秒级输入 × 两遍：内部 `20,000/20,000` 结果与核心摘要一致。相同输入的 .NET 公历→农历字段差分为 `19,832` 匹配、`7` 条未解决的一日历表差异、`161` 条低于 .NET 支持下界；完整报告与小型界面摘要均内容寻址，`audit:p0-03:differential` 会全量复跑并字节比较。该报告始终是 `engineering_diagnostic_only`，金标增量为 0，不冒充多时区或完整四柱独立真值；
- 上述 7 个触发样本现已扩成连续窗口数据集 `hakimi-p0-03-calendar-divergence-windows-v1`：2089 与 2097 各 32 日，共 `64 = 60` 个连续差异日 `+ 4` 个前后控制日，仍只属于 `engineering_diagnostic_only`。`npm run audit:p0-03:calendar-windows` 会固定 v1 摘要，重放当前适配器/ICU/.NET 各 64 行，从两份 HKO 原文重建并逐日核对 64 行，再核对两份 USNO 响应、规范化两事件摘要及父计划/报告；当前审核为 `unresolved`，`verifiedGoldDelta=0`（本轮 `verified +0`），不改变 `candidate=60 / verified=0` 的 360 配额总账。`npm run test:audit:p0-03:calendar-windows` 提供不联网的缩短/重签/改源和 HKO 月首解析失败关闭回归；
- 连续窗口中，HKO 是官方历表，USNO 是政府朔事件参考而非完整中国农历表，ICU 与 .NET 是彼此独立的软件实现。2089 的 HKO/当前适配器/ICU 与 USNO 朔事件日期倾向同侧、.NET 在另一侧；2097 则为 HKO/当前适配器/ICU 与 .NET/USNO 朔事件日期倾向分裂。HKO 远期网页历表受天文台网站使用条件约束，商业使用须事先取得书面授权；DATA.GOV.HK 条款不会自动覆盖这些网页历表，故当前只作审计材料引用与哈希核对，不把它们当成可直接随包商业分发的数据；
- `/settings/calendar-divergence-audit` 会先复算连续窗口摘要，再显示 64 日逐行对照和 `64 / 60 / 7` 筛选；同页可导出或载入内容寻址候选包、分别预检两份 64 日独立审核，并在两者通过后预检第三身份裁决。旧包重放、缺日、控制/分歧混淆、同一 reviewer/身份记录复用、裁决人与审核人重合、来源角色伪装、危险 JSON 与未决裁决都会失败关闭；结构预检永远不会自动核验现实身份、写入 fixture、开放 curated integration 或增加金标；
- 设置页可按需导出或载入 24 对农历内容寻址审核包，并预检绑定具体审核包、完整 fixture/数据集/来源/差分运行/候选摘要的双人裁决；危险 JSON、来源伪装、`unsupported/mismatch` 冒充匹配和重放会被拒绝。SHA-256 只证明内容一致，不证明现实人员身份；身份与来源真实性未核验时固定不可进入 fixture 集成且不增加 `verified`；
- P1-04 运限查询现有 18 条纯合成、隔离关系与事件的六轨审核候选，覆盖立春/交节/23 点换日/01 点换时、出生前或交运前不适用、未知性别顺逆降级；设置页可导出或载入内容寻址候选包，分别预检两份独立审核，再预检最终裁决。三类文件逐级绑定完整快照、Revision、查询、数据世代、工程结果、规则/小运摘要、时间轴、算法和可重算来源材料谱系；跨包/跨候选重放、同一离线身份冒充双审、同材料换名、时间倒序和第三种未审核裁决会失败关闭。SHA-256 不是人员签名，所有通过结果仍固定 `identityVerified=false`、不写 fixture、查询/运限专家金标均为 0；
- `/settings/transit-review-inbox` 提供持久化的“本地未核验审核收件箱”：按 JSON 内 `format` 导入候选包、独立审核或裁决，保存经严格 UTF-8、2 MiB、Schema 与摘要门验证的原始字节；相同字节即使换文件名也会原子去重，完整备份会逐字节带走并恢复。页面每次刷新都从原始字节重新执行当前协议，按审核包、候选与精确审核摘要重建等待/通过/失败状态；删除上游后下游自动退回等待。该收件箱只整理材料，不核验现实身份或来源，不开放 fixture/gold 集成，所有可信度与专家金标增量固定为 0；
- 保存 `Case + Revision` 到 IndexedDB；命盘页可切换任意历史 Revision，并从确切 Rn 预填原出生资料、校时和规则快照后追加新修订，不覆盖或改写任何历史盘；
- 案例与未知时辰候选组均支持收藏、别名/标签编辑、移入回收站和恢复；回收站记录保留修订、笔记、事件与去重指纹，只能在回收站经过不可逆确认后永久删除；全部、收藏、回收站各自在当前生命周期范围内检索；
- 正式对照台可选择 2～4 个确切 Revision，以 A 为可重排基准，对齐当前 96 个输入、校时、规则、规则包来源、历法、四柱、关系和证据字段；支持文字化差异状态、只看变化、同一 UTC 瞬时点六层运限与精确 URL 刷新恢复。每个桌面槽位和窄屏当前身份条都可打开对应的确切 Revision 研读页，返回后原会话、活动盘和投影摘要保持不变。桌面按任一 B/C/D 相对 A 汇总；窄屏固定 A、切换 B/C/D，并让标题、分组计数、行状态和筛选严格按当前 A↔活动盘重算。可选 `focus=C|D` 只恢复视图且不改变投影哈希；URL 还保存未指定性别时的人工顺逆。损坏、重复、超量、未知或混用参数与不规范 UTC 均整条失败关闭，不截断、不猜 latest。未知时辰候选探针保持独立研究入口，不混入正式盘；
- 正式对照输出经过深层 exact JSON 运行时 Schema，并独立复算 Revision、完整字段矩阵、同步运限快照和最外层摘要；摘要格式锁为 `formal-comparison-hash-v1`。2/3/4 列、当前 96 字段及旧 Revision 人工顺逆路径已有 `fixtureVersion=1.1.0` 的版本化工程黄金文件和只读 `--check` 门，但明确不算命理金标或专家裁决；
- 双案例结构研究使用独立 `/compare/pair`，只接受两个不同 Case 的两个确切 Revision；`parallel_facts_only` 只并列双方各自冻结的当前 96 项事实，并在同一 UTC 瞬时点按双方各自 Revision、规则与时区分别计算六层运限。更改 B 不得改变 A，交换 A/B 只改变排列；输出固定为 `participant_facts_only`、`engineering_projection`，不包含评分、吉凶、缘分、婚配结论或跨盘推导，也不计入命理金标；
- 双案例页新增两条分离的本地出口：默认匿名 Markdown 先重新验签整个双案例工件，再按冻结白名单分别重建双方各 76 项系统事实和去引用的六层活动节点；不会下载删字段后的原始对象。它移除别名、UUID、地点/坐标、来源说明、用户文本、规则名称/说明/来源、全部摘要和完整运限轨道，并常驻组合信息仍可重新识别的警告。完整审计 JSON 使用自描述的敏感信封原样封装已验签投影，必须在界面逐次勾选确认，领域 API 也要求 `acknowledgedSensitiveData=true`；两种出口任一内层 Revision、观察、运限或外层摘要不一致都会失败关闭；
- 保存规则快照、上游版本、工程警告、规则哈希、可选规则包精确绑定和结果哈希；规则包摘要进入新结果哈希，旧 Revision 不会随当前活动包改变；
- 专业研究检索以严格 `ResearchQuery v1` 统一正式命盘、候选组、真实事件和知识资料四种范围；当前执行器为 `0.2.0`、查询快照导出为 `1.1.0`。支持 NFKC 中文全文、生命周期、收藏、标签、日主、月令、版本化确定性干支关系、完整规则配置摘要、指定 UTC 瞬时点运限及“同一条事件满足全部条件”的组合查询。关系/Transit 派生筛选输出 `stored_receipt` 或 `explicit_projection` 来源、账本状态和逐组件比较状态；所需 stored-receipt 组件不是 `matched` 时写入 `not_evaluable` 诊断并失败关闭。账本状态和全部验真收据进入 `dataEpoch`，来源结果进入 `resultDigest` 与导出。每张事件卡可用“按此事件条件检索”生成严格会话草稿：节点事件绑定当前节点，修订级事件绑定精确 Revision，候选盘/案例级事件绑定精确 Case，避免同名同标签事件跨案例串入；它表达条件检索而非精确锁定单一 Event。只有随机草稿 UUID 进入 URL，标题、Case/Revision/Event ID 与完整条件都留在当前标签页的 `sessionStorage`；草稿写入失败时停留原页并明确报错。结果保留确切 Revision、事件和节点来源，并可导出经过摘要复算的当前查询快照；只要启用运限条件，结果区会直接显示“专家验证案例为 0”，不把工程命中写成命理真值；
- `SavedView v2` 支持保存、更新、复制和刷新恢复；案例库简单视图必须先明确“正式命盘”或“候选组”，高级条件只在专业检索中执行。旧版任意 `filters/sort` 统一迁移为不可执行的 `migration_required`，只有人工查看原文、重选当前条件并确认后才能转换，不会自动猜测旧语义；
- 本地导入最大 2 MiB 的 Markdown/TXT 资料，以 Worker 严格解码 UTF-8、冻结内容哈希并提取真实章节；导入时原子创建绑定精确正文哈希的 `SourceRights`，用户资料始终保持“用户提供、未核验、仅本机、未复核”，普通界面和仓储 API 不能把它升级为随包资料；支持书名/作者/正文检索、章节/行号深链，以及面向命盘字段、研究笔记、事件和稳定证据主题的“用户候选”结构化引用与反向链接。引用是独立证据层，不改写 Revision 事实；删除资料会事务级联清理引用和权利记录；
- 知识页提供独立的来源权利台账和依据覆盖审计：台账分别展示古代作品层与现代版本/校点/数字化文本层权利、分发范围、复核状态和正文哈希；覆盖报告以 36 个版本化四柱字段 `EvidenceSubject` 为固定分母，分别计算 provenance 完整、结构化链接、双人核验、可分发来源四项指标，并列出确定性缺口与报告摘要。用户候选引用只会增加结构化链接，不会增加双人核验、可分发来源或金标；
- 下载 CSV 模板或对任意表头显式映射 14 个字段，选择重复策略后分块预检、取消并逐行写入；精确分钟写为命盘案例，未知时辰写为完整 13 探针候选组；原始 `Blob` 直接交给一次性模块 Worker，以固定 64 KiB `Blob.slice()` 和严格 UTF-8 流式解码读取，第一遍完成表头与精确计数，第二遍按 RFC 4180 记录流处理，不再物化完整解码字符串或累计全部解析记录；批次必须等待主线程合并和进度回调确认后才继续；无 Worker 回退也复用同一 Blob Source；表头限制为 256 列、32,768 个字符、单元格 256 个字符；`skip/error` 会在 IndexedDB 提交事务内再次原子检查出生指纹；首版硬上限为 5,000 个数据记录（空行也占安全上限）和 20 MB 文件，混合 fixture 已覆盖计数、任意 UTF-8/RFC 4180 分块、第 5,001 行拒绝、取消与重试；生产浏览器已通过 5,000/5,000 预检、15.63 MB 字节扫描取消、干净重试及 390×844 窄屏复验，固定 Android 设备容量基线仍待验收；
- Web 研读页可锁定当前网址指定的精确 Revision，单事务读取案例、该修订适用的笔记/事件、结构化引用、原文和来源权利记录；命盘/资料/Citation 摘要或正文哈希、权利记录归属任一失配都会失败关闭，不会退回最新版或输出半可信报告；
- 当前 `1.4.0` 单盘报告模型可导出 Markdown、1080 CSS 像素宽且以 `pixelRatio: 2` 栅格化的高清摘要 PNG，并通过浏览器系统打印面板打印或另存为 PDF；当前 `0.4.0` 研究 CSV 仍覆盖整个案例的全部修订、归档笔记和软删除事件。报告把本命事实标为已校验冻结 Revision，并为下游来源、账本状态、复演结论和关系/起运/Transit 组件建立独立字段。四种出口共用默认匿名/显式完整切换：匿名模式移除别名、位置、用户研究文本、规则方案名称/说明/自由文本来源、字段 provenance 自由文本、结构化引用、结果哈希、事件时间上下文、Event 时间派生回执，以及计算收据 ID、请求指纹、收据/投影/组件摘要和保存时间；仍保留非个人的来源分类、复演结论与 `rulePackBinding` 计算来源，包括 `packId`、`packDigest`、`profileId`、`profileDigest` 与 `useMode`。完整模式保留本地审计来源、权利状态、运限节点引用、Event v2 的时间语义、IANA 时区、DST 选择、偏移、规范 UTC，以及与所选事件有关且端点投影一致、冻结快照正文 SHA-256 已重新计算通过的时间派生回执；农历字段继续包含原值、闰月、公历解析和算法 ID，CSV 保留 BOM 与公式注入防护；
- **历史 v1.3 Edge 聚焦门证据：** 合法合成 native Dexie v7 / Event v1 经界面显式派生出两条非空时间迁移凭证，完整报告视觉 DOM 保留乙亥、甲申、辛巳、壬辰四柱及两条凭证的源/目标 Event、冻结摘要、IANA/UTC 与 `calendar_date` 解释。门禁用并清空普通 HTTP 缓存，在 context 级断网且新文档 `navigator.onLine=false` 后，以 390×844 重载同一精确 Revision，页面与报告弹层均无横向溢出；完整 Markdown 的 front matter 锁定 `schemaVersion: "1.0.0"`、`formatVersion: "1.3.0"`、报告 kind/format 与 `anonymized: false`，正文保留四个 Event ID、旧来源字符串及两条凭证的源→目标/摘要引用映射；同一离线报告生成 2160px 宽 PNG。当时 DOM/CSS 另经无头 Edge 打印引擎生成一份 588,561 字节、7 页 A4 PDF，逐页渲染复核均可读；全过程 `console warning/error` 与 `pageerror` 为 0。该冻结记录证明 v1.3 的 Event 回执与打印链，不证明当前 v1.4.0 的下游计算来源契约；自动门也没有操作系统原生打印 UI，不构成 Firefox、Android Chrome、Android 原生打印/分享或固定真机证据；
- 独立数据管理页 `/settings/data` 可导出、预检并事务恢复 full v1.2 的十六个用户数据分区：原十五分区加只追加 `revisionCalculationReceipts`。冻结 full v1.1 必须先按原十五分区 Schema、计数、摘要与关系验真，才补空第十六分区；旧 Revision 不回填。当前格式分别复核 CandidateSet、Event 与 Revision 计算收据的内部摘要、源绑定、上下文与唯一性；v13/v14 可导出/恢复空收据分区但拒绝非空收据，Schema 15 与隔离 Schema 16 候选可完整往返。v16 的 `mutationState` 和派生 `birthFingerprints` 均不属于用户备份分区，marker 变化不会改变 payload 或摘要。附件、singleton、规则仓库、并发 CAS、精确安全备份、容量准入和十六分区单事务恢复边界保持；完整备份的规范化、摘要、ZIP/JSON 生成、解压、严格 UTF-8、解析、旧版迁移和只读预检均进入一次性 module Worker；最终仓储重做记录/关系校验，并在同一 Dexie 写事务内比较当前十六分区摘要后才替换。当前仍缺 Firefox、固定 Android/WebView、原生 SAF adapter、真机容量/放大系数标定、极端大库、内存峰值和分卷；
- 随包知识构建门要求 manifest、正文 SHA-256 与权利台账一致，并分别核清古代作品和现代版本/校点/数字化文本的权利；未知、受阻、仅本机、哈希失配或未完成双人分发复核都会拒绝进入 PWA/未来 Android 包。当前随包典籍正文为 **0**，来源候选和权利依据见 [首批典籍来源与权利审计](./docs/首批典籍来源与权利审计-2026-08-01.md)；
- 设置页可导入、隔离保存、导出、删除和显式激活严格声明式规则包；公共入口限制 2 MiB 与节点/键/字符串总预算，拒绝代码、URL、原型污染、未知字段和摘要篡改。包内审核只作为作者自述；本机激活不认证身份。合法但引擎未完整支持的包可保存研究，不能激活；活动引用损坏或升级后不兼容时，新建排盘与 CSV 导入失败关闭，不静默退回默认规则；
- 独立 `/help` 页面从桌面侧栏、手机顶栏和设置页均可到达，提供首次使用清单、本地明文数据与完整备份风险、PWA 离线边界、Revision/Profile/CandidateSet 术语、规则与证据边界、当前无 AI、18+ 及高风险用途边界、异常恢复步骤和当前构建身份。页面明确说明未来 Android APK 不会自动继承浏览器数据；迁移仍以 full v1.2 的只读预检与恢复为边界；
- 响应式桌面研究壳与手机底部导航/依据抽屉；提供跳到正文入口，跨页面导航把焦点移到主内容区，报告弹窗和窄屏字段依据抽屉均锁定 Tab、支持 Esc 并在关闭后恢复触发点。当前自动门覆盖 200% 等效 640px、400% 等效 320px、强制色彩与 reduced-motion；应用内 Edge 又在传统滚动条的 320×720 视口确认 `scrollWidth = clientWidth = 305`、危险操作取消后焦点回到触发按钮，控制台无错误。390×844 的正式对照、双案例、单盘报告和设置页证据继续成立；这仍不是固定 Android 真机结论；
- 自有 manifest、图标与按 HTML/脚本/样式/manifest/图标实际内容生成指纹的全路由预缓存 Service Worker；当前追加式官方 tzdb 注册表中的历史工件、Schema 15 收据历史界面独立 chunk，以及 Schema 16 mutation-state/完整性协议均进入对应候选代。只有真实懒加载路由、代际描述符要求的十五/十六个用户数据分区、派生指纹索引、v16 内部状态及计算核心烟测均成功后才确认新构建；未完成 `BOOT_OK` 的合法旧页在新 worker 接管后保持锁定并 reload 收敛，不能用旧代回执确认目标代；缓存只接管显式静态资源，不吞入未来同源 API 响应；
- 浏览器真实发出 `beforeinstallprompt` 时显示暖色安装横幅；用户接受提示只表示浏览器已接收请求，只有 `appinstalled` 才显示“安装完成”。真实非隐身 Edge 的安装资格错误为 0，manifest 与 192/512/maskable 图标均可获取；清缓存并断网后新开数据管理深链仍能冷启动。同 Schema A→B 已覆盖健康确认、HTTP 200 运行故障回退和预缓存 404 清理；真实生产 v13→v14 已在 Edge 通过 8/8 可恢复两阶段门，并覆盖全新首装、容量不足时目标零创建、源指针不动与无 `BOOT_OK`。操作系统安装 UI、安装后独立窗口启动、Chrome、Firefox、Android Chrome 与固定真机仍待验收；
- 无账号、无付费、无 AI、无 iOS 代码。

当前明确没有完成：24 条农历候选与 360 例金标的现实复核、规则/小运/关系映射的专家真值与可信身份链；`browser-intl-unreported` 的可识别旧工件迁移；0.4.0 以外的历史 bazi executor、relations/luck 的更多历史代、Transit 1.1 完整快照 executor；CandidateSet/Revision 在 Chrome、Firefox、固定 Android 的同构门；跨长期应用代际 registry 持续重发审计；用户/远端 tzdb 工件信任模型；完整四柱独立差分与固定设备容量/性能门。full v1.2 仍是单文件，Android SAF/分享 adapter、真机存储与 APK 壳也未完成，因此当前不能把“本命盘只读复演 v1”扩大为“完整 Revision/所有历史引擎/完整命盘 replay”，也不能把无收据的显式版本派生说成旧输出比对，更不能声称 Web v1 或 APK 已完成。详见 [v1 功能验收矩阵](./docs/v1功能验收矩阵-v0.1.md)与[跨 Schema 发布协议](./docs/跨Schema数据库与ServiceWorker发布协议-v0.1.md)。

## 代码边界

```text
apps/web                 React + Vite 响应式 Web/PWA
packages/contracts       Zod 运行时契约
packages/integrity       规范 JSON 与 SHA-256 完整性基础
packages/chart-integrity 正式命盘、修订与候选快照的共享结构/摘要验真，以及本命盘只读复演能力分类与投影
packages/time-core       公历/农历解析、IANA/DST 归一化与太阳时对照
packages/rule-profiles   可序列化规则快照
packages/rule-packs      声明式规则包、摘要与安全预检
packages/bazi-core       lunar-typescript 白名单适配与确定性哈希
packages/gold-standard   候选/交叉检查/已签字金标分层与发布门
packages/relations-core  干支关系事实、规则版本、来源状态与严格 composite descriptor 历史 executor registry
packages/storage         Dexie v13 bridge、v14/v15 历史候选与显式 v16 mutation epoch/CAS 候选；事务级写锁能力、Revision 基线原子写入、CandidateSet/Event 时间迁移回执、规则仓库与生命周期
packages/luck-core       起运、十柱大运、小运步进规则与严格 composite descriptor 历史 executor registry
packages/transit-core    六层并行运限切片、稳定节点引用及绑定 bundled 2026c 的 1.2 完整快照 executor；1.1 仅 node-ref 验真
packages/revision-replay 本命精确复演后的显式投影、下游计算收据、内容验真与精确历史输出复演比较
packages/comparison-core 2～4 个正式 Revision 的字段矩阵/差异/同步运限，以及两个不同 Case 精确 Revision 的事实层工程投影
packages/knowledge-core  知识资料规范化、来源权利构建门、36 个证据主题与四项依据覆盖审计
packages/case-import     RFC 4180、行级错误、去重、分块与取消
packages/research-query  ResearchQuery v1 / engine 0.2.0 执行、收据来源追溯、严格数据验真、稳定结果摘要、1.1.0 查询快照，以及 P1-04 候选包/独立审核/最终裁决的只读预检门
packages/research-export 精确单盘报告 v1.4.0（保留冻结 v1.3 历史证据）、下游来源与 Event 时间派生回执、匿名扫描/黄金契约，以及 Markdown/全案例 CSV 导出
packages/backup          十六分区 full v1.2 ZIP/JSON 与冻结 v1.1 迁移；core v0.2 对非空计算收据保持失败关闭
packages/platform        Web/未来 Android 的平台能力边界
packages/ziwei-doushu-contracts-draft 紫微斗数 draft.3 输入/规则/事实/回执与 canonical digest 门；生产导入禁止
packages/ziwei-iztro-adapter-draft 锁定 iztro@2.5.8 的一次性 Node/Browser Worker、完整 Browser 专属工程工件与 2023–2028 官方历法证据；无生产路由、存储或备份
packages/ziwei-fortel-differential-draft 锁定 Fortel 1.3.4 的一次性 Worker 命名字段差分；只报相同/差异/不可比，不给真值或总分
packages/ziwei-workspace-artifact-draft 紫微独立不可变 study/Revision；保留 Node 内存演示，并提供 4218 Browser 资料库、epoch/CAS、重开验真、单条导出、完整独立备份/预检/原子恢复；不进入 apps/web 或八字数据库
packages/western-astrology-contracts-draft 西洋星盘隔离契约草案；生产导入禁止
packages/western-astronomy-engine-adapter-draft 锁定 Astronomy Engine 2.1.19 的一次性 Worker UTC 位置诊断与 Browser/Node 稳定投影门；不生成严格星盘或成功回执
```

`lunar-typescript@1.8.6` 只作为实验候选实现。产品不会直接暴露其宜忌/吉凶 API，也不会把上游输出宣称为已经通过本项目金标准的生产真值。

紫微工程探针可用上面的 demo 命令运行，也可单独构建并打开本机 `4216` 端口的浏览器十二宫预览。两条路径都为每次计算新建隔离 Worker；Browser Worker 返回包含 input、冻结规则、facts、provenance/evidence、执行身份和四层 canonical SHA-256 的专属工程工件。主线程重新验真工件与当前九文件源码图后，才从已验真的 facts/rule snapshot 本地派生宫位、星曜、亮度和四化显示；该工件不是、也不能冒充强制 Node runtime 的 fixture receipt。Fortel 差分会同时新鲜运行固定 iztro 与 Fortel Worker，再逐项比较公农历、命身宫、十二宫、14 主星、14 辅星、四化与大限；外部 JSON 的摘要自洽不再被当作引擎身份证明，报告的结构/摘要门也只承认内容自洽，只有 fresh 复现门会重跑两套引擎并返回本次新报告，历史 Worker ID 与时间戳不冒充已认证。月干支、时干支、亮度、辅助星全集和解释层保持不可比，晚子策略未对齐时直接失败关闭。它已稳定保留戊/庚/壬年化科表的具名差异，但不输出一致率、胜负或专家结论。

紫微 workspace 还保留 Node 内存 Store 的单 Revision 文件演示；Browser 侧则新增不接入 `apps/web` 的 `4218` 独立研究预览。它把已验真的完整 Browser 工件保存到独立 IndexedDB `hakimi-ziwei-browser-workspace-draft`，以 UUID study/Revision、内容地址、完整父链和 mutation epoch/CAS 失败关闭；重开读取并验真保存字节，不重新排盘。最近档案列表有界，用户可导出单个 Revision 或整个独立资料库。完整备份选择后先做零写入预检，再以 create-only 单事务合并：相同项跳过，身份/内容冲突、陈旧 epoch、容量不足或事务中止会整批停止；`clearAll` 是唯一删除路径，只能清空该紫微草案库。此备份是完整的**独立紫微 Browser workspace**备份，不包含八字数据库，也不属于或扩宽 full v1.2。

西洋 Astronomy Engine 探针只接受规范 UTC，输出地心 EQJ、真黄道日期位置与 UTC ±60 秒中心差分，并明确标记 Moon 的直接 `GeoMoon` 语义；Browser/Node 隔离页在 Edge、Chrome 分别重放五个 fresh Worker 种子，以版本化十进制稳定投影逐字段核对，同时保留 raw canonical 差异。它仍只返回 `diagnostic_only` 信封，不生成严格星盘或 `western-calculation-receipt`；当前也没有取得可锁定的 JPL Horizons 官方响应字节，未用合成数据代替。规则层已另把诊断位置接入纯几何黄道/宫位/相位竖切（`npm run demo:western:rules`），输出仍固定 `astrology_rules_engineering_artifact` 且不产生回执；`4219` 规则层浏览器预览（`npm run preview:western-rules-preview`）每次新建一次性 Worker、只渲染不保存，带 SVG 星盘轮与恒星黄道演示，已在 Edge 151 与 Chrome 151 完成十体/十二宫/角点/相位核验，全程零存储、零外网请求；JPL Horizons 差分离线管道已就绪（`npm run demo:western:horizons`）：冻结 2025 春分太阳地心 VECTORS 查询清单、证据 SHA-256 校验与 raw AU 差分报告，官方字节缺失时固定失败关闭；2026-08-10 对 JPL 官方端点的 TLS 直连与代理尝试仍被网络层阻断，未用合成数据代替。所有这些隔离路径都不写生产数据库、不进入八字 full v1.2，也不会改变普通 `npm run build` 的 `legacy-v13 / targetSchema 13` 身份。隔离历法门另从 DATA.GOV.HK 的香港天文台 2023–2028 六份年度 CSV 离线还原 **2,192 日 / 74 个农历月界 / 5 个跨年接缝**，并只声明 `calendar_resolution`；`upstream_regression`、`differential_diagnostic`、摘要一致和恢复成功都只是固定依赖图与软件协议的工程证据，不是专家真值。

## 当前文档

- [P0/P1 研究闭环进展](./docs/P0-P1研究闭环进展-2026-08-01.md)：当前可运行闭环、逐项缺口与下一条关键路径。
- [P2-05 案例库容量基线](./docs/P2-05案例库容量基线-2026-08-04.md)：固定 10,000 Case 的默认 v13 红灯、Schema 16 Edge/Chrome clean-start 实测、跨代自然收敛与仍未闭环的总门。
- [产品方向更新 v0.2：专业研究版](./docs/产品方向更新-v0.2-专业研究版.md)：当前最高优先级基线及五个待确认问题。
- [多术数融合扩展边界 v0.1](./docs/多术数融合扩展边界-v0.1.md)：八字当前严格协议与未来紫微斗数、西洋星盘能力包的路由、数据、备份和验收边界。
- [紫微斗数契约草案与来源门 v0.1](./docs/紫微斗数契约草案与来源门-v0.1.md)：早/晚子、闰月、draft.3 规则快照、十二宫/162 星曜/四化/20×12 亮度事实、canonical digest 门、iztro fresh-Worker、Fortel 命名字段差分，以及 `4218` 独立 Browser 资料库的保存/重开/导出/完整隔离备份竖切；当前仍无生产入口、八字 full v1.2 接入或专家真值。
- [西洋星盘契约草案与来源门 v0.1](./docs/西洋星盘契约草案与来源门-v0.1.md)：UTC/TT/UT1/TDB、星历目标中心、黄道/宫制/相位、后备拒绝、候选引擎许可证，以及当前隔离 Astronomy Engine UTC 诊断与 Browser/Node 稳定投影边界；当前无生产入口。
- [八字规则配置与金标准计划 v0.1](./docs/八字规则配置与金标准计划-v0.1.md)：工作默认、规则包契约、360 个金标准与差分策略。
- [时间归一化与金标边界 v0.2](./docs/时间归一化与金标边界-v0.2.md)：IANA/DST 歧义、太阳时对照、边界 fixture 与发布门。
- [农历闰月输入与转换 v0.1](./docs/农历闰月输入与转换-v0.1.md)：原始输入、固定适配器、转换快照、拒绝条件与待补金标。
- [首批 24 条农历历表候选 v0.1](./docs/首批24条农历历表候选-v0.1.md)：香港天文台权威对照、.NET 独立差分、24 对/48 方向计数与人工金标边界。
- [首批 36 节气边界候选审计 v0.1](./docs/首批36节气边界候选审计-v0.1.md)：十二节秒级候选、证据状态与人工签字流程。
- [P0-03 工程差分报告 v0.1](./docs/P0-03工程差分报告-v0.1.md)：固定种子 20,000×2 内部确定性、.NET 公农历字段差分、由 7 个触发样本展开的 64 行连续窗口、HKO/USNO/ICU/.NET 分裂与零金标边界。
- [小运规则裁决与实现 v0.1](./docs/小运规则裁决与实现-v0.1.md)：原典事实、产品工作口径、旧快照边界、金标候选与 GitHub 复用结论。
- [运限查询专家审核协议 v0.1](./docs/运限查询专家审核协议-v0.1.md)：18 条六轨候选、两份独立审核、最终裁决、来源谱系与无签名条件下的零金标边界。
- [干支关系规则审计表 v0.1](./docs/干支关系规则审计表-v0.1.md)：48 个关系规则 ID、来源、争议与 v1 展示门槛。
- [Web 研究工作台信息架构 v0.1](./docs/Web研究工作台信息架构-v0.1.md)：桌面/手机导航、关键页面、修订与全局状态。
- [运限纵向切片技术设计 v0.1](./docs/运限纵向切片技术设计-v0.1.md)：六层时间线、URL/存储边界、Android 适配与验收门。
- [Revision 下游计算收据与复演协议 v0.1](./docs/Revision下游计算收据与复演协议-v0.1.md)：不可变 Revision、只追加收据、两层验真、Schema 15 与备份 1.2 发布顺序。
- [v1 功能验收矩阵 v0.1](./docs/v1功能验收矩阵-v0.1.md)：完整研究闭环的逐项通过线和证据要求。
- [S0 工程竖切说明 v0.1](./docs/S0工程竖切说明-v0.1.md)：当前实现范围、运行证据和不能冒充 v1 的边界。
- [视觉概念实施规格 v0.1](./design/视觉概念实施规格-v0.1.md)：四张概念图到生产组件的具体映射与视觉验收线。
- [P0 视觉忠实度记录](./design/qa/视觉忠实度记录-p0.md)：关系、运限、CSV 导入、个人知识库及 360/390/1440 视口的生产预览证据。
- [S0 视觉忠实度记录](./design/qa/视觉忠实度记录-s0.md)：概念图对照、安卓常见宽度与有意偏离项。
- [产品决策记录（历史）](./docs/产品决策记录-2026-08-01.md)：上一轮 B/A 双路线决定，供追溯。
- [产品规划 v0.1（历史底稿）](./docs/产品规划-v0.1.md)：早期定位、MVP、架构与商业模式讨论。
- [第一轮方向选择卡](./docs/第一轮方向选择卡.md)：已完成的第一轮选择及其历史选项。
- [外部验证报告](./docs/外部验证报告-2026-08-01.md)：竞品、跨端技术以及中国大陆上线风险的来源与结论。
- [双路线 MVP 对比（历史）](./docs/双路线MVP对比.md)：上一轮大陆文化版与海外命理解读版对比。
- [双产品技术架构 v0.1（历史）](./docs/双产品技术架构-v0.1.md)：上一轮双生产平面方案；共享包与开源边界仍可参考。
- [GitHub 开源复用评估](./docs/GitHub开源复用评估-2026-08-01.md)：候选仓库的许可证、测试与可复用边界。
- [GitHub 相似项目筛选](./docs/GitHub相似项目筛选-2026-08-01.md)：面向八字研究台的最新候选复核；结论是只借鉴机制与测试维度，不整仓搬运，也未复制外部代码、素材或典籍内容。
- [首批典籍来源与权利审计](./docs/首批典籍来源与权利审计-2026-08-01.md)：记录首批来源候选、作品层/现代版本层的独立权利判断、随包构建门与“当前正文为 0”的边界。
- [视觉系统与原创边界 v0.1](./docs/视觉系统与原创边界-v0.1.md)：原创“一纸四时”方向、设计令牌与竞品禁用清单。
- [AI 内容边界样例](./docs/AI内容边界样例.md)：两条路线各自允许、改写与拒绝的示例。
- [MVP 验证与商业假设](./docs/MVP验证与商业假设.md)：访谈假设、内部通过线、停止线和收费验证顺序。

## 当前最重要的决定

已确定当前集中推进 **B 专业八字研究版**：面向简体中文八字学习者与研究者，先做响应式 Web/PWA，之后优先适配 Android。

当前不做付费与 iOS。尚需用户/顾问最终确认流派来源、默认换日、强校验年份范围、规则争议签字人与未来 AI/BYOK 方式；现有值都以可逆“工作默认”运行。
