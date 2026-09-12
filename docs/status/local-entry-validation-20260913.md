# 固定本地入口：实现与验证记录

本次实现将日常入口固定为 `http://127.0.0.1:5188/`，从明确选择的 c15ef 产物复制安装。重复启动复用同一服务，其他服务占用端口时拒绝启动。安装器和启动器不执行构建、不改浏览器数据、不覆盖既有安装。新的启动服务仅使用 Node 标准库，无需在安装机器运行 npm。

源码基线是 `3a6fa1e3dd7edad26dde203205bf98eaf34e4956`，本次开发分支为 `codex/local-entry-install-20260913`。验证在该分支的独立 Windows checkout 和临时安装目录执行。提交仅包含安装工具、入口说明、换行约定和验证摘要；应用、SW、数据库、专家准入与历史摘要未修改。

## 包与源产物身份

本包原应用仍为 `c15ef05bb165 / legacy-v13 / Schema 13`，Evidence ID 为 `hre1-fe550f335b9d1166535e59d0dbb5db13`。它不是本次源码重新构建的产物，也不是下一候选版本。

| 对象 | 数量/大小 | SHA-256 |
| --- | --- | --- |
| 原产物锁 `tmp/release-artifact-identity.json` | 原137文件清单 | `1403c9d765fff226b68d5b51e9cbe2c9cb724d7e3fc47893d3d3fa081d38227e` |
| 原产物集合 | 137文件 | `d6774223f58104c78a88df7daef9c771b23a7dc854cf46de240fbe54a7da7cd6` |
| v4完整安装包清单 `local-package-files.json` | 含清单共147文件 | `6ae38b22821f133f05f013b06250246b77621e5263bf3bef593286747175c6ae` |
| `hakimi-c15ef-portable-v4.zip` | 2,315,702字节 | `341c84d638aca727a75045c63f355f4ee758eae08e220edfcff9c6c664a351b9` |

ZIP保存于本地备份盘的 `HakimiBaziBackups/LocalDelivery/2026-09-13/packages/`，压缩后实际回读147文件与包目录逐字节一致；不随本次源码上传。原137文件及原锁均未改写。安装运行时为 Node `24.16.0`、Windows PowerShell `5.1`，不包含自动下载安装功能。

## 实际执行结果

| 验证 | 结果 | 适用范围 |
| --- | --- | --- |
| `node scripts/validate-local-installation.mjs --package-root <v4包> --output <新临时目录>` | 11通过，0失败 | 完整非空清单、篡改/重复/越界/硬链接拒绝、创建/重复安装、既有内容保留、HTTP字节/响应头/Host检查、冲突拒绝、原包不变 |
| Windows v4安装与启动脚本 | 9条记录均符合预期 | 首次安装、重复安装、冷启动、重复启动同PID、仅清理自有测试服务；外部测试服务占5188时启动退出1且该服务存活 |
| 启动日志同名冲突注入 | 通过，预期退出1 | 原日志不覆盖，`EEXIST`保留，刚创建的自有服务器关闭，5188重新空闲 |
| `node --check` 三个新增 `.mjs` | 通过 | 语法检查，不是浏览器验收 |
| `npm ci` | 退出0 | 独立源码checkout安装锁定依赖；安装者不需要此步骤 |
| `node scripts/run-node-test-group.mjs ci-contracts`，安装依赖后 | **55通过、1失败；0跳过/取消** | 完整56项实际执行，见下面失败归因 |

Windows脚本验证使用 `-NoShortcut`、`-NoBrowser`、`-NoDialogs`；只在预检5188空闲后启动已知测试服务。清理时核对自有PID、脚本路径和创建时间。未打开日常浏览器、未写实际桌面快捷方式。另一台干净Windows安装、真实快捷方式双击和新静态服务器上的浏览器流程验收仍未取得。

## 保留首次失败

1. 第一轮Node集成检查为10通过、1失败：测试使用内置fetch设置Host，实际请求未按测试要求发送该头。改用`node:http`并核对实际请求头后验证外部Host被403拒绝。后续轮次各11通过，是同组复测，不累计成独立覆盖。
2. Windows启动前两轮因后台服务继承调用方输出管道，调用进程等待超时。两轮原日志保留；识别并关闭的仅为各自测试服务器。最终用隐藏ShellExecute启动，服务自行写日志；v3和v4冷启动、复用和冲突拒绝通过。
3. 新checkout未安装依赖时CI合同检查为54通过、2失败。`npm ci`后复测为55通过、1失败，不能沿用之前另一个checkout的56/56。
4. 剩余失败为 `verify-migration-ci-paths.test.mjs:151` 的夜间诊断合同：测试用字面量 `local-data-boundaries-diagnostic:\n` 分割文件，Windows `core.autocrlf=true` 将工作流检出为CRLF，故得到1段而预期2段。工作流在HEAD中有113个LF、检出文件有113个CRLF；仅换行归一化后逐字节相等。此处没有修改工作流或测试来隐藏失败，留待测试合同修复组处理。

## 原始证据位置

原始报告和启动日志保存于本地备份盘 `HakimiBaziBackups/GithubSync/2026-09-13-local-entry-v1/`，GitHub仅保存这份无案例数据的摘要。

| 文件（相对备份目录） | SHA-256 |
| --- | --- |
| `validation-inputs.json`（首批82个证据文件索引） | `2c03571754e4c923ee090a19d66ba086a90edbd227a5abec80fbf52200003484` |
| `checks/node-integration-r4.json` | `7de23204265faef59c7f7c374b29390ee36206ad70603d397c6be6bdc10e8e24` |
| `checks/windows-launcher-r4/results.json` | `b9f376850154fb3eca5e054fb1addc1c1ecd82c5d595416b36042a60512f0ec8` |
| `checks/server-startup-log-collision/results.json`（索引后新增，单列身份） | `00c0c545d083d615915942a2bf826838531075709c74200ab0e195ed7bff9049` |
| `checks/ci-contracts-before-install/results.json` | `b5009cc9f2457391e5ddf10af6eb448e2b00c0d80c49e6c0b4b67a5ba4887ad9` |
| `checks/ci-contracts-after-install/results.json` | `98b0e409562d6715e88e420008231efeef5cc34f5b2f4a5344cfb7f7b41961d5` |

初次`cdb8457`同步未重新执行完整TypeScript、Vitest、应用构建或浏览器矩阵；09-10的2825项Vitest通过、269项治理失败和1项发布证据失败仍属于原记录。后续远端及修复结果单列如下。正式专家材料、另一台Windows实测和完整交付目标仍待完成。源码推送不表示主分支合并、远端CI通过或替换本人固定安装。

## Draft PR 远端基线与当前构建清单修复

[Draft PR #1](https://github.com/TheDeadly-cat/hakimi-suanming/pull/1)以既有开发分支为base，未合并main。`cdb845782c88491ce511e4027f7a8c73ef0f02d8`的[Quick CI 34710918460](https://github.com/TheDeadly-cat/hakimi-suanming/actions/runs/34710918460)和[Migration CI 34710918485](https://github.com/TheDeadly-cat/hakimi-suanming/actions/runs/34710918485)均已完成，终态failure。

Quick CI的类型检查、CI合同、包产物工具、current索引和历史checkpoint通过；Vitest为2824通过/1失败（birth-time-perturbation-panel焦点断言）。专家资格加载与原始意见仍缺失，正式门继续拒绝。另有西洋构建告示观察不匹配、旧PWA合同失败；Windows迁移在raw源码身份检查处停止。这些初次失败没有被抹去或冒充通过。

安装分支引入的构建失败已复现并修复：`package.json`更换两个桌面命令后为32306字节，当前运行时清单仍记录旧32319字节。使用仓库现有`verify-historical-natal-runtime-closure.mjs --write`重建当前清单，再以`--check`核验；差异严格只有`package.json`的大小、摘要和清单总摘要三个字段，所有运行时源文件和依赖记录不变。该清单声明的范围是`current_checkout_runtime_closure_not_historical_binary_or_expert_attestation`，不属于历史缺失原件或专家意见。

修复后完整包产物工具组**38/38，0跳过/取消**；`node scripts/run-diagnostic-stage.mjs build`实际启动并退出0。输出仅在隔离源码目录，用于检查这项构建修复，未作为下一候选准入、未安装、未覆盖c15ef。原v4安装包和137文件产物锁不变。

原始日志保存在`Z:/HakimiBaziBackups/LocalDelivery/2026-09-13/pwa-profile-contract/p1-build-binding-fix/`：`build.stdout.log` SHA-256为`0e91b93a31a5b9201f6a2edcf18b0b1f0b29db69734b2e5c4dbe1ce285e44312`；`package-artifacts.stdout.log`为`fcf0c2f63e95200acf64b7c8f950430a5bdb047be373a6a331ad9b2a873ea74a`。补丁前清单另存`runtime-closure-before.json`。上述远端结果只属于cdb8457；后续提交必须取得自己的CI结果。
