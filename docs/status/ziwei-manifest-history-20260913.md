# 紫微 v2 历史输入夹具与治理回归

日期：2026-09-13。基线为 `35358d35528c2c782b2ded7af142c42364ebe4d4`，工作分支为 `codex/ziwei-manifest-history-20260913`。本批只修改测试输入的适用范围、Windows 检出规则及说明；生产验证器、原 manifest、当前选择、业务参数、真实专家计数和安装入口不变。

## 原因与完整输入

原测试把保存的 Ziwei v2 manifest 放到已变化的源码目录中验证。46 个组件文件中，合同源、HKO 限制策略和策略 helper 三项不同。验证器先正确拒绝整个清单，使对象冻结、WeakSet 品牌、Array sort/iterator、toJSON 及路径重定向等原回归无法到达目标断言。

三份原件来自真实 Git blob，未重建文本或改签摘要：

| 原路径 | 字节 | 原 SHA-256 | Git blob |
| --- | ---: | --- | --- |
| `packages/ziwei-doushu-contracts-draft/src/index.ts` | 45329 | `0474abe7170f17352efd9b0d0f2735f2edbec049bb331441b7bd77ff2b79acc0` | `c81395a8a04c65b3923cf610c33376d5168aba0f` |
| `content/system-admission/ziwei-hko-restricted-source-pre-release-policy.v1.json` | 9538 | `7bd469864d43edc6d2743c0adab1dd3e3a0576a75580a77b0e4421302f6149b4` | `14db7f1be92a861108cb3b97406667673dd9c846` |
| `scripts/ziwei-hko-restricted-source-pre-release-policy-lib.mjs` | 33651 | `709f513b0e7e8c044e1eaf10375b17b065ca3b8cd2ae0676ed238148034cba26` | `cea16183706eb13ed3c0707b94ad06646f30548c` |

夹具总共 48 项：上述 3 份原件、原 v2 manifest、原 predecessor，以及 43 个仍与冻结清单逐字节相同的当前输入。ZIP 只新增前五项，不再复制已有的 HKO 原文数据。归档为 `scripts/fixtures/ziwei-v2-manifest-original-changed-inputs.zip`，32867 字节，SHA-256 为 `684b64b2e70b1eb11b5d58ecee631b64e9c54a7b28874c23f49dd21063ef6cf0`。

测试先验证归档精确身份、完整路径集合、manifest 原始身份及全部 48 项摘要，再写入独立临时目录。归档源码只作为数据，不导入、不执行；验证代码始终从当前仓库导入。结束后只删除测试持有的目录。

## 当前与历史边界

Ziwei 单体系的冻结、品牌与篡改测试显式选择原始输入目录。新增实际当前目录负例，确认当前源码仍因 `MANIFEST_MISMATCH` 拒绝旧清单，不能继承历史夹具成功。

原全体系正例及真实 CLI 正例继续执行，仍有三项失败：逐体系循环在通过 Ziwei 后抵达 Western 历史清单差异；全体系 full-load 与真实当前 CLI 继续拒绝实际目录中的旧 Ziwei 清单。没有把这些测试改为任意拒绝即通过，也没有跳过或删除它们。Western 缺失的历史 README 没有被合成或代替，跨体系回执另有版本引用差异，继续保留未完成状态。

原 Ziwei v2 manifest SHA-256 保持 `f886e95815109d670b65628db403a2fb86e69e5af4088466de1330a15695a867`；pred 和所有来源、权利、专家、发布声明均未修改。历史夹具通过不等于当前准入或源内容权威。

## Windows 原字节

43 个未变化输入中，36 个尚无固定检出换行规则。逐个核对其 Git blob 都为 LF 后，只为这些精确路径补 `text eol=lf`；已有 `-text` 例外保持原样，没有修改源文件字节。

新增测试实际建立独立 Git index，用 `core.autocrlf=true` 检出全部 43 个输入：有规则时全部匹配原 SHA-256；去掉规则后，HKO boundaries 样本变为 CRLF、原摘要不同，而 LF 规范化文本相同。负例发生在测试自己的 Git 目录中，不改用户 Git 配置或当前检出。

## 完整执行与对照

| 范围 | 原基线 | 修复后 |
| --- | --- | --- |
| 完整 manifest 测试文件 | 33 项：23 通过、10 失败 | 36 项：33 通过、3 失败 |
| 完整 current-governance | 28 文件，740 项：491 通过、249 失败 | 同一 28 文件，743 项：501 通过、242 失败 |
| 跳过、取消、缺失文件结果 | 全部 0 | 全部 0 |

按文件、原测试名、层级、测试类型和重名出现次数对照，仅归一化两个工作区路径与一个测试标题。关闭 7 项原失败，新增归档篡改、实际当前拒绝和 Windows 检出三项测试通过，其余结果身份不变。剩余三项中的第一个错误从 Ziwei 移到 Western，记录为下游阻塞显露，不称为新回归或完整通过。

关闭的七项原测试分别覆盖：分离且递归冻结的纯结果、替换 Object.freeze 后仍冻结、WeakSet 原型污染、Array sort 污染、Array iterator 污染、继承的 toJSON hook，以及 iterator 重定向不得取得品牌。没有减少原断言。

加上前批已关闭的 20 项，原 269 项治理失败累计关闭 27 项，仍有 242 项。上轮 Western notice 的两项失败属于另外的 independent-system-evidence 组，不在这里重复扣减。

```powershell
node --test --test-reporter=tap scripts/verify-independent-domain-release-manifests.test.mjs
node scripts/run-node-test-group.mjs current-governance
```

以上两个命令仍退出 1；局部恢复不代表整组全绿。原日志、48 项输入组装记录、Windows 路径核对和逐项结果对照在 `Z:\HakimiBaziBackups\LocalDelivery\2026-09-13\ziwei-manifest-history-v1`。远端 CI 与新鲜 Windows 检出结果应分别记录，不从这些本地结果推定。
