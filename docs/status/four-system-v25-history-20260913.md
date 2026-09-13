# 四体系 v2.5 历史源码与浏览器记录绑定

本批以 `3d53e580bb263e422aa58714a22a785f7339ef60` 为基线，修复 v2.5 测试的历史输入适用范围。生产验证器、旧浏览器记录、当前索引与现实准入均未修改。

## 第一个失败及补齐的范围

基线完整治理组中，该文件有 24 项测试、19 项失败。原正例直接读取当前工作区，首先被 v2.4/v2.3 父链中的 `MANIFEST_IDENTITY_DRIFT` 阻断。提供 v2.4 的 662 项原始输入后，加入 v2.5 记录及其紫微浏览器子记录，初次独立加载又因缺少 `packages/ziwei-doushu-contracts-draft/tsconfig.json` 返回 `CURRENT_BASE_REBUILD_FAILED`。该失败和初始 664 项输入目录均保留。

紫微子记录中已有固定的 `currentBaseObservation`：其构建源码图绑定 50 项文件，证据工具图绑定 14 项文件。逐项核对这 64 项原始身份后，需要再加入 36 项文件；与已有数据没有路径或身份冲突。包括前述两份 JSON，共补入 38 项，形成 **700 项历史输入**。

当前加载器用这些文件和旧记录内嵌的 runtime observation 重建规范化对象，完整验证 v2.5 的 `childDigest` 为 `183253a83af0029a525eefe95207e4b4ad39d7febcc00c5c317bbaa5e837cdbc`。这次没有运行 Vite 构建或浏览器；记录内的 Edge/Chrome 28/28 等字段仍属于原观察，不是本次新取得的浏览器结果，不能转签当前开发源码或用于声明生产 Web/PWA 已获验收。

## 归档和执行代码

新归档 `scripts/fixtures/four-system-v25-additional-inputs.zip` 为 **166265 字节**，SHA-256 `63c56417780b9ba7031521e2b2bb040f374f7cdf43e6df5dedafccf442c23d62`。它包含 38 项数据和一份 `fixture-inputs.json`，数据合计 673736 字节。旧 v2.2/v2.3/v2.4 归档保持原字节，新增条目不覆盖已有 662 项数据。

准备阶段核对整个 ZIP 的固定身份、清单身份、精确唯一安全路径、每项长度和 SHA，以及数据总长度。写入使用 `wx`，与既有输入发生冲突就失败并清理自有临时目录。清理沿用已有父 helper 的实际父目录、目录前缀、非链接目录及 dev/ino 检查。

所有归档源码只作为数据。验证器始终从本次源码导入；CLI 正例是当前 CLI 的逐字节副本，相邻模块仅转发到当前验证器 URL。公共 helper 的允许版本仅增加 5。原 CLI 的预加载检查、参数拒绝和按自身文件位置确定根目录的行为正常执行；实际源码 CLI 在历史目录作为 cwd 时仍拒绝借用历史成功。

## 原断言与回归

原 24 个测试函数体逐字节未改。原 `fixture()` 只将四处加载调用的输入根改成历史目录，`Promise.all` 的调用和缓存行为不变。新增三项测试覆盖当前入口不继承历史成功、归档损坏/截断/空包被拒绝，以及绑定源码图中的配置文件被同长度篡改或删除时，真实递归加载器拒绝旧浏览器观察。

关联 v2.4/v2.5 两个完整文件首轮 **49/49 通过**（22 + 27），无取消或跳过，约 107 秒：

```powershell
node --test --test-reporter=tap scripts/verify-four-system-current-status-observation-child-v2-4.test.mjs scripts/verify-four-system-current-status-observation-child-v2-5.test.mjs
```

随后执行 `node scripts/run-node-test-group.mjs current-governance`，完整 28 个文件、765 项：**614 通过、151 失败**，无取消、跳过或缺失文件结果，约 287 秒，整组仍退出 1。与 `3d53e58` 的 762 项逐项比较，原 v2.5 的 19 项失败全部转为通过，新增三项通过，没有删除测试，其他测试结果状态不变。

原 269 项治理失败累计关闭 **118 项，剩 151 项**。Windows 新检出和远端 CI 按其实际提交身份另存回执，不能由定向通过推断。当前来源、权利和真人专家计数不因历史机械验证增加，5188/5189 安装保持原版本。

原始输入发现和独立加载证据保存在 `Z:/HakimiBaziBackups/LocalDelivery/2026-09-13/four-system-v25-input-diagnostic-v1/`；本次回归、源文件审阅和交付证据保存在同级 `four-system-v25-history-v1/`。
