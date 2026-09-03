# 阶段 D：八字专家零实例时间勘误后继 v1.1（2026-09-01）

## 0. 结论

本轮只新增 append-only 的 `bazi-expert-current-line-zero-instance-observation-child/1.1.0` 及其固定验证链。它消费三份当前 private-brand parent：八字 binding readiness v1.9、专家 authority precheck v1 和 `createdAt` 标签勘误 v1。

旧 child v1 仅作 exact raw+self historical context；新链没有 import 或 invoke 旧 v1 full loader，也没有消费它的 private brand。旧标签的 chronology 语义仍已撤回，`correctedCreatedAt = null`。

新 child 不是当前 endpoint 替换，没有改动 formal Manifest、central registry、Bazi successor、four-system aggregate、runtime 或 release 状态。

## 1. 新增四件套与机械身份

| 文件 | bytes | SHA-256 |
|---|---:|---|
| [child artifact](../content/system-admission/bazi-expert-current-line-zero-instance-observation-child.v1.1.0.json) | 9,765 | `598b662c7c58913fe9326290d08a1559f46f91909e5d040f9e335ad23562f9e2` |
| [loader library](../scripts/bazi-expert-current-line-zero-instance-observation-child-v1-1-lib.mjs) | 35,408 | `b9e445825661115bee523102a69671da5a03706b9d78deb7d4082eda96c4ba5c` |
| [fixed-path CLI](../scripts/verify-bazi-expert-current-line-zero-instance-observation-child-v1-1.mjs) | 2,895 | `b46a0245f48a479a4e81b19bbecae9a4b034c19e65d48ba2c1e8f5ce60482846` |
| [adversarial tests](../scripts/verify-bazi-expert-current-line-zero-instance-observation-child-v1-1.test.mjs) | 21,588 | `ab61e8986d518f1d3371a8a12f9c0c03d3dea2953869416c689ea508beb57d76` |

身份：

- `childId = hakimi.bazi.expert-current-line-zero-instance-observation-child/1.1.0`；
- `childDigest = 88044983de8b32fb68da7075224b5799528aa2ce63970d7c4eae0a0a92fae647`；
- `status = append_only_current_line_zero_instance_observation_successor_no_admission_effect`；
- `createdAt = 2026-09-01T13:21:30Z`；
- 同一未认证本机时钟固定上界为 `2026-09-01T13:22:09.883Z`。

`createdAt` 早于该固定上界，只是 same-untrusted-clock 的局部值域检查。它不是 trusted timestamp、外部时间权威、单调时钟、notary receipt 或跨工件先后证明。

## 2. 三份当前 private-brand parent

| role | artifact | raw identity | semantic identity |
|---|---|---|---|
| current binding readiness zero-authority parent | `bazi-binding-freeze-requirements.v1.9.0.json` | 45,551 / `e20145b5f34b5dc04464e482cda5da990f82e520236679efbf568b322637f797` | ledger `42930e63cb0960df969f5fe059617eb96a8ec9bd857c486cd4b33a28d37a8ae1` |
| current zero-instance authority-contract parent | `bazi-expert-authority-material-precheck.v1.json` | 12,974 / `ccfe28e4dfb8c1bd7a6764d6253cf818c37a712ea24225bd100092362cc1f2af` | ledger `0c68a77a135a6ad6205a9c0da3e37162a820ee2f273cb899783fe9a990526a80` |
| current createdAt-label erratum parent | `bazi-expert-current-line-created-at-label-erratum.v1.0.0.json` | 8,821 / `cf387592c507660f3ec00f31b5b735c7e90eb6bf1a92aefbb361240a2518bb21` | erratum `f16e24eb71145203d15eec73e1ddcd7ef5a375e349284597744a249dd47cc8cf` |

只有这三份通过各自的 exact full loader private brand 进入当前 parent 合同。clone、raw-only 对象或重建的语义等价对象不能伪装该品牌。

## 3. 旧 v1 只是 historical context

旧 `bazi-expert-current-line-zero-instance-observation-child/1.0.0` 精确固定为：

- raw identity：9,122 bytes / `c21d07363701fa15ad57ccabf333f2dfcb5200b816c3772fbc3ae830c5c5e3ce`；
- child digest：`f7e7a4a6b3580e451e06de8af29cf8c3b834b05234f9f97ec343a5b8ab1641db`；
- observed `createdAt` label：`2026-09-01T14:00:00Z`；
- `correctedCreatedAt = null`；
- `rawAndSelfDigestVerified = true`；
- `fullLoaderImportedByThisChild = false`，`fullLoaderInvokedByThisChild = false`；
- `privateBrandConsumed = false`，`brandCurrent = false`。

新 loader 使用 held-handle strict reader 和本地公开 digest domain 重算旧 v1 的 raw+self，没有依赖旧 full loader。这个绑定不恢复旧 `createdAt` 的 chronology 语义，也不把旧 v1 提升为当前权威。

## 4. 零专家实例与私有材料边界

两个 reviewer seat 仍均为 `vacant`。四个 review question、十个 independence factor 和 no-winner policy 被保留，但不得由空契约制造任何现实实例。

以下全部为 `0`：

- reviewer slot occupied、real reviewer instance、public identity binding；
- identity、credential、scope、pairwise independence assessment；
- original/sealed opinion、disagreement inventory、expert review bundle；
- independent expert review 和 verifier authority-grant instance。

本 child 读取的 PII-bearing artifact、private dossier、private opinion、real-person material 均为 `0`，也未 invoke private runtime endpoint。它不断言仓内或现实世界不存在私有材料，不建立真人材料、同意、首次出现或 custody 真值，也不授权发布。

## 5. endpoint、mutation epoch 与授权红门

本 child 明确不：

- 替换 Bazi machine-identity endpoint 或 four-system status endpoint；
- 修改 formal Manifest、central registry 或 global current endpoint registration；
- 修改 predecessor 或增加 backlink；
- 接入 default/runtime 或建立 formal admission。

发布治理仍为 `legacy-v13 / targetSchema 13 / migrationId null`。Schema 13 没有 mutation epoch receipt；跨文件原子 snapshot、区间 mutation、ABA 和 replay 排除全部未建立。

| 分账 | 当前结论 |
|---|---|
| 工程证据 | 新 child raw+self、三份当前 private brand、旧 v1 raw+self 历史绑定已机械验证 |
| 浏览器／运行时证据 | 未建立；CLI 不是 Node、loader、launcher、OS 或 hidden preload attestation |
| 内容真值 | `false` |
| 专家真值 | `false`；现实 reviewer `0`，独立意见 `0/2` |
| 权利／法律判断 | source/rights/carrier/materialization 闭环未建立，法律结论 `false` |
| 发布就绪 | `false`；Release Evidence、部署与回滚未建立 |
| 公开发布／专家声明 | public deployment、public release、expert claims 全部未授权 |

## 6. 定向验证

| 验证 | 结果 | 边界 |
|---|---:|---|
| adversarial tests（默认） | 63/63 | 单文件默认调度下的同一窄合同 |
| adversarial tests（串行） | 63/63 | raw+self、private brand、future/upper-bound、旧 loader 禁用、零实例、unknown/duplicate、authority promotion、fixed CLI |
| fixed-path CLI | exit 0 | 可从非项目 cwd 验证固定关系与红门，不是可信 attestation |
| `node --check` | 3/3 | lib、CLI、test 语法闭合 |

负例覆盖：

- 新 `createdAt` 晚于固定上界，或上界早于新 `createdAt`；
- 填入 predecessor `correctedCreatedAt`，或提升任一 time authority；
- import/invoke 旧 v1 full loader、提升旧 brand 为 current/private brand；
- clone 伪冒三份当前 private brand；
- 制造任何真人、身份、资质、scope、独立性、意见或 authority-grant 实例；
- 提升 PII／私有材料读取，或内容、专家、权利、法律、准入、发布权威；
- 增加 unknown field、duplicate JSON key、篡改 self digest、占用空席、替换 endpoint 或制造旧 v1 raw 漂移；
- fixed CLI 携带 operands 或可见 preload 环境。

本轮没有运行全仓 typecheck、默认 Web build、完整应用、PWA／Service Worker、浏览器、公开主机、部署或回滚验证；没有读取受限的 `apps/web/src/lib/local-user-data-cleanup.ts`，也没有执行任何 Git 操作。
