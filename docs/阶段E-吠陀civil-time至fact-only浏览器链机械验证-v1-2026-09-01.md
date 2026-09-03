# 阶段 E：吠陀 civil-time 至 fact-only 浏览器链机械验证 v1

日期：2026-09-01（Asia/Shanghai）  
性质：isolated controlled-loopback observation candidate；不晋级、不接入正式 Web、不产生发布授权

## 一句话结论

本轮按“先推进 C、D 或其他体系”的新优先级，选择了无需私有材料或现实专家外联授权即可继续的吠陀独立工程切片：从显式 Gregorian civil wall time 到 UTC instant／offset／本地墙时重叠空档处理的 fact-only 浏览器链。当前已冻结源码边界、两次 byte-exact 构建身份和一次 Codex In-app Browser 合成观察；它只建立限定工程证据与受控浏览器观察，不建立 DST 分类、天文／星盘／规则／解释、内容真值、专家真值、来源权利法律结论、发布就绪或公开发布授权。

## 版本与体系身份

- 本文档 `v1` 只是验证说明版本；浏览器解析器仍为 `0.1.0-draft.0`。
- 项目发布治理保持 `legacy-v13 / targetSchema 13 / migrationId null`。
- 吠陀自身 `productSystemId / releaseIdentity / targetSchema / migrationId` 为 `null / null / null / null`，不继承八字 v1.7、紫微或西洋 authority。
- observation child 为 append-only candidate，`activeAdmissionEffect=none`；未修改正式吠陀 Manifest、中央四体系 Registry、默认 Web surface 或正式存储。

## 工程范围与明确排除

链路只消费日期、当地时间、精度、IANA zone、重叠策略及固定 tzdb identity，输出 UTC instant、UTC offset seconds、本地墙时 unique／gap／overlap decision、round-trip 和 tzdb identity。它不选择 sidereal zodiac、ayanamsa、Rahu／Ketu、Bhava、D1／D9／D10、Vimshottari Dasha、Chara Karaka、Shadbala、Ashtakavarga，也不产生 UT1／TT／TDB／EOP、星历、星盘、规则或解释。

主线程先做 descriptor-safe exact-shape 捕获和 Web Crypto request digest，每次提交创建新的 Dedicated Worker；只有 Worker runtime 可达 tzdb。Worker 投影后，主线程重验精确 shape、固定身份、UTC 算术、全否定 authority／privacy 与 projection digest。主线程没有第二套独立 tzdb resolver，所以 Worker 是同一锁定构建中的受信计算组件；本链不声称抵抗恶意 Worker 或提供多样化语义复核。

UI generation 只阻止旧 Worker 结果覆盖新输入，不是产品 mutation epoch，也不证明跨文件原子、interval mutation 排除或 ABA 排除。SHA-256 只作一致性摘要，不是数字签名、publisher authenticity、来源真值或法律结论。

## 冻结 observation child 与双构建身份

[observation candidate](../content/system-admission/vedic-civil-time-fact-browser-observation-candidate.v1.0.0.json) 当前 raw identity 为 `22,446 bytes / fdfb6da43215e87e103f428d59d104b43cb3be3b4468880b9417f0baf6167e0a`，semantic observation digest 为 `019ee27933a5a63eb2636a3b3618df25b9a365fed0101f88e1e8ddc1bcb68f6d`。它绑定 `25` 个 artifacts：`15` 个 runtime／HTML／Vite／tzdb source identities、`7` 份吠陀 formal context ledgers 和 `3` 个专用 verifier artifacts。

两次新建 OS temp GUID 目录构建得到相同的 `12` 文件 envelope（manifest 枚举另外 `11` 个 payload files），共同 build output identity digest 为 `2037ddbf4a4ccea5b80e597751dd30c51f9e4a99a5fef353531570c8b5f78ccd`。Vite `7.3.6`，每次转换 `10` modules；main、Worker、IANA data chunk、source maps、HTML／CSS、build manifest 和三份许可 notice 的 bytes／SHA-256 逐项一致。输出目录分别为：

- `hakimi-vedic-facts-abfcc7be6182426a92ceaf45b0077419`
- `hakimi-vedic-facts-8e29cacf489640b8a9a5bcf57739cf01`

输出中的 `iana-2025b-*` 文件名沿用当前 adapter artifact 标识；candidate 依靠固定输入与内容摘要绑定，不从 chunk 文件名推导 tzdb 权威版本。构建与 preview 的目录 identity、exact envelope、manifest 和许可摘要会重验，但明确排除同一账户恶意进程与构建精确并发替换同一 outDir，以及 Vite runner 已读取配置而自校验初始化尚未执行之间的配置字节替换窗口；不据此声称 OS 级敌对并发防护。

## 机械验证

- 隔离 strict TypeScript：通过。
- 隔离 Vitest：`5 files / 52 tests` 通过。
- 专用 observation verifier：默认与串行均 `12/12`；CLI exit `0`；三个 `.mjs` 均通过 `node --check`。
- verifier 锁定 `13` 个 runtime modules、`31` 条 import edges、`17` 个 build inputs、`3` 份 emitted notices，并扫描 `372` 个可读 `apps/web` 源文件，未观察到反向引用。
- `check:web-storage-import-boundary`、`check:release-governance` 与 offline lockfile dry-run 通过；lockfile 前后保持 `40a02c7c3166f0c9bc03afa9c1d1f342fb7f54efe1abbf7cb3f5cf6ecb482a4d`。
- 中央 `check:system-contract-draft-boundaries` 继续 exit `1`；测试为 `74/75`。失败项和 CLI 诊断仍是受限文件未检查、既有动态 import 与未登记依赖。新吠陀 fact-only 路径没有被拿来删除或绕过这些红门。

`apps/web/src/lib/local-user-data-cleanup.ts` 按用户限制继续明确跳过且未读取／修改。因此 `incompleteProductionReachabilityAudit=true`，不能声称 whole-repository production unreachability；本轮也没有运行全仓 typecheck 或默认 Web build。

## Codex In-app Browser 受控观察

浏览器观察绑定第一份 manifest-backed build，origin 为 `http://127.0.0.1:4226/`，记录时间为 `2026-09-01 05:02:10.254 +08:00`。它不是完整应用、Chrome／Edge 或公开主机证据。

| 合成场景 | 观察结果 |
| --- | --- |
| `2025-03-20 17:01 Asia/Shanghai` | `2025-03-20T09:01:00.000Z`，`UTC+08:00`，`unique / unique · 未判定是否 DST` |
| 同日精确到秒 `17:01:23` | `2025-03-20T09:01:23.000Z`；秒精度进入新摘要 |
| `1900-01-01 20:00 Asia/Shanghai` | `1900-01-01T11:54:17.000Z`，`UTC+08:05:43` |
| `1900-01-01 00:00 Asia/Shanghai` | 因保守 UTC instant containment guard 失败关闭，无部分事实 |
| `2025-03-09 02:30 America/New_York` | 本地墙时空档失败关闭，UI 不把它冒充 DST 分类 |
| `2025-11-02 01:30 America/New_York`, reject | 本地墙时重叠失败关闭，无部分事实 |
| 同一 overlap，earlier／later | 分别为 `2025-11-02T05:30:00.000Z / UTC−04:00` 与 `2025-11-02T06:30:00.000Z / UTC−05:00` |
| 未知 IANA zone | 失败关闭，无旧事实或部分事实残留 |

输入改变会立即隐藏旧结果并提示重新生成。请求 viewport 为 `390×844`，观察到 `clientWidth=375 / scrollWidth=375`，没有横向溢出；named form controls 为 `0`，两个按钮均为 `type=button`，未观察到天文或解释字段。页面与 Worker 响应为 HTTP `200`，响应头含 `Cache-Control: no-store` 及精确 `connect-src 'none' / form-action 'none'` CSP；console warning/error 计数为 `0`。

浏览器直接观察没有覆盖 request-digest binding、response descriptor capture 或 failure allowlist 的内部机械步骤；它们只由源码／测试门验证。运行过快，未直接观察到 controls-disabled-in-flight。浏览器版本未取得；网络请求计数没有执行探测，存储与 cookie 检查受浏览器工具边界禁止，Service Worker 也未探测。因此这些字段保持 `false / null / unknown`，不能改写成运行时零网络、零存储、零 cookie 或零 Service Worker。

## 七账分离

| 账 | 当前结论 |
| --- | --- |
| 工程证据 | 隔离源码、Dedicated Worker 边界、定向测试、专用静态门和两次 byte-exact 构建已机械观察 |
| 浏览器／运行时证据 | 仅 Codex In-app Browser 受控 loopback；非完整应用、非生产、非跨浏览器 |
| 内容真值 | `false`；未建立时区领域、天文、星盘、规则、解释或科学真值 |
| 专家真值 | `0/2`，`false` |
| 来源／权利法律判断 | `not_established`；作品／版本／载体层均未完成 |
| 发布就绪 | `false` |
| 公开部署／公开发布授权 | `false / false`；`expertClaimsAuthorized=false` |

吠陀当前仍为 `Binding 0/38 / independent expert 0/2 / admission 0/8`；re-review requirements 仅机械完成 `3/7`，requirements universe 未闭合。民用时、时区与摘要仍属于 person-derived data；本次只用了 synthetic input，candidate digest 仍不视为 anonymous，logging／persistence／network transmission／publication 均未授权。

## 尚未完成与 C／D 授权边界

本轮没有启动现实专家外联、真人资料收集、私有底本导入或第三方后台访问，也没有复制第三方 prompt、知识库、断语或资产。C 的真实下一输入仍要求用户在工作区外提供合法持有的指定 revision 原始 UTF-8 body，并明确授权仅作本机私有验证；D 仍要求另行授权专家联络及个人信息处理。二者没有被本吠陀工程切片代替。

完整应用启动、真实正式仓储边界、PWA／Service Worker、Chrome／Edge、公开主机、Release Evidence、部署和回滚均未运行。吠陀仍须独立完成自己的输入、事实、规则版本、38 条来源 binding、三层权利、至少两份彼此独立的现实专家原始意见和高风险表达边界；分歧不得多数表决、平均或由生成模型自动选择赢家。
