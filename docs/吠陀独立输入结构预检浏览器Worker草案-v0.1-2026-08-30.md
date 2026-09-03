# 吠陀独立输入结构预检浏览器 Worker 草案 v0.1

- 日期：2026-08-30
- 范围：吠陀独立产品化的固定、无人物输入、shape-only 浏览器预检
- 工程位置：`packages/vedic-input-preflight-draft`
- 工程状态：隔离草案，非产品入口，非正式 admission child
- 项目默认治理：`legacy-v13 / targetSchema 13 / migrationId null`
- 吠陀产品身份：`releaseIdentity null / targetSchema null / migrationId null`

## 结论

本段把既有四个固定结构诊断拒绝 probe 搬到一个独立页面和 fresh Dedicated Worker 中，并建立当前构建的浏览器运行证据。每次执行只允许得到以下四个精确诊断：

1. `SCHEMA_REQUIRED_PROPERTY_MISSING`
2. `SCHEMA_PATTERN_MISMATCH`
3. `DECLARED_DST_GAP_REJECTED`
4. `INPUT_CONTRACT_NOT_ADMITTED`

结果继续硬锁：

- `acceptedInputs=0`
- `inputInstances=0`
- `productInputRejectionReceipts=0`
- `inputContractGateSatisfied=false`
- `inputRejectionCapabilityEstablished=false`
- `probeCoverageComplete=false`
- 九项 authority 全部为 `false`

页面没有姓名、出生日期、出生时间、地点、上传或任意 JSON 输入入口；本段不处理真人数据。

## 隔离与调用方向

实际调用方向为：

`isolated page -> fresh module Worker -> pinned project-authored input draft -> four fixed diagnostics -> strict main-thread gate -> neutral red UI`

边界如下：

- package 为 `private`，没有 production export；
- 只进入 `scripts/system-contract-draft-registry.json` 的工程隔离登记；
- 没有进入 `content/system-admission/four-system-admission.v1.json`；
- 没有被 apps、主路由、release parent 或八字包引用；
- 没有读取八字 v1.7 工件，项目默认治理只作为项目边界提示，不成为吠陀产品身份；
- 没有 storage、cookie、IndexedDB、Cache Storage、fetch/XHR、远程字体或第三方资产依赖；
- CSP 固定为 same-origin script/Worker/style/font；image 只允许 same-origin 与内联 `data:` favicon；`connect-src 'none'`，同时禁止 base、form 和 object。

Worker 使用一次性 message listener，并在回包后关闭。客户端把首个 Worker 事件定义为终局：首个事件必须通过 exact protocol、requestId 和全红结果核验，否则失败关闭；完成后立即移除监听并 terminate。这里不再声称可以在已经终止后检测任意延迟的第二条消息；可证明的边界是后续消息不能恢复、提升或改变已结算结果。

## Schema 与构建身份

构建入口先读取仓内 input draft 的同一 byte buffer，核对原始字节数和 SHA-256，再解析并注入 Worker。Worker 运行时使用 Web Crypto 重算 canonical bytes、canonical SHA-256 和 semantic digest。

| 项目 | 值 |
| --- | --- |
| schema raw bytes | `16529` |
| schema raw SHA-256 | `4899e8fdf267a44e401295f23e11e2504e45f8e2f731c6be9b8ad1435e8dbf69` |
| canonical bytes | `9766` |
| canonical SHA-256 | `03afcae3e276ce7d84b1be321185431ea4e8d95fcba02063ecb29a42e10d6a1f` |
| semantic digest | `ad9a1d568d63296d3ed19f30d91cb8f8e52f543afcec03f238178da4af70ee08` |

下列是 2026-08-30 本轮验证时的 endpoint 观察值，不是 release manifest、数字签名或 frozen golden：

| 文件 | Bytes | SHA-256 |
| --- | ---: | --- |
| `src/protocol.ts` | 16393 | `5ee2de32419019495cc8ec1ea8502860ed93a197c29c3cc48c6ff7ed1da4a5af` |
| `src/preflight.ts` | 22675 | `25cf02a65713d2ddd4c69d020417f22aa1fa3206bd4717b7528047281cd72ccb` |
| `src/browser-worker.ts` | 1358 | `391d89d148df2bcb0a4ae3c27ead675a551ab56d277cfcc1b0264b812c816b31` |
| `src/browser-client.ts` | 4953 | `91512d859d128c1aa05a526e1c40d1a070fe01f86b36d5870ddc87a0b9ffd1b6` |
| `src/browser-app/main.ts` | 4538 | `17c5340dd14c8cf34dc61a196290effa229f4d3604f6aa1d93152b4007b339d5` |
| `src/browser-app/styles.css` | 5661 | `17e1c4dbcfd3890e56b2198f0599cdfc3c7ac15768acec44776a80ff65444745` |
| `browser-app/index.html` | 4823 | `a1307fcefd47f769536afdaa1ad5b1be656f44f836c6ec9851194d5df46a4a21` |
| `e2e/browser-preflight.spec.ts` | 7680 | `f3544b7f0090df66fcd2c5e46e9fefb0dcb25a728939600ee30f8f03b80eab07` |
| `vite.browser-preflight.config.mjs` | 3390 | `f75b0385f8d2c4d9d8af2e024dff810860744d085247dcb36bd0f382eef1bb02` |
| `playwright.browser-preflight.config.ts` | 1103 | `3f4b73004a14990ab1384d1643481c981b58d3867e3d2a439e6069c6a598f7b1` |
| `scripts/serve-fresh-browser-preflight.mjs` | 448 | `c4f5da58c88518ac4bc2b1116e73f83adf90cb5e10d75d1dafa0f16658d2fd14` |

本轮 self-building Playwright harness 产生的当前 dist 观察值：

| 构建文件 | Bytes | SHA-256 |
| --- | ---: | --- |
| `dist/browser-app/index.html` | 4910 | `db25a47af05de8853b4af1984cce8b3b03a3a4199a662756a734bc7b00e48935` |
| `assets/browser-worker-D9nX9PvL.js` | 28286 | `1c6723ab0d78606858dfa80a66c043a7e0605bf4fd5c2d4be6e4e1cc51bc4fd8` |
| `assets/index-yQhygIFy.js` | 12331 | `f28d1494e99ea5c2a1f9a94d8957f1f7651e7c008e4c0add8d3f40f1f861f3da` |
| `assets/index-CRHLBWku.css` | 4617 | `82bc8b2fee36f1c4d11d9c4eec77ef2536ff27b552abb15029fcc0a9a517b1a0` |

## 定向验证

### 类型、单测与构建

- 独立 TypeScript：通过；范围包括 `src`、Vitest config、Playwright config 和 `e2e`。
- Vitest：`2 files / 11 tests / 11 passed`。
- 隔离 Vite build：通过；`7 modules transformed`。
- 离线 lockfile dry-run：exit 0；`packageLockUnchanged=true`。

单测覆盖：

- 当前 schema canonical 与 semantic identity；
- 四个固定 probe、顺序、diagnostic 和 receiptId；
- 0 输入、0 产品回执、coverage/capability/authority 全红；
- schema 或 identity 漂移失败关闭；
- 响应 request binding、额外字段和 authority 晋级攻击；
- malformed 首事件、crash、messageerror、timeout 与 post/启动失败；
- 首事件终局、立即 terminate、后续事件不能改变结算。

### 应用内浏览器

当前 self-built dist 在 Codex 应用内浏览器中复验：

- 桌面：四个精确 code，`accepted=0`、`productReceipts=0`、`admission=false`；
- 重复执行：四个 receiptId 与第一次完全一致；
- 390×844 viewport override：浏览器内容区实际 `clientWidth=375`，`scrollWidth=375`，无横向溢出；
- 移动端仍显示四项结果和全部红门；
- console warning/error：`0`；
- 临时页面已关闭，预览端口已停止。

应用内浏览器的可视检查是一次当前运行观察；没有冻结 screenshot、trace 或浏览器二进制身份。

### Chrome 与 Edge

Playwright 每次先重新构建，再启动独立 preview，避免旧 dist 假阳性。实际运行：

- Microsoft Edge channel：`4 / 4 passed`
- Google Chrome channel：`4 / 4 passed`
- 合计：`8 / 8 passed`

每个浏览器覆盖：

1. 两次 fresh Worker 正常执行，精确四 code 与 receiptId 确定性；
2. Worker 资源故障注入确实命中一次，UI 精确显示 `WORKER_CRASHED`，结果列表为空，全部产品与 authority 红门保持关闭；
3. 390×844 下 `scrollWidth=clientWidth`，四项结果不溢出；
4. CSP 的 `connect-src 'none'` 实际阻断 same-origin fetch，Playwright 页面请求观察器未观察到该请求。

正常路径还核对：每次点击新建 Worker、无 cookie、无 local/session storage、无 IndexedDB、无 Cache Storage、无外部请求、无应用 fetch/XHR、无 console warning/error、无 pageerror。

## 通用边界检查没有通过

`node scripts/verify-system-contract-draft-boundaries.mjs` 当前 exit 1，不能称为绿色。本切片最初暴露的三个新越界项已经消失；剩余输出是当前工作区的既有阻塞：

- 明确受限且未读取的 `apps/web/src/lib/local-user-data-cleanup.ts`；
- `scripts/bazi-expert-review-packet-lib.mjs` 的既有未登记 imports/targets；
- 三个既有测试的 non-literal dynamic import。

本段没有读取或修改受限文件，也没有修改这些既有阻塞条件。

## 必须分开的真值账

### 工程证据

已建立：当前固定 schema、四 probe、浏览器 Worker、主线程 exact gate、响应式页面、Edge/Chrome 和故障注入的定向工程证据。

未建立：完整 JSON Schema validator、完整输入拒绝能力、任意用户 candidate 接口、产品输入实例或产品拒绝回执。

### 内容、时间与天文真值

全部未建立。没有验证真实日期、IANA zone、tzdb、DST gap/overlap、UTC、星历、恒星黄道、岁差、Rahu/Ketu、宫制或分盘。`DECLARED_DST_GAP_REJECTED` 只拒绝项目固定 probe 自己声明的 gap 分支。

### 来源、权利与法律判断

全部未建立。本段只使用仓内 project-authored draft 和固定 probe，没有新增第三方正文、exact quote、locator、作品层/版本层/载体层许可或法律结论。

### 专家真值

全部未建立。现实专家身份、资质、彼此独立性、同意和意见仍为零实例；本段不产生专家 claim。

### 浏览器、完整应用与发布

本段的浏览器证据只属于该隔离草案。没有建立完整应用启动、正式仓储边界、PWA/Service Worker、公开 HTTPS host、部署、回滚或 Release Evidence。

### 完整性与 mutation epoch

当前构建对一个 schema byte buffer 做 raw hash/parse，运行时重算 canonical/semantic identity；这不是跨文件原子快照，不证明 loaded module bytes、浏览器二进制、launcher 或历史执行身份。`mutationEpochAvailable=false`、`intervalMutationExcluded=false`、`abaExcluded=false` 继续成立。SHA-256 不构成签名、作者真实性或许可证明。

## 授权状态

- `releaseReady=false`
- `expertClaimsAuthorized=false`
- `publicDeploymentAuthorized=false`
- `publicReleaseAuthorized=false`

本段没有修改八字 v1.7 frozen golden、正式四体系 registry、吠陀父要求账或任何发布授权。
