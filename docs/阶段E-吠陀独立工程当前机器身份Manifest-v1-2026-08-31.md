# 阶段 E：吠陀独立工程当前机器身份 Manifest v1

日期：2026-08-31  
状态：独立 `research_boundary_only` 机器观察；无产品／发布身份；无中央准入效力

## 结论

新增 `hakimi.vedic-astrology.isolated-engineering-current-machine-identity-manifest/1.0.0`，为吠陀建立自己的 current-machine engineering identity，而不是借用八字、紫微或西洋的产品／Schema／专家权威。

Manifest 通过两个 full fixed-path loader 私有品牌绑定：

1. 吠陀 v1.2 version-aware observation child；
2. 最新 source-binding and three-layer rights requirements v1.1 successor。

其中 v1.1 successor 作为显式第 5 个 requirements-only component，固定 `94,582 bytes / 9356740cfd960a3137493928978d43d25be432f1bae719dde7ea95c66338c2bd` 与 ledger digest `afd65de96a850c1632e8c00b03b6be2ff05a2f8b1dd0a19fbe27d4376ac2bb6b`。旧 v1 仍是 formal current；v1.1 明确 `successorIsFormalCurrent=false`、`successorActiveEffect="none"`，不能反向冒充正式 registry 晋级。

## 当前工程闭包

| 项目 | 当前值 |
|---|---:|
| component closures | 5 |
| component file references | 33 |
| unique physical paths | 33 |
| input requirements | 13 |
| fact requirements | 12 |
| rule requirements | 13 |
| total requirements | 38 |
| requirements resolved | 0 |

五个闭包分别固定现有 requirements/governance children、civil-time adapter 草案、input-admission kernel 草案、临时 mutation-epoch experiment，以及 source-rights v1.1 successor。这里的“闭包”只表示本地文件身份与投影一致，不表示这些模块已被主应用、浏览器、正式存储或发布流水线消费。

## 固定身份

| 项目 | 值 |
|---|---|
| artifact | `content/domain-release/vedic-astrology.engineering-draft.v0.1.0.manifest.v1.json` |
| raw identity | `19,557 bytes / a21c5bcafe84fcbb6289af6d3dfdd052acb72c6987ea924a882abd76768bc0d5` |
| manifest digest | `96c1f8c4062a5d398b7b546ee68fd6bbd51f5a5200f4bdb4b76b994ab25d8685` |
| loader | `scripts/vedic-independent-engineering-manifest-v1-lib.mjs` — `29,416 bytes / 6ac91d66843cddf969997262b26aafb4d659d8884e00d4c661a0c7931220c06a` |
| CLI | `scripts/verify-vedic-independent-engineering-manifest-v1.mjs` — `4,217 bytes / c375ac76e6f96cb3948cfcd75029689a70a8c46fc2fb227dc824cc928629fab6` |
| tests | `scripts/verify-vedic-independent-engineering-manifest-v1.test.mjs` — `23,957 bytes / fa0a64efd86a4142a39de2171c11c88edf5801fc7aa63c9cb3100a51775d200a` |

## 独立红账

- admission 为 `0/8`、binding 为 `0/38`、现实独立专家为 `0/2`。
- source-rights v1.1 中仅有 `2` 个 partial candidates、`3` 个 candidate exact-quote observations；`subjectFullySatisfied=0`、`exactQuotesBound=0`、`bindingFrozenVerified=0`。
- 吠陀自身 `productIdentity / releaseIdentity / targetSchema / migrationId` 全为 `null`；主应用 integration 为 `false`。
- `legacy-v13 / targetSchema 13 / migrationId null` 只作为八字主项目背景，不能被吠陀继承。
- content truth、expert truth、rights legal conclusion、release readiness、public deployment／release、expert claims authority 全为 `false`。
- `crossFileAtomicSnapshot=false`、产品 mutation epoch 不存在、receipt 为 `null`，interval mutation 与 ABA 未排除。
- Manifest digest 不是数字签名；CLI 也不是 runtime attestation。
- 中央 registry、cross-system receipts 和主应用都没有 backlink／consumer。

## 失败关闭与验证

v1.2 parent 的接受路径已收口为模块私有、内部固定路径加载；test-only surface 不再暴露 caller-supplied parent 或 raw `requireVerifiedParent` seam。loader 还拒绝 v1.1 successor clone、仅提供旧 formal v1、删除 v1.1 后自重签、把 v1.1 提升为 formal current／active effect、删组件、raw drift、抬升计数／权限、未知字段、重复 JSON key、accessor、alias、稀疏数组和 `-0`。上游历史 v1.2 brand predicate 的 post-import primordial 加固不由本 Manifest 冒充已完成；任意前置代码执行继续排除在可信边界之外。

```text
node --test scripts/verify-vedic-independent-engineering-manifest-v1.test.mjs
# 36/36

node --test --test-concurrency=1 scripts/verify-vedic-independent-engineering-manifest-v1.test.mjs
# 36/36

node scripts/verify-vedic-independent-engineering-manifest-v1.mjs
# exit 0; VEDIC_INDEPENDENT_ENGINEERING_MANIFEST_OBSERVATION_OK
```

三个 `.mjs` 文件均通过 `node --check`。CLI 明确把 hidden preload、Node runtime、loader、launcher、stdout attestation 和 visible-loader guard security boundary 全部记为未建立。

## 分账

| 账本 | 当前结论 |
|---|---|
| 工程证据 | 5 个本地闭包／33 条文件身份与两条私有上游观察可机械复验 |
| 浏览器／运行时证据 | 未建立；临时 epoch experiment 不是产品 runtime |
| 内容真值 | `not_established` |
| 专家真值 | `not_established`；现实专家 `0/2` |
| 来源／权利法律判断 | `not_established`；正式 binding `0/38` |
| 发布就绪 | `false` |
| 专家宣称授权 | `false` |
| 公开部署／发布授权 | `false` |

本轮没有访问外部载体、联系专家、读取第三方后台或复制第三方内容；没有浏览器、PWA／Service Worker、正式存储、公开主机、Release Evidence、部署、回滚、全仓 typecheck 或默认 Web build。
