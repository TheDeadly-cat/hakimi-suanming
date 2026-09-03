# 阶段 E：紫微隔离体系当前机器身份 Manifest v2

日期：2026-08-31  
状态：当前隔离工程闭包已固定；`draft`；不是领域权威、正式体系准入、主应用集成、Release Candidate 或公开发布授权

## 结论

既有 `content/domain-release/ziwei-doushu.engineering-draft.v0.1.0.json` 已与当前紫微隔离工程闭包不一致。本切片不覆盖或重签该 predecessor，而是新增：

- `content/domain-release/ziwei-doushu.engineering-draft.v0.1.0.manifest.v2.json`；
- manifest ID：`hakimi.ziwei-doushu.isolated-engineering-domain-release-manifest/2.0.0`；
- raw identity：`17,968 bytes / f886e95815109d670b65628db403a2fb86e69e5af4088466de1330a15695a867`；
- semantic manifest digest：`f16f4e023248d4362fe42b28e34fd054a3451980d437ca9c83b6bdfb053fb34e`。

旧 predecessor 继续保持：

- `11,591 bytes / 4a09928188c659152383824dca7630a251a3b384b82a81344ea3d3a4b812d5f7`；
- semantic manifest digest：`ac8d05dbfe45846e1edbb277ce2e34f076a8e2c7e6adb8c57b75366d04c8eed7`；
- `predecessorCurrent=false`。

v2 建立的是“当前哪些紫微隔离工程字节构成 surface `0.1.0`”的机器身份，不建立这些规则、来源、解释或高风险政策的领域正确性。

## 独立体系与默认发布线分账

紫微自身继续没有获准的发布身份或主应用 Schema：

- `releaseIdentity=null`；
- `targetSchema=null`；
- `migrationId=null`；
- `mainApplicationIntegrated=false`。

项目默认发布线另账固定为：

- `legacy-v13`；
- `targetSchema=13`；
- `migrationId=null`；
- `inheritedByThisSystem=false`。

紫微不得继承八字 v1.7 的内容、来源、专家或发布权威。

## 当前组件闭包

v2 固定 9 个组件、59 个组件文件引用和 46 个唯一物理路径：

1. execution rules：iztro 锁闭包、隔离 worker 与 workspace calculation bridge；
2. interpretation rules：当前紫微候选内容源；
3. input policy：紫微独立输入契约草案；
4. fact contract：紫微 facts、browser artifact 与跨体系工程投影；
5. source bundle：27 条 requirement、HKO source candidate、公开端点 observation、受限来源 pre-release policy、raw snapshot fixture 与机械 verifier；
6. rights bundle：依赖许可观察、iztro build-notice child、HKO 条款歧义 observation 与 pre-release policy；
7. expert review bundle：`absent/0`；
8. high-risk policy：source-binding child、16 个注册 surface、policy/view、browser client、workspace DOM 入口与 verifier；
9. report contract：隔离 workspace README、两条 bridge、browser main 与 artifact contract。

其中 `bound` 只表示输入、事实或规则的当前工程字节身份；source、rights、high-risk 与 report 组件继续为 `incomplete`。

## 失败关闭门

Manifest 精确固定：

- Binding `0/27`；
- 正式 `KnowledgeDocument / SourceRightsRecord / SourceCarrierRecord = 0/0/0`；
- 现实独立专家 `0/2`；
- source／rights／expert bundle 均不完整；
- HKO 既存 raw source bodies 为 6，仍待独立权利审查；
- HKO fresh pre-release live check 每次必须重跑，历史通过不得满足未来门，且没有持久化 point-in-time pass；
- high-risk policy 的源码身份已绑定，但 `highRiskPolicyBound=false`；
- 16 个 surface 已登记，但 `candidateCallSitesWiredToGate=false`、`semanticCoverageComplete=false`；
- `formalAdmissionPromotionBlocked=true`；
- `centralSystemAdmissionRegistryIntegrated=false`；
- `crossSystemEngineeringReceiptRegistryIntegrated=false`；
- `ownerAcceptanceForFormalAdmissionEstablished=false`。

全部权威投影继续为 false，包括 content truth、expert truth、rights legal conclusion、formal admission、release readiness、public deployment、public release 和 expert claims。

## Mutation 与快照边界

组件逐文件使用 held-handle endpoint snapshot 和同缓冲摘要，但这不是跨文件事务：

- `crossFileAtomicSnapshot=false`；
- `mutationEpochAvailable=false`；
- `mutationEpochReceipt=null`；
- `intervalMutationExcludedAcrossFiles=false`；
- `abaExcluded=false`。

测试会拒绝调用方通过重算 manifest digest 自行宣称 Schema 继承、HKO raw body 已清理、历史构建通过可复用、高风险门完整、中央集成、mutation epoch 或发布授权。

## 定向验证

- 独立 Manifest 专用测试：`33/33`；
- 显式绿色受影响闭包：独立 Manifest、独立 source requirements、HKO source、HKO endpoint observation、紫微 high-risk child、双隔离 build/license、release governance 与八字 v2 共 `325/325`，默认并发和 `--test-concurrency=1` 均通过；
- `verify-independent-domain-release-manifests`：exit 0，紫微 v2 与西洋既有 draft 均通过，且全部准入／授权字段为 false；
- `verify-independent-source-binding-requirements`：exit 0，紫微仍 `0/27`；
- HKO source／endpoint observation／high-risk child CLI：均 exit 0，同时分别保持 raw bodies 6、法律结论未建立、`0/8` admission gates；
- 双隔离 fresh build gate：exit 0；本次两个临时输出树未观察到当前登记的 HKO 精确表示，但该结果不持久化、不证明未知转码不存在，也不授权公开 build 纳入；
- `check:release-governance`：exit 0，项目默认继续为 `legacy-v13 / 13 / null`，两项公开授权继续为 false；
- exclusive writer 第二次执行以 `EEXIST / exit 1` 拒绝覆盖 v2。

## 保留的红账

- 旧紫微 predecessor 未被当作当前 Manifest；
- 中央 `four-system-admission.v1.json` 继续因其既有八字正式 Manifest 漂移而失败关闭；
- cross-system engineering receipts 继续因其保存的 expected-manifest preview／registry 身份漂移而失败关闭；
- 两者均未重签，v2 没有借独立 Manifest 绿色获得中央或跨体系正式准入。

把中央和跨体系旧测试文件加入同一次大调用会真实暴露上述 expected-red；它们不计入 `325/325` 绿色闭包。

## 未建立

本切片没有建立：

- 紫微规则、流派或解释的内容真值；
- 现实紫微专家的身份、资质、独立性或两份原始意见；
- HKO、iztro、Fortel 或其他材料的作品／版本／载体权利结论与再分发授权；
- 完整高风险语义／sink／callgraph 闭包；
- 主应用集成、正式仓储、完整浏览器矩阵、PWA／Service Worker、公开主机、Release Evidence、部署或回滚；
- 发布就绪、专家声明或公开发布授权。

本轮没有运行全仓 typecheck 或默认 Web build；已知受限源码没有读取或修改。没有执行 Git 操作。
