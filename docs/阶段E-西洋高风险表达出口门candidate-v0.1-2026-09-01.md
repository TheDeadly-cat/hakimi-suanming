# 阶段 E：西洋高风险表达出口门 candidate v0.1（2026-09-01）

## 1. 本轮目标与结论

用户明确改为优先推进 C、D 或其他体系后，本轮选择不依赖第三方私有材料、现实专家联络或公开发布授权的西洋独立产品化缺口：为现有隔离浏览器预览补一层 first-party 高风险表达词法出口门，并把当前源码、调用点、测试和零准入边界冻结为可重建 candidate。

这不是正式高风险表达政策，也不是语义分类器。机械结论保持：

- `activeAdmissionEffect = none`；
- Admission `0/8`；
- Binding `0/28`；
- 现实独立专家 `0/2`；
- `lexicalCoverageComplete=false`、`semanticSafetyEstablished=false`；
- `formalHighRiskPolicyBound=false`、`highRiskClaimsAuthorized=false`；
- 西洋产品 `productIdentity / releaseIdentity / targetSchema / migrationId = null`；
- 项目 `legacy-v13 / targetSchema 13 / migrationId null` 只作治理背景，不由西洋产品继承；
- mutation epoch、跨文件原子快照、区间无变异和 ABA 排除全部未建立；
- 内容真值、专家真值、权利法律判断、发布就绪、公开部署和公开发布授权全部为 `false`。

## 2. 运行时边界

### 2.1 五个登记出口

策略登记五个 surface：

1. `western.preview.candidate-interpretation`；
2. `western.preview.expert-review-question`；
3. `western.preview.imported-review-feedback`；
4. `western.preview.primitive-review-template-download`；
5. `western.preview.dynamic-review-template-download`。

当前 `main.ts` 有 52 个显式 DOM guard 调用和 2 个模板 guard 调用。DOM 命中登记词后只显示固定中性替代文字；两类 JSON 模板命中后整体抛出 `RISKY_TEMPLATE_EGRESS_REJECTED`，不会进入下载 sink。反馈消息、导入文件名、审稿人自述、标题、传统口径、理由、成立条件、反例和退修要求的当前已知出口都经过统一 helper。

Candidate 只写 `currentKnownExternalReviewFeedbackRoutedThroughGate=true`。它同时固定：

- `completeTextLeafInventoryClosed=false`；
- `registeredCallGraphClosureEstablished=false`；
- `surfaceCallerAuthenticityEstablished=false`。

所以源码正则与调用计数只是当前已知调用点观察，不是完整 taint／AST／控制流证明。

### 2.2 八类登记风险

当前词法表覆盖：确定性个人结果、健康医疗与生育、法律刑事、财务投资与赌博、生死灾祸暴力与自伤、婚恋家庭、职业教育与社会身份、心理健康与人格诊断。

归一化在 NFKC 后删除标点、符号、分隔、控制、组合标记和 Default Ignorable code point，并处理当前登记词所需的常见繁简字符。负测覆盖零宽／双向控制／variation selector／language tag／组合音标／interlinear annotation／emoji／Hangul filler 与已登记繁体同词。

该表仍是有限 denylist：英文、同义改写、未登记繁体和在词中插入普通字母仍可能放行。因此任何后继不得把它升级成对抗性语义安全边界；外部自由文本若要进入正式产品，应改为结构化字段、固定安全模板或经正式政策审定的独立闭包。

### 2.3 fail-closed 与资源预算

- DOM raw 上限：12,000 UTF-16 code units；normalized 上限同为 12,000。
- 模板 raw 上限：2 MiB；normalized 风险扫描上限：512 KiB。
- ill-formed UTF-16、wrapper 字符串、未知 surface、raw 超限和 normalized 扩张超限全部拒绝。
- 否定、引用和纠错句只要仍含登记短语，也会保守中和／拒绝。它避免简单否定解析造成跨句放行，但会误杀例如“不应该买入”或“请删除‘一定会成功’”；这是明确的安全侧假阳性，不是语义理解。

Request、receipt 和 decision 使用模块私有 `WeakSet` brand；clone、Proxy 和 JSON 反序列化对象不能取得品牌。Receipt 不保存候选原文、原文摘要、出生数据、派生盘面摘要或来源正文，也不执行网络、存储或 Cookie 副作用；但 `triggeredRiskCategoryIds` 是粗粒度敏感主题元数据，后继不得把它日志化或持久化。

## 3. 固定身份

| 工件 | bytes | SHA-256 |
| --- | ---: | --- |
| `content/system-admission/western-high-risk-expression-policy-draft.v0.1.0.json` | 9,526 | `caf4b85e9ce72d0aaaec1b57e5a634b4acf7d376ef39ff6f02b9cf84875d1485` |
| candidate semantic digest | — | `f04ac69f2eae777802dbe6946aeb1898eb21440f71d46cb0643b7e6fe38ca4ba` |
| `packages/western-astrology-rules-preview-draft/src/browser-app/high-risk-expression-egress-policy.ts` | 22,464 | `2edb1f38df4dd8854648bfbdd4b321e2e5fad8bbff3710eff009814ac15eedf8` |
| `packages/western-astrology-rules-preview-draft/src/browser-app/main.ts` | 78,206 | `37d85c18a7895e5f75d3e1fc6fa8435b2f5c10376d5b2e6296bd5801fd59a61b` |
| `packages/western-astrology-rules-preview-draft/src/high-risk-expression-egress-policy.test.ts` | 16,624 | `4c2565a5b69f5d6e477a15b10f5765649a1b92116c874e96ae2009b45d81becc` |
| `scripts/western-high-risk-expression-policy-draft-lib.mjs` | 35,773 | `0a8e89d9ddb19ec98b4aeff70274ee43868b5eef6bc70bdf00a3b61b67995a68` |
| `scripts/verify-western-high-risk-expression-policy-draft.mjs` | 1,225 | `6ad4bfe52266a9d357fb175e0b9379fdfdab0661d9aa117d404d9aad89e5c297` |
| `scripts/verify-western-high-risk-expression-policy-draft.test.mjs` | 14,292 | `2619cdd119815f66eeea027973909cf708fcffd4b376e2aee9a011b3ab5faa95` |

Candidate 固定绑定八个端点：v1.1 零准入 parent、policy runtime、浏览器调用点、content layer、两类模板 serializer、策略测试和隔离 package boundary。保存文件与当前八端点精确重建一致后，loader 才返回模块私有 branded result。

## 4. 定向验证

### 4.1 工程证据

- 专用 CLI：通过；返回 `surfaceCount=5`、`artifactBindingCount=8`、Admission `0/8`、Binding `0/28`、专家 `0/2`，全部 authority 红门保持 false。
- Candidate verifier：11/11 通过。
- Western 受影响 Vitest：6 files / 75 tests 通过；其中高风险策略定向用例 54 项。
- `tsconfig.json` strict TypeScript：通过。
- `tsconfig.browser-app.json` strict TypeScript：通过。
- 隔离 Vite build：98 modules，构建输出只写入系统临时目录；没有运行默认 Web build。
- `check:web-storage-import-boundary`：通过。
- `check:release-governance`：通过；默认仍为 `legacy-v13 / 13 / null`，`publicDeploymentAuthorized=false`、`expertClaimsAuthorized=false`。
- `check:system-contract-draft-boundaries`：预期红，仍为受限文件未检查及 11 条既有动态 import／未登记依赖诊断；本轮西洋新文件没有出现在诊断中。

### 4.2 应用内浏览器证据

隔离构建通过 Codex in-app browser 在 `http://127.0.0.1:43219/` 进行一次性观察：

- 页面身份：`西洋星盘规则层预览 · 隔离草案`；
- 首屏非空，没有 Vite／Webpack／框架错误 overlay；
- 默认桌面与 390×844 两个视口无横向溢出；
- 控制台 error／warn 为 0；
- 一次计算成功，返回 10 天体并启用当前盘模板；
- 计算后共观察到 686 个带 policy dataset 的 DOM 节点，当前安全内容全部为 `pass_through`，且每个节点的 `semanticSafetyEstablished=false`、`expertClaimsAuthorized=false`；
- 43 项基础模板与 73 张当前盘动态模板均进入“已生成”页面状态，证明当前安全序列化内容通过 guard 后到达下载动作。

本轮没有通过浏览器上传恶意审稿文件，所以“危险导入在真实浏览器中显示固定替代文字”没有建立；该行为只有运行时单元反例和当前调用点机械证据。上述观察也不是 Chrome／Edge、PWA／Service Worker、完整应用、正式仓储、公开主机或生产运行时证据。Candidate 本身仍保持 `browserRuntimeEvidenceEstablished=false`，避免把一次临时观察冒充冻结 Release Evidence。

## 5. 独立审计与剩余红门

两名只读审计者未发现当前源码中已登记出口的实际直接旁路，并确认 Unicode、繁体登记词、guard-before-download、品牌、raw identity、当前八源重建和全部 authority 红门。审计同时保留三类后继问题：

1. **未登记语义默认放行**：若把有限 denylist 当正式安全边界，属于阻止晋级的高严重度缺口；当前因为隔离、零准入且明确 `lexicalCoverageComplete=false`，没有形成发布或权威提升。
2. **否定／引用误杀**：这是有意 fail-closed 的可用性代价，未来应通过结构化“被引用危险原句／安全纠错说明”解决，不得再用简单否定前缀放行。
3. **机器检查与 standalone parser 非完整 schema／callgraph 闭包**：顶层 unknown key、已知 authority 自重签、`mutationEpochReceipt`、调用计数漂移和 `currentKnown...=false` 已拒绝；嵌套 unknown key 仍可被 standalone test-only parser 接受，但结果没有 brand，正式 loader 的固定 raw identity 与 exact-current 比较会拒绝。调用点检查也可能被别名 sink 或注释计数欺骗，因此字段已收窄为 `currentKnown...`，完整闭包继续为 false。

## 6. 七账分离

| 账 | 本轮状态 |
| --- | --- |
| 工程证据 | 当前五 surface、八风险类、52 DOM guard、2 template guard、八端点 candidate 与攻击回归已建立 |
| 浏览器／运行时证据 | 有一次隔离 IAB 桌面／390×844 观察；未冻结进 candidate，不覆盖危险文件导入、Chrome／Edge、PWA、完整应用或公开主机 |
| 内容真值 | 未建立 |
| 专家真值 | 现实独立专家 0/2，未建立；分歧处理未发生 |
| 权利／法律判断 | 未建立；本轮未取得或复制任何第三方私有材料 |
| 发布就绪 | `false` |
| 公开发布授权 | `false` |

## 7. 明确未做

未读取或修改受限 `apps/web/src/lib/local-user-data-cleanup.ts`；未运行全仓 typecheck、默认 Web build、完整应用、PWA／Service Worker、Chrome／Edge、公开主机、部署或回滚；未联络专家、未访问第三方后台、未复制 prompt／知识库／断语／资产；未执行任何 Git 操作。

本 candidate 不能从八字 v1.7、紫微或吠陀继承内容权威、专家权威、许可结论或发布授权。它只是西洋体系的独立工程增量，后继若要晋级，仍须另行完成来源正文与许可依据、至少两名现实独立专家并列意见、正式高风险政策、同产物 Chrome／Edge 质量门、Western 专属 Release Evidence、部署与回滚证据。
