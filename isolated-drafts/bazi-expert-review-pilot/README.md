# 八字 v1.7 无代码专家试审（隔离试填）

这是一个完全隔离、零运行时依赖的静态页面。它只帮助不懂代码、不了解 AI 的命理专家查看五个**人工构造的工程测试场景**并填写反馈；启动页面由协调人负责，专家不需要运行命令。

它不接入根 workspace、根 `package.json`、lockfile、生产 Web、IndexedDB 或 Schema 13 数据；不联网、不调用模型、不比较系统与专家表现，也不改变任何规则或发布状态。

## 固定边界

- `legacy-v13 / targetSchema 13 / migrationId null`
- `countsTowardFormal2of2=false`
- `countsTowardExpertGate=false`
- `formalAdmissionAllowed=false`
- `trustedBootstrapEstablished=false / packageAuthenticityEstablished=false / pinProvenanceVerified=false / signature=false`
- `samePrivilegeIntervalMutationExcluded=false / realPersonDistributionReady=false`
- `alternateDataStreamsEnumerated=false / alternateDataStreamsExcluded=false / sameCycleReplayExcluded=false`
- `samePrivilegeConcurrentMutationExcluded=false / atomicSessionCleanupEstablished=false / atomicObservationWriteEstablished=false`
- 内容真值、专家真值、科学有效性、发布就绪、专家声明、公开部署与公开发布授权全部为 `false`
- 本 pilot 不创建、读取或声称任何 Schema 13 mutation epoch
- 五个条目是人工构造场景，不是五个人；题面没有真人出生日期、时间、地点、性别、事件或备注
- 所有输出固定 `personDataPresenceAssessed=false`、`personDerivedDigestExcluded=false`、`safeToPublish=false`，只能作为私密、仓外材料处理
- 敏感资料预检只能拦截明显模式，不构成匿名证明；工具不主动上传，但下载位置和打印后的流转由浏览器、操作系统和协调人控制

## 文件入口

- `seat-a.html`：A 席预冻结顺序
- `seat-b.html`：B 席预冻结镜像顺序

源码树同时保留两个入口，仅供开发与验证，不能直接交给现实专家。`package-builder.mjs` 可以为机械测试生成同一 opaque `reviewCycleId` 下的两个物理单席子包，但包内自检无法证明自身或 manifest 的真实性。现实分发在 owner 另行建立可信 pin 来源或数字签名并明确授权以前必须停止；owner 的一般试填许可、包内 manifest、pair manifest 或同包 pin 文件都不能补足这条技术信任根。A、B 也不得获得另一入口、另一顺序、另一席导出或另一席状态；所有 manifest 继续固定 `distributionAuthorized=false` 与 `realPersonDistributionReady=false`。

```powershell
node .\package-builder.mjs --pair --new-review-cycle
```

命令打印仓外 pair 根目录、新生成的 `reviewCycleId`，以及 A/B 两个 `PIN-CANDIDATE` manifest raw SHA-256。协调人可把这两个 pin 分席保存到仓外独立记录；控制台输出本身仍固定 `pinProvenanceVerified=false / signature=false`，复制回 pair 根或任一单席包也不会变成信任根。命令不会在本仓库留下 `delivery/` 或 `dist/`。pair 根目录当前只供协调人做机械验证，不得交付现实专家。需要指定目录时使用 `--output`，目标必须尚不存在并在 realpath 上位于本 pilot 源码树之外。若只为机械测试单独构建一席，必须显式提供合法的 `--review-cycle pilot-review-cycle.<64位小写十六进制>`；实体包不接受 unassigned cycle。

每个单席包都带有协调人专用的 `START-HERE.txt`，但 `START-PILOT.cmd` 已明确关闭包内直启。受支持的机械入口是以 `PowerShell -NoProfile` 运行源码树 `external-pin-prelaunch-candidate.ps1`；它先清除 `NODE_OPTIONS`、`NODE_PATH` 与 npm Node-options 环境，再启动 Node 核心。核心随后用调用者显式提供的 64hex pin、seat 与 review cycle 调用源码侧 verifier，核对实体 manifest raw SHA、完整 payload 集合与每个 hash，并以静默语法检查解析 package launcher；这些步骤不主动 import 或求值单席包 JavaScript。只有预检通过，候选协调器才以模块加载时捕获的 Node 路径、单一 launcher 参数、精确 cwd、`shell=false` 和受限环境启动包内 launcher。示例（仅机械测试）：

```powershell
powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File .\external-pin-prelaunch-candidate.ps1 --package-root 'C:\仓外\seat-a' --manifest-sha256 '<仓外另存的A席64hex pin>' --seat A --review-cycle 'pilot-review-cycle.<64hex>'
```

不得直接运行 `.mjs` 核心：Node 的父环境预载发生在核心获得控制权以前，核心只能拒绝这种直启，不能倒推证明此前未执行预载代码。即使使用上述 wrapper，也不认证 PowerShell、wrapper 文件、Node binary 或调用者，因此结构化边界仍为 `trustedBootstrapEstablished=false / sourceCoordinatorAuthenticityEstablished=false / directNodeCoreStartupPreloadExcluded=false`。

包内 launcher 还会在 dynamic import server/verifier 前重新核对显式 pin、seat、cycle 与 payload 漂移；pin 缺失、错误或包漂移均以稳定错误拒绝，不回显专家正文或实体路径。该双重检查仍不能排除源码侧预检与子进程执行之间的同权限替换竞态，也不能认证候选协调器、pin 来源或签名，所以持续明确 `samePrivilegeIntervalMutationExcluded=false`、`pinProvenanceVerified=false`、`signature=false`、`packageAuthenticityEstablished=false`、`realPersonDistributionReady=false`。下载完成后按 Enter，回件文件的 held handle 会保持到 observation 写入结束，并在写入前后重新核对默认数据流的端点、nlink、字节和摘要；它仍不建立跨文件原子快照或排除同权限并发竞态。只有浏览器和服务器都确认关闭、临时目录仍匹配最初 BigInt `dev/ino` 时才尝试递归清理；路径式删除仍不建立原子删除保证。失败时保留现场、只显示稳定错误码，且不得晋级。

真实 NTFS alternate data streams 不会由 Node `readdir()` 枚举；本实现只拒绝可见的冒号形路径字符串，不能声称 ADS 不存在或已排除。Chrome/Edge 还可能添加 `Zone.Identifier`。因此返回材料继续按私密、仓外处理，不得据“目录只有一个可见文件”推断全部数据流已清空。

## 本地打开

页面应由只读 loopback 静态服务器提供。服务器只接受 `GET`/`HEAD`，不写磁盘，并只接受精确的 `127.0.0.1:<实际端口>` Host。以下命令只用于开发验证；当前尚不允许现实分发或现实专家试填：

```powershell
node .\server.mjs --entry seat-a.html --port 4178
```

然后在本机浏览器打开 `http://127.0.0.1:4178/`。B 席将入口改为 `seat-b.html`。这种源码开发预览会在导出中明确绑定 `pilot-review-cycle.unassigned` 与全零 manifest SHA；它只能用于开发和旧草稿恢复，不能作为实体交接。服务器不提供远程接口；应用的 CSP 将 `connect-src` 固定为 `none`。

开发预览不得把“端口正在响应”当作页面身份。普通浏览器可能在曾经运行主应用的同一 origin 保留 Service Worker；服务器停止后，旧缓存甚至可能显示另一套应用。开发验证应使用一个确认未监听的新端口和隔离浏览器资料夹，并在任何操作前同时核对页面标题必须精确为“八字规则复核试填”、顶部必须显示“这里只检查题目是否清楚，不作为正式专家审定意见”。若出现其他页面，立即停止；不得为了本 pilot 清除该 origin 的 storage/cache，因为其中可能有用户数据。实体包候选启动器已经使用 `server.listen(0)` 的系统分配端口和新建的临时 Chrome/Edge profile，避免继承普通浏览器的既有 Service Worker；这仍不提升其可信启动、签名或现实分发状态。

## 专家流程

1. 阅读说明并填写自述流派与复核范围；任何自由文本都不得填写姓名、机构、联系方式、证件、现实出生资料或真实案例。
2. 逐项完成五个人工构造的工程测试场景。
3. 单独回答四个总体问题。
4. 单独填写使用感受。
5. 在“核对并保存”页展开核对全部文字，确认未查看另一份独立答卷，然后点击“检查并锁定答卷”；锁定后当前页面只读，但此时还没有保存文件。
6. 专家填写到此结束，由协调人展开“协调人：保存答卷文件”，点击“保存完整提交资料（一个文件）”，并确认文件确实存在后再关闭页面；浏览器“打印”只产生易读投影，本工具不自动生成或上传 PDF。

## 两席回件并列（协调人本机候选）

专家不需要打开或编辑 JSON。A、B 两份完整回件返回后，协调人可另行启动本机只读并列页：

```powershell
node .\pair-compare-server.mjs --port 0
```

当前 CLI 使用系统分配的随机 loopback 端口并打印开发 URL，避免固定复用历史 origin。此入口仍**只允许程序生成的合成测试回件**：它尚未建立全新浏览器 profile、既有 Service Worker 排除、扩展隔离、浏览器身份或可信启动，因此不得在普通浏览器 profile 中载入真实专家回件。输入合成回件的同一 `reviewCycleId` 与 A/B 两席 manifest pin 后，页面会重新运行两席完整回件预检，再把自述范围、五个场景和四个总体问题逐字段并列显示；展示格式不等于原始字节投影。

候选页面自身没有持久化或上传接口，但这不等于浏览器运行环境已经可信。它不提供“采用哪一席”、评分、投票、平均或自动合并按钮。所有差异固定为 `unresolved`，只能安排人工后续核对；当前页明确不生成正式 disagreement inventory 或 reconciliation record，两份原始回件不被覆盖，也禁止 pilot→formal 转换。机械并列仍不证明真人参与、身份、资质、实际独立、意见真实性、外部未使用 AI、专家真值或预测准确度，也不增加 formal 2/2 或专家门计数。并列内容和由其派生的摘要继续属于 `private_off_repository_in_memory_only / safeToPublish=false`。

并列页与物理单席专家包完全分离，不进入 `COMMON_SOURCE_FILES`，因此不会随 A/B 专家包分发。它只能作为协调人开发候选；真实回件处理仍需 owner 明确授权、仓外保管与可信 pin/signature/first-seen 流程。

## 单条 Binding 非技术专家题面演练（合成固定题面）

`single-binding-rehearsal-a.html` 与 `single-binding-rehearsal-b.html` 是与既有五场景 pilot 分离的题面演练入口。它们固定只展示 `binding:policy:thresholds` 的合成临界例子，明确并列“本页已有材料”和“仍缺材料”，不接入 formal successor 的 `binding_freeze_evidence` purpose，也不授权输入真实来源正文、现实专家资料或真人案例。自由文本的明显敏感模式预检不构成匿名证明，仍固定 `personDataPresenceAssessed=false / personDerivedDigestExcluded=false`。

专家可以选择本人输入或由协调人逐字代录；代录路径必须自述没有概括、润色或替换术语。页面把“无法判断”细分为材料不足、题意不清、超出流派、来源／版本不清或其他原因，并要求披露是否曾使用他人、书籍资料或 AI／软件工具；这些都只是自述，不证明实际排除了任何外部影响。完成前必须生成与当前内容摘要绑定的逐字核对稿，由专家亲自通读或听取读回，再确认文字准确表达本人意见。修改任何实质字段都会使旧核对稿失效。固定 fixture 是 synthetic-only；自由文本仍是 `unassessed_private`，明显敏感／准确度语言的失败关闭预检不构成匿名证明或“全部排除”证明。

A/B 各自只由 seat-specific loopback server 提供，服务器不暴露另一席入口；页面没有文件、粘贴、storage、上传、赢家、投票、平均或自动合并接口。它不建立作者盲法、现实独立性或意见真实性。准确度研究完全排除：没有隐藏作者标签、结果标签、预注册评分或预测准确度结论。

开发验证入口：

```powershell
node .\single-binding-rehearsal-server.mjs --seat A --port 0
```

对应 B 席把 `A` 改为 `B`。两个入口只产生当前内存中的 rehearsal candidate；固定 `syntheticOnly=true / formalAdmissionAllowed=false / verifiedExpertCount=0/2 / frozenBindingCount=0/12`。三个 rehearsal record type 已登记进 formal successor 的负向 deny inventory，不能改名或重包装后进入 formal intake。

## 单条 Binding 完整无代码交接演练（session-bound synthetic-only）

`single-binding-integrated-a.html`、`single-binding-integrated-b.html` 与 `single-binding-integrated-pair.html` 把上述单题题面接成一个完整但仍为 synthetic-only 的无代码演练：协调人先分别打开 A/B 单席页面；专家选择“本人输入”或口述，由协调人逐字代录；专家本人通读或听取逐项读回；完成后把设备交回协调人；协调人分别发起下载完整回件与包外 `.sha256.txt`；最后在独立协调人页选择四个文件，重新核对 raw SHA、session binding、内嵌 submission／seal／checksum 交叉引用，再把固定七个专业字段并列。

专家不需要接触命令、JSON 或 hash。A/B 页面在创建 draft 以前必须从服务器 HTML meta 中取得完整 session binding；URL query 不参与构造 session。binding 覆盖 review cycle、pair run、A/B seat、各席 nonce、pair precommit pin、pair manifest pin、各席 package manifest pin，以及固定题面／候选／Binding 身份。缺失、全零、错席或漂移一律在显示表单前阻断；旧的无 session rehearsal submission 不能事后包成新回件。

源码树的开发演练入口为：

```powershell
node .\single-binding-integrated-server.mjs --seat A --port 0 --source-tree-demo
node .\single-binding-integrated-server.mjs --seat B --port 0 --source-tree-demo
node .\single-binding-integrated-pair-server.mjs --port 0 --source-tree-demo
```

这三个命令应分别运行。`--source-tree-demo` 使用固定、可重放的合成会话标识，只为工程集成与浏览器 QA；它不是真实专家入口，也不是 physical package、可信启动器或首次出现记录。普通持久浏览器 profile 可能在历史 origin 上保留主应用 Service Worker；如标题不是“八字单题双席复核合成演练”或“单条规则 A/B 回件校验与差异并列”，必须立即停止并换一个未使用的随机 loopback 端口，不得为本演练清除可能含用户数据的 storage/cache。

完整回件是一个 UTF-8 JSON，内嵌三份逻辑独立工件；浏览器发起的包外 `.sha256.txt` 供协调人选择，但页面只声明“发起下载”，不声称文件已经保存。回件及其内嵌工件的 basename 含 cycle、pair 与 seat nonce 的安全短后缀，减少不同演练静默复用同一文件名；若浏览器因本地已有同名文件而自动插入 `(1)` 等正整数编号，协调人页允许该物理文件名，但仍按 wrapper 内的逻辑文件名、session binding、sidecar 目标和 raw SHA 严格复核。两席比较要求同一 cycle/pair/precommit/pair manifest/固定题面，精确 A/B 两席，不同 nonce、不同 seat package pin、不同回件原始字节与不同 raw SHA。任何已选文件发生 change 都立即撤下旧结果；校验期间四个输入会锁定，完成前再次确认仍是同一组 `File` 对象，避免旧异步结果回写到新选择。任何差异固定为 `unresolved`，没有赢家、投票、平均、自动合并或模型裁决。

此完整链仍固定 `actualHumanParticipationEstablished=false / reviewerIdentityEstablished=false / reviewerQualificationEstablished=false / opinionAuthenticityEstablished=false / pinProvenanceVerified=false / trustedBootstrapEstablished=false / contentTruthEstablished=false / expertTruthEstablished=false / rightsLegalConclusionEstablished=false / releaseReady=false / publicReleaseAuthorized=false`。现实专家仍为 `0/2`，冻结 Binding 仍为 `0/12`；`legacy-v13 / targetSchema 13 / migrationId null` 未改变，产品存储与 Schema 13 mutation epoch 均未使用。十五类 integrated／physical／clean-profile pilot record type 已全部进入 formal successor 的 deny inventory，不能作为正式私件、v4 authenticated payload 或 formal 2/2 证据。

### 单席 physical clean-profile runner（合成候选）

`single-binding-integrated-physical-clean-profile-runner.mjs` 把来源侧已经验证的单席 package capability、verified-memory server 与一个显式指定且按 raw SHA-256 pin 核对的 Chrome／Edge executable 接成三段 process-local capability：preflight、start、stop。start 只创建仓库外 system-temp session、独立 `browser-profile` 与 `browser-temp`，把随机 loopback 单席地址作为 `--app` 传入，并以环境变量 allowlist 清除 Node preload、普通 PATH／HOME／USERPROFILE、proxy 和历史 browser-profile 继承。stop 只有在直接 browser child、verified-memory server 和初始 `dev/ino` 绑定的 session 路径都完成关闭／有界缺失检查后才返回 cleanup receipt。

test adapter 只产生无 `recordType`、`admissibleRuntimeRecord=false` 的进程内 capability；失败启动只产生无 `recordType` 的 cleanup receipt。只有未使用 adapter 的实际进程 spawn 才能产生 clean-profile run／stop candidate record，但 formal successor 仍会明确拒绝这三种 candidate record type。

定向单元回归：

```powershell
npm.cmd run test:single-binding-integrated-physical-clean-profile-runner
```

实际安装浏览器验证是显式、非默认测试，调用方必须同时提供 executable 绝对路径、`chrome|edge` family 和刚读取的 exact SHA-256：

```powershell
$env:HAKIMI_PHYSICAL_BROWSER_EXECUTABLE='<absolute chrome.exe or msedge.exe>'
$env:HAKIMI_PHYSICAL_BROWSER_FAMILY='chrome'
$env:HAKIMI_PHYSICAL_BROWSER_SHA256='<64 lowercase hex>'
npm.cmd run test:single-binding-integrated-physical-clean-profile-real-browser
```

这个测试只观察来源 server 可读、实际 child spawn 以及本次 browser/server/session 的关闭清理；它不是 Playwright 页面交互证据。runner 也没有证明实际 process image 与 held executable 原子绑定、浏览器确实采用 `--user-data-dir`、外网被阻断、扩展／企业策略影响被排除或整个 browser process tree 已关闭。`browserProfileIsolationEstablished / externalNetworkExcluded / browserProcessTreeClosureEstablished / physicalExpertSurfaceReady` 均保持 `false`，不得处理真人资料或现实专家回件。

### Synthetic clean-profile 启动候选（只供协调人自检）

`pair-compare-synthetic.html` 是另一条完全分离的合成自检入口。它只在内存中构造固定 A/B 测试回件，并调用真实 comparison 核心；页面没有文件选择、粘贴、拖放、storage、Service Worker、XHR、WebSocket 或 `fetch` 入口，也拒绝真实 pair viewer 和单席页面路由。它不能读取现实专家回件，固定 `realReturnLoadingAuthorized=false`。

协调人可先只读观察固定 12 文件 source bundle（八项固定页面 payload，含显式本地图标；另含 launcher、PowerShell wrapper、synthetic server 和 cleanup helper）和本机 Chrome／Edge executable 的 raw SHA-256：

```powershell
powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File .\pair-compare-session-launcher-candidate.ps1 --observe --browser-family chrome
```

输出的 digest 仍只是本次读取值，`PAIR_COMPARE_OBSERVATION_AUTHORITY none`；它不证明 pin 来源、签名、发布者或可信启动。只有将两个期望 digest 另行保存后，才能显式启动一次 synthetic-only 候选：

```powershell
powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File .\pair-compare-session-launcher-candidate.ps1 --launch --owner-decision synthetic_fixture_visual_qa_only_approved --viewer-source-sha256 '<64hex>' --browser-family chrome --browser-executable-sha256 '<64hex>'
```

候选使用系统随机 loopback 端口和新建的 system-temp profile，并准备禁用 sync、extensions、background networking、component update、default-browser check 与 proxy 的参数。关闭时把浏览器运行结果、server 关闭和临时路径清理分账；停止前或自然观察到的非零退出、signal 或 error 即使清理成功也必须返回失败。`--probe` 完成页面观察后先向当次 `DevToolsActivePort` 所指 browser endpoint 派发 `Browser.close`，只有随后观察到浏览器 child code 0、没有使用强制终止兜底、server 关闭、删除尝试前初始路径身份匹配且删除尝试后在有界窗口内重复观察到路径缺失，才可签发最终观察。强制终止只能用于失败后的清理。以上仍不证明 endpoint 与 spawned process 的因果绑定、浏览器实际采用了 profile、外网完全被排除、进程树与 crash dump 无路径泄露、持续不存在、原子清理或物理擦除。现实专家不接触这段命令、hash 或启动器；专家只使用协调人准备的中文单席题面。

机器可重复的 synthetic runtime probe 使用相同 pin，但把 `--launch` 改为 `--probe`。它从新建 profile 路径稳定读取 `DevToolsActivePort`，只连接随机 `127.0.0.1` 调试端点；attach 前的一次 `/json/list` 快照必须只有一个精确合成页面 target，其他当时已见 target 只允许固定 Omnibox `browser_ui` 闭集，不得在该快照中出现 extension 或 Service Worker target。随后对该 page session 启用 Page／Runtime／Network／Log、绑定新主 frame reload，再核对 post-reload/pre-click 精确标题、H1、无外部回件输入，post-reload 的 pre-click 与 post-click 两点上 Service Worker registration、CacheStorage key、IndexedDB database、localStorage 和 sessionStorage 计数为零，`58/54/4/0`、从 reload mark 起该 page session 的 allowlist URL 与 200 response 事件、warning／error 计数为零，以及 390×844 无页面级横向溢出。它没有检查 cookie、OPFS、Storage Buckets 或其他未列举的存储面。调试端口、profile 路径、PID 和 WebSocket URL 不进入输出。

页面观察先产生进程内 provisional capability，类型为 `bazi_review_ui_synthetic_pair_cdp_precleanup_probe_candidate_v1`，固定 `cleanupObserved=false`，CLI 不会把它作为通过记录输出。只有上述 code-0 优雅关闭与有界清理观察全部满足后，same-run finalizer 才产生 `bazi_review_ui_synthetic_pair_cdp_runtime_observation_candidate_v1`，固定 `purpose=synthetic_pair_viewer_visual_qa_only / evidenceClass=engineering_runtime_observation_only / admissionEffect=none`；两种类型均已列入 formal successor 的 pilot 拒绝清单。它最多证明一次 page-session reload 观察窗内的合成页面行为和随后有界关闭／清理结果，不证明首次 `--app` 导航、连续 target discovery、browser-wide network、response body digest、request/response loader correlation、`fromServiceWorker` 排除、全部进程树消失或清理持续有效。`browserProfileIsolationEstablished`、`preexistingServiceWorkerExcluded`、`browserExtensionInterceptionExcluded`、`externalNetworkExcluded`、endpoint/process 绑定、优雅关闭因果、同权限竞态、ABA、原子清理、物理擦除及全部真人／专家／内容／权利／准确度／发布字段仍为 `false` 或 `0`。

显式的本机双浏览器回归不会并入默认 Node 测试；只有协调人确认机器空闲且允许弹出全新临时浏览器窗口时，才运行 `npm.cmd run test:real-browser-probe`。该命令会分别对本机 Chrome 和 Edge 执行 `--observe` 后的 exact-pin `--probe`，并要求只出现 post-cleanup final observation 与 `SESSION_CLOSED`。未运行时必须记录为 `NOT_RUN`，不能由普通 Playwright 页面测试替代。

草稿只存在当前页面内存中。刷新、关闭或崩溃都会丢失未下载的内容；需要中断时请在导出页完成隐私确认并“下载全部草稿备份”，之后再通过“导入草稿备份”恢复。导入后必须重新核对并确认。旧版 0.1 草稿只允许在明确 unassigned 的开发预览恢复；实体单席包会拒绝不同 seat、不同 cycle 或不同 package-manifest SHA 的错配，但没有外部已用轮次登记或可信时间，同一 cycle 的旧提交仍可再次通过，`replayExcluded=false`。

## 摘要与封存边界

封存会：

- 对不含 `integrity` 的规范 JSON 计算 domain-separated `recordDigest`；
- 生成 UTF-8、无 BOM、LF 结尾的原始 opinion JSON；
- 对该原始 JSON 的精确字节计算 SHA-256；
- 把字节摘要和长度写入独立的 pilot seal receipt 与 `.sha256.txt`。

这些摘要只检出字节漂移，不是数字签名，不证明作者、身份、首次出现时间、保管链或可信时间。修改只能通过新的补充件另行表达；本实现不覆盖已封存的原件。

回件通过后新增的 handoff observation 也只证明一次本机默认数据流的机械读取与交叉校验。它不嵌入专家正文，但包含可能由正文派生的摘要，因此仍固定 `personDataPresenceAssessed=false`、`personDerivedDigestExcluded=false`、`safeToPublish=false`，只能留在仓外私密返回目录。它同时明确 `trustedBootstrapEstablished=false`、`packageAuthenticityEstablished=false`、`pinProvenanceVerified=false`、`signature=false`、`samePrivilegeIntervalMutationExcluded=false`、`alternateDataStreamsEnumerated=false`、`alternateDataStreamsExcluded=false` 与 `sameCycleReplayExcluded=false`；不产生 formal record、不允许 pilot→formal 转换，也不计入专家门。

## 定向测试

仅运行本目录测试，不运行根 workspace、全仓 typecheck 或默认 build：

```powershell
npm.cmd run test:node
```

浏览器测试由 root 在最终视觉 QA 阶段运行：

```powershell
playwright test -c .\playwright.config.mjs
```

如果本机 Playwright 没有自己的 Chromium，但已经安装 Chrome，可显式指定现有浏览器，不需要下载或安装：

```powershell
$env:HAKIMI_PILOT_BROWSER_EXECUTABLE='C:\Program Files\Google\Chrome\Application\chrome.exe'
npm.cmd run test:ui
```

设计稿位于 `design/desktop-concept.png` 与 `design/mobile-concept.png`；实现规则见 `DESIGN-SYSTEM.md`。
