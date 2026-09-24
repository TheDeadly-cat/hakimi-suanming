# 四体系 v2.3 历史输入与 CLI 回归

本批以 `3828b062d0a5f8d41e50ccdbbc913fc5e91e4d3f` 为基线，修复 v2.3 测试把历史记录用于当前源码的问题。生产验证器、旧记录、当前选择、专家和来源准入均未修改。

## 首个失败与输入版本

上一轮完整 current-governance 中，该文件有 18 项测试，13 项失败。第一项实际错误是其 v2.2 父链中的 `MANIFEST_IDENTITY_DRIFT`：Ziwei 记录所需的文件与当前目录不符。复用已逐项恢复并验证通过的 v2.2 输入后，还需对应 Western 漂移记录的历史页面和其他输入，不能仅根据第一条报错归为一个文件问题。

v2.3 直接消费 v2.2 父记录与 Western v1 漂移记录。后者明确观察的是 78206 字节的 `main.ts`，SHA-256 `37d85c18a7895e5f75d3e1fc6fa8435b2f5c10376d5b2e6296bd5801fd59a61b`。该原字节已从本地 Git 对象 `fcc1cde9125eda7a481e2f9340ec7a26ed615d75` 找回；现用文件为 79428 字节，未被覆盖。

同一输入上下文还使用已精确恢复的 18037 字节 README（`74d1faf8…aa2`），但西洋契约文档要求的是 20999 字节、`3a8e38d3…c57`。之前四体系 v1 登记所需的 20351 字节原文属于另一个版本，不能因为文件同名而替换它。

## 618 项数据与当前代码

复用 `four-system-v22-loader-inputs.zip`：完整 SHA-256 为 `9c7d9ca28a5d3f5eeb0b26c39b39de2c4e17a296f197193f0a023598bb6c79bc`。其中是 589 项数据及一份 `fixture-inputs.json` 元数据；不是 590 项验证输入。

新增 `scripts/fixtures/four-system-v23-additional-inputs.zip` 为 123704 字节、29 项数据，SHA-256 `073e5651b9988ca7fc0da96bc39276f0dde94363606f0be7e6324e46ff1d62a0`。此 ZIP 与上一轮在 Z 盘验证的补充包逐字节一致。新增条目合计 414636 字节，与原 589 项没有路径重叠，形成 618 项输入。

测试准备校验完整归档 SHA、精确路径集合、条目数量、总字节数、关键原文身份和不重叠性，再以禁止覆盖方式写入自有临时目录。原 v2.2 归档自身继续核对每项数据身份。历史源码及依赖文件只作为字节输入，不安装或执行归档代码。

原验证器从当前源码直接导入。CLI 正例由现有测试 helper 复制当前 CLI 原字节，其相邻模块只转发到当前验证器 URL；helper 的版本白名单仅新增 3，原 v2.1/v2.2 分支不变。CLI 仍按自身位置决定输入根，参数与预加载拒绝路径正常执行。当前源码检查仍读取当前真实源码，没有误读测试用转发模块。

## 断言与验证

原 18 个测试保留：6 个函数体逐字节不变，另 12 个只把 19 处加载调用的输入根从当前目录改为对应历史目录。AST 提取后，仅还原这些明确的参数替换，函数体即与原文完全一致；未改动原断言或删除测试。

新增三项验证覆盖：当前加载器与源码 CLI 不能从历史工作目录继承成功；补充归档被篡改、截断或替换为空 ZIP 时拒绝；历史 `main.ts` 同长度篡改或被现用页面替换时，真实递归 v2.3 加载器返回 `CURRENT_SOURCE_DRIFT`。临时目录清理沿用父 helper 的真实父目录、前缀、目录类型与 dev/ino 核验。

定向运行三个完整文件 v2.1/v2.2/v2.3，首轮 **65/65 通过**（分别 20、24、21 项），无取消或跳过，约 129 秒：

```powershell
node --test --test-reporter=tap scripts/verify-four-system-current-status-observation-child-v2-1.test.mjs scripts/verify-four-system-current-status-observation-child-v2-2.test.mjs scripts/verify-four-system-current-status-observation-child-v2-3.test.mjs
```

随后运行 `node scripts/run-node-test-group.mjs current-governance`：28 个文件、759 项，**573 通过、186 失败**，无取消、跳过或缺失文件结果，约 168 秒，整组仍退出 1。与基线 `3828b06` 的 756 项结果按文件、测试名及同名出现序号逐项比较，原 v2.3 的 13 项失败全部转为通过，新增三项通过，没有删除测试，也没有其他测试结果状态变化。

原 269 项治理失败累计关闭 **83 项，剩 186 项**。本轮完整结果文件 SHA-256 为 `de8e74833be89c950d5c28ab8c97270662977961a862ef0609d6661bd1a24460`。Windows 新检出和远端检查按其实际提交身份另存回执；历史输入通过不能使当前源码自动获得原记录的 current 或准入身份。

本机原始日志、函数体比较、归档身份、提交后的检查保存在 `Z:/HakimiBaziBackups/LocalDelivery/2026-09-13/four-system-v23-history-v1/`。原文恢复和前一轮独立加载记录保留在 `western-readme-session-recovery-v1/`，旧失败记录未覆盖。较后历史链与现实来源、权利、专家工作仍未完成；本批不替换 5188/5189 安装，不声明新的浏览器验收。
