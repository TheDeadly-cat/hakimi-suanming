# 阶段 D：非技术专家试填与 Synthetic 双席 Clean-Profile 验证分账（2026-09-03）

## 结论

命理专家不需要懂代码，也不需要先学会 AI。专家的职责是按固定中文题面审查规则解释、成立条件、反例、失效结构和高风险表达；协调人负责启动页面、版本 pin、匿名化、保存原件和机械并列。

本轮新增并验证的是协调人使用的 synthetic A/B 并列自检和 clean-profile launcher candidate。它只生成内置合成回件，没有 file、paste、storage 或 upload 入口，固定 `realReturnLoadingAuthorized=false`。它不是现实专家正式填写入口，也没有读取任何现实回件。

当前现实专家审定仍为 `0/2`。本轮没有证明专家比 AI 准，也没有证明 AI 与专家准确度相同。工程验证、专家意见、预测准确度、内容真值、权利判断和发布授权继续分账。

固定治理不变：

```text
releaseIdentity = legacy-v13
targetSchema = 13
migrationId = null
publicDeploymentAuthorized = false
expertClaimsAuthorized = false
```

## 非技术专家怎样实际参与

### 角色分离

- 协调人：准备单席材料、启动中文页面、核对 cycle／pin、保存原始回件、处理私密保管和生成差异清单。
- 专家：只看中文题面和待审内容，不运行命令，不查看 JSON、hash、代码或另一席意见。
- 工程人员：验证程序是否按约定保存、比较和拒绝越界输入；不能代替专家判断命理内容。

### 单席流程

1. 每位专家在隔离的 A 或 B 单席完成同一套固定问题，双方不得查看另一席。
2. 每条待审规则至少判断：事实是否读对、采用什么流派／规则立场、理由、成立条件、反例、何时失效、哪些表达风险过高、建议怎样改。
3. 专家不会打字时，可以口述，由协调人逐字录入；锁定前必须由专家本人通读并确认。
4. 协调人保存原始意见、seal 和 checksum。摘要只能检出字节变化，不证明作者身份、资格、首次出现时间或保管链。
5. 两席完成后只逐字段并列。分歧保持 `unresolved`，不得投票、平均，也不得由生成模型自动选择赢家。
6. 真人身份、资质、参与同意、彼此独立性、意见真实性、first-seen 和 custody 仍须仓外人工核验。

当前五个 synthetic 场景只用于排练操作和发现题面问题。未来正式审定必须在 12 条 binding 的可靠底本、版本、exact quote 和权利依据分别冻结后，再逐条建立正式专家材料；不能把五个合成场景当成 12 条内容已经审定。

## “专家与 AI 准确度差不多”应怎样处理

这句话可作为待验证假设，不能直接转成项目结论。需要把三类问题分开：

1. 规则一致性：输出是否忠实于指定体系、版本和来源。可由命理专家盲审。
2. 表达与风险：条件是否说清、是否过度确定、是否可能诱导医疗／法律／财务等高风险决定。可由专家与安全审阅共同检查。
3. 预测准确度：必须另建预注册、盲法、带结果标签的前瞻或严格回顾性研究；专家意见本身不是 ground truth。

若以后比较“专家、AI、专家复核后的 AI”，应使用同一批冻结案例、隐藏作者标签、预先固定评分规则和结果时间窗，并保存无法判断项及分歧。该研究不得与当前 2 席内容复核门混为同一通过线。

## 本轮工程候选

- 固定 11 文件 synthetic source set：7 个页面／数据 payload，加 launcher `.mjs`、PowerShell wrapper、synthetic server 和 cleanup helper。
- 每个 source endpoint 观察为普通单链接文件并计算 raw SHA-256，两遍点时读取一致；这不是跨文件原子快照，interval mutation 和 ABA 仍未排除。
- 只从 Chrome／Edge 固定安装候选位置观察 executable 并计算 raw SHA-256，不回退默认浏览器。
- PowerShell wrapper 清空继承环境后只恢复 7 项运行所需环境和固定 marker，拒绝 Node preload、coverage、compile-cache 和 debug 类环境产生的额外执行或落盘。
- 只接受固定 owner decision literal `synthetic_fixture_visual_qa_only_approved`，不接受调用方路径或真实回件授权。
- 候选运行计划使用随机 `127.0.0.1` 端口、fresh system-temp profile 和单一 `--app` URL；静态路由拒绝真实 pair viewer 与单席入口。
- 浏览器退出结果、server 关闭和临时端点清理分别记录。自然退出只有 `kind=exit / code=0 / signal=null` 才可被 CLI 接受；非零退出、信号或 error 即使安全清理成功也返回失败。
- 测试 adapter 只能来自 plain／null-prototype 对象的自有函数，并显式记录 `testAdapterUsed=true`；不能再用继承属性伪装真实浏览器运行。

## 本轮证据

### Node／合同

- launcher focused tests：`16/16` 通过。
- 无代码 pilot 全目录：`77/77` 通过。
- formal intake successor scoped TypeScript：通过。
- formal intake successor Vitest：`96/96` 通过；15 类 pilot producer record 均保持 formal deny。
- 新增 JavaScript／MJS 语法检查：通过。

首次 launcher 测试曾出现 `4 passed / 3 failed`，原因是 fake browser 的 `spawn` 事件在监听器注册前发出；修正测试时序后通过。随后独立复核又发现非零 browser exit 会与清理成功混账、继承 adapter 可伪装、信号／EPIPE 可绕过 finally，以及 Node runtime 环境可额外落盘；这些路径均已修正并加入负例。旧的通过数不用于覆盖这些失败历史。

### 页面／浏览器

- 本机 Google Chrome Playwright：`16/16` 通过；覆盖 pair viewer、synthetic page、单席页面和 390×844 响应式布局。
- Codex 应用内 Browser 直接打开 synthetic page：初始 DOM 非空，console error／warning 为 0；点击自检得到 58 字段、54 相同、4 差异、formal count 0；1280 桌面和 390×844 均无页面级横向溢出。
- 上述是页面测试，不是 PowerShell launcher、随机端口、真实 clean-profile Chrome／Edge 启动证据。

### 治理

- `check:release-governance`：通过；仍为 `legacy-v13 / 13 / null`，公开部署和专家声明授权均为 false。
- `check:system-contract-draft-boundaries`：仍为相同的 17 条既有／全局失败；本轮文件没有新增失败。受限的 `apps/web/src/lib/local-user-data-cleanup.ts` 只由检查器报告为未检查，本轮没有读取或修改。
- Playwright 使用的 4178、4179、4180 以及手工 Browser 使用的 4184 均已确认无监听。

## 仍为红／零的正式账

```text
Formal KnowledgeDocument = 0
Formal SourceRightsRecord = 0
Formal SourceCarrierRecord = 0
Formal materialization = 0
Binding frozen = 0/12
现实 verified expert reviews = 0/2
Formal original opinions = 0
Formal sealed opinions = 0
Human pairwise independence = 0
Formal disagreement inventory = 0
Formal reconciliation = 0
Formal 2/2 delta = 0
Expert gate delta = 0
contentTruth = false
expertTruth = false
expertVsAiAccuracyEvaluated = false
rightsLegalConclusion = false
releaseReady = false
publicDeploymentAuthorized = false
publicReleaseAuthorized = false
expertClaimsAuthorized = false
```

同时保持 `browserHonoredUserDataDirVerified=false`、`browserProfileIsolationEstablished=false`、`preexistingServiceWorkerExcluded=false`、`browserExtensionInterceptionExcluded=false`、`externalNetworkExcluded=false`、`samePrivilegeIntervalMutationExcluded=false`、`abaExcluded=false`、`cleanupAtomicityEstablished=false` 和 `physicalErasureEstablished=false`。

## 遗留与下一道门

- 本轮未运行真实 Chrome／Edge clean-profile launcher；fake child 只验证参数和生命周期代码，不能证明浏览器真的采用 profile 或页面真实加载。
- 一次早期失败测试留下精确 synthetic 临时目录 `C:\Users\Administrator\AppData\Local\Temp\hakimi-bazi-pair-synthetic-Tu2Xla`。后续删除尝试被工具安全策略拒绝，当前只读复核确认该目录仍存在；不声称已清理或物理擦除。目录来自合成测试，不是现实专家材料。
- 在 owner 明确授权现实专家周期、个人信息范围、保管人、保留／删除／撤回和事故流程前，不启动现实回件收集。
- 获授权后，Chrome 与 Edge 应分别执行 synthetic clean-profile 一轮并独立留证；通过后才做两位现实专家的小规模可用性试填。专家仍只接触中文单席页面。

本轮没有运行 Git，没有访问外网，没有读取现实专家或私人来源材料，也没有读取或修改受限文件。
