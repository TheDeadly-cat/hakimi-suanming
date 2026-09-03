# 阶段 C/E：吠陀 IANA tzdb 2026c 机械子件与 v1.1 后继候选验证

日期：2026-08-31  
性质：吠陀体系专属、非正式、零生效的机械验证账

## 结论

本轮完成了两个新冻结件：一个只保存 Vedic 操作员来源观察与本地载体证据的 child，以及一个把该 child 仅投影到两个 subject 的 nonformal v1.1 successor。两者都保持 `0/38` binding、零完整 subject、零 formal exact quote、零权利法律结论、零专家审定、零正式集成和零发布授权。

这只是工程与证据结构的机械通过，不是正式输入实现、canonical IANA/DST 语义、内容真值、专家真值、权利结论、发布就绪或公开发布授权。

## 冻结身份

### Vedic source-rights child

- path：`content/system-admission/vedic-tzdb-2026c-source-rights-evidence.v1.json`
- evidence ID：`hakimi.vedic.source-rights/iana-tzdb-2026c-moment-timezone-0.6.3/1.0.0`
- raw bytes：`20505`
- raw SHA-256：`baa55f5e21f3a91075048c85e5b2a880f0d0e6c62e611a881e7d636b10db58fa`
- evidenceDigest：`9be3d2631d1bcee5ccea174b55884f4f7f5655fed69ecd2adc94ca31cefb1bc0`

### Nonformal Vedic v1.1 successor

- path：`content/system-admission/vedic-source-binding-and-three-layer-rights-requirements.v1.1.0.json`
- ledger ID：`hakimi.vedic.source-binding-and-three-layer-rights-requirements/1.1.0`
- raw bytes：`94582`
- raw SHA-256：`9356740cfd960a3137493928978d43d25be432f1bae719dde7ea95c66338c2bd`
- ledgerDigest：`afd65de96a850c1632e8c00b03b6be2ff05a2f8b1dd0a19fbe27d4376ac2bb6b`
- status：`requirements_plus_two_partial_candidates_36_canonical_exact_no_bindings_frozen_nonformal_zero_active_effect`

## Formal predecessor 与上下文保持不动

successor 没有替换 formal v1；formal predecessor 继续是：

- path：`content/system-admission/vedic-source-binding-and-three-layer-rights-requirements.v1.json`
- raw：`85752` bytes / `2eed084660dbfa9de5c655e40d96c9bb848743f8f14091e8fb3564f2d60385b9`
- ledgerDigest：`b98699c70e9783ef670c6acfbb0410e0ff89eca51db54dd4b36b44e60d33194e`

产品父件、v1.1 历史版本子件、v1.2 当前版本子件、current registry v2 与 legacy registry 均保持原始 byte/digest 身份；六个 context 对新 child ID/path 与 successor ID/path 的 backlink 检查均为零。没有修改 formal parent、version child、registry、manifest 或 package scripts。

## 38-subject 差分

- canonical-exact：36
- partial candidate：2
- unexpected change：0
- `vedic.input.dst_gap_overlap_resolution`：canonical-exact

唯二变化 subject：

1. `vedic.input.iana_time_zone_and_tzdb_identity`
2. `vedic.rule.rights_license_and_redistribution_review`

这两个 target 的 formal `sourceBodyDigest`、exact quote、locator、三层权利、专家、freeze 与 full-satisfaction 字段仍是 `null`、空或 `false`。三个 quote 观察只保存在 candidate evidence 层，`exactQuotesBound=0`。

IANA 2026c archive/version 身份只是 source candidate；它不能建立 `resolution_policy_id`、gap reject 或 overlap choice。system-local civil-time adapter 也只是工程候选，不能替代 source binding 或把 DST subject 改成 partial/verified。

## 私有品牌与失败关闭边界

- child 只有固定 loader 可以通过内部 `WeakSet` 铸造私有品牌；object-only verifier 不铸造品牌。
- successor 只接受真实 loader 产生的 child 品牌；重算 JSON、重签 digest 或构造同形对象均不能冒充。
- Proxy、accessor、alias、cycle、foreign/null prototype、negative zero、own `__proto__`、duplicate key、非 canonical bytes 与 primordial poisoning 均被拒绝或被动失败。
- child/successor writer 使用 exclusive create，不能覆盖冻结件。
- Western source child/successor/controlled-reproduction 的 authority、brand、quote、权利或 transformation provenance 均不继承；所有 cross-system inheritance flags 为 `false`。
- 不声称 mutation epoch、跨文件原子快照、interval integrity 或 ABA exclusion。

## Civil-time adapter 与 lock 分账

适配器草案已迁至：

`isolated-drafts/vedic-civil-time-input-resolution-draft`

它不在根 workspace，也不进入根 `package-lock.json`。根 lock 恢复并保持旧冻结身份：

- `package-lock.json`：`175812` bytes
- SHA-256：`40a02c7c3166f0c9bc03afa9c1d1f342fb7f54efe1abbf7cb3f5cf6ecb482a4d`

child 的 `localArtifactEvidence` 使用这个旧冻结 lock pin。这样不会为了 Vedic 草案改变既有 Western v1.2 证据链，也不会把隔离草案误写成已进入正式 workspace 的产品依赖。

适配器的机械测试即使全部通过，也只证明其局部解析／解析候选契约；不能被写成正式输入实现、canonical IANA/DST、source binding、权利、专家或发布授权。

## 定向验证结果

### 新 child 与 successor

- child tests：默认 `13/13`；`--test-concurrency=1` 串行 `13/13`
- successor tests：默认 `14/14`；`--test-concurrency=1` 串行 `14/14`
- 合计：27 个测试项在默认和串行模式各通过一次
- 两个固定路径 CLI verifier：均 exit 0
- child CLI：`partialCandidatesAttached=2`、`bindings=0/38`、`subjectFullySatisfied=0`、`exactQuotesBound=0`、`rightsLegalConclusionEstablished=false`、`releaseReady=false`、`publicReleaseAuthorized=false`
- successor CLI：`predecessorRemainsFormalCurrent=true`、`successorIsFormalCurrent=false`、`successorActiveEffect=none`、`formalParentIntegrated=false`、`formalRegistryIntegrated=false`、`releaseReady=false`、`publicReleaseAuthorized=false`

### 未改动 Vedic/formal 上下文回归

formal v1、产品父件、两代 version observation 和 current registry v2 的五个相关文件合计 `194/194` 通过。组合中另包含 legacy `verify-system-admission-registry.test.mjs`；默认与串行各为 `195/203`，唯一 8 个失败都在该 legacy registry 文件，并在进入 Vedic 变更比较前先遇到既有 `BaziDomainReleaseManifestError` / `MANIFEST_MISMATCH`。本轮没有修改、重签或绕过八字 manifest／legacy registry，因此该失败单列为跨体系既有 fail-closed 阻塞，不计作 Vedic child/successor 通过，也不由本切片修复。

### 隔离 civil-time adapter

- scoped strict TypeScript：通过。
- adapter 自身：`24/24`。
- `tzdb-core + adapter`：默认与 `--maxWorkers=1 --no-file-parallelism` 各 `38/38`。
- offline lockfile dry-run：exit 0；前后 `package-lock.json` 均为 `175812` bytes / `40a02c7c3166f0c9bc03afa9c1d1f342fb7f54efe1abbf7cb3f5cf6ecb482a4d`。
- 迁移后的第一次双模式测试各为 `37/38`：唯一失败是测试仍读取旧 `packages/vedic-civil-time-input-resolution-draft/package.json` 而得到 `ENOENT`。只修正测试与 README 的目录路径后，strict TypeScript、默认和串行测试全部复验通过；没有以放宽断言换取绿色结果。
- 迁移后独立只读终审为 `P1=0 / P2=0 / P3=0`。

该 adapter 只产生深冻结、私有品牌的 Vedic civil-time resolution candidate，覆盖 exact proleptic-Gregorian minute/second、显式 IANA zone 与 2026c snapshot、unique、gap reject、overlap reject/earlier/later、声明重算、版本／snapshot／range 漂移和 round-trip。完整 13 项输入、正式 acceptance／receipt、runtime 全字节闭包、canonical IANA spelling、DST 真值、UTC time-scale／leap seconds／UT1／TT／TDB／EOP、来源、权利、专家、发布及 mutation epoch／atomicity／interval／ABA 均仍为 false、null 或未建立。

### 扩大回归与既有西洋链保护

- `scripts/verify-vedic-*.test.mjs` 当前 21 个文件在默认模式和 `--test-concurrency=1` 串行模式均 exit 0；这是吠陀脚本范围回归，不是全仓测试。
- 本轮 8 个新增 child／successor 脚本全部通过 `node --check`。
- 既有西洋 source child、v1.1、controlled-reproduction observation 与 v1.2 四文件在 lock 恢复后默认／串行各 `98/98`；四个固定路径 CLI 在最终状态再次全部 exit 0。其冻结 digest 仍分别为 `14361c93e29d257080b25c0f3e580345243930acb07da450f938fbf6f02b8465`、`254fbc561d3a82a4b9dfaf969b472de7dfcbb9543299b4f69cc9a9944e6994db`、`5d3eea3297b7cd024fb53f5a9c9e92d5a396f972d802fede6ced7c58f496b612`、`91708bf49785148eede41872717104949fa9725732e661c25a115788a983dd58`。
- `check:release-governance` exit 0，继续固定 `legacy-v13 / targetSchema 13 / migrationId null`、`publicDeploymentAuthorized=false`、`expertClaimsAuthorized=false`。
- `check:system-contract-draft-boundaries` 仍 exit 1：受限文件明确未检查，另有既有 Western live-audit 动态 import、八字 expert packet 未登记依赖和若干既有动态 import 诊断；本轮新增 Vedic 文件不在失败清单。该红线未被绕过，也不算入本切片通过。

## 未执行与未建立

按任务边界，本轮没有执行全仓 typecheck、默认 Web build、完整应用启动、浏览器、PWA/Service Worker、公开主机、部署或回滚验证。也没有读取或修改受限的 `apps/web/src/lib/local-user-data-cleanup.ts`。

因此本轮没有建立：

- 正式 Vedic 输入、runtime、storage、product identity 或 release identity；
- canonical IANA/DST resolution policy；
- 内容真值、传统权威或两位现实独立专家意见；
- 作品层、版本层、载体层权利结论或再分发授权；
- Release Evidence、发布就绪、部署确认或公开发布授权。
