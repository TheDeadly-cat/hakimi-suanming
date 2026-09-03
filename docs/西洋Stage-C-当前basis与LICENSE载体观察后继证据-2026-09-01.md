# 西洋 Stage C：当前 basis 与 LICENSE 载体观察后继证据

日期：2026-09-01

## 1. 结论先行

本窄切片只形成两项 append-only 工程观察：

1. 一个 current-basis/license-carrier observation child，机械绑定当前 Western source/manifest drift receipt、Astronomy build notice、三个 package roots 与 lock/package identities。
2. 一个非正式 source-binding requirements v1.3 successor，只给
   `western.rights.engine-code-and-distribution` 附加一个 partial candidate。

它们没有修改 formal v1、历史 v1.1/v1.2，也没有取得 formal current 或 active effect：

- formal v1 仍是声明上的 current，但因当前 source basis 漂移而 mechanically current=false，失败类为 `LEDGER_MISMATCH`。
- v1.1/v1.2 是 stale historical candidates；本 successor 消费数为 0，携带为 current 的数量为 0。
- v1.3 successor：`successorIsFormalCurrent=false`、`successorActiveEffect=none`。
- binding 仍是 0/28 frozen，只有 1 个 current partial candidate，subjectFullySatisfied=0。
- legacy-v13 / targetSchema 13 / migrationId null 保持不变。

## 2. 固定身份

### 2.1 Current-basis/license-carrier child

| 字段 | 值 |
|---|---|
| path | `content/system-admission/western-current-basis-license-carrier-observation-child.v1.0.0.json` |
| raw bytes | 14,068 |
| raw SHA-256 | `abde812040df2f8589ce20b31ede147253a18e8656332cdc8c17255de1ccbb2d` |
| childId | `hakimi.western.current-basis-license-carrier-observation-child/1.0.0` |
| childDigest | `5f752ba6bad7d9411993907ed93ce6b5d665e8ecae2b467907dc71761e9a4c25` |
| status | `current_basis_and_two_external_dependency_carriers_observed_unbound_no_legal_conclusion` |

### 2.2 非正式 source-binding successor

| 字段 | 值 |
|---|---|
| path | `content/system-admission/western-source-binding-requirements.v1.3.0.json` |
| raw bytes | 37,140 |
| raw SHA-256 | `08418368dfc668cc59f7814a88e2b629bfda5867b69c264a42483951b469eb67` |
| ledgerId | `hakimi.western-astrology.source-binding-requirements/1.3.0` |
| ledgerDigest | `76ae1299965405f86f161473adb11dc87db66e5e02e4e7d0bbb9f60f85e9e2ac` |
| status | `nonformal_current_basis_plus_one_partial_engine_license_carrier_candidate_no_bindings_frozen` |

## 3. 当前 basis 与上游消费

Child 只消费当前 loader 的 private-brand 结果，且为单向 child，不向旧 formal/historical 文件写 backlink：

| 上游 | 固定身份/边界 |
|---|---|
| current source+manifest drift receipt | raw 12,537；SHA-256 `09feb585528a6d390afda19a10d967ff2356714cbb00d4eef3462fe267d01c26`；receiptDigest `f422b6b1bd61e97631b5ce5719877d0e17525b18cdfd7cc7d1c3257e85884097`；private brand verified |
| three-package manifest v2 | raw 72,472；SHA-256 `a4ba9ca6504e5d386be5302c28a498d95b172a3904c5ddc5f90a8adcc5951f27`；manifestDigest `4ed66eeae3d0f7a45dcb850a67dfb6407b695a2f6ecb58eac8b0dd1748db632d`；3 roots / 70 physical paths；entire closure=false |
| Astronomy build-notice evidence | raw 8,994；SHA-256 `98525929045505831e6f62feaa6a3a9802c5e5680637463464f4f1030e7e45d9`；evidenceDigest `0645b6a4fd6308576346b9efefd9caabfd42684609702e87c6077e724b046a30`；本次 load 重验两受控 build；rights/legal=false |

当前四个 source-basis endpoints：

| path | raw bytes | SHA-256 |
|---|---:|---|
| `docs/西洋星盘契约草案与来源门-v0.1.md` | 20,999 | `3a8e38d3f321e3232c0c895476cb4b7be61473c67d7a956444ccb8d4776c6c57` |
| `packages/western-astrology-contracts-draft/src/index.ts` | 39,756 | `87bf4fcecc7ec85542eed25c7c06869ba3a084c5e7d7fb305fcd7712ef508416` |
| `packages/western-astrology-contracts-draft/src/civil-input.ts` | 2,910 | `e1e9cfa1f8f800e5c1ef61b7fdd134fcf0276664411c0691d64ccba21ed81458` |
| `packages/western-astronomy-engine-adapter-draft/src/index.ts` | 19,629 | `ccf29e09dbcd0422da67cdb8c623061f974ff05335a768758254e869b8ac4d83` |

三个 package roots：

- `packages/western-astrology-contracts-draft`
- `packages/western-astrology-rules-preview-draft`
- `packages/western-astronomy-engine-adapter-draft`

本观察覆盖的外部 package nodes 精确为两个：

- `astronomy-engine@2.1.19`
- `zod@4.4.3`

这不是整个 Western 产品或 runtime closure；SOFA、Swiss Ephemeris、civil-time/tzdb/moment-timezone 均不在这个 partial candidate 覆盖内。

## 4. Package manifest、lock 与 carrier 观察

### 4.1 astronomy-engine@2.1.19

- installed package manifest：`node_modules/astronomy-engine/package.json`
  - raw 1,078
  - SHA-256 `d035702763839ae11f41600cf4b8210005672658dcb19cea4a09591078af4931`
  - 声明字段观察值：MIT
- package-lock identity：
  - resolved：`https://registry.npmjs.org/astronomy-engine/-/astronomy-engine-2.1.19.tgz`
  - integrity：`sha512-8yWKNf7UeNbH458h3sAJ6ZgAjE5jTXp/mNNRFoC20j2SHwZIjAQeEsBB2Q3uCFRaTCCJRv33K2XhkhZQMXoX6w==`
- exact installed LICENSE endpoint：`node_modules/astronomy-engine/LICENSE`
  - 两次 point-in-time exact-path 检查均未出现。
  - `persistentAbsenceEstablished=false`；不得外推为持续不存在或其他路径不存在。
- 两份受控 project copy：
  - `packages/western-astronomy-engine-adapter-draft/licenses/astronomy-engine-2.1.19-LICENSE.txt`
  - `packages/western-astrology-rules-preview-draft/licenses/astronomy-engine-2.1.19-LICENSE.txt`
  - 二者均 raw 1,095，SHA-256
    `690dd98cb13ba4db77c6327deea852a816892bb9debbad5943405c66972f8023`

### 4.2 zod@4.4.3

- installed package manifest：`node_modules/zod/package.json`
  - raw 3,796
  - SHA-256 `c630bd10b52dcf71c112a2bf78dbf2734b9db58d62de663b8d86c2ec2c8cda2e`
  - 声明字段观察值：MIT
- package-lock identity：
  - resolved：`https://registry.npmjs.org/zod/-/zod-4.4.3.tgz`
  - integrity：`sha512-ytENFjIJFl2UwYglde2jchW2Hwm4GJFLDiSXWdTrJQBIN9Fcyp7n4DhxJEiWNAJMV1/BqWfW/kkg71UDcHJyTQ==`
- installed carrier：`node_modules/zod/LICENSE`
  - raw 1,072
  - SHA-256 `3f1189b28e3866e0d979968d466b78f813f76827cfdca1fbb124cc0a5c8841f8`

以上只是本地 manifest/lock/carrier byte identity 观察。它不证明出版者身份、许可证真实性、对精确作品/版本/载体的适用性、兼容性、notice 履行、法律结论或可再分发授权。

## 5. Successor 的精确变化

旧 formal v1、v1.1、v1.2 均未修改。v1.3：

- 28 个 subject 顺序和主体集合保持；
- 27 个仍为 `required_unbound`；
- 仅 `western.rights.engine-code-and-distribution` 变为
  `candidate_only_unbound`；
- 该 subject 只附一个
  `western-current-basis-declared-engine-license-carrier-candidate-v1`；
- current partial candidates=1；
- frozen bindings=0/28；
- sourceBodyDigest=null、exact quote=false、exact locator=false；
- subjectFullySatisfied=false；
- work/version/edition/carrier rights 全 false；
- publisher authenticity、license applicability/compatibility 全 false；
- rights/legal、redistribution、notice、independent rights review 全 false。

历史 tzdb candidates 只作为 raw/self-digest context 观察：

- stale historical candidates observed=2；
- current private brand available=false；
- consumed=0；
- carried forward as current=0；
- active effect=none。

## 6. 分账与红线

| 账目 | 本切片结果 |
|---|---|
| 工程证据 | current 4-endpoint basis、3 package roots、2 external nodes、manifest/lock/carrier endpoints 机械观察成立 |
| 浏览器/运行时证据 | not assessed |
| 内容真值 | not established |
| 专家真值 | not established；独立专家意见=0 |
| 权利/法律判断 | not established |
| 发布就绪 | not ready |
| 公开发布授权 | not authorized |

下列 gate 均保持红：

- authenticity、applicability、compatibility；
- work/version/edition/carrier rights；
- rights/legal、redistribution、notice；
- source body、exact quote、exact locator、full binding；
- expert/domain authority；
- browser/PWA/Service Worker/cross-browser/public-host/runtime；
- trusted time、Node/loader/launcher identity、CLI attestation；
- cross-file atomicity、mutation epoch receipt、interval integrity、ABA exclusion；
- release readiness、public deployment、public release。

## 7. 定向验证

本次只运行与窄切片及固定发布治理有关的检查：

- `node --check`：6 个新增 child/successor lib、CLI、test 文件通过；
- Node 对抗测试：2 suites / 37 tests / 37 pass / 0 fail；
- child fixed CLI：通过，报告 4 current basis endpoints、2 external dependencies、0/28、activeEffect none；
- successor fixed CLI：通过，报告 formal v1 mechanically stale、1 current partial、2 historical stale、0 consumed、0/28、activeEffect none；
- `npm run check:release-governance`：通过，并继续报告
  legacy-v13 / targetSchema 13 / migrationId null、
  publicDeploymentAuthorized=false、expertClaimsAuthorized=false。

旧 formal Western loader、历史 successor loaders 与 aggregate verifier 没有被本切片“修绿”：

- formal Western 线的当前已知机械失败仍是 source basis drift 的 `LEDGER_MISMATCH`；
- v1.1/v1.2 的 recursive formal-parent currentness 因此前提失败而不可消费；
- aggregate verifier 还会被其他体系的独立失败线阻断，不能用新 fixed CLI 冒充 aggregate green。

## 8. 未执行与不成立

本切片没有执行全仓 typecheck、默认 Web build、完整应用启动、真实仓储边界、PWA/Service Worker、Chrome/Edge、公开主机、部署或回滚；没有读取或修改受限文件；没有使用 Git；没有访问第三方后台，也没有新增个人数据授权。

因此，本证据文档不得被表述为：

- 完整应用或跨浏览器验收；
- 内容权威、科学有效性或专家真值；
- 许可证真实性、适用性、法律意见或再分发授权；
- release ready、public deployment authorized 或 public release authorized。
