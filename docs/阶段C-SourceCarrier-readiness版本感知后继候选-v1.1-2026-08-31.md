# 阶段 C：SourceCarrier readiness 版本感知后继候选 v1.1

日期：2026-08-31

## 结论

新增 `hakimi.bazi.source-carrier-record-readiness.version-aware-candidate/1.1.0`，作为旧 `bazi-source-carrier-record-readiness.v1.json` 的候选后继。它仅在该 successor 的直接父位上改绑 source `1.7.0` 与 rights `1.3.0`；旧 Binding readiness 与 C-M1 仍保持 source `1.6.0` / rights `1.2.0` 历史父位，本层不声称它们已采用新父。

该工件是零实例、deny-only 的 readiness 投影，不是 SourceCarrierRecord，不是权利结论，不是 binding freeze，也不是发布授权。

## 固定输入

| 角色 | 路径 | raw bytes | raw SHA-256 | 语义身份 |
| --- | --- | ---: | --- | --- |
| source successor parent | `content/bazi-strength-source-binding-candidates.v1.7.0.json` | 58,579 | `03bc334a507e224d8658cd2af5fe5d5a11e1db0553fa7e54bf1287010147ccd2` | ledger digest `e705ef32eb2dc0d6651f314a6020b71c18070ba5b6702c6965b628d01f1ef5d9` |
| rights successor parent | `content/bazi-strength-source-rights-candidates.v1.3.0.json` | 25,852 | `8b26eea65e9ee3e7876298c3f720c46c43d5ec7d444ad4a4252116fc1dc21f17` | ledger digest `4b1183a85f1d2aeee537544a6b3711510406d98856a921730879c8a9ca782db1` |
| paired supersession receipt | `content/system-admission/bazi-smt-v10-versioned-parent-supersession.v1.json` | 12,256 | `e44740e013b4182a2a2aa4125ceda67cbf3c071c5f36db54fcdd35b7b17217b5` | supersession digest `a30313260723bfa24eff2704cb0d1f108b6b6fdfbf5e67639b4285745159e6bd` |
| predecessor readiness | `content/system-admission/bazi-source-carrier-record-readiness.v1.json` | 27,322 | `d5624c796f715b3e4a9846714a036621a8ccc66d8e3433a91e7bf69beba291e9` | ledger digest `7b34f976c58b541895747177a2326af82241d76432acba3dbbd8fac2b68ad3c5` |

loader 顺序消费 SMT-v10 supersession 的私有 WeakSet 品牌与 predecessor readiness 的私有品牌，再通过 held-handle stable read 锁定上述四个文件。克隆、重签 digest 或仅伪造相同字段均不能伪造品牌。

## 六行投影

predecessor 的五行没有在新 artifact 内重复整个对象。新 artifact 锁定 predecessor raw/语义身份、13 个顶层字段名、全五行 aggregate digest，并对每行完整对象计算 domain-separated row digest。因此旧行的每个嵌套字段仍可由固定 predecessor 路径取回并重算，同时避免复制 27 KB predecessor。

| ordinal | row | full-row SHA-256 |
| ---: | --- | --- |
| 1 | `carrier-gap:smt-v10-gujin-volume-472-page-28-facsimile-v1` | `4fa180eef2cd9a81f23f0d50b4dd7506dee2c8644c9baddeb5fd57d5463492ff` |
| 2 | `carrier-gap:dtt-chanwei-ssid-11335994-pages-170-176-facsimile-v1` | `f10168e4d447ecf426010add63845f47bfac9a19b06b3afb4c5c0c5adf806a04` |
| 3 | `carrier-gap:dtt-chanwei-cadal-07005210-pages-178-184-facsimile-v1` | `757248dbd0ddc99192c95a561033c9b8d77d50a03a8c6d80f511f4156c441dbf` |
| 4 | `carrier-gap:smt-v5-gujin-volume-470-page-115-facsimile-v1` | `c667a58505e479d5ce5e395fbdd7439ac3070e39a0f957942271ba5c64157fc5` |
| 5 | `carrier-gap:yhzp-nlc416-15jh007754-99036-page-54-facsimile-v1` | `bc5bf1c3753e3b5661c5aa4c30a217a06204b1b19c5763f5f2b9e13a0c136ba3` |
| 6 | `carrier-gap:smt-v10-cadal-06056486-pages-3-4-facsimile-v1` | `6df41b2d5ec15ba3dcf5074478ec00ea0d96d5d11b067a5ced3a8577b3aea37e` |

第六行内联完整的 deny-only readiness 对象，锁定：

- anchor `smt-v10-cadal-06056486-pages-3-4-facsimile-v1`；
- 操作员记录的 8,321,599 bytes DjVu；
- raw SHA-256 `d532196ef4aa46c747c2a703c7c47c5fdb9cfce9bea8a654a652d6657b4e6fbe`；
- 176 页；
- source candidate v2 digest `2465b64080d4a9f0283212c994b1bd78ebe59ece26ed71e41601cc43a67d2d1d`；
- rights candidate v2 digest `aed5031acb007b74092db96de4338d4148bc8518b4fb392cc59e18a0ba54295d`。

最终投影为 4 个 source family、6 个 carrier row、SMT-v10 2 行、DTT 2 行；若把 SMT-v5 也计入 SMT 总类则为 3 行。

## 红线边界

- formal KnowledgeDocument / SourceRightsRecord / SourceCarrierRecord / ProjectCopyMaterializationRecord 均为 `0`；materialization verified 为 `0`。
- binding freeze 为 `0 / 12`。
- verified rights reviewer、domain expert review、rights legal review 均为 `0`；权利、专家、法律与发布授权均为 `false` / `not_established`。
- `sameEditionVerified=false`，`specificWikisourceCarrierProvenanceEstablished=false`，`externalCarrierLiveVerifiedThisRun=false`。
- `activeAdmissionEffect="none"`，`legacy-v13 / 13 / null`。
- cross-file atomic snapshot、mutation epoch、interval exclusion、ABA exclusion 均为 `false`，mutation epoch receipt 为 `null`。
- 私有验证结果递归冻结；canonicalizer 通过 property descriptor 读取字段，拒绝 accessor、symbol key、sparse array、非 JSON 值与循环。

## 固定输出与验证

artifact：`content/system-admission/bazi-source-carrier-record-readiness.v1.1.0.json`

- raw bytes：`18654`
- raw SHA-256：`8a2ae3fcd2abc01d952159ab78cb98eeba5dd2ab06d205e478abf64574759377`
- ledger digest：`ca2734777002a2e56d82ec3702f0517668ae68b23b423c2cb31e65164c225531`

执行的本地离线验证：

```text
node --test scripts/verify-bazi-source-carrier-record-readiness-version-aware-candidate.test.mjs
# 23/23

node --test --test-concurrency=1 scripts/verify-bazi-source-carrier-record-readiness-version-aware-candidate.test.mjs
# 23/23

node --test scripts/verify-bazi-source-carrier-record-readiness-version-aware-candidate.test.mjs scripts/verify-bazi-source-carrier-record-readiness.test.mjs scripts/verify-bazi-smt-v10-versioned-parent-supersession.test.mjs
# 90/90

node --test --test-concurrency=1 scripts/verify-bazi-source-carrier-record-readiness-version-aware-candidate.test.mjs scripts/verify-bazi-source-carrier-record-readiness.test.mjs scripts/verify-bazi-smt-v10-versioned-parent-supersession.test.mjs
# 90/90

node scripts/verify-bazi-source-carrier-record-readiness-version-aware-candidate.mjs
node scripts/verify-bazi-source-carrier-record-readiness.mjs
node scripts/verify-bazi-smt-v10-versioned-parent-supersession.mjs
# 三个 CLI 均通过
```

本次未运行 full repository typecheck 或 default Web build，也未进行浏览器/PWA、公网主机、外部载体重下载或发布验收。上述绿色结果只证明固定本地输入、投影与 deny-only 权限边界在本次离线门中一致。
