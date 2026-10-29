# Android 内部验证工程

本目录复用 `apps/web` 的正式构建产物和同一套核心、平台接口。内部应用标识为 `com.hakimi.bazi.internal`，显示名为“哈基米八字·内部验证”。默认数据库合同仍为 `legacy-v13 / schema 13 / migration null`；Android 应用的 WebView 数据位于它自己的应用目录，不自动读取、导入或迁移桌面浏览器及日常安装的数据。

## 当前范围

- Capacitor 8.6.0 原生工程、Gradle wrapper 与独立 npm 锁文件已落地。
- `https://localhost` 由本地打包资源提供；没有开发服务器地址、云同步、AI 调用或 Google Services 插件。
- 保留现有 Web 启动、Service Worker、构建身份和数据库写入保护。`resolveServiceWorkerRequests=true` 将 SW 请求转交 Capacitor 本地资源处理；该配置和资源复制检查不等于真机离线冷启动已经通过。
- Android 自动云备份与设备转移备份关闭。用户主动使用现有备份入口属于另一条路径。
- 这是最薄壳的初始工程。文件保存、分享仍使用现有平台端口的 Web 实现，尚未宣称 Android 原生 SAF 文件交付成功；系统返回、键盘、安全区、大字、进程恢复、更新保留数据必须逐项实测。
- 本目录不自带测试者数据，不安装到任何手机，不申请公开发布。

## 构建

在仓库根目录操作。根项目依赖和此处工具依赖彼此独立，禁止把 Android 依赖安装到根锁文件。

```powershell
npm --prefix apps/android/tooling ci --workspaces=false --ignore-scripts --no-audit --no-fund
node apps/android/scripts/doctor.mjs
```

需要 Java 21、Android SDK Platform 36、AGP 8.13 默认使用的 Build Tools 35.0.0、Platform Tools，以及已由用户接受的 Android SDK 许可。默认工具链目录是 `%USERPROFILE%\HakimiAndroidToolchain`；可用仅限当前进程的 `HAKIMI_ANDROID_TOOLCHAIN`、`JAVA_HOME`、`ANDROID_HOME` 覆盖。脚本不会修改系统环境变量，也不会自动接受 SDK 条款。

Windows 构建目录必须使用纯 ASCII 路径。当前中文工作区的 `gradlew help` 已实际被 AGP 的路径检查拒绝；没有用 `android.overridePathCheck` 隐藏该失败。后续编译前应从同一已确认提交建立 ASCII 路径的隔离副本，再在该副本内准备 Web 产物与 Android 同步；本轮尚未完成这一编译环境验证。

1. 由当前 Web 工作流构建 `dist/web`，核对“关于与反馈”对应的 12 位真实构建身份。
2. 将明确选择的构建复制入内部工程。例如用实际值替换下面的占位符：

```powershell
node apps/android/scripts/sync-native.mjs --web-build <真实的12位构建身份>
node apps/android/scripts/assemble.mjs
```

同步前复用现有产物验证器检查数据库合同、页面与 SW 身份；逐文件记录大小和 SHA-256；复制后再次比对。旧的已准备 Web 目录保存到 `artifacts/previous-web-*`。这一步不会从当前 Git HEAD 推断旧构建的来源提交。

编译只调用 `assembleDebug`，不调用安装、运行、卸载或清空数据命令。成功时 APK 与 SHA-256 回执存于 `artifacts/`，结果固定标为 `APK_COMPILED_NOT_DEVICE_VALIDATED`。设备验证必须另行记录真实型号、Android/WebView 版本、APK 哈希及任务结果。内置 `android-internal-build.json` 保留 Web 资源身份。

同一个内部应用 ID 的后续安装仍可能更新该内部应用；必须先确认已安装版本和备份，再决定更新。不要把卸载重装当成“更新保留数据”通过。

## 官方依据

- [Capacitor Android 环境](https://capacitorjs.com/docs/android)与[8.0 工具版本要求](https://capacitorjs.com/docs/updating/8-0)
- [Capacitor 配置及 Service Worker 转交设置](https://capacitorjs.com/docs/config)
- [Android SDK 安装与许可](https://developer.android.com/tools/sdkmanager)
- [AGP 8.13 的 Build Tools 默认版本](https://developer.android.com/build/releases/agp-8-13-0-release-notes)
- [Google SDK 组件大小和校验值清单](https://dl.google.com/android/repository/repository2-3.xml)
- [Gradle 8.14.3 官方 SHA-256](https://services.gradle.org/distributions/gradle-8.14.3-bin.zip.sha256)

## 2026-10-29 实际验证状态

| 项目 | 实际结果 |
| --- | --- |
| 独立 npm 安装 | 完成，97 个包；根 package/lock 未修改 |
| Android 脚本语法 | 全部通过 `node --check` |
| 现存 Web 产物同步演练 | `b57972ffe0ce`，143 个文件，15,361,966 字节；manifest 校验和复制后 SHA-256 一致 |
| 错误构建身份 | `000000000000` 在复制前被拒绝 |
| JDK / Gradle | Temurin `javac 21.0.12.1`；Gradle `8.14.3 --version` 成功；ZIP 和 wrapper 的官方 SHA-256 均匹配 |
| Gradle 项目配置 | 未通过：Windows 中文路径被 AGP 拒绝；未关闭该保护 |
| SDK 与许可 | 用户本轮明确“暂不接受，先保留 Android 工程”；未下载或安装 SDK、未代用户接受许可；`doctor` 返回 `TOOLCHAIN_INCOMPLETE` |
| APK | 未编译，未安装；新的 UI 候选尚未同步打包 |
| 设备 / 生命周期 / 原生文件操作 | 全部 `NOT_RUN`；未连接或识别测试设备 |

现存产物的演练只验证打包管线，不能当作本轮新 UI 的交付。APK 编译与真机结果以实际回执为准，不能由语法、复制一致性或配置项推导。
