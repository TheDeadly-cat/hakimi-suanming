# 阶段 C／D：Binding-Citation 链接需求与专家零实例当前线（2026-09-01）

## 0. 状态结论

本轮按阶段 C、D 优先级新增两条 append-only、zero-instance、deny-only 机械子件：

1. 阶段 C 把当前八字旺衰 readiness v1.9 的 12 条 binding 行，逐条投影为未来 Citation／KnowledgeDocument／SourceRights／SourceCarrier／项目副本 materialization 必须同时闭合的链接需求；当前没有发行任何 receipt，Binding 仍为 0/12。
2. 阶段 D 以两个当前 full-loader 私有品牌为父件，重新观察专家线的当前零实例状态；历史 intake／privacy 工件只按同一 raw buffer 的 raw SHA-256 与 self digest 保存为历史投影，不调用已经漂移的旧 full loader。当前两个专家席位均为空，现实专家仍为 0/2。

两条子件都不取得来源正文，不保存 exact quote，不采集真人资料，不访问第三方后台，不联系专家，也不作作品、版本、载体许可或法律判断。它们不建立内容真值、专家真值、发布就绪、公开部署、公开发布或专家宣称授权。

项目默认治理继续固定为：

| 字段 | 当前值 |
|---|---|
| release identity | legacy-v13 |
| targetSchema | 13 |
| migrationId | null |
| mutation epoch receipt | null |
| publicDeploymentAuthorized | false |
| expertClaimsAuthorized | false |

## 1. 新增工件与冻结身份

### 1.1 阶段 C

| 文件 | Bytes | Raw SHA-256 |
|---|---:|---|
| [Binding-Citation-locator requirements artifact](../content/system-admission/bazi-binding-citation-locator-link-requirements.v1.0.0.json) | 28,463 | 4316c708a6d5a2a65c8574208ec6e44d182c5886e4559e87ed2a3c0a6963368b |
| [loader library](../scripts/bazi-binding-citation-locator-link-requirements-lib.mjs) | 40,742 | 8d75d40021597508f75238c2ac4a6fbf2776429debb6993109366e0066a23e53 |
| [observation CLI](../scripts/verify-bazi-binding-citation-locator-link-requirements.mjs) | 5,835 | 44671760c45703624bcb9ced00c7154a0648327d1abeb280c0327ad27a12a0cd |
| [adversarial tests](../scripts/verify-bazi-binding-citation-locator-link-requirements.test.mjs) | 20,366 | 51ee4c74847c32c7163a0761002c1fbb79a15ae7d1083d3ed85a353454fa4a68 |

artifact semantic ledger digest：

2fdc1fcafcb28795823b3cac92db707e88df6325c197f08cb6a59a96fa3f9dc4

### 1.2 阶段 D

| 文件 | Bytes | Raw SHA-256 |
|---|---:|---|
| [expert current-line zero-instance artifact](../content/system-admission/bazi-expert-current-line-zero-instance-observation-child.v1.0.0.json) | 9,122 | c21d07363701fa15ad57ccabf333f2dfcb5200b816c3772fbc3ae830c5c5e3ce |
| [loader library](../scripts/bazi-expert-current-line-zero-instance-observation-child-lib.mjs) | 43,862 | 85a8f7547bb15ed739fe3d98ffad975c6ccb91984c99444eb9333acb39d006c6 |
| [observation CLI](../scripts/verify-bazi-expert-current-line-zero-instance-observation-child.mjs) | 1,907 | e920395f6bafae437adcbdc5622bc5a361f4200aec4f2616cb987d0f87f8ff36 |
| [adversarial tests](../scripts/verify-bazi-expert-current-line-zero-instance-observation-child.test.mjs) | 17,590 | 3fcab47ae26c9cdd65638d9a0bf178120b710530b1c7fb16b3bcdb1298395aa6 |

artifact semantic child digest：

f7e7a4a6b3580e451e06de8af29cf8c3b834b05234f9f97ec343a5b8ab1641db

## 2. 阶段 C：12 条链接需求

### 2.1 当前父件与精确投影

本 child 只消费当前 readiness v1.9 的 exact persisted full-loader 私有品牌：

| 项 | 固定身份 |
|---|---|
| ledger | hakimi.bazi.strength.binding-freeze-candidate-readiness/1.9.0 |
| artifact | content/system-admission/bazi-binding-freeze-requirements.v1.9.0.json |
| raw identity | 45,551 bytes / e20145b5f34b5dc04464e482cda5da990f82e520236679efbf568b322637f797 |
| semantic digest | 42930e63cb0960df969f5fe059617eb96a8ec9bd857c486cd4b33a28d37a8ae1 |

12 行按原顺序固定以下字段，并为每行保存 parent canonical SHA-256：

- order；
- bindingId；
- evidenceSubjectId；
- sourceId／sourceType／URL／stableRevision／verificationStatus；
- registry locator kind／value／verificationStatus／contentSha256；
- readiness 的来源正文、quote、作品／版本／载体身份、三层权利、carrier、materialization 与 freeze 红门。

独立交叉审计从当前 strength registry 与 Knowledge Core 重新提取映射，结果为 core 12 行、ledger 12 行、顺序与 bindingId → evidenceSubjectId 完全相等。

深审材料中列出的 strength.yueling_exact_quote、support.season_production 等 12 个名称，是来源候选账中的 conceptual topic IDs，不是另一套已经正式注册的 12 个 EvidenceSubject。本 child 没有把两套标识静默等同。后续 PR 10A／10B／10C 若取得真实内容输入，仍需为“概念主题 → 正式 binding → EvidenceSubject → 冻结来源包”另建显式 crosswalk；当前只完成需求建模，尚未冻结任何一批。

### 2.2 未来 receipt 的单一合取

未来若要把某条 binding 从 locator 候选提升为真实闭合，必须由另一个 owner-authorized capability issuer 在同一 receipt 中同时绑定：

1. registry binding 与 evidence subject；
2. registry source；
3. registry locator；
4. 同一内容身份的 KnowledgeDocument；
5. 指向同一 subject、文档、section、line 与 quote digest 的 Citation；
6. 同一文档版本的 SourceRights；
7. 同一内容身份的 SourceCarrier；
8. 终止于同一 KnowledgeDocument hash 的项目副本 materialization receipt。

本 ledger 自身不能发行 receipt；调用方自写、只重算 digest、合并多个 partial receipt、用 candidate locator 状态冒充 verified，均不能获得 persisted private brand。

当前状态仍为：

| 计数／判断 | 当前值 |
|---|---:|
| current receipts | 0 |
| locator linked | 0/12 |
| formal KnowledgeDocument | 0 |
| formal SourceRights | 0 |
| formal SourceCarrier | 0 |
| project-copy materialization | 0 |
| materializations verified | 0 |
| Binding frozen | 0/12 |
| minimal quote sufficiency | not_established |

quote 长度或唯一性不能自动证明“最小充分”；未来仍需针对同一冻结文档字节的独立人工复核。

### 2.3 单盘报告边界

Knowledge Core 当前确实把这 12 个 binding EvidenceSubjects 纳入 SINGLE_CHART_REPORT_EVIDENCE_SUBJECTS；这一事实只证明 registry membership。C child 明确固定：

- report consumer closure 未评估；
- report Citation admission 未重放；
- singleChartReportAdmissionEffect = none；
- v1.7 frozen golden 未重新验证；
- 浏览器证据未建立。

因此本轮不能沿用历史 269 tests、隔离构建或浏览器演示来声称当前报告准入、当前 golden 或当前浏览器闭包。

### 2.4 失败关闭与运行时校准

- builder 输出不带 child 私有品牌；只有 exact persisted loader 可授予品牌。
- BASIS_ARTIFACTS 的遍历使用索引循环，不依赖 live Array iterator。
- 定向 iterator 污染、Promise／Array 方法污染、clone、重签行换位、receipt 伪造、quote／authority／epoch 提升均不能产生绿色品牌或权限。
- endpoint snapshot 不等于跨文件原子快照；Schema 13 没有 mutation epoch receipt，interval mutation 与 ABA 仍未排除。
- CLI 只是“假设没有任意 pre-evaluation 代码执行”的机械观察，不是 Node、loader、launcher 或 OS 启动链 attestation。

## 3. 阶段 D：专家当前线零实例

### 3.1 当前父件与历史投影

D child 消费两个当前 full-loader 私有品牌：

| 当前父件 | Raw identity | Semantic identity |
|---|---|---|
| readiness v1.9 | 45,551 bytes / e20145b5f34b5dc04464e482cda5da990f82e520236679efbf568b322637f797 | 42930e63cb0960df969f5fe059617eb96a8ec9bd857c486cd4b33a28d37a8ae1 |
| expert authority precheck v1 | 12,974 bytes / ccfe28e4dfb8c1bd7a6764d6253cf818c37a712ea24225bd100092362cc1f2af | 0c68a77a135a6ad6205a9c0da3e37162a820ee2f273cb899783fe9a990526a80 |

历史 intake v1.1 与 privacy v1 各自在同一 held handle 上只做 raw SHA-256 与 self digest 复核；其旧 full loader 没有被 import 或调用，也没有被称为当前品牌：

| 历史观察 | Raw identity | Semantic digest |
|---|---|---|
| intake v1.1 | 32,579 bytes / 7a7088a3fdc660ccca3ef0d9765e36421563c7feee1c3dfa6bc4d7169d0f91df | 5318b9543bad20c52e5129901e94aa2ca3d2dd68f342ba11ab9611f4f767d582 |
| privacy v1 | 10,260 bytes / f99612bd68adbe42145b0cc92030f44d54ee91eed574617690de8a4f109c9a17 | cdf1a4d73a07b99a915e19f24672adbf6a4b42fb98754a0d679b32ec91eca3a2 |

### 3.2 两席、四问、十项独立性因素

当前模板固定两个 vacant seats：

- domain-expert-a；
- domain-expert-b。

复核范围固定为四个问题：

- 月令／藏干重复计入；
- 相对因子权重；
- 旺衰区间阈值；
- 失效／特殊结构。

两位现实专家未来还需逐项核验十类独立性因素，包括机构、师承、家庭、商业利益、共同著作、共同服务、汇报关系、提前看见另一意见、共享未公开材料和同一上游算法／教材依赖。

分歧规则保持：

- 不得多数表决；
- 不得平均；
- 不得由生成模型选择赢家；
- 未解决分歧只能 defer 或 reject，不能直接采纳。

### 3.3 零实例不是现实不存在

历史 persisted 投影中的身份、资质、scope、独立性评估、原创意见、sealed opinion、分歧清单和专家 bundle 全为 0。摘要已经使用 historicalPersisted* 与 templateReviewerSeatsVacant 命名，并显式固定：

- historicalProjectionIsCurrentRealityAttestation = false；
- realWorldPrivateMaterialExistenceAssessed = false；
- absenceOfPrivateMaterialInRealityClaimed = false。

所以“仓内当前没有可承认实例”不能外推为“现实世界没有专家意见或私有材料”。本 child 没有读取 dossier／opinion 文件、没有调用 private runtime、没有收集真人资料，safeToPublish 仍为 false。

### 3.4 私有品牌对象实际冻结

loader 捕获并使用 held Object.isFrozen，而不是信任导入后可变的全局引用。回归证明，在 post-import Object.isFrozen 污染下，persisted branded result 与关键子对象仍实际深冻结；修改专家计数、expert authority 或 release 字段均抛出 TypeError，clone 不能取得品牌。

Manifest currentness 与 single-chart-report drift receipt 均未由本 child 评估或消费。它不修复、不重签正式 Manifest，也不接入 default/runtime/central admission。

## 4. 聚焦验证

| 验证 | 结果 | 仅能证明 |
|---|---:|---|
| C 专用默认 tests | 19/19 | persisted identity、12 行、future conjunction、report 边界、污染与晋级负例 |
| C 专用串行无隔离 tests | 19/19 | 同一进程顺序执行下的窄机械回归 |
| D 专用默认 tests | 23/23 | 当前双父品牌、历史 raw+self、零实例、no-winner、实际冻结与红门 |
| D 专用串行无隔离 tests | 23/23 | 同一进程顺序执行下的窄机械回归 |
| C + D + readiness v1.9 + authority precheck | 4 files / 109 tests | 当前 C／D 父链与 child 的合并机械闭包 |
| C／D CLI | 均 exit 0 | 校准后的窄 mechanical observation，不是 runtime attestation |
| C／D node --check | 各 3/3 | 两套 lib／CLI／test 语法闭合 |
| Stage C material-admission candidate Vitest | 1 file / 14 tests | 既有 material candidate 的定向功能合同 |
| Stage C material-admission candidate strict TypeScript | exit 0 | 该 package 的静态类型闭合 |
| release governance CLI | exit 0 | 默认仍为 legacy-v13 / 13 / null，公开／专家授权仍关闭 |
| 两路独立终审 | 无剩余 P1／P2 | 只覆盖列明代码、身份、PoC 与语义边界 |

## 5. 必须分账的 expected-red

以下退出码 1 是当前历史工件对已知上游漂移的失败关闭，不属于本轮 C／D 新 child 的测试失败，也不能被新 child 的绿色覆盖：

| 历史入口 | 当前结果 |
|---|---|
| generic Bazi binding readiness CLI | exit 1；旧 basis 与当前 12 条注册表／来源／权利状态不一致 |
| source-carrier readiness v1.1 full-loader 路径 | exit 1；BOUND_READINESS_BASIS_DRIFT |
| expert intake v1.1 full-loader 路径 | exit 1；BOUND_READINESS_BASIS_DRIFT |
| expert privacy reconciliation CLI | exit 1；VERIFICATION_FAILED，根因仍沿旧 readiness ancestor |
| Bazi Domain Manifest v2.2 CLI | exit 1；COMPONENT_FILE_IDENTITY_DRIFT，当前 single-chart-report 源身份已变 |

当前 readiness v1.9 与 expert authority precheck 是本轮使用的绿色当前端点；它们不自动使上述历史入口重新 current。

## 6. 七账分离

| 账本 | 本轮结论 |
|---|---|
| 工程证据 | C/D artifact、私有品牌、raw/self identity、closed-world 投影与对抗回归已机械验证 |
| 浏览器／运行时证据 | 未建立；没有启动完整应用、PWA、Chrome／Edge 或公开主机 |
| 内容真值 | not_established |
| 专家真值 | not_established；现实专家 0/2，意见 0/2 |
| 权利法律判断 | not_established；正式 document／rights／carrier／materialization 均为 0 |
| 发布就绪 | false；未建立 Release Evidence、部署或回滚确认 |
| 公开发布授权 | publicDeploymentAuthorized=false / publicReleaseAuthorized=false / expertClaimsAuthorized=false |

## 7. 本轮未做与下一真实输入

本轮没有运行全仓 typecheck 或默认 Web build；既有阻塞文件 apps/web/src/lib/local-user-data-cleanup.ts 未读取或修改。也没有运行完整应用、PWA／Service Worker、跨浏览器、正式仓储、公开主机、部署或回滚。

阶段 C 下一步不能靠继续添加零实例账本来提升计数。每条 binding 都需要有权提供者逐条交付并冻结：

1. 可靠底本、作品与版本身份；
2. 精确来源正文 bytes 与 hash；
3. section／line／exact quote 及最小充分人工判断；
4. 作品层、版本层、载体层许可依据；
5. SourceRights、SourceCarrier 与项目副本 materialization 的同内容闭合。

不能再分发的材料继续保持 private 或 link-only。没有明确授权时，不访问第三方后台，不复制 prompt、知识库、断语或资产。

阶段 D 下一步需要用户另行授权现实专家 intake／私有材料处理，并且至少两位专家分别完成身份、资质、scope、彼此独立性与原创意见核验。两份意见必须并列保存；分歧不得多数表决、平均或由生成模型自动选赢家。

紫微、西洋、吠陀仍需各自独立建立输入事实、规则版本、来源、权利、专家审定、高风险表达和发布证据。八字 v1.7 与本轮 C／D 机械子件不得外推为其他体系的内容权威或产品化完成。
