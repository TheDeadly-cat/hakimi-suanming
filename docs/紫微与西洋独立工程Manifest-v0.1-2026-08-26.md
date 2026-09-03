# 紫微与西洋独立工程 Manifest v0.1

- 日期：2026-08-26
- 紫微 manifest：`content/domain-release/ziwei-doushu.engineering-draft.v0.1.0.json`
- 紫微摘要：`7592c751b5ed321983b2bab7d27e305a307a4295d20627fa78916457c4c45f51`
- 西洋 manifest：`content/domain-release/western-astrology.engineering-draft.v0.1.0.json`
- 西洋摘要：`625cd7717d88ecb4ab7778c685e96ce1b54a25437f641c8f1906d297ca9fa272`
- 两者状态：`draft`
- 两者 `targetSchema`：`null`
- 两者 `publicDeploymentAuthorized`：`false`
- 两者 `expertClaimsAuthorized`：`false`

## 结论

紫微和西洋现在各有自己的机器身份，不再只靠路线图或四体系总表描述。两个 manifest 分别绑定本体系的输入、执行规则、解释工程候选、事实合同、来源研究笔记、权利观察、失败关闭边界和隔离预览文件；任何文件漂移都会使对应 manifest 验证失败。

这不是正式准入。两个体系已有精确的 binding 需求清单，但全部仍是 `required_unbound`；它们仍没有主应用数据 Schema、已冻结来源 binding、完整来源包、产品权利闭包、现实专家包、正式高风险表达政策、独立 Release Evidence 或公开发布授权。

## 为什么不填写 `targetSchema: 13`

`legacy-v13 / targetSchema 13 / migrationId null` 仍是八字主应用的唯一默认发布身份。紫微和西洋均未进入该数据库，不能为了复用现有 manifest Schema 而伪称自己使用 Schema 13。

通用 `SystemDomainReleaseManifest` 因此允许 `targetSchema=null`，但只在以下条件同时满足时接受：

- `releaseStatus=draft`；
- `migrationId=null`；
- `releaseEvidenceComplete=false`；
- `publicDeploymentAuthorized=false`；
- `expertClaimsAuthorized=false`。

任何把无 Schema 体系晋级为 `engineering_candidate` 或更高状态的修改都会失败关闭。这里的 `mutationEpochBoundary=preserved` 表示隔离工作不得绕过已有 mutation epoch/CAS 边界，不表示西洋已拥有持久化系统，也不表示紫微资料库已获生产准入。

## 为什么 `bindingRequired` 现在是 27/28

紫微和西洋已把现有输入、事实、规则、工程复现、解释、高风险表达和权利边界逐条转换为机器可核验的需求 inventory：紫微 27 条，西洋 28 条。两个数字来自固定 subject 列表与依据工件摘要，不是来源完成数，也不是专家确认数。

两个 manifest 因此固定：

- 紫微 `bindingRequired=27`；
- 西洋 `bindingRequired=28`；
- `bindingFrozenVerified=0`；
- `sourceBundleComplete=false`；
- `rightsBundleComplete=false`；
- `expertReviewBundleComplete=false`。

任何把 27/28 改成 0、增减 subject、附加虚构 candidate/正文摘要/exact quote/locator/权利结论/专家意见或把冻结数改成正数的操作都会失败关闭。通用合同仍只在严格 draft/no-authorization 条件下允许其他尚未建账的体系使用 `bindingRequired=null`；这不再是紫微或西洋当前状态。

## 组件状态

| 组件 | 紫微 | 西洋 | 状态含义 |
|---|---|---|---|
| `execution_rules` | bound | bound | 只绑定当前隔离引擎、配置与锁文件的工程身份 |
| `interpretation_rules` | bound | bound | 只绑定当前解释/几何规则代码，不证明传统或专家真值 |
| `input_policy` | bound | bound | 输入合同具有文件身份，尚未获正式产品准入 |
| `fact_contract` | bound | bound | 事实结构和适配器工件可定位，不证明领域正确性 |
| `source_bundle` | incomplete | incomplete | 已绑定精确需求清单及其 verifier，但分别为 0/27、0/28，没有正式冻结来源包 |
| `rights_bundle` | incomplete | incomplete | 依赖与许可观察不等于产品分发或法律许可结论 |
| `expert_review_bundle` | absent | absent | 现实独立专家意见均为 0/2 |
| `high_risk_policy` | incomplete | incomplete | 当前只有草案阻断边界，没有体系独立正式政策 |
| `report_contract` | incomplete | incomplete | 隔离预览不是正式报告合同或发布入口 |

`bound` 只表示 manifest 绑定了工程文件与摘要。内容真值、专家真值、权利法律结论、浏览器/运行时证据、发布就绪和公开发布授权仍分别记为未建立。

## 权威不继承

负向门明确拒绝：

- 把任一体系的 `releaseIdentity` 改为 `legacy-v13`；
- 给紫微或西洋填写 `targetSchema=13` 冒充主应用集成；
- 从八字继承内容真值或专家主张；
- 把精确 binding 总量改写为 0、其他数字或删减 subject；
- 在 requirements ledger 中伪造来源 candidate、正文摘要、exact quote、定位、权利结论、冻结 binding 或专家意见；
- 把来源、权利、专家或发布证据改为完成；
- 将 `draft` 晋级为工程候选、发布候选或 released；
- 修改组件 hash 后只重写表面字段。

## 治理接入

- `scripts/independent-source-binding-requirements-lib.mjs` 从固定依据工件重建 27/28 条精确需求与失败关闭账。
- `scripts/verify-independent-source-binding-requirements.mjs` 同时验证两个 requirements ledger；负向测试拒绝伪造来源、引文、权利、专家和授权。
- `scripts/independent-domain-release-manifest-lib.mjs` 从固定工作区文件重建两个 manifest 的组件与总摘要，并把对应 requirements ledger 纳入 `source_bundle`。
- `scripts/verify-independent-domain-release-manifests.mjs` 同时验证两个体系。
- `scripts/verify-independent-domain-release-manifests.test.mjs` 覆盖闭包、无 Schema 边界、精确 binding 总量、权威继承和组件晋级。
- 根 `prebuild`、`pretest`、`pretypecheck` 与 Quick CI 的 `toolchain-and-boundaries` 都先验证 requirements ledgers，再验证两个独立 manifest 和四体系 registry。
- 四体系 registry 直接绑定两个 manifest 文件，同时仍保留对关键隔离草案和研究笔记的 hash。

## 本阶段验证

在不读取或修改受限 `apps/web/src/lib/local-user-data-cleanup.ts`、不执行 Git 操作的前提下：

- requirements verifier：紫微 27/27、西洋 28/28，冻结数均为 0；
- requirements tests：6/6；
- 独立 manifests verifier：2/2；
- 独立 manifests tests：5/5；
- 四体系 registry tests：9/9；
- 八字 domain manifest tests：3/3；
- release governance tests：91/91。

本次来源 inventory 与治理接线完整定向回归为 8 个 Node test files / 141 tests，加上 contracts 与 knowledge-core 2 个 Vitest files / 110 tests，共 251 tests，全部通过。Vitest 仅报告既有 Vite `esbuild`/`oxc` 配置弃用 warning。此前 234 个定向测试是先前阶段证据，不再冒充为本次结果。

本阶段没有执行全仓 typecheck、默认 Web build、真实浏览器、PWA/Service Worker、公开主机、部署或回滚。历史紫微/西洋浏览器结果没有进入两个 manifest 的 `browserRuntimeEvidence`，该字段仍为 `not_assessed_in_domain_manifest`。

八字 v1.7 frozen golden 仍为 `aba357d98a99271cc9a9b2727ad1c7c516424c94b7cf34f765cb38b0e9a74b29`。后续 CADAL 同版第二载体候选、多载体权利账、批量在线审计器与七条工程 Binding 候选包使八字 manifest 在本批次点时级联为 `5492057fc9fe189b91fa8614c5380b3f45ec7d4d0ef930c6212bea3e68c4822e`；这不表示八字工程理由已冻结、内容、专家、权利或发布状态晋级，也不改变紫微或西洋各自的独立 manifest。本批次点时专家候选包摘要为 `f7b1025e0262ec2c4fce5c22702eb14ab3a6ad425ee8346f7539c79886053e10`，现实意见仍为 0/2；当前摘要以八字机器身份与专家候选包状态文档为准。
