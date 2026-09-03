# 八字七条工程 Binding 值级 Subject 缺口账 v1

日期：2026-08-29

状态：`PR10C_engineering_value_subject_pre_freeze / candidate_only / 0_of_33_freeze_eligible / bindings_frozen_0_of_12`

## 1. 本轮结论

当前 12 条旺衰 binding 中有 7 条属于项目工程候选。此前的候选账能够锁定相关文件和稳定 symbol，却没有把真正影响结果的常量、枚举、阈值比较符、算法分支、上游表身份和跨 consumer 语义拆成可逐项审阅的值级对象。仅凭整文件 SHA-256 不能回答“到底冻结了哪些值”，也不能证明声明值确实被 producer 消费。

本轮新增独立、可重建的值级缺口账：

- `content/system-admission/bazi-engineering-binding-value-subject-gaps.v1.json`
- `scripts/bazi-engineering-binding-value-subject-gap-lib.mjs`
- `scripts/verify-bazi-engineering-binding-value-subject-gap.mjs`
- `scripts/verify-bazi-engineering-binding-value-subject-gap.test.mjs`

账本从当前 7／4／1 binding inventory、冻结准备账、工程候选账、专家候选包、相关 producer／consumer 源码及 `package-lock.json` 重建 7 条工程 binding 下的 33 个 `repository_authored_engineering_value_subject_candidate`。这些 subject 只是预冻结缺口单元：当前 binding inventory 中没有这些 ID；所评估的 binding EvidenceSubject registry 中也没有观察到其正式登记，但全仓 formal registry inventory 未评估。本门没有接入正式 lifecycle、改变生产语义或重签中央 manifest；同时明确 `repositoryMutationSetMechanicallyEstablished=false`，不把端点 verifier 冒充为全仓变更集证明。

账本摘要为 `7a03874b6009928367bf8c5aa60a1312d519d0f8c4ee339c83bc7a40f0b8e81d`。

## 2. 七条工程 binding 与 33 个候选 subject

| 当前 binding | 值级候选数 | 当前机械观察 | 冻结结论 |
| --- | ---: | --- | --- |
| `binding:core:derive-assessment` | 8 | 上游 `ZHI_HIDE_GAN`／`SHI_SHEN` 依赖身份、柱序、月令／显干／藏干 factor 构造、未知十神丢弃、support／demand 聚合与比例 | 上游表值摘要、来源与工程理由均未闭合 |
| `binding:policy:factor-inclusion` | 4 | 三项声明值、日干排除语法、月令与首藏干保留语法、五种 `timePrecision` 的四 consumer 矩阵 | scoped factor source 未出现该声明的具名 AST 引用；一般数据流缺失未建立；`hour_range` 冲突 |
| `binding:policy:direction-map` | 4 | 两项别名、十神分组、group→support/demand、未知值失败关闭及上游十神表依赖 | 表值 provenance 与领域审阅缺失 |
| `binding:policy:weights` | 3 | `monthCommand=4 / visibleStem=2 / firstHiddenStem=2 / otherHiddenStem=1`、dispatch 与输入 guard／consumer | 只是当前工程值，非古籍、专家或统计标定 |
| `binding:policy:month-duplication` | 4 | `counted_separately_candidate` 声明、月令／首藏干 factor-pair 语法、重复检测语法和当前合计权重 6 | scoped factor／sensitivity source 未出现该声明的具名 AST 引用；一般数据流缺失未建立 |
| `binding:policy:thresholds` | 4 | `0.25 <`、`0.43 <`、`0.57 <=`、`0.75 <=`，输入 guard、零总量与 ratio consumer | 无案例标定、专家批准或内容权威 |
| `binding:sensitivity:six-scenarios` | 6 | 当前精确六个工程场景、重复身份、排除条件、等权值 1、稳定性优先级和 authority nulls | 六场景不是六流派，也不是正式规则 |

全部 33 项均固定：`valueProvenanceFrozen=false`、`independentDomainReviewed=false`、`freezeEffect=none`。七条 binding 均为 `bindingFreezeEligible=false`，当前总冻结数仍为 `0/12`。

## 3. 不能被整文件摘要掩盖的六个红缺口

### 3.1 声明与 producer 没有直接绑定

`strength-policy.ts` 声明了 `factorInclusion` 和 `monthMainDuplication`；锁定的 factor／sensitivity source 当前没有这两个名字或 `BAZI_STRENGTH_POLICY` 的 AST 引用，同时保留了与部分声明相似的稳定可执行语法片段。该检查不建立动态属性、任意 alias 或一般数据流的完整不存在性，只能登记为“具名引用未观察到、声明到行为等价未建立”。这里也不声称仓库范围绝对不存在其他 consumer。

### 3.2 `hour_range` 存在真实 consumer 冲突

五种时间精度中只有 `hour_range` 不一致：

| consumer | `hour_range` 是否包含时柱 |
| --- | --- |
| 交互解释面板 | `true` |
| 单盘报告 | `false` |
| 本地 AI draft validation | `false` |
| interpretation evidence envelope | `false` |

账本没有替用户选择赢家，固定 `hourRangeMappingFrozen=false / domainAndProductDecisionRequired=true`。这项冲突关闭前，factor-inclusion 值级范围不能冻结。

### 3.3 legacy `sourceRef` 不是当前 binding 证据

factor producer 源码仍引用 `dtt-strength`、`smt-position`、`smt-ten-gods` 三个 legacy ID；它们与当前 12 条 binding ID 的精确字符串命中为 0，本门建立的可审查语义 crosswalk 记录为 0。`repositoryWideSemanticCrosswalkInventoryAssessed=false`：这里不声称全仓或仓外绝对不存在其他映射。本轮读取了本地 `source-refs.ts` 中的 URL 字符串，但没有访问这些 URL 指向的外部页面或复制页面正文；旧 URL 不能视为当前 binding 的固定版本、exact quote、权利依据或语义等价证明。

### 3.4 正式 EvidenceSubject 没有值级 locator

所评估 registry 中当前 12 个 binding `EvidenceSubject` 的 `algorithmIds`、`fieldPaths`、`ruleProfilePaths` 都为空，33 个新 ID 的观察命中为 0；`repositoryWideFormalEvidenceSubjectRegistrationAssessed=false`。因此本门不能把 producer symbol 引用冒充报告合同中的正式 locator，也不能把这个 scoped 0 外推成全仓不存在其他 registry。

### 3.5 上游依赖身份不等于表值 provenance

当前 lockfile 观察到 `lunar-typescript@1.8.6`、符合 SHA-512 SRI 形状的 tarball integrity 与包级 `MIT` metadata，运行时代码路径引用 `LunarUtil.ZHI_HIDE_GAN` 和 `LunarUtil.SHI_SHEN`。本门没有核验已安装包字节或表字节；两张表的逐值摘要、来源记录、传统内容真值和嵌入数据权利结论均为 0／false。包级许可证 metadata 不能自动证明其内嵌传统表值的来源或可分发性。

### 3.6 专家候选包已与当前字节漂移

专家候选包保存的 `packages/bazi-core/src/index.ts` SHA-256 为 `73e0be8dbb2f40132158ee5dba26e493e18b686f9c888552c3e596c713301b2f`，当前字节为 `4c9b7fc5a16cbd3e3f5ca0bed90cd950b8ef3750f204427a332a6c1a1b4e7e7f`。正式 verifier 仍按预期以 `专家审阅包冻结文件已漂移` 退出 1。本门只记录漂移，没有重签、刷新或把空席包用于工程冻结，更不把它计作现实专家意见。

## 4. 观察与 mutation 边界

本门对 16 个直接 basis 文件分别使用同一读取 Buffer 完成 hash 与 JSON parse 或 AST／稳定可执行语法片段检查；这只是每个文件的端点一致性。includeHour consumer、authority null 和部分 literal table 有更精确 AST 绑定，但其余算法投影不建立一般控制流或数据流等价，也没有运行这些路径。嵌套的既有 verifier 会自行重读文件，本门没有复用这些 Buffer，因此不声称传递性的 same-buffer 证明。跨文件不是原子快照；Schema 13 没有 mutation epoch，`mutationEpochReceipt=null`，不伪造 epoch 0，也不声称排除读取区间 mutation 或 ABA。

## 5. 机械验证

- 新 verifier：`1 file / 11 tests`，全部通过；
- C 阶段合并切片：前三 Exact Quote 私有过渡、来源候选、三层权利候选、冻结准备、PR10B／PR10C 范围对账和值级缺口账合计 `6 files / 68 tests`，全部通过；
- 来源候选、权利候选、冻结准备、范围对账和值级缺口五个 CLI 均通过；冻结 CLI 仍报告 `sourceBundleComplete=false / rightsBundleComplete=false / expertReviewBundleComplete=false / bindingFrozenVerified=0`；
- `check:release-governance` 通过，默认身份仍为 `legacy-v13 / targetSchema 13 / migrationId null`，托管平台仍未选择；
- 专家候选包 verifier 的退出 1 是当前已知漂移证据，不计入通过项，也没有被绕过。

测试覆盖严格 UTF-8、无 BOM、无重复 JSON key、精确 7 条 binding／33 个唯一 subject、当前权重／阈值／比较符／六场景、声明具名引用、`hour_range` 冲突、legacy crosswalk、EvidenceSubject locator、上游表值缺口、专家包漂移、Schema 13 mutation 边界，以及伪造冻结、权利、lifecycle、发布授权、spread／computed／destructuring 引用、注释伪装、consumer 脱绑和 authority guard 不可达的失败关闭。

## 6. 后续决策顺序

1. 先由产品与领域负责人明确 `hour_range` 是否允许进入旺衰时柱，并让四个 consumer 采用一个有版本的决定；不能由测试多数或模型自动选边。
2. 明确 `factorInclusion`、`monthMainDuplication` 是应成为 producer 的真实配置，还是仅保留为说明性声明；若保留，必须建立声明→consumer 的显式 contract。
3. 为 `ZHI_HIDE_GAN`、`SHI_SHEN` 和工程表值分别建立逐值 identity、来源／派生 rationale 与作品层、版本层、载体层权利记录；不能从 package metadata 直接推导。
4. 决定 legacy `sourceRef` 是废弃、迁移还是建立可人工审查的语义 crosswalk；不得只改 ID 让精确匹配变成非零。
5. 在当前 artifact closure 上重新生成待审材料后，再取得至少两份现实、彼此独立的真人意见并列保存；旧漂移包不得静默重签。
6. 只有上述内容和权利材料闭合后，才讨论把值级 subject 注册进正式 EvidenceSubject、补 locator 和进入 binding freeze；PR10B 的表模型仍须另行由人定义，不能由这 33 项反向生成。

## 7. 证据分账

| 账 | 当前结论 |
| --- | --- |
| 工程证据 | 当前 7 条工程 binding 的 33 个 literal／AST／稳定可执行语法投影与六类跨 binding 缺口可从锁定源码重建；不建立一般控制流、数据流或运行时等价；新门 11/11、C 合并切片 68/68 通过 |
| 浏览器／运行时证据 | 未建立；只读源码与 lockfile，未启动应用或浏览器 |
| 内容真值 | 未建立；工程值、上游表值和传统适用性均未获权威校勘 |
| 专家真值 | 未建立；现实独立专家仍为 `0/2`，候选包且已漂移 |
| 权利／法律判断 | 未建立；当前 12 条 binding 冻结账绑定的正式 SourceRights／SourceCarrier 记录均为 0 |
| Binding 冻结 | `0/12`；33 个值级候选中 freeze eligible 为 0 |
| 发布就绪 | 未达到 |
| 公开发布授权 | 未授权 |

本轮没有读取或修改受限文件，没有运行全仓 typecheck、默认 Web build、Git、网络、浏览器、PWA／Service Worker、部署或外部平台操作。`publicDeploymentAuthorized=false`、`expertClaimsAuthorized=false` 保持不变。
