# 阶段 E：西洋 civil-time 至 fact-only 浏览器链机械验证 v1

日期：2026-09-01（Asia/Shanghai）  
性质：isolated controlled-loopback observation candidate；不晋级、不接入正式 Web、不产生发布授权

## 一句话结论

本轮完成了一条独立的西洋民用时输入到 UTC 工程事实的隔离浏览器链，并冻结源码、门禁、两次 byte-exact 构建及 Codex In-app Browser 受控 loopback 观察。它只建立限定范围的工程证据和浏览器观察，不建立时区领域权威、天文事实、星盘／宫位／相位／解释、内容或专家真值、许可法律结论、发布就绪或公开发布授权。

## 版本与体系身份

- 本文档标题中的 `v1` 只是说明文档版本，不是西洋产品 v1；Worker 与浏览器 projection 协议仍为 `0.1-draft`。
- 项目发布治理继续固定为 `legacy-v13 / targetSchema 13 / migrationId null`。
- 西洋体系自身 `releaseIdentity / targetSchema / migrationId` 均为 `null / null / null`，不继承八字 v1.7、Schema 13 或其他体系权威。
- observation child 为 append-only candidate，`activeAdmissionEffect=none`；没有修改正式西洋 Manifest、中央四体系 Registry 或默认 Web surface。

## 工程范围与明确排除

链路只处理声明的 Gregorian civil wall time、IANA zone token 与 gap／overlap policy，输出 UTC instant、offset seconds、DST resolution decision、tzdb snapshot identity 与 round-trip verification。它不包含 Astronomy Engine、4219 规则、行星位置、宫位、相位、黄道解释、跨体系比较、正式存储或 `apps/web` 产品运行时。

浏览器侧每次请求创建新的 Dedicated Worker。主线程校验精确 shape、request digest、内部 UTC 算术、authority/privacy 常量与 projection digest；它不会独立重算 tzdb zone semantics。因此 Worker 是同一构建内的受信计算组件，本链不保证纠正被替换或敌对 Worker 的语义。SHA-256 只作一致性摘要，不是数字签名、真实性或发布者认证。

UI generation counter 只用于阻止旧 Worker 结果覆盖更新后的输入，不是 mutation epoch，也不证明跨文件原子、interval mutation 排除或 ABA 排除。

## 冻结 evidence child 与构建身份

[observation candidate](../content/system-admission/western-civil-time-fact-browser-observation-candidate.v1.0.0.json) 当前 raw identity 为 `21,132 bytes / c23cef0c53f433e4996c78769c4f9ffe023309e8ef136414e67fc35d7e0932b2`，semantic observation digest 为 `e898edd1e91aa69193157bdbfc5ea24610a828ce16588388cd9b7cb5b6331b81`。它绑定 25 个源码／canonical contract／verifier／root script artifacts，并登记 11 个最终构建产物。

两次全新 GUID 临时目录构建的 11 个文件逐字节一致。Vite `7.3.6` 来自 `apps/web` 已安装工具链，仅作为 build tool 借用；没有 `apps/web` runtime/product import，也不据此声称工具链完全独立。构建产物包含 hashed main、Dedicated Worker、IANA 2025b chunk、source maps、HTML/CSS 与 Moment／Moment-Timezone 许可 notice；输出未写回仓库。

最终 bundle closure 中，main 只含本隔离 client／projection／UI、canonical civil input 与 Zod；Worker 只含本隔离 worker／civil-time／builder、tzdb-core、Moment／Moment-Timezone、canonical civil input 与 Zod。最终 JS 对 `apps/web`、astronomy、rules、cross-system 及已登记 storage/network API 的定向扫描均为 0 命中；这是当前 authored source 与当前 bundle 的限定观察，不是任意运行时或全仓生产不可达证明。

## 机械验证

- 隔离 strict TypeScript：通过。
- 隔离 Vitest：`4 files / 28 tests` 通过。
- 专用 observation verifier Node tests：`11/11` 通过；CLI exit 0。
- canonical Western contract strict TypeScript：通过；对应测试 `1 file / 7 tests` 通过。
- 专用 verifier 锁定 `12` 个 runtime modules、`21` 条唯一 import edges，并扫描 `372` 个可读 `apps/web` 源文件，未观察到反向引用。
- `check:web-storage-import-boundary`、`check:release-governance` 与 offline lockfile dry-run 通过；lockfile 保持 `175,812 bytes / 40a02c7c3166f0c9bc03afa9c1d1f342fb7f54efe1abbf7cb3f5cf6ecb482a4d`。
- 中央 `check:system-contract-draft-boundaries` 继续按已知受限文件未检查和既有动态 import／未登记依赖诊断 exit 1；本轮西洋隔离路径不再新增诊断，红门没有被删除或绕过。中央测试为 `74/75`：唯一失败在用例首次解析当前 `apps/web` Vite config 时即触发上述 expected-red，发生在 alias 注入之前，因此不是专用西洋 verifier 或 alias 拒绝逻辑的回归；该测试仍应如实记为失败，不能算全绿。

对 `apps/web/src/lib/local-user-data-cleanup.ts` 的限制保持不变：本轮明确跳过且未读取。因该路径不可检查，`incompleteProductionReachabilityAudit=true`，不能声称 whole-repository production unreachability。

## Codex In-app Browser 受控观察

浏览器观察只覆盖 `http://127.0.0.1:4223/` 的最终构建预览，不是完整应用或公开主机：

| 场景 | 观察结果 |
| --- | --- |
| `2000-01-01 20:00 Asia/Shanghai` | `2000-01-01T12:00:00.000Z`，`UTC+08:00`，`unique/unique` |
| `1900-01-01 20:00 Asia/Shanghai` | `1900-01-01T11:54:17.000Z`，`UTC+08:05:43` |
| `2021-11-07 01:30 America/New_York`, reject | `DST_OVERLAP_REJECTED`，旧结果清空，不产生部分事实 |
| 同一 overlap，earlier | `2021-11-07T05:30:00.000Z`，`UTC-04:00`，`overlap/earlier` |

请求 viewport 为 `390x844`，有效 `clientWidth=375 / scrollWidth=375`，未观察到横向溢出。表单 named controls 为 0，运行按钮为 `type=button`，form action attribute 为 null，CSP 含 `form-action 'none'`；输入变化或失败会清除旧结果。最终 console warning/error 为 0。未持久化截图的操作员记录为 `101,956 bytes / cbf2a856aac22c405602de0d8580aada85ef6a64f24e751c36437255e9cce666`，不能由 verifier 复取。

文档与 Worker 响应均观察为 HTTP 200，受控预览响应包含 `Cache-Control: no-store` 与精确 CSP。浏览器产品记录为 Codex In-app Browser，产品版本、engine 与 engine version 未取得；Chrome、Edge 与跨浏览器验证均为 false。

## 个人派生数据、网络与存储边界

四个记录场景全部是 synthetic input，未输入真人资料；但该 surface 能处理个人派生数据，因此 candidate digest 不视为 anonymous，`safeToLog / safeToPersist / safeToPublish=false`。UI 只承诺“应用代码不主动记录、持久化或向外部服务传输”，不把静态源码扫描夸大为浏览器或主机保证。

read-only browser evaluate sandbox 未能完成 runtime storage probe；所以只能记录 authored-source storage/cookie/cache/Service Worker API 定向扫描为 0，不能声称 runtime zero storage/cache/SW activity 或完整网络隔离。

## 七账分离

| 账 | 当前结论 |
| --- | --- |
| 工程证据 | 隔离源码、Worker 协议、定向测试、专用静态边界与两次 byte-exact Vite build 已机械观察 |
| 浏览器／运行时证据 | 仅 Codex In-app Browser 受控 loopback；非 Chrome/Edge、非完整应用、非生产 |
| 内容真值 | `false`；未建立时区领域、天文、星盘、规则、解释或科学真值 |
| 专家真值 | `0/2`，`false` |
| 权利法律判断 | `not_established`；作品／版本／载体层均未完成 |
| 发布就绪 | `false` |
| 公开部署／公开发布授权 | `false / false`；`expertClaimsAuthorized=false` |

西洋当前仍为 `Binding 0/28 / expert 0/2 / admission 0/8`。formal source v1 继续是唯一 current；v1.2 只为两个 subject 增加 nonformal partial observation，不建立来源正文、exact quote、三层权利或再分发许可。

## 未运行与后续前置条件

本轮没有运行全仓 typecheck、默认 Web build、完整应用启动、真实正式仓储边界、PWA、Service Worker、Chrome、Edge、公开主机、Release Evidence、部署或回滚。全仓 typecheck 与默认 Web build 的已知阻塞仍记录在受限文件中，本轮没有读取、修改或试图绕过。

正式准入前仍须由西洋体系独立完成 28 条 binding 的可靠底本／版本／来源正文／exact quote／作品层、版本层、载体层权利依据，现实专家身份、资质、scope、彼此独立性和至少两份并列原始意见，以及高风险表达边界、正式浏览器与发布证据。不得从八字 v1.7、紫微或吠陀继承权威，也不得用多数表决、平均或生成模型自动选择专家意见赢家。
