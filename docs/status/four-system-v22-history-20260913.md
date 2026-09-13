# 四体系 v2.2 输入适用范围与原失败回归

日期：2026-09-13。基线提交为 `ad8280fa62e882f1d378dc08e3a1c19b1df31208`，分支为 `codex/four-system-v22-history-20260913`。

原 v2.2 对象、冻结、私有标记和篡改测试直接调用实际源码目录，先被历史输入变化阻断，无法到达各自的目标断言。本批为这些对象合同提供明确、固定的输入上下文，继续运行当前验证器。实际源码目录负例与所有真实 CLI 测试仍使用实际目录；两项 CLI 成功测试仍失败，没有改成“任意拒绝即通过”。

## 已核验的输入与范围

原紫微 drift receipt 只允许合同源码这一处变化、五个组件摘要变化。当前目录另有 HKO 策略及 helper 变化；恢复这两份原 Git blob 后，原加载器通过，receipt digest 保持 `09d86df6f23d4c1cbc0a76df359dd0738f793de5bdf84e4784b0620a3a6f05bb`。

继续执行四体系 v2.2 才依次显露旧 package.json、downstream registry、Vitest 配置与 package-lock 的输入差异。六份恢复文件均来自真实 Git 对象：

| 路径 | 字节 | SHA-256 | Git blob |
| --- | ---: | --- | --- |
| apps/web/vitest.config.ts | 4074 | ab1ed8f96812e4c3bb977e66833d3186057c5967bfe121da87f0f7449de4f069 | 3010c8ae64ddbd082dc6c7cc0ee5a178a93da1ca |
| content/system-admission/ziwei-hko-restricted-source-pre-release-policy.v1.json | 9538 | 7bd469864d43edc6d2743c0adab1dd3e3a0576a75580a77b0e4421302f6149b4 | 14db7f1be92a861108cb3b97406667673dd9c846 |
| package.json | 28879 | c601b1e560d988a82cfc8d9c374a06597bf8dd867e941a2f4e8cc57f3d59e076 | a2cbea54e808c2d887695b1b4ed5146cb863be32 |
| package-lock.json | 175812 | 40a02c7c3166f0c9bc03afa9c1d1f342fb7f54efe1abbf7cb3f5cf6ecb482a4d | 7a8a2964aae53981c5742d3633af3f5e472c193f |
| scripts/system-contract-downstream-draft-registry.json | 1808 | c17503797376c5800364f8976b8c11e5b42479a637206de8b09ae77374f1cc59 | 0e2302dbebad9f90f4aed5d464eba02a9c51757a |
| scripts/ziwei-hko-restricted-source-pre-release-policy-lib.mjs | 33651 | 709f513b0e7e8c044e1eaf10375b17b065ca3b8cd2ae0676ed238148034cba26 | cea16183706eb13ed3c0707b94ad06646f30548c |

4074 字节 Vitest 配置也存在于首次提交 v2.2 记录的 `b7216a301a74bea0591b364b4dba32aa34409378`。当前 5180 字节配置注册完整测试图，已被通用边界检查器识别；旧吠陀检查器仍按关键字拒绝它。本批只在历史测试输入中保存旧配置，未缩减或修改当前 Vitest 入口，也未放宽生产扫描器。

夹具 `scripts/fixtures/four-system-v22-loader-inputs.zip` 为 **3002031 字节**，SHA-256 为 `9c7d9ca28a5d3f5eeb0b26c39b39de2c4e17a296f197193f0a023598bb6c79bc`。内含 589 个输入文件及一份清单：559 个基线 Git blob、6 个恢复的 Git blob、24 个与既有记录逐字节一致的已安装依赖输入。输入共 13585614 字节；每个路径、大小、摘要与来源均列在 ZIP 内的 `fixture-inputs.json`。

这是固定的加载器测试上下文，**不是完整历史提交、安装环境或浏览器运行的重建**。归档源码和依赖文件只作为数据读取，不导入、不安装、不执行。未取得新的浏览器回执。原 v2.2 JSON 未修改，完整加载器返回原 child digest `b0d0340eae1190560831be2901afe9924e6c1a6434f5a7596d8be6aacb28d941`，并取得原私有标记。

## 回归与保留失败

| 范围 | 基线 | 本批完整组执行 |
| --- | --- | --- |
| v2.2 完整测试文件 | 20 项：3 通过、17 失败 | 23 项：21 通过、2 失败 |
| current-governance | 28 文件、743 项：501 通过、242 失败 | 同一 28 文件、746 项：519 通过、227 失败 |
| 跳过、取消、缺失文件结果 | 0 | 0 |

按文件、原测试名、层级、类型和同名出现次数对照：15 项原失败变为通过；新增 3 项测试通过；没有删除测试，没有其他通过/失败结果转换。新增检查覆盖归档损坏/截断/空包、实际当前目录不得继承历史私有标记，以及替换恢复的 lock/配置后仍被拒绝。后者的两个输入替换属于同一项测试。

原 269 项失败累计关闭 **42 项**，剩 **227 项**。本轮 Windows 完整组与此前基线的检出换行不同，另外 61 项既有失败的首个错误文本变化，未计作关闭；逐项差异保留在 `full-outcome-comparison.json`。新鲜检出的验证记录应与这次执行分别保存，不能从相同 Git 提交推定磁盘原字节相同。

初次夹具执行 23 项均因 before hook 失败：读取轨迹漏记 callback `fs.open`，缺少 19 个真实输入。修正追踪并逐个核对基线 Git blob 后补齐；首个不完整 ZIP、失败日志均保留。其后一次执行为 20 通过、3 失败：新增当前目录负例遇到 Windows CRLF 的 `CONTRACT_SOURCE_DRIFT`。核对两个合同文件的 Git blob 后，为这两个精确路径补 LF 检出规则，源代码 Git 内容不变，之后完整组结果如上。

```powershell
node --test --test-reporter=tap scripts/verify-four-system-current-status-observation-child-v2-2.test.mjs
node scripts/run-node-test-group.mjs current-governance
node scripts/verify-release-governance.mjs
```

完整治理组仍退出 1；release-governance CLI 退出 0。没有把局部历史输入验证等同于当前准入或全仓全绿。

## 后续链与未修改事项

v2.3 及后续加载器在 v2.2 通过后仍发现 Western 历史输入变化。已找回 78206 字节的旧 main.ts，并从原项目取得 20999 字节、`3a8e38d3…` 的原文档；这些只保存到外部诊断副本。该文档与仍缺失的 **20351 字节、518116de…** 原件身份不同，后者没有找回。Western manifest 还要求旧 rules-preview README `74d1faf8…`，仍无候选原件，后续链不能宣布通过。未将 109 项共享上游失败整体计为修复。

生产验证器、旧 JSON/摘要、参数、current 选择、专家意见与资格计数均未修改；专家仍须真实原件。现有 5188/5189 安装、浏览器资料和候选产物未替换。原始诊断保存在 `Z:\HakimiBaziBackups\LocalDelivery\2026-09-13\ziwei-drift-history-v1`；本批回归、输入恢复与后续提交验证材料保存在相邻 `four-system-v22-history-v1`。

## 后续：CLI 正例的输入范围

以上结果保留为 `2fcc67a` 阶段记录。后续将当前 CLI 原文及明确导入当前库的测试转接模块放入独立输入目录，原 CLI 断言不变；另测实际源码入口不能通过历史 cwd 继承成功。v2.2 完整文件现为 24 项全部通过，连同 v2.1 的完整对照见 [四体系历史输入与 CLI 合同回归](four-system-history-cli-20260913.md)。未改变实际入口的默认定位或原 JSON 身份。
