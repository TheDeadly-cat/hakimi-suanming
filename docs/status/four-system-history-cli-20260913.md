# 四体系 v2.1 / v2.2 历史输入与 CLI 合同回归

日期：2026-09-13。基线为 `2fcc67af52f1e80415b97349d58921b2d5e7a593`；工作分支为 `codex/four-system-history-cli-20260913`。

原 v2.1 对象测试依赖已经变化的实际源码目录，无法执行到冻结、篡改及私有标记断言。v2.1 和 v2.2 的 CLI 成功测试也把当前源码目录当作各自旧记录的有效输入。本批修复测试输入的适用范围；生产加载器、CLI、当前选择及原 JSON 均未修改。

## 原输入与当前执行代码

v2.1 复用已经核验的 v2.2 固定输入上下文，只有紫微合同源不同：

| 输入 | 字节 | SHA-256 |
| --- | ---: | --- |
| v2.1 的原合同 | 45329 | 0474abe7170f17352efd9b0d0f2735f2edbec049bb331441b7bd77ff2b79acc0 |
| v2.2 观察的合同 | 46181 | 2a9555dba509873e6c436dcdc9121fcd90e943d880984581fbff865feca15685 |

原合同来自已恢复的 Git blob `c81395a8a04c65b3923cf610c33376d5168aba0f`。辅助函数先核对原 ZIP 的完整摘要，再核对合同的大小、摘要和替换前身份，只在本次持有的临时目录写入原字节。

两份已有归档都未修改，也没有新增一份重复归档：

- `scripts/fixtures/ziwei-v2-manifest-original-changed-inputs.zip`：32867 字节，SHA-256 `684b64b2e70b1eb11b5d58ecee631b64e9c54a7b28874c23f49dd21063ef6cf0`。
- `scripts/fixtures/four-system-v22-loader-inputs.zip`：3002031 字节，SHA-256 `9c7d9ca28a5d3f5eeb0b26c39b39de2c4e17a296f197193f0a023598bb6c79bc`。

这是明确的加载器测试上下文，不是完整历史检出、安装或浏览器运行的重建。归档源码仍只作为数据读取。v2.1 原记录的 child digest 保持 `e2fb723d2c0ddfdb5e41918a0ffa1ceb5d5d1cbbd8f1ac3a86f0be38b05fd64c`；v2.2 保持 `b0d0340eae1190560831be2901afe9924e6c1a6434f5a7596d8be6aacb28d941`。

CLI 正例把**当前 CLI 原文字节**复制到这个独立输入目录，在旁边写一个测试用 ESM 转接模块，明确导入实际源码目录的当前验证库。CLI 的参数、预加载拒绝、`import.meta.url` 定位和直接执行判断均按原代码运行；没有启动参数后门，也没有改写 CLI 源码或执行归档内的旧模块。复制完成后逐字节复核入口文件。这个检查覆盖 CLI 合同，不宣称完整安装包的模块解析或部署验收。

实际源码目录的 CLI 另外从有效历史目录作为 cwd 启动，仍必须退出 1、stdout 为空，并报告原失败前缀。这证明切换工作目录不能让实际入口继承历史输入的成功。原旧 registry 拒绝测试仍运行实际源码入口。

## 执行结果与原失败对照

| 范围 | 基线 | 本批完整治理组 |
| --- | --- | --- |
| v2.1 完整测试文件 | 17 项：2 通过、15 失败 | 20 项全部通过 |
| v2.2 完整测试文件 | 23 项：21 通过、2 失败 | 24 项全部通过 |
| current-governance | 28 文件、746 项：519 通过、227 失败 | 同一 28 文件、750 项：540 通过、210 失败 |
| 跳过、取消、缺失文件结果 | 0 | 0 |

按文件、原测试名、层级、类型和同名出现次数对照，关闭 17 项原失败，新增 4 项负例通过，没有其他结果转换或既有错误文本变化。原测试函数体全部保持原字节，只调整入口与输入准备。原 269 项失败累计关闭 **59 项**，剩 **210 项**。

新增负例覆盖原合同归档损坏/截断/空包、v2.1 与 v2.2 输入不能互换，以及两个实际 CLI 的源码目录定位。v2.1 拒绝 v2.2 输入的实际原因是 `MANIFEST_MISMATCH`；反向为 `CONTRACT_SOURCE_DRIFT`。

首次聚焦执行为 43 通过、1 失败：新增互换负例错误地预期 `CURRENT_GRAPH_BINDING_INVALID`，实际已经由原 manifest 验证器拒绝为 `MANIFEST_MISMATCH`。只修正这个新增断言，没有修改验证器或放宽可接受错误集合；首个失败日志保留。随后完整治理组中的两个文件全部通过。

```powershell
node --test --test-reporter=tap scripts/verify-four-system-current-status-observation-child-v2-1.test.mjs scripts/verify-four-system-current-status-observation-child-v2-2.test.mjs
node scripts/run-node-test-group.mjs current-governance
```

完整治理组仍退出 1。尚缺的 Western 历史 README、20351 字节原文档及现实来源/专家事项没有因此解决；历史上下文的通过也不能代替实际 current 的可用性或正式准入。

原始日志、精确结果对照、新鲜检出、Git 与远端 CI 验证记录分别保存在 `Z:\HakimiBaziBackups\LocalDelivery\2026-09-13\four-system-history-cli-v1`。远端结果只归其实际 head SHA 和运行次数；上一提交发生过三次浏览器版本探测超时、随后单任务重跑通过的事实继续保留，不推定为本提交的 CI 结果。

本批未修改应用运行时、生产 CLI/验证器、历史 JSON、参数、专家材料或安装选择；现有本地入口和浏览器资料不变。
