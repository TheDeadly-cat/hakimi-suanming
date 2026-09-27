# 持久浏览器重开后的文件交付回归

范围是默认 v13 的完整文件交付，以及另存为实际文件名合同。原 A/B/C 工程结项保留；本页不授予安装替换、main 合并、Schema 晋级或正式专家/公开发布权限。

## 修复前候选结果：完整应用通过，独立下载回归仍失败

源码 5189e86598090ef1d289bd15d0670de764a08cae 构建的 dcab57b8cd23，在同一锁定产物上完成本地浏览器检查 **20/22**。后续本页更新只补充事实，不把这份产物转签给文档提交或新远端 CI。

| 场景 | Edge 无界面 | Edge 有界面 | Chrome 无界面 | Chrome 有界面 |
| --- | --- | --- | --- | --- |
| 千例导出、恢复、完全关闭/重开、两次再导出 | 通过 | 通过 | 通过 | 通过 |
| 另存为原名、改名、取消及真实文件句柄读回 | 通过 | 通过 | 通过 | 通过 |
| 独立最小 ZIP 下载与 profile 重用 | 通过 | 通过 | 失败 | 失败 |

另有原有备份 **8/8**、连续研究 **2/2**，原严格报告器通过。千例四组各核对四份保存文件、完整 ZIP 预检和语义 payload，恢复、重开及导出后的 16 张表与本组来源一致，两个自有进程正常退出。最小下载失败仍导致套件失败，没有跳过、重试、修改 expectedStatus 或把文件开始下载称为完成。

因此，**端口切换本身不是通用修复，dcab57b8cd23 的失败记录不改判。** 合法改名修复的 12 个文件共 165 项单测通过，执行于 153da87；之后生产代码及这些单测没有变化。完整类型检查程序、诊断构建和产物锁通过，默认 npm 生命周期仍被原专家前置门拒绝。

本产物的 evidenceId 为 hre1-f9aea896f266cfc8c3cf39c4975dddb2；原锁 SHA-256 为 0d1a202b1d8184578932205414f5693d2ed05769e70ec1a9a6f4066e836e2c3c，137 文件集合摘要为 95e22393d38cb1c8edd9651ee236c39f23c8a7fa68c1b25b49a7b5e9a30cddb4。默认 legacy-v13 / Schema13 / migrationId null，阶段之间未重建。原锁及产物已逐字节复制留档并复验。

PR 自动检查另发现新增测试对公共 full-backup-helpers.ts 的可选绝对地址扩展触发既有 SW 夹具字节身份保护。现将该公共文件恢复为 d23d1e2 的原始字节，专用 CDP 页面导航及同等就绪断言仅保留在新增回归文件。相关路径/checkout 检查 28/28、类型检查程序通过；没有更新旧指纹、历史回执或准入策略。此后测试驱动与已锁定应用产物的来源提交分别记录，不重新构建该失败候选以覆盖原结果。

## 定位边界

原产物 94767515b166（源码 d23d1e2）在 Edge 153.0.4234.48 的持久资料空间重开后导出 ZIP 时退出。原始转储私有留存；进程 ID 与启动记录中的浏览器主进程相同，异常码 0xC0000005，故障模块 msedge.dll+0x104c2cc。

使用对应 GUID/age 的 Microsoft 官方 PDB，DbgHelp 报告 PDB 匹配，故障符号为 base::internal::WeakPtrFactoryBase 析构。只能取得部分展开结果，未将它当作完整调用栈或更深的对象所有权根因证明；也没有内存不足的证据。

本机控制试验使用同一份合成千例 ZIP（221,323 bytes），验证下载 failure/path/saveAs、文件哈希和下载后的浏览器存活。最小页面不运行排盘、数据库恢复或 ZIP 生成，仍能触发管道连接下的退出：

后续成对控制和候选验收实际记录为 Edge 154.0.4258.37、Chrome 154.0.8037.57。原转储属于 Edge 153.0.4234.48；不同版本的证据分别保留，不把当前通过转签为旧版本修复。

- Blob 立即撤销、完成检查后撤销、HTTP 下载均有失败，不能据此修改生产 Blob 生命周期。
- 保持显式下载目录并未消除失败。
- 有界面 Edge 也能复现；增加下载后的存活观察后，Chrome 154.0.8037.57 管道路径同样有失败。此前成功观察保留原范围，不能被推广为所有时序下稳定。
- 保持浏览器、有效载荷和启动默认参数，仅将调试管道改为本机 CDP 端口后，四组控制（Edge 有/无界面、HTTP 对照、Chrome）都完成两次启动、三份文件校验及正常退出。
- 后续显式统一 1280×800、devicePixelRatio=1 的三组配对控制（Edge 有/无界面、Chrome 无界面）当时得到相同区分：管道第二次启动失败，端口完成全部文件检查和正常退出。这只描述该组观察；后续端口失败否定了将其概括为通用修复的结论。
- 这是本机自动化兼容性边界，不证明普通非自动化浏览器必然退出，也不是浏览器原生缺陷的源级修复。
- 原崩溃资料空间先逐文件复制并核对一致，再仅启动副本；崩溃之后的 16 张物理表与崩溃前来源一致。副本通过端口连接重新导出的 ZIP 语义 payload 也一致。原未知下载没有被重新签为成功。
- 原产物本身的 Edge 无界面千例完整应用流程已用端口连接回归通过；后续源码/产物结果应分别核对实际 commit/build/evidenceId，不能借用这条旧产物结果。

原始失败、临时脚本问题、控制矩阵和私有转储均保留。第一次开发辅助器的 Chrome 简单 data-URL 烟测曾在清理时遇到非零退出；增加生命周期记录后的一次定向检查通过，但并未把这个观察称为根因修复或所有浏览器退出时序稳定的证明。正式验收以锁定应用 ZIP 流程的文件、数据、存活及原生退出记录为准。

候选 2cf47cb9b5c4 的首次定向组为 8/12：两个有界面最小用例在 about:blank/setContent 页面第二次下载未完成检查时失败，清理又出现 0xC0000005，不能称为文件已完成后仅关闭失败。新 Edge 转储为主进程、msedge.dll+0x9a8923b，与旧版签名不同；不声称同一底层缺陷。独立成对页面对照中 Edge 空白页失败、Chrome 空白页通过，两浏览器真实本机 HTTP 页均通过。回归最小页因此匹配应用的本机 HTTP 来源，保留空白来源失败为独立兼容性边界；操作和清理同时失败时保留两个错误。

另外两个首次失败来自有界面浏览器的窄屏测试断言：390 像素视口扣除纵向滚动条后可用宽度为 375。现改为同时核对视口宽度及 scrollWidth 等于 clientWidth，继续禁止横向溢出。原失败产物和结果未覆盖。

后续 dcab57b8cd23 的独立最小页即使使用真实 HTTP 页面，Chrome 有/无界面仍在第二次下载的 failure() 检查完成前关闭连接。额外固定 ZIP 直接 HTTP 下载对照为 4/8，包含 Edge 有界面及 Chrome 两模式的失败；固定二进制/实际合成备份 ZIP 与确认点击的对照为 4/8。固定下载目录对照中临时/固定目录各 1/2；启动时序对照中无等待 1/2、等待 3 秒 0/2。这些都没有证明可稳定消除故障，因此不加入固定等待，不改生产 Blob 释放，不关闭安全功能，也不放宽原断言。

新 Edge 154 转储的官方符号 GUID/age 为 776661B0D1A08F224C4C44205044422E/1，DbgHelp 报告匹配，故障符号为 DownloadItemModel::DownloadItemModel+0x87。首次符号解析只能展开故障帧；后续改用匹配 PE 的运行时展开表读取离线栈，在旧 Edge 153 和新 Edge 154 均找到相同的下载进度更新路径：DestinationUpdate → UpdateObservers → DownloadBubbleUpdateService::OnDownloadUpdated → CacheManager::UpdateDisplayInfoForDownloadItem → DownloadItemModel 构造。旧版在更深处表现为 Omnibox/WeakPtr 析构异常。展开在离开 msedge.dll 时停止；这些证据定位到原生下载提示窗缓存路径，仍不证明具体失效对象及释放者。[上游缓存代码](https://github.com/chromium/chromium/blob/main/chrome/browser/download/bubble/download_bubble_update_service.cc)只作路径解释，不替代本机匹配符号与二进制。

## 两阶段连接的兼容性修复

进程退出对照在首轮确认所有已记录子进程退出后仍有失败；关闭延迟历史加载的单变量对照也没有全部通过，未采用这类启动开关。

进一步对照区分了原生初始化与自动化接管顺序。Playwright 默认连接会在初始页面附着期间设置下载行为。现先用公开的 noDefaults 选项完成一次不施加下载覆盖的连接，验证自有 PID、品牌及初始页面 DOM 就绪，断开这条调试连接，再对同一个原生进程进行默认连接。第二阶段再次核对 PID 与浏览器版本，完整保留原默认行为；没有固定等待、下载页预热、额外功能开关或安全设置变更。关闭调试连接与最终 Browser.close 的原生退出分开记录。

固定 HTTP ZIP 的两浏览器无界面对照中，普通页面初始化和仅只读连接初始化各 4/4，原直接连接组仍有失败。将仅只读连接方案用于仓库内 Blob 最小回归后，Edge/Chrome × 有/无界面、每组两个全新 profile，**8/8**；每例两轮文件及解压内容一致，16 次原生退出均为 0。它是当前已测版本的自动化兼容性处理，不是浏览器供应商内存缺陷的源码修补。后续同一新应用产物的完整验收身份及结果单独记录于 [PR #11](https://github.com/TheDeadly-cat/hakimi-suanming/pull/11)，不会转签上述旧失败产物。

另有公开的 [Playwright 问题 #42506](https://github.com/microsoft/playwright/issues/42506) 和[独立管道/端口对照](https://github.com/ryo-whaletech/microsoft-edge-cdp-pipe-download-crash-repro)提供相关线索；它们的环境及故障签名不同，不替代上述本机证据。

## 可维护回归

命令：

    node node_modules/@playwright/test/cli.js test --config apps/web/playwright.persistent-file-delivery.config.ts

前提是依照现有默认 v13 流程构建、设置 HAKIMI_RELEASE_EVIDENCE_ID，并在 dist/web 外生成 tmp/release-artifact-identity.json。该命令只校验和预览已经锁定的产物，不重建它，也不接管 5188/5189。

套件分别执行 Edge/Chrome 的有界面和无界面模式，每种模式包含：

1. 独立最小 ZIP：在真实本机 HTTP 页面首次保存、关闭、重开、再次保存；核对完整字节与解压内容，并保留下载后的存活观察。
2. 千例完整应用：在独立测试资料空间中，以原生 IndexedDB 将真实 UI 创建的合法案例扩充为合成千例；造数明确限定物理 v13（130），不读取打包器内部模块。随后全部通过锁定应用执行 UI 完整备份、隔离恢复、完全关闭/重开、重复导出；核对 16 张物理表、最终文件及语义 payload，并打开恢复后的案例。
3. 另存为：使用浏览器真实 OPFS FileSystemFileHandle 完成写入、close 和读回，核对原名/改名/取消与备份内容。只替代 OS 选择器返回目标的环节；不称为自动操作真实 Windows 保存对话框，也不以它替代普通下载验收。

默认通过 createReusableReleaseBrowser 启动专用临时 profile。它从安装的 Playwright 公共 launchServer API 取得默认启动参数，只替换调试传输，使用随机本机端口，并按上述两阶段顺序连接；两次连接必须识别同一自有 PID 和品牌。禁止同一个 profile 同时启动，检查目录身份，文件核对结束后才请求原生关闭，并等待进程退出。上下文提前关闭会保留异常状态，非零或意外退出仍导致失败。测试资料及转储留在私有临时目录，不发布原始内存。

如需显式重现管道路径，只对最小用例设置 HAKIMI_DOWNLOAD_REPRO_PIPE=1 并选择一个浏览器项目：

    node node_modules/@playwright/test/cli.js test --config apps/web/playwright.persistent-file-delivery.config.ts --grep "minimal fixed ZIP" --project msedge-headless

这个开关不会将失败改成预期成功，也不会改变完整应用用例；它不是发布验收模式。

## 另存为合同

指定位置保存保留建议名称与实际 handle.name，捕获调用时的 Blob 和操作标识。非法实际名称在打开 writer 前拒绝。只有 write 和 close 完成后才返回 saved；失败/取消保留原语义。

弹窗对 File System Access 保存要求建议名称、操作标识和字节数都匹配，才接受合法实际名称并显示它。普通下载/分享的文件名检查不放宽；现有原名 native 回执保持兼容，不因此取得改名权限。浏览器下载仍只是 download_requested，未知交付仍需要人工核对。

原名、改名、非法名称、取消、写入失败、close 失败、输入捕获、错配操作/建议名/字节数及普通下载越界改名都有定向测试。相关页面模拟器必须回传真实合同，不能以不完整模拟器绕过人工确认门。

## 证据范围

本地数据与浏览器检查不替代远端 CI、来源/权利审定、现实独立专家意见或第二台 Windows 验收。不要上传完整 profile、转储或私人案例；公开记录仅保留脱敏摘要、源码和合成最小复现。

下载开始与保存完成按 [Playwright Download API](https://playwright.dev/docs/api/class-download) 分开核对。符号匹配依照 [Microsoft minidump 调试说明](https://learn.microsoft.com/en-us/windows/win32/debug/minidump-files)，部分栈不用于声称完整根因。
