# 阶段 C：吠陀 tzdb-core 三节点 LICENSE 载体观察与 v1.2 后继（2026-09-01）

## 1. 本轮真实结论

本轮只完成一项 append-only、authority-free 的 Stage C 工程进展：对当前 `@hakimi/tzdb-core@0.1.0` 在本机 `package-lock.json` 中可达的三个第三方节点，逐一固定安装包 manifest、LICENSE 载体、lock edge、`THIRD_PARTY_NOTICES.md` 条目，并固定两个 Moment-Timezone packed data carrier。

三个节点是：

1. `moment-timezone@0.6.3`；
2. alias `moment-timezone-2025b -> moment-timezone@0.5.48`；
3. 两者共享的 transitive `moment@2.30.1`。

这证明的是“当前本机选定依赖闭包的载体身份和声明字段被机械观察”，不证明 npm publisher tarball byte equality、包或许可真实性、许可适用性、作品层/版本层/载体层权利、notice 义务履行、法律结论或再分发授权。

本轮没有网络访问、第三方后台访问、账户访问、个人数据处理或远端 source body 持久化。三个 LICENSE 正文没有复制进新 JSON；只保存路径、字节数、SHA-256 和声明字段。

## 2. 正式当前线没有改变

正式 current 仍是 [vedic-source-binding-and-three-layer-rights-requirements.v1.json](../content/system-admission/vedic-source-binding-and-three-layer-rights-requirements.v1.json)：

- raw：85,752 bytes；
- SHA-256：`2eed084660dbfa9de5c655e40d96c9bb848743f8f14091e8fb3564f2d60385b9`；
- 38 subjects：input 13、fact 12、rule 13；
- candidate、source body、formal exact locator、formal exact quote、frozen binding、work/version/carrier rights、expert-reviewed subject 全为 0；
- frozen binding：`0/38`。

既有非正式 [v1.1 successor](../content/system-admission/vedic-source-binding-and-three-layer-rights-requirements.v1.1.0.json) 也没有改变：

- raw：94,582 bytes；
- SHA-256：`9356740cfd960a3137493928978d43d25be432f1bae719dde7ea95c66338c2bd`；
- 36 `required_unbound` + 2 `candidate_only_unbound`；
- 仍只有两个既有 IANA/Moment-Timezone candidates；
- `successorIsFormalCurrent=false`；
- `successorActiveEffect=none`；
- frozen binding 仍为 `0/38`。

## 3. 新 carrier observation child

主件：[vedic-tzdb-core-dependency-license-carrier-observation-child.v1.json](../content/system-admission/vedic-tzdb-core-dependency-license-carrier-observation-child.v1.json)

- child ID：`hakimi.vedic.tzdb-core-dependency-license-carrier-observation-child/1.0.0`；
- raw：12,983 bytes；
- raw SHA-256：`3320d773aaf6687af773d8d8a98cbc01cee1f0b83831120069e002caef766884`；
- child digest：`37800051745eeff337134962eb2518c9149eab14cf8369d559419ea76cdca4d0`；
- status：`three_node_local_manifest_license_and_two_packed_carriers_observed_unbound_no_legal_conclusion`。

### 3.1 三节点、六个 manifest/LICENSE endpoint

| 节点 | package manifest | LICENSE carrier |
| --- | --- | --- |
| `moment-timezone@0.6.3` | 1,076 bytes / `131fc5c4b7ad0c5ebcc00b5670c49ef54c2cf0cd26f68670bee10bfd66276a2b` | 1,097 bytes / `b3a550795f41cdccdb5eb2523505ce54dc4a7a3e0d3a6d457d297591341795e7` |
| alias `moment-timezone-2025b -> moment-timezone@0.5.48` | 1,077 bytes / `4b5a6218fe37ea04bbe19f463fc2477e141bfb8ee18506bd99e871a0d25c3dad` | 1,097 bytes / `b3a550795f41cdccdb5eb2523505ce54dc4a7a3e0d3a6d457d297591341795e7` |
| `moment@2.30.1` | 3,556 bytes / `5e2f0870f4d1bbef11e8bf90babd72a4399b86b19da81de796a58457a37b8e13` | 1,075 bytes / `8f38f320bbf5eb84c08e08676f7ee1d2204ebe5797f6a090d077329cf212fca3` |

manifest 中的 `license: MIT` 只按“本机声明字段被观察”记账，不能转写为适用性或法律结论。

### 3.2 lock closure 与 packed carrier

机械核对的 dependency edges：

- `@hakimi/tzdb-core@0.1.0 -> moment-timezone@0.6.3`；
- `@hakimi/tzdb-core@0.1.0 -> moment-timezone-2025b`，其 alias target 为 `moment-timezone@0.5.48`；
- 两个 Moment-Timezone 节点都声明 `moment: ^2.29.4`；
- lock 最终解析到共享 `moment@2.30.1`；
- 从 `tzdb-core` 根出发的当前第三方 lock subgraph 恰为这三个节点。

packed carrier：

| carrier | IANA label | bytes | SHA-256 |
| --- | --- | ---: | --- |
| `node_modules/moment-timezone/data/packed/latest.json` | `2026c` | 715,527 | `43f7878a298740ff6acabb9c726c7e5431a94bdca79abad274a6fe6e355bfe81` |
| `node_modules/moment-timezone-2025b/data/packed/latest.json` | `2025b` | 727,104 | `b1ad1446fbc94459f86c8e3f4ffadfc4170ad2af9cbd2a9b85c75d5436ce6425` |

这不建立 IANA archive 到 packed data 的 transformation provenance，也不建立 publisher tarball equality。

### 3.3 notice 观察

[THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md) 固定为 7,030 bytes / `d05d5d8a944cde7a739f3a64a1077fbedf706185a20e3e15c7ad423d7f0e8248`。loader 要求三个版本的 heading、lock path、tarball URL 和 integrity fragment 均存在；这只证明当前 notice inventory 有对应条目，不证明 notice 义务已经充分履行。

## 4. 新 v1.2 非正式 delta successor

主件：[vedic-source-binding-and-three-layer-rights-requirements.v1.2.0.json](../content/system-admission/vedic-source-binding-and-three-layer-rights-requirements.v1.2.0.json)

- ledger ID：`hakimi.vedic.source-binding-and-three-layer-rights-requirements/1.2.0`；
- raw：15,738 bytes；
- raw SHA-256：`6d3a36f041801e7120a3d270695f94b34242a97fc1559000f8d4d2c0002a3239`；
- ledger digest：`0decafbdc8c94dd9ae206fb453a8a64e8132eb02e5b4f50a1eb12797804b8ef2`；
- `formalV1RemainsCurrent=true`；
- `predecessorV11RemainsNonformal=true`；
- `successorIsFormalCurrent=false`；
- `successorActiveEffect=none`。

v1.2 是 delta successor，不复制 38 个完整 subject body。它通过 v1.1 full-loader 私有品牌固定原 subject inventory：canonical JSON 60,751 bytes / SHA-256 `207a571b7454856e3f9363ba619cb76ef1e03cb876ff753bb09e94c09a7c15a5`，仍是 36 required + 2 candidate-only，frozen 和 fully satisfied 均为 0。

carrier child 只补充两个既有 candidate：

1. `vedic.input.iana_time_zone_and_tzdb_identity` / `vedic-iana-tzdb-2026c-input-source-candidate-v1`：只增加本机 2026c/2025b packed carrier identity；
2. `vedic.rule.rights_license_and_redistribution_review` / `vedic-iana-tzdb-2026c-moment-timezone-rights-candidate-v1`：只增加三节点 manifest、LICENSE、notice carrier identity。

没有新增 candidate ID，没有替换 v1.1 evidence，没有 source body、formal quote、formal locator、frozen binding 或 subject satisfaction。

loader 还固定并扫描 formal v1、v1.1、当前 Vedic engineering manifest v2 与两个已知四体系 registry/context，共 5 个已知上下文件；这些文件均没有回链消费本轮 child 或 v1.2。该检查不是全工作区扫描，因此 `workspaceWideBacklinkAbsenceEstablished=false`。

## 5. 失败关闭与分账

两个新件都继续固定：

- 项目上下文：`legacy-v13 / targetSchema 13 / migrationId null`；
- 该上下文没有被 Vedic product identity 继承；
- `mutationEpochAvailable=false`、`mutationEpochReceipt=null`；
- cross-file atomic、interval mutation exclusion、ABA exclusion 全为 false；
- trusted time、runtime identity、loader identity、launcher identity、hidden pre-evaluation exclusion 全未建立；
- content truth、traditional authority、expert truth、rights legal judgment、release readiness、public deployment/release authorization 全未建立；
- fixed CLI 的可见 preload guard 不是安全边界，CLI 输出不是可信证明。

## 6. 新增实现身份

| 文件 | bytes | SHA-256 |
| --- | ---: | --- |
| [carrier child lib](../scripts/vedic-tzdb-core-dependency-license-carrier-observation-child-lib.mjs) | 35,683 | `a1175a7290641148aa6e51788341000b5e5d8531fc0b31f62a647adf217026fc` |
| [carrier child fixed CLI](../scripts/verify-vedic-tzdb-core-dependency-license-carrier-observation-child.mjs) | 3,310 | `2b2b0bf3d68dba49781c8baf12e116fd05bc655ef0c458e7a2cb5cf094ab3888` |
| [carrier child adversarial tests](../scripts/verify-vedic-tzdb-core-dependency-license-carrier-observation-child.test.mjs) | 10,835 | `d20edbfadf87c5392060ec06dd4ad08caf5773c727fea2c6dd3dd57b47c86c36` |
| [v1.2 successor lib](../scripts/vedic-source-binding-and-three-layer-rights-requirements-successor-v1-2-lib.mjs) | 36,875 | `2ac0a7d0bb9153284d165d7657fe4c7de7710ad0e954d5acbd2f650b77f3d55b` |
| [v1.2 fixed CLI](../scripts/verify-vedic-source-binding-and-three-layer-rights-requirements-successor-v1-2.mjs) | 4,062 | `308d42f295aecd4428379aa3e8c23e1de6f49e97f1ad52d67e1b1cbbc1c4b94b` |
| [v1.2 adversarial tests](../scripts/verify-vedic-source-binding-and-three-layer-rights-requirements-successor-v1-2.test.mjs) | 11,607 | `4ca5cf41de26579afffa6847fbc264e6e16d60c88e3de66e6ce41f555cf8aff3` |

## 7. 定向验证

通过：

```text
node --test --test-concurrency=1 \
  scripts/verify-vedic-tzdb-core-dependency-license-carrier-observation-child.test.mjs \
  scripts/verify-vedic-source-binding-and-three-layer-rights-requirements-successor-v1-2.test.mjs
```

结果：29 tests / 29 pass / 0 fail。

六个新增 `.mjs` 文件的 `node --check` 均 exit 0；两个 fixed CLI 均 exit 0。对抗范围包括：raw/canonical/self digest、私有品牌伪造、duplicate key、future time、闭包 edge/carrier identity 漂移、第三 candidate 注入、evidence replacement、binding/rights/formal/release 重签名越权、参数、错误 cwd、`NODE_OPTIONS` 和 `NODE_PATH`。

旧线复核：

- formal v1 verifier：exit 0，`0/38`；
- v1.1 successor verifier：exit 0，2 partial、`0/38`、nonformal/none；
- Vedic engineering manifest v2 verifier：exit 0，但仍 `currentFullDomainManifestMechanicallyVerified=false`；
- four-system current child v2.8 verifier：exit 0，但总 admission gates 仍为 0；
- `npm run check:release-governance`：exit 0，仍为 `legacy-v13 / 13 / null`，`publicDeploymentAuthorized=false`、`expertClaimsAuthorized=false`。

两个历史聚合 verifier 仍为红，未被隐藏：

- `node scripts/verify-independent-source-binding-requirements.mjs`：exit 1，当前错误为 Ziwei requirements drift；该聚合定义本身只含 Ziwei/Western，不消费 Vedic Stage C 线；
- `node scripts/verify-system-admission-registry.mjs`：exit 1，当前错误为 Bazi manifest drift；其 Vedic 正式条目仍只消费三份早期研究文档，不消费本轮 child/v1.2。

## 8. 未执行、不得外推

本轮没有运行全仓 typecheck、默认 Web build、完整应用、PWA/Service Worker、Chrome/Edge 产品边界、公开主机、部署或回滚验证，也没有进行专家审定和法律审查。

因此本轮不能被表述为：完整 Vedic source bundle、许可结论、内容权威、专家真值、domain release manifest current、发布就绪或公开发布授权。
