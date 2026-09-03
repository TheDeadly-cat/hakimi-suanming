# 阶段 D：八字专家 `createdAt` 标签勘误 A 链（2026-09-01）

## 0. 结论

本轮只新增一份 append-only 时间标签勘误工件，没有修改、覆盖或替换任何旧冻结工件，也没有建立新的专家 current endpoint。

勘误精确记录两处已持久化 `createdAt` 标签倒置：

| issue | 父／被消费工件标签 | 直接消费者标签 | 机械关系 |
|---|---|---|---|
| expert child v1 → Bazi successor v1 | `2026-09-01T14:00:00.000Z` | `2026-09-01T08:10:46.766Z` | successor v1 把旧 expert child 作为 `current_expert_zero_instance_overlay_parent` |
| four-system v2.3 → v2.4 | `2026-09-01T11:00:00.000Z` | `2026-09-01T08:17:44.862Z` | v2.4 把 v2.3 作为直接 parent |

这些倒置只能证明旧标签不能承担跨工件 chronology 语义。它们不能反向证明真实创建先后、产生原因或正确时间。因此：

- `correctedCreatedAt = null`；
- `correctedHistoricalInstantEstablished = false`；
- 文件系统时间不作为权威；
- trusted timestamp、外部时间权威、单调时钟、notary receipt 和跨工件时间顺序全部为 `false`。

## 1. 新增工件

| 文件 | bytes | SHA-256 |
|---|---:|---|
| [erratum artifact](../content/system-admission/bazi-expert-current-line-created-at-label-erratum.v1.0.0.json) | 8,821 | `cf387592c507660f3ec00f31b5b735c7e90eb6bf1a92aefbb361240a2518bb21` |
| [loader library](../scripts/bazi-expert-current-line-created-at-label-erratum-lib.mjs) | 29,530 | `f570515924b64c4f8836dd527ac058c1ff488e9902e6f91ed6ff466b8c4f790f` |
| [fixed-path CLI](../scripts/verify-bazi-expert-current-line-created-at-label-erratum.mjs) | 2,792 | `4a6fa9a584974098d2926148efd784395302ef7f21ae34a9012c982e59a0158f` |
| [adversarial tests](../scripts/verify-bazi-expert-current-line-created-at-label-erratum.test.mjs) | 15,070 | `1214dbec13b09da3a1b3586ec3cc5b0d76f1bfd62f4ef6ca099b5c50567ed2d7` |

身份：

- `erratumId = hakimi.bazi.expert-current-line-created-at-label-erratum/1.0.0`；
- `erratumDigest = f16e24eb71145203d15eec73e1ddcd7ef5a375e349284597744a249dd47cc8cf`；
- `status = append_only_time_label_erratum_no_endpoint_or_admission_effect`；
- `createdAt = 2026-09-01T13:09:00.000Z`；
- 同一未认证本机时钟固定上界为 `2026-09-01T13:09:44.233Z`。

本轮新工件的 `createdAt` 也只是不晚于固定上界的未认证本机时钟标签，不是可信时间戳或跨工件先后证明。

## 2. 三份主绑定与两份补充 issue evidence

主绑定精确为三份：

| role | artifact | raw identity | semantic identity |
|---|---|---|---|
| affected old expert child | `bazi-expert-current-line-zero-instance-observation-child.v1.0.0.json` | 9,122 / `c21d07363701fa15ad57ccabf333f2dfcb5200b816c3772fbc3ae830c5c5e3ce` | child `f7e7a4a6b3580e451e06de8af29cf8c3b834b05234f9f97ec343a5b8ab1641db` |
| direct Bazi consumer | `bazi-current-machine-identity-successor.v1.0.0.json` | 30,801 / `9360655d17b23ea8c7c68e44af3177f8ccc72b350046d4f7dca5f8a8c83b717d` | receipt `f7ae6009bea62156a82de86ee0be3c353b022035194881001a913066ed8c4b05` |
| erratum 观察时暴露该 Bazi endpoint 的 then-current four-system aggregate | `four-system-current-status-observation-child.v2.8.0.json` | 19,327 / `3e5181c53fbc8eddc6e57fce7c7c6bfb94a05ae5498c408b52198851f7580dea` | child `a3057d564024e6e5c52a01ab82b4bcc74cc863aea127b6556849b5dd7a2ee792` |

为机械证明第二处倒置，另固定 v2.3 和 v2.4 的 raw+self identity。erratum 只调用加固 held-handle reader、严格 duplicate-key parser 和各自公开 digest domain 的本地重算；没有 import 或 invoke 这五份旧工件的 full loader。

此外，verifier 还重验：

- successor v1 的 `currentParentBindings.expertZeroInstanceChild` 与 `expertOverlay` 确实指向旧 expert child；
- expert overlay 不进入 `currentMachineIdentityDigest`，现实 reviewer 与独立意见仍为 0；
- v2.4 的 direct parent 为 v2.3，Bazi endpoint 为 successor v1；
- v2.8 的 Bazi endpoint 仍为 successor v1，专家声明和专家真值仍为 false。

## 3. 不替换 current endpoint

该 erratum 明确固定：

- `replacesOldExpertChildAsCurrentEndpoint = false`；
- `replacesBaziMachineIdentitySuccessorAsCurrentEndpoint = false`；
- `replacesFourSystemStatusAggregateAsCurrentEndpoint = false`；
- `activeAdmissionEffect = none`；
- formal Bazi Manifest、central registry 与旧冻结文件均未修改；
- 没有 parent backlink、default/runtime integration 或新的 formal admission。

因此旧 D child、Bazi successor v1 与 four-system v2.8 仍是原有端点关系；本工件只使“旧 `createdAt` 可证明 chronology”的说法明确失效。后续若建立 D child v1.1、Bazi successor v1.1 或 four-system v2.9，必须另建追加链，不能把本 erratum 本身称为修复后的 current endpoint。

## 4. 专家与授权分账

本轮没有采集、保存或制造真人身份、资质、scope、独立性评估或原创意见：

| 账本 | 当前结论 |
|---|---|
| 工程证据 | 三份主绑定、两份 issue evidence、两处标签倒置和 erratum self digest 已机械固定 |
| 浏览器／运行时证据 | 未建立；CLI 不是 Node、loader、launcher、OS 或隐藏 preload attestation |
| 内容真值 | `false` |
| 专家真值 | `false`；现实 reviewer `0`，独立意见 `0/2` |
| 权利／法律判断 | rights bundle 不完整，法律结论 `false` |
| 发布就绪 | `false`；Release Evidence、部署与回滚未建立 |
| 公开发布／专家声明 | public deployment、public release、expert claims 全部未授权 |

治理继续固定：`legacy-v13 / targetSchema 13 / migrationId null`；Schema 13 仍没有 mutation epoch receipt，跨文件原子、区间 mutation、ABA 和 replay 排除均未建立。

## 5. 定向验证

| 验证 | 结果 | 边界 |
|---|---:|---|
| adversarial tests（默认） | 36/36 | 单文件默认调度下的同一窄合同 |
| adversarial tests（串行） | 36/36 | raw+self、两处倒置、future/upper-bound、corrected null、duplicate/unknown、private brand、authority promotion、fixed CLI |
| fixed-path CLI | exit 0 | 仅证明本地固定关系和红门，不是可信 attestation |
| `node --check` | 3/3 | lib、CLI、test 语法闭合 |
| `check:release-governance` | exit 0 | 默认仍为 `legacy-v13 / 13 / null`，公开部署与专家声明授权仍为 false |

负例覆盖：

- erratum `createdAt` 晚于固定上界；
- 上界早于 erratum `createdAt`；
- 填入任何 `correctedCreatedAt`；
- 提升 trusted/external time、跨工件顺序、单调时钟、notary 或文件系统时间权威；
- 提升内容、专家、权利、法律、准入或发布权威；
- 添加 unknown field、洗平任一标签倒置、篡改 self digest；
- duplicate JSON key；
- 任一绑定父件 raw 漂移；
- clone 冒充 private brand；
- fixed CLI 参数或可见 preload 环境。

本轮没有运行全仓 typecheck、默认 Web build、完整应用、PWA／Service Worker、浏览器、公开主机、部署或回滚验证；没有读取受限的 `apps/web/src/lib/local-user-data-cleanup.ts`，也没有执行任何 Git 操作。
