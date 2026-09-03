# 阶段 F：西洋来源与 Manifest 身份漂移追加记账（2026-09-01）

## 结论

本阶段继续推进西洋占星独立体系，但不重签历史来源 requirements 或历史 domain manifest。当前机械故障已经收窄为两条必须分账的身份漂移：

1. `packages/western-astrology-contracts-draft/src/index.ts` 拆出 `civil-input.ts` 后，formal source v1 的 live basis 不再匹配，导致 v1.1／v1.2 私有品牌链以 `LEDGER_MISMATCH` 失败关闭；同一个 `index.ts` 旧绑定还扇出到历史 Manifest 的五个 component digest。
2. `packages/western-astrology-rules-preview-draft/src/browser-app/main.ts` 独立变化，导致历史 Manifest 的 `report_contract` 漂移。

这两个根没有被解释为六次独立领域语义变化。按旧 definition 重算的 counterfactual 摘要只用于记录漂移，不会持久化为 current manifest，也不会冒充包含新 `civil-input.ts`、当前高风险 policy 或完整规则预览 source graph 的工程闭包。

当前西洋账仍为：

- admission gate：`0/8`；
- source binding：`0/28`；
- 现实独立专家：`0/2`；
- `activeAdmissionEffect = none`；
- `releaseReady = false`；
- `publicDeploymentAuthorized = false`；
- `publicReleaseAuthorized = false`；
- `expertClaimsAuthorized = false`。

## 来源 requirements 三代历史身份

| 工件 | raw bytes | raw SHA-256 | semantic digest | 当前含义 |
| --- | ---: | --- | --- | --- |
| `western-source-binding-requirements.v1.json` | 25909 | `3f22c78279022a70d3a3a21e5a80a33b321a99793c033eb0a72c5171628107c9` | `2bb52306841098ee5e83906bffda400ad07efd706c7c294ee4d07115854849bd` | formal designated historical requirements；live basis stale |
| `western-source-binding-requirements.v1.1.0.json` | 34338 | `7f50fd5a7fd09647d1a91fc1c663e30acc56828962b98624aeeb73e985dba0fc` | `254fbc561d3a82a4b9dfaf969b472de7dfcbb9543299b4f69cc9a9944e6994db` | nonformal successor；零 active effect |
| `western-source-binding-requirements.v1.2.0.json` | 40667 | `e9894ce51541d284a58aa59b1d175a121746dbd1d6521b16a700cf64c05c63c1` | `91708bf49785148eede41872717104949fa9725732e661c25a115788a983dd58` | nonformal successor；raw/self 完整，但不能取得 current private brand |

formal v1 旧 basis 中只有 contract barrel：

- historical `index.ts`：41394 bytes，SHA-256 `3568cbe0568382354ed59c6bb9bacd0cf4c4d3c52490c1a80a614f2e9db60515`；
- current `index.ts`：39756 bytes，SHA-256 `87bf4fcecc7ec85542eed25c7c06869ba3a084c5e7d7fb305fcd7712ef508416`；
- current `civil-input.ts`：2910 bytes，SHA-256 `e1e9cfa1f8f800e5c1ef61b7fdd134fcf0276664411c0691d64ccba21ed81458`；
- current focused `index.test.ts`：18738 bytes，SHA-256 `ff029f322cc3243a40ad174cbc0e96a23b40d7a5603a21d711cbb79f32eba2d0`。

说明文档与 Astronomy Engine adapter `index.ts` 两个 formal source basis endpoint 保持原字节。按旧 formal v1 definition、保留原 `createdAt` 的 counterfactual current digest 为：

`7ddaf8afc40bb6d3bddc0161e115ec2237b1a91305e885de32e49eb362d5cc44`

该摘要没有被写回 formal v1，也没有 rebind、re-sign 或 owner admission。

## 历史 Western Manifest 的两个漂移根

历史 Manifest：

- path：`content/domain-release/western-astrology.engineering-draft.v0.1.0.json`；
- raw bytes：10832；
- raw SHA-256：`c138220098346a3ff9857c1e8034914205277bdbe8cf5563e80b58687745a398`；
- persisted manifest digest：`5c44fce96357ed80c4274f1f225151764ffe5998956e7e823764499ee45f993e`；
- old-definition counterfactual digest：`8dd95748538886284b2cde1413c963fb1e21606f431732492def2be338df7702`。

当前 loader 以 `MANIFEST_MISMATCH` 失败关闭。旧 `western-independent-productization` v1.0 observation 也因相同两个 endpoint 漂移以 `ARTIFACT_DRIFT` 失败关闭；历史 JSON 均保持原样。

### Contract split fan-out

| component | persisted digest | old-definition counterfactual digest |
| --- | --- | --- |
| `execution_rules` | `b3eaf0b9f5d91d182a1cc9aad185b708388a1eee04c53e9a6766de80d0cf7748` | `f45e5e0fbc9c57c933f67bbf987dfed9d8a51cfab05fc8da35121b0948c3a7cf` |
| `interpretation_rules` | `76e3929b057a129601ed88e150392c373ad1ffab4217e9453f1faeb25994af7c` | `283a5e5f29ed05969a476e39dbb1cb77083ea146fdd1bfc9428b85cc487f73da` |
| `input_policy` | `3d010ea228360407c76b6332dad72c881d7065109ad7d3e9fac75a17fedc22a3` | `ec586d5ea27d37f585fa4d960235780a89155728ddc216bb6c5b9633f1e2add7` |
| `fact_contract` | `3e1b629cf778b404353ebf244c19315746748b902c11f5ebd83953fce993a989` | `6f3508a856cbfb8477c74cbf9b5d0ed9b5590d6c4267df0f0c4d938b4b225e95` |
| `high_risk_policy` | `fb7f66e7398ec80301f449507a00683ed1f61acdd49746431ce91b22be0eb936` | `390cfffb571580988ae07a4ef657e569a80c4538afc86b8fcaba73767d538a29` |

五个 digest 的唯一旧 definition hash 漂移源都是同一个 contract `index.ts`。新 `civil-input.ts` 没有出现在旧 Manifest definition 中，所以 counterfactual 摘要不能证明 split contract closure 完整。

### 独立 report drift

- historical rules-preview `main.ts`：72690 bytes，SHA-256 `27284f9817d6b8414402b8fbedbcb06e49aab738115c084a55a6c0100357ea7e`；
- current `main.ts`：78206 bytes，SHA-256 `37d85c18a7895e5f75d3e1fc6fa8435b2f5c10376d5b2e6296bd5801fd59a61b`；
- `report_contract` persisted digest：`de813d916c6b9f558f0039fa91079282ae380ebe911e6072738271d7797a9dd7`；
- old-definition counterfactual digest：`911b173f3396f11d38ce77ae3004ee331ccdc5c1b1068d99bd861cefe2c042eb`。

`source_bundle`、`rights_bundle`、`expert_review_bundle` 三个旧 component digest 未漂移。当前 high-risk candidate 虽已绑定新的 egress policy 与 `main.ts`，但仍为 `formalHighRiskPolicyBound=false`、`semanticSafetyEstablished=false`、`browserRuntimeEvidenceEstablished=false`，不能反向为历史 Manifest 续证。

## 追加漂移收据

本阶段新增 candidate-only、append-only 的 Western source + Manifest identity drift receipt：

- path：`content/system-admission/western-source-and-manifest-identity-drift-receipt-candidate.v1.0.0.json`；
- candidateId：`hakimi.western.source-and-manifest-identity-drift-receipt-candidate/1.0.0`；
- raw bytes：12537；
- raw SHA-256：`09feb585528a6d390afda19a10d967ff2356714cbb00d4eef3462fe267d01c26`；
- receipt digest：`f422b6b1bd61e97631b5ce5719877d0e17525b18cdfd7cc7d1c3257e85884097`；
- `activeAdmissionEffect = none`。

实现：

- `scripts/western-source-and-manifest-identity-drift-receipt-candidate-lib.mjs`；
- `scripts/verify-western-source-and-manifest-identity-drift-receipt-candidate.mjs`；
- `scripts/verify-western-source-and-manifest-identity-drift-receipt-candidate.test.mjs`。

收据必须同时冻结：

- formal source v1、nonformal v1.1／v1.2 的 raw 与 semantic identity；
- formal Manifest 的 raw 与 semantic identity；
- current contract split 与 rules-preview `main.ts` 的直接 endpoint identity；
- `LEDGER_MISMATCH`、`MANIFEST_MISMATCH`、`ARTIFACT_DRIFT`；
- 五 component fan-out 与一个独立 report drift；
- `civil-input.ts` 和当前 high-risk scope 没有完整进入旧 definition；
- `uniqueBlockerClaimed = false`；
- counterfactual digests 均 `persisted = false`；
- 所有内容、专家、权利、准入、运行时、发布和公开授权字段为 false。

## 四体系 current-status v2.3 successor

本阶段新增 v2.3 child，但没有覆盖 v2.2 或中央 registry：

- path：`content/system-admission/four-system-current-status-observation-child.v2.3.0.json`；
- childId：`hakimi.system-admission/four-system-current-status-observation-child/2.3.0`；
- raw bytes：17398；
- raw SHA-256：`7f6a12f52cf035c2138c17c6f58855db03ba686c7c71ebf2221021461387f1b7`；
- childDigest：`ea16c7ae69271c2a4ea5902e4ec8b9ff6df224c5d58433b07a56004a2c46e2de`；
- `activeAdmissionEffect = none`；
- `persistedAsCentralRegistry = false`。

实现：

- `scripts/four-system-current-status-observation-child-v2-3-lib.mjs`；
- `scripts/verify-four-system-current-status-observation-child-v2-3.mjs`；
- `scripts/verify-four-system-current-status-observation-child-v2-3.test.mjs`。

v2.3 只把新的 Western receipt 追加为 current Western endpoint；八字、紫微和吠陀的当前分账、四体系 `0/32` admission gates 和跨体系禁止项保持不变。其直接依赖只有被私有品牌验证的 v2.2 parent 与 Western receipt，固定 raw identity 2 个、upstream private brand 2 个。v2.2 loader 会递归复核其既有上游；v2.3 没有调用 stale v2.1 loader。

Western 在 v2.3 中仍必须显示：

- current endpoint mechanically verified；
- current full domain manifest = false；
- current engineering manifest = false；
- browser runtime evidence = `not_assessed_by_this_child`；
- binding = `0/28`；
- experts = `0/2`；
- formal admission = false。

## 机械验证

本阶段定向结果：

- Western receipt：1 file / 13 tests，通过；CLI exit 0；
- four-system v2.3：1 file / 18 tests，通过；CLI exit 0；
- Western contracts、Astronomy Engine adapter、strict receipt、规则层、差分、cross-system projection、rules preview 内容／审稿／高风险出口：12 Vitest files / 118 tests，通过；
- Western v1.1 observation、current high-risk candidate、civil-time browser observation：3 Node test files / 36 tests，通过；
- 合计：17 test files / 185 tests，通过；
- scoped strict TypeScript：5/5 配置通过，包括 contracts、Astronomy Engine adapter Node／browser parity、rules preview Node／browser app；
- 两组新增脚本共 6 个 `.mjs` 语法检查通过。

当前陈旧链路复核：

- source requirements v1.2 CLI：非零，`LEDGER_MISMATCH`；
- Western productization v1.0 CLI：非零，`ARTIFACT_DRIFT`；
- formal Western Manifest loader：非零，`MANIFEST_MISMATCH`；
- v1.1 observation、current high-risk candidate、civil-time browser observation 和 v2.3 CLI：均 exit 0，但各自只证明其明示的窄机械范围。

新 receipt 与 v2.3 的 passive canonical capture、dense own-index array construction、固定 raw/self digest、当前端点逐项 stable read、exact projection、deep freeze 与 private WeakSet brand 顺序均有攻击测试。测试覆盖 authority／counterfactual／fan-out／lineage／registry／browser／manifest／epoch 的重摘要提权、accessor、proxy、alias、cycle、own `__proto__`、Array 数字索引 setter、global `String`、global `Promise`、私有品牌 clone、CLI operand／visible preload 与 import 时 exit-code 保留。

独立 P1/P2 审计未发现新问题。额外探针覆盖 Hash prototype、同步替换 `createHash`、`Object.prototype.toJSON`、Array iterator／numeric setter，以及取得两个真实上游品牌后同时污染 JSON／Object／WeakSet／Buffer／String／Promise／Array；结果要么保持精确摘要，要么在 raw／materialization／directory-chain 边界失败关闭，没有取得假品牌或 authority 提升。

存在一个被显式保留的祖先运行时限制：v2.3 自身不使用 `Promise.all`，并能在取得两个真实上游品牌后抵抗 global `Promise` 替换；但从 v2.3 入口开始的完整递归链仍会进入既有 Bazi receipt loader 的 live `Promise.all`。替换 global `Promise` 时该祖先链会失败关闭，而不是产生假品牌；本阶段没有越界修改祖先，也没有声称整条递归链已经具备 primordial 隔离。

任何通过只代表当前源码和固定工件的机械一致性，不代表：

- UT1／UTC、闰秒、EOP、ICRF、目标中心或 JPL 官方字节已经闭环；
- 西洋占星内容或规则获得科学、领域或专家真值；
- 28 条 binding、作品／版本／载体三层权利或再分发授权已经成立；
- 现实专家身份、资质、scope fit、独立性或两份原始意见已经取得；
- 当前规则预览拥有 same-artifact Chrome／Edge 浏览器证据；
- 完整应用、PWA／Service Worker、公开主机、Release Evidence、部署、回滚或公开发布已准备。

## 固定治理与未完成事项

项目默认治理继续固定：

- `legacy-v13`；
- `targetSchema = 13`；
- `migrationId = null`；
- mutation epoch boundary required；
- `mutationEpochAvailableForSchema13 = false`；
- `mutationEpochReceipt = null`；
- `crossFileAtomicSnapshot = false`；
- `intervalMutationExcludedAcrossFiles = false`；
- `abaExcluded = false`。

西洋体系自身仍为独立产品边界：`releaseIdentity = null`、`targetSchema = null`、`migrationId = null`，不继承八字权威。

后续应按独立阶段继续：

1. 先定义包含 split civil input、当前 high-risk egress、rules preview 与 civil-time browser scope 的新工程 manifest closure；未经 owner acceptance 不重签。
2. 为当前 4219 规则预览建立同一输出树、当前 source graph 的 Chrome／Edge append-only browser child；历史 README 或旧 8/8 不能代替。
3. 逐条完成 28 个西洋 binding 的可靠来源、正文、最小充分 exact quote、locator 和三层权利。
4. 取得至少两名现实、独立、scope-fit 的西洋占星专家原始意见；分歧并列保存，不多数表决、不平均、不由模型选赢家。
5. 完整闭环 strict receipt 尚缺的 UT1／UTC、闰秒、EOP、target center、ICRF、许可、官方 JPL bytes 和现实复核。

## 本阶段未做

- 未读取或修改 `apps/web/src/lib/local-user-data-cleanup.ts`；
- 未运行全仓 typecheck 或默认 Web build；
- 未覆盖、重签、删除、清理、暂存或提交历史 artifact；
- 未执行 Git 操作；
- 未访问第三方后台，未复制第三方 prompt、知识库、断语或资产；
- 未联系现实专家，未取得私人身份材料或原始意见；
- 未作权利或法律结论；
- 未执行当前 4219 规则预览浏览器重跑、完整应用、PWA／Service Worker、公开主机、部署或回滚验证。

截至本阶段：`releaseReady=false`、`publicDeploymentAuthorized=false`、`publicReleaseAuthorized=false`、`expertClaimsAuthorized=false`。
