# 持久浏览器重开后的文件交付回归

范围是默认 v13 的完整文件交付，以及另存为实际文件名合同。原 A/B/C 工程结项保留；本页不授予安装替换、main 合并、Schema 晋级或正式专家/公开发布权限。

## 定位边界

原产物 94767515b166（源码 d23d1e2）在 Edge 153.0.4234.48 的持久资料空间重开后导出 ZIP 时退出。原始转储私有留存；进程 ID 与启动记录中的浏览器主进程相同，异常码 0xC0000005，故障模块 msedge.dll+0x104c2cc。

使用对应 GUID/age 的 Microsoft 官方 PDB，DbgHelp 报告 PDB 匹配，故障符号为 base::internal::WeakPtrFactoryBase 析构。只能取得部分展开结果，未将它当作完整调用栈或更深的对象所有权根因证明；也没有内存不足的证据。

本机控制试验使用同一份合成千例 ZIP（221,323 bytes），验证下载 failure/path/saveAs、文件哈希和下载后的浏览器存活。最小页面不运行排盘、数据库恢复或 ZIP 生成，仍能触发管道连接下的退出：

- Blob 立即撤销、完成检查后撤销、HTTP 下载均有失败，不能据此修改生产 Blob 生命周期。
- 保持显式下载目录并未消除失败。
- 有界面 Edge 也能复现；增加下载后的存活观察后，Chrome 154.0.8037.57 管道路径同样有失败。此前成功观察保留原范围，不能被推广为所有时序下稳定。
- 保持浏览器、有效载荷和启动默认参数，仅将调试管道改为本机 CDP 端口后，四组控制（Edge 有/无界面、HTTP 对照、Chrome）都完成两次启动、三份文件校验及正常退出。
- 后续显式统一 1280×800、devicePixelRatio=1 的三组配对控制（Edge 有/无界面、Chrome 无界面）得到相同区分：管道第二次启动失败，端口完成全部文件检查和正常退出。结论限定为调试连接路径，不把它扩展为已解释浏览器内部全部对象生命周期。
- 这是本机自动化兼容性边界，不证明普通非自动化浏览器必然退出，也不是浏览器原生缺陷的源级修复。
- 原崩溃资料空间先逐文件复制并核对一致，再仅启动副本；崩溃之后的 16 张物理表与崩溃前来源一致。副本通过端口连接重新导出的 ZIP 语义 payload 也一致。原未知下载没有被重新签为成功。
- 原产物本身的 Edge 无界面千例完整应用流程已用端口连接回归通过；后续源码/产物结果应分别核对实际 commit/build/evidenceId，不能借用这条旧产物结果。

原始失败、临时脚本问题、控制矩阵和私有转储均保留。第一次开发辅助器的 Chrome 简单 data-URL 烟测曾在清理时遇到非零退出；增加生命周期记录后的一次定向检查通过，但并未把这个观察称为根因修复或所有浏览器退出时序稳定的证明。正式验收以锁定应用 ZIP 流程的文件、数据、存活及原生退出记录为准。

另有公开的 [Playwright 问题 #42506](https://github.com/microsoft/playwright/issues/42506) 和[独立管道/端口对照](https://github.com/ryo-whaletech/microsoft-edge-cdp-pipe-download-crash-repro)提供相关线索；它们的环境及故障签名不同，不替代上述本机证据。

## 可维护回归

命令：

    node node_modules/@playwright/test/cli.js test --config apps/web/playwright.persistent-file-delivery.config.ts

前提是依照现有默认 v13 流程构建、设置 HAKIMI_RELEASE_EVIDENCE_ID，并在 dist/web 外生成 tmp/release-artifact-identity.json。该命令只校验和预览已经锁定的产物，不重建它，也不接管 5188/5189。

套件分别执行 Edge/Chrome 的有界面和无界面模式，每种模式包含：

1. 独立最小 ZIP：首次保存、关闭、重开、再次保存；核对完整字节与解压内容，并保留下载后的存活观察。
2. 千例完整应用：在独立测试资料空间中，以原生 IndexedDB 将真实 UI 创建的合法案例扩充为合成千例；造数明确限定物理 v13（130），不读取打包器内部模块。随后全部通过锁定应用执行 UI 完整备份、隔离恢复、完全关闭/重开、重复导出；核对 16 张物理表、最终文件及语义 payload，并打开恢复后的案例。
3. 另存为：使用浏览器真实 OPFS FileSystemFileHandle 完成写入、close 和读回，核对原名/改名/取消与备份内容。只替代 OS 选择器返回目标的环节；不称为自动操作真实 Windows 保存对话框，也不以它替代普通下载验收。

默认通过 createReusableReleaseBrowser 启动专用临时 profile。它从安装的 Playwright 公共 launchServer API 取得默认启动参数，只替换调试传输，使用随机本机端口，核对目标浏览器 PID 和品牌。禁止同一个 profile 同时启动，检查目录身份，文件核对结束后才请求关闭，并等待原生进程退出。非零或意外退出仍导致失败。测试资料及转储留在私有临时目录，不发布原始内存。

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
