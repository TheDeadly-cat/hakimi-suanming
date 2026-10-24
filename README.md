# 哈基米八字研究台

本地使用的八字排盘与解读工具，保留第二稿界面。**本机当前安装的是 0.21.1 试用版，构建 `7c1ae0cea354`，入口为 [127.0.0.1:5202](http://127.0.0.1:5202/)。** 源码中的 **[0.22.0 是开发候选，尚未安装](./docs/status/reading-trial-022-evidence-topics-20261024.md)**；拉取代码不会自动替换应用或迁移资料。

## 如何打开

使用已安装的桌面快捷方式，或安装目录内的 `START-READING-0211.cmd`。服务启动后，在原来的 Edge 用户配置中打开上面的 5202 地址。安装、启动故障与日志位置见 [0.21.1 安装说明](./LOCAL-READING-0211-INSTALL.txt)。

## 资料在哪里

命盘、笔记和保存报告留在本机浏览器资料库，按**浏览器用户配置和地址**区分，不在源码目录里，也不会自动跨浏览器共享。在 [数据管理页](http://127.0.0.1:5202/settings/data) 导出完整 ZIP 备份，并保留下载的原文件。看到空案例库时，先核对浏览器配置和 5202 地址。

## 如何回退

保留原 0.21 安装包、快捷方式副本和完整资料备份。回退需要按 [安装与回退说明](./LOCAL-READING-0211-INSTALL.txt) 核对并切换 5202 服务；点击旧快捷方式不会自动替换正在运行的新版。回退应用也不应覆盖后来新增的资料或报告。

旧 5188、5189、f043 等入口和原 README 已移到 [本地入口历史索引](./docs/status/local-entry-history-20261024.md)。它们是历史记录，不是当前启动指引。已安装版本的验证范围见 [0.21.1 稳定化说明](./docs/status/reading-trial-0211-stabilization-20261023.md)。工程检查不等于命理解读或事件预测已得到现实验证。

## 开发说明

开发环境需要 Node.js `24.16.0`、npm `11.13.0`：

```powershell
npm ci
npm run dev
```

开发地址默认 `http://127.0.0.1:5173`，与日常 5202 资料空间分开。开发候选、已安装应用和原保存报告分别保留。技术路线、专项命令和旧文档清单可从 [历史索引](./docs/status/local-entry-history-20261024.md) 追溯。

以下保留已有的构建与准入状态区块，供机器校验及开发查阅；它不替代上方本机安装身份。

<!-- CURRENT_STATUS_ENTRYPOINT_V1_BEGIN -->
## 当前发布状态入口

普通 Web/PWA 构建固定为 `legacy-v13 / targetSchema 13 / migrationId null`。Schema 16 仅是独立输出目录中的工程候选，不是默认版本，也没有公开发布授权。当前产品定位是本地优先研究工具和工程预览；工程哈希、迁移矩阵或 Release Evidence 均不代表命理专家真值。

唯一机器 current 源是 [canonical current-index](./content/system-admission/current-index.v1.json)，人工可读入口是由它精确生成的 [current-index 状态投影](./docs/status/current-index-summary.md)。完整的多版本历史由独立的 [history checkpoint](./content/system-admission/history-checkpoint.v5.json) 校验；普通 current 读取只绑定该检查点身份、版本族名称清单和每族当前端点，不把更旧历史字节装入 current 结果。[当前发布状态历史长账](./docs/status/current-release-status.md) 仅保留历史叙述，不再构成 current 或授权来源；发布边界另见 [Web v1 发布章程](./docs/Web-v1发布章程与兼容范围-v0.1-2026-08-21.md)、[发布代际台账](./docs/release/release-generation-history.json) 和 [发布回滚手册](./docs/release/web-v1-release-and-rollback-runbook.md)。在所有者确认许可证策略前，本项目明确保留全部权利，不声称是开源项目。
<!-- CURRENT_STATUS_ENTRYPOINT_V1_END -->
