# 阶段 C：生产 Bundled Knowledge Manifest 共享契约 v0.2（2026-08-31）

## 本轮结论

本轮只关闭首份真实 Stage C 材料进入 Web 随包正文前的一处生产接口裂缝，不创建材料实例，也不提升任何来源、权利、专家或发布计数。

此前隔离候选包只调用通用 `validateBundledKnowledgeRelease`，测试夹具使用 `knowledge/bazi/...`；真正 Web build consumer 另要求 `documents/`、Markdown／TXT，并在随后盘点磁盘库存、稳定读取正文和重算 content hash。两者的路径集合并不相同。

当前新增共享纯函数 `validateBundledKnowledgeManifestRelease`：

- 只接受 `.md / .markdown / .txt`；
- 首段必须精确为 `documents`；
- 拒绝空段、`.`、`..`、重复 `/` 与非规范相对路径；
- 继续委托既有 `validateBundledKnowledgeRelease` 执行安全相对路径、document identity、作品层／版本层／载体层、public-repo storage 与双复核结构门；
- 不宣称验证 manifest envelope、磁盘库存、正文 bytes 或实际 content hash。

Web build audit 与 Stage C 候选现在调用同一个 entry-metadata gate。Web 既有的严格 JSON envelope、精确库存、普通文件／目录链、held-handle 稳定读取、UTF-8、字节上限与实际正文 hash 校验全部保留，没有被共享函数替代。

## Stage C 候选 v0.2

隔离包 `packages/bazi-stage-c-material-admission-candidate` 的候选 schema 与自有摘要域升为 `0.2.0`，测试 bundle path 改为 `documents/bazi/smt-v5-r2706483.md`。输出将两类证据明确分账：

- `bundledKnowledgeManifestEntryMetadataContractValidated=true`：仅表示这一个 entry 的路径／格式与三层结构元数据通过共享纯门；
- `productionBodyInventoryAndBytesAudited=false`：该隔离包没有读取生产目录，也没有建立正文库存或稳定 bytes 证据。

以下红门没有变化：

- `bindingCitationLocatorLinked=false`；
- `externalTuplePinVerified=false`；
- `mutationEpochCapabilityAvailable=false`；
- `crossFileAtomicSnapshot=false`；
- `intervalMutationExcluded=false`；
- `abaExcluded=false`；
- `structuralGatePassed=false`；
- `admissionAuthorized=false`；
- `bindingFrozen=false`；
- `rightsLegalConclusionEstablished=false`；
- `contentTruthEstablished=false`；
- `expertTruthEstablished=false`；
- `releaseReady=false`；
- `publicReleaseAuthorized=false`。

拒绝码继续是 `BINDING_CITATION_LOCATOR_LINK_UNAVAILABLE`，blocking reasons 继续同时保留 locator link、external tuple pin 和 mutation epoch 三项。fixture 中的 reviewerId 与权利结论只测试 schema 结构，不是现实自然人、许可或法律证据。

## 文件身份

| 文件 | bytes | SHA-256 |
|---|---:|---|
| `packages/knowledge-core/src/index.ts` | 41,040 | `85e86d6e28fbaee112a21daa4288be0c613b93d22138a5448a8f78bd33b20837` |
| `packages/knowledge-core/src/index.test.ts` | 26,975 | `452c6ede4f2251131202a5963544994401c7dcb2556cf59171dc996e0e12d7bf` |
| `apps/web/bundled-knowledge-audit.ts` | 12,271 | `d7d35bbfe5dfa50674f2d51667ea0c970cdb7e57082ac0d2fdca90e4888fb3c1` |
| `apps/web/src/bundled-knowledge-audit.test.ts` | 15,156 | `d075b0b59cfa674340c6ab4710d01dc82b6b04880c3c934174865149a02d34db` |
| `packages/bazi-stage-c-material-admission-candidate/src/index.ts` | 28,529 | `2c2d3635530d8ec57ba7e6af838c868c7d0cc7cf9ed4c8fbd12436b76648c229` |
| `packages/bazi-stage-c-material-admission-candidate/src/index.test.ts` | 20,393 | `31a7072dd50d44ba08e36f3fba7436bdacabae2c0c57472aa944663ec84e07e9` |

这些逐文件身份不是跨文件原子快照，也没有 mutation epoch／interval／ABA 证明。

## 定向验证

- 三个 Vitest 文件默认并发：`47/47`；
- 同三文件单 worker、禁文件并发：`47/47`；
- Stage C 独立 strict TypeScript：exit 0；
- Web audit + knowledge-core 临时只读 TypeScript 切片：exit 0，临时 tsconfig 已删除；
- `check:release-governance`：exit 0，继续为 `legacy-v13 / targetSchema 13 / migrationId null`，两项公开授权为 false；
- `check:system-contract-draft-boundaries`：exit 1，只列受限文件未检查与既有动态导入／未登记依赖诊断；本轮 C 文件无新增诊断；
- `package-lock.json`：`175,812 bytes / 40a02c7c3166f0c9bc03afa9c1d1f342fb7f54efe1abbf7cb3f5cf6ecb482a4d`，未改变。

红队先后发现并关闭：重复 `/` 与 `.` 段的 P2、`.txt` 点文件格式推断错位、KnowledgeDocument format 与 bundle extension 未绑定、locale 与 code-unit 排序不一致，以及两个不能辨识旧 bug 的 P3 测试。最终运行时 P0/P1/P2 为 0；强化后的 5,000-heading text 正例与 `a-.md / a_.md` 多文件顺序正例能够区分旧实现。历史 v0.1 文档不改写，本文件作为 v0.2 后继说明。

## 后继身份漂移分账

本轮对 `packages/knowledge-core/src/index.ts` 的真实生产修改使旧 readiness／manifest 的完整私有品牌链按设计失败关闭：

- `verify-bazi-smt-v10-version-aware-binding-readiness.mjs`：exit 1；
- `verify-bazi-domain-release-manifest-v2.mjs`：`BOUND_READINESS_BASIS_DRIFT / exit 1`；
- `verify-bazi-domain-release-manifest-v2-1.mjs`：`VERIFICATION_FAILED / exit 1`，其根因同为旧 readiness basis 漂移。

因此 v1.8、Bazi Manifest v2 与 v2.1 从此只能称历史固定快照，不能继续称当前完整品牌。它们的原件与 loader 均未改写。v2.1 JSON 自列文件仍可内部匹配，不足以替代已断开的递归父品牌链。

下一机械后继必须 append-only：先建立 readiness v1.9，将 v1.8 与 source／rights／DTT／SMT／carrier 只记为 fixed raw+semantic historical observations、全部 `brandCurrent=false`，只重绑当前 knowledge-core identity；再派生 Bazi Manifest v2.2，把当前 knowledge-core 与 Web audit 纳入 rights bundle，并明确 `predecessorCurrent=false`。在这些后继完成前，本项目没有可诚实称为 current 的八字 v1.7 完整机器 Manifest。该漂移不改变 Binding、专家、权利或公开授权计数。

## 未完成与下一真实输入

生产 `content/knowledge/manifest.v2.json` 仍为空，正式 `KnowledgeDocument / SourceRightsRecord / SourceCarrierRecord / materialization` 仍为 `0/0/0/0`，Binding 仍为 `0/12`，现实专家仍为 `0/2`。

下一份非 synthetic 的 C 证据不能由代码自行生成。最小真实路径是现有 `binding:smt-v10:whole-chart` 对应的 `strength.yueling_exact_quote / smt-v10-yueling-minimal-v1`：用户需在工作区外提供合法持有的 revision `761703` 原始 UTF-8 body，并明确授权只做本机私有导入与 exact-quote 验证，禁止仓库存储、再分发与公开发布。届时仍只能创建 `user_knowledge_document` 与 `user_import / user_unverified / local_private_only` 权利记录；不得据此创建 verified Citation、SourceCarrier、materialization 或 frozen Binding。

Stage D 在未获得现实专家外联和个人信息处理授权前停止：不得联系、收集、持久化、刷新或伪造 consent、身份／资质、独立性、原始意见或 seal。其他体系的后续工程链仍必须独立于八字准入。

## 2026-09-01 append-only 后继落实附记

上一节“v1.9／v2.2 尚未完成”保留为 2026-08-31 点时记录；当前机械后继已经按原边界落盘：

- `bazi-binding-freeze-requirements.v1.9.0.json`：`45,551 bytes / e20145b5f34b5dc04464e482cda5da990f82e520236679efbf568b322637f797`，ledger digest `42930e63cb0960df969f5fe059617eb96a8ec9bd857c486cd4b33a28d37a8ae1`；只重绑当前 knowledge-core，十二条 Binding 行零改动，全部旧上游为无当前品牌的历史观察；
- `bazi.single-chart-report.v1.7.0.manifest.v2.2.0.json`：`23,399 bytes / 6481d5edfa9f9819af035ad9d208ea526fa7b29f12ccd6e072ad31f625e7f86d`，manifest digest `a95e722674c0b09a2d564b4090396fbfc25fdfc2f5f2fff9aedc92aa2468f68e`；唯一 current private brand 为 v1.9，v2.1／carrier／privacy 为 3 份 historical raw+self-digest context，其余 8 个组件保持 v2.1 exact；
- knowledge-core 与 Web audit 已进入 rights bundle 的当前文件身份，但 `productionWebConsumerClosureEstablished / productionWebCallSitePinned / productionBodyInventoryAndBytesAudited / currentBuildGateExecuted` 仍全部为 false；`apps/web/vite.config.ts` 与 Stage C candidate 均未进入 active component surface。

v1.9、v2.2 及联合测试在默认／串行模式分别为 `32/32`、`25/25`、`57/57`；独立终审最终无剩余 P0–P3。治理仍为 `legacy-v13 / targetSchema 13 / migrationId null`，正式四类记录 `0/0/0/0`、Binding `0/12`、专家 `0/2`，全部内容／专家／权利／发布与公开授权门为 false。逐文件 held-handle 只证明端点 raw identity，不证明跨文件原子、mutation epoch、interval mutation、ABA 或 replay exclusion。

因此 v2.2 可以称为当前机器身份 Manifest，但不能称为内容权威、许可结论、专家审定、发布就绪或公开发布授权。真实 C 输入与 D 阶段真人授权要求仍按“未完成与下一真实输入”执行。
