# 默认 v13 同产物 Release Evidence 机械门（2026-08-26）

## 结论

默认 `legacy-v13 / targetSchema 13 / migrationId null` 的正式 Release Evidence 浏览器门已从“测试时另建 `.vite/playwright-web`”改为“只预览 build 回执产生并锁定的同一份 `dist/web`”。

这项变更关闭的是证据链设计缺口，不代表本轮已经完成全仓 typecheck、默认构建、Chrome/Edge 实跑、PWA/SW 实跑、公开 HTTPS 主机、部署或回滚演练。

## 两类浏览器路径分离

- 通用 E2E／nightly：继续使用 `serve:e2e` 和隔离目录 `.vite/playwright-web`，允许为了测试自行构建；这些结果不是正式发布产物证据。
- 正式 Release Evidence：`boot / backup / pwa / web-v1-flow` 分别使用四条 `test:release:*artifact` 命令，其唯一 web server 都是 `preview:release-artifact`；该命令先逐文件验证 `tmp/release-artifact-identity.json`，再对 `dist/web` 执行 `vite preview`，不调用 build。

两个路径不能用同名回执互相替代。

## Artifact 身份链

正式顺序固定为：

```text
source-bound evidenceId
→ build receipt 生成 dist/web
→ 写入仓外 release-artifact-identity lock
→ Chrome + Edge boot 6×2（预览 dist/web）
→ Chrome + Edge backup 4×2（预览 dist/web）
→ Chrome + Edge PWA 1×2（预览 dist/web）
→ Chrome + Edge Web v1 flow 1×2（预览 dist/web）
→ 其他隔离迁移门
→ artifact-stability receipt 逐文件复核
→ built-contract receipt
→ evidence generator 再次复核同一 lock
→ Release Evidence 与 artifact 一起上传
```

identity lock 绑定：evidence ID、默认 v13 descriptor、构建版本、ReleaseStorageManifest 摘要、逐文件路径/大小/SHA-256、文件数和 artifact set digest。锁必须位于 artifact 根目录之外；写入使用不可覆盖模式。浏览器门之后任一产物字节增加、删除或修改都会使 `artifact-stability` 和 evidence generator 失败。

2026-08-27 的补强还要求四项浏览器命令在执行前后各自复核同一个 lock，并把两端 lock SHA-256、lock digest、artifact-set digest、build、manifest 与完整 v13 descriptor 写入原始命令回执。generator 与 formal verifier 通过该原始回执的路径和 SHA-256 重新核对。它只建立两次端点快照；Schema 13 仍固定 `mutationEpochCapability=absent_schema13`，不会把端点相等冒充区间不存在 ABA 改写。

## 机器门

- `scripts/release-artifact-identity-lib.mjs`
- `scripts/release-artifact-identity.mjs`
- `apps/web/vite.release-artifact-preview.config.ts`
- `apps/web/playwright.release-boot-artifact.config.ts`
- `apps/web/playwright.release-backup-artifact.config.ts`
- `apps/web/playwright.release-pwa-artifact.config.ts`
- `apps/web/playwright.release-web-v1-artifact.config.ts`
- `scripts/generate-release-evidence.mjs`
- `scripts/verify-release-evidence.mjs`
- `scripts/release-evidence-schema.mjs`
- `scripts/verify-release-governance.mjs`

Release Evidence schema 要求 `artifacts.identityLock` 与 `gates.artifactIdentityStable`。workflow、runbook 和机器策略必须保持相同的回执命令与执行顺序；缺少 lock、浏览器前锁晚于 build、浏览器后稳定性回执缺失、generator 未绑定 lock、正式 preview 重新 build，均失败关闭。

## Release Evidence Schema 已成为执行门

2026-08-26 的后续收紧把 `docs/release/release-evidence.schema.json` 从“只进入 policy hash”改为三处实际执行：

- generator 在创建目录或写入 evidence/sidecar 前验证完整对象；
- verifier 在 sidecar、artifact 路径及 Git 状态读取之前验证输入对象；
- `check:release-governance` 每次都加载、审计并编译 checked-in Schema。

执行器固定使用根级直接声明的 `zod@4.4.3` 做 draft 2020-12 转换，同时在转换前执行本项目的严格关键词审计；未知关键词、外部 `$ref`、带 sibling 的 `$ref`、未封闭对象、可选对象属性或未审核 format 均失败关闭。由于当前转换器不执行 `uniqueItems`，项目执行器另行按 canonical JSON 递归复核唯一性，不能把依赖库的静默忽略当作通过。

Schema 当前精确封闭：

- Release Evidence 根对象及全部嵌套对象；
- 发布 descriptor 的 11 个 `ReleaseDatabaseDescriptor` 字段；
- 浏览器回执 binding 的 `path / sha256 / summary`；
- strict browser summary 和每个 Chrome/Edge project 的精确通过形状；
- RFC `date-time`、SHA/ID pattern、必需字段、数组界限与唯一性。

另外同步关闭了与 Schema 独立的 fail-open：default-v13 generator 在未传 `--require-receipts` 时直接采用策略中的完整 13 项回执集合，若显式传参则只能与策略精确相等；实际记录的 receipt ID 集合也必须与策略集合精确相等，策略外附加回执会使工程门失败。`--allow-dirty` 与 `--allow-unbound` 现在只放宽各自谓词，其余 descriptor、回执集合/命令、浏览器摘要、artifact lock 和构件门始终强制。默认 v13 descriptor 按全部 11 个字段与 canonical descriptor 比较；verifier 还会重算 `artifacts.count`，绑定原始回执的开始时间、完成时间和时长，并复核 repository、branch 与完整 toolchain。

当前静态回归：`test:release-evidence` 163/163（Release Evidence core 42 + deployed-host 45 + rollback-contract 11 + deployed-PWA v1 closed contract 9 + deployed-PWA v2 untrusted candidate consistency 20 + deployed-PWA v3 installability/Manifest candidate consistency 36）、`verify-release-governance.test.mjs` 146/146，另有 SW 两代本地夹具与 A→B 离线候选合同合并 47/47（15 + 32）；治理检查继续通过并保持 `legacy-v13 / 13 / null` 与两项公开授权为 false。boot/backup 新配置仅用 `--list` 核对出 Edge/Chrome 共 12/8 个 tuple，没有执行浏览器。v2/v3 测试进入聚合只表示离线工具合同被覆盖；两版 Evidence、host/browser/provider candidate receipt 和 verifier 命令仍被治理明确排除在默认 v13 正式 pre-deployment receipt 集之外。默认 v13 的完整 receipt ID→命令表仍为精确 13 项 allowlist，并拒绝通过直接或递归 npm-script 别名把 v2/v3 偷渡成正式 receipt。没有调用正式 generator/verifier，因此这些结果只建立证据工具契约，不建立当前工作区正式 Release Evidence。

2026-08-27 新增的 v3 不改写历史 v2 八附件合同。它把浏览器 `Page.getInstallabilityErrors`、`Page.getAppManifest`、远端 Manifest 原始 bytes 与锁定 artifact Manifest 分账，并增加十附件和 `pwaInstallabilityAndManifestCandidateConsistent` 机械门；终态仍固定为 `not_admitted / closed_missing_https_origin`。当前采集器只完成 18/18 离线 writer 合同与定向 TypeScript 检查，没有运行现实 HTTPS Chrome/Edge。详见 [独立 v13 真实 HTTPS / PWA 离线语义候选门 v3](./独立v13真实HTTPS-PWA离线语义候选门-v3-2026-08-27.md)与 [独立 v13 公网 PWA 候选回执采集器](./独立v13公网PWA候选回执采集器-v1-2026-08-27.md)。

后续定义审查又关闭了一条独立 Schema 漏口：`type` 与 `const/enum` 的组合不再被转换器静默降格；本项目审核子集直接拒绝该组合，并加入语义负测。当前 checked-in Schema 没有使用该冲突形状，因此这是执行器 fail-closed 加固，不是 evidence 内容或发布状态变化。

## 真实主机与回滚仍是独立未关闭线

`verify-deployed-security-headers.mjs` 已升级为严格真实网络 CLI：先要求已选择平台、canonical public HTTPS origin，以及根、SW、远端 Evidence、代表性深链四类精确 HTTP→HTTPS redirect；再通过唯一可授权 real weak-set 的内部入口实际运行 formal Release Evidence verifier，复核本地 Evidence/sidecar、policy 原始字节、artifact inventory 与 identity lock，解析全部 DNS A/AAAA，最后逐路径检查完整公开 artifact、document deep routes、远端 Evidence、non-public 404/410、HSTS/危险行为头、cache、UTF-8 MIME、identity content coding、零意外重定向和流式 SHA-256。可注入 fetch 的 mocked contract 是另一个入口，结果中 `publicHttpsVerified` 与 `realHostVerified` 都不能被 mock 置为 true。

托管 policy 同步升为闭合 v2，并把 `/*` 的 no-store 基线与 `/assets/*` immutable 例外精确镜像到 `_headers`；治理检查不再使用 substring 匹配 route/header。HTML/Manifest 的附加声明门拒绝 base、inline executable script/event handler、meta refresh、外部资源、复合加载/报告属性、CSS escape 与已知加载函数；SW 身份常量改由 AST 读取。输出仍把 inline CSS、JavaScript、SW 与 CSP 的真实浏览器网络门逐项保持为 false，不把静态 denylist 冒充运行时来源闭合。

checked-in policy 仍是 `deploymentPlatform: unselected`、`canonicalOrigin: null`、空 redirect matrix 和 Report-Only CSP，因此真实 CLI 在 artifact、Git-backed verifier 和网络之前失败关闭。mocked-host 正反测试只证明验证器契约；没有真实主机、CSP blocking、浏览器 enforcement、部署或公开授权。详见 [真实主机部署验证器机械契约 v2](./真实主机部署验证器机械契约-v2-2026-08-26.md)。

既有旧 `dist/web` 缺少当前 v2 Manifest 闭集，并含不应公开的历史 local Evidence sidecar，因此会在网络前失败；这是一条旧产物漂移证据，不代表当前源码已经通过默认 build 或当前构建已验证兼容。

回滚已新增独立的后部署 Schema/policy/verifier 骨架，不改变正式 13 项预部署 Release Evidence 回执。独立审查发现下游 receipt 仍缺可信原始事实根，因此 `executionAdmission` 固定关闭；未选主机与零 actor 会更早失败，临时配置它们也不能取得 pass。`service-worker-two-generation.spec.ts` 现已把本地合成夹具静态固定为 Edge/Chrome 双项目、全新持久 profile、CDP 品牌核验和独立 fixture-only summary，但本轮只完成契约测试与 6 项静态发现，没有执行浏览器场景。它仍未绑定正式候选/baseline artifact lock、真实主机、真实 v13 数据副本或回滚 actor，而且“由新 worker 返回旧 shell cache”不等于恢复旧 Service Worker 二进制。因此发布与回滚确认继续为 `not_verified`，mutation epoch 边界也不得由该夹具外推为真实回滚证据。详见 [独立 v13 真实回滚证据机械门](./独立v13真实回滚证据机械门-v1-2026-08-26.md)与 [Service Worker 两代本地夹具证据边界](./SW两代本地夹具证据边界-v1-2026-08-26.md)。

## 当前证据分账

- 工程契约/工具测试：本轮通过。
- 当前工作区正式 Release Evidence：未生成；dirty/untracked 工作区也不得冒充正式证据。
- 当前提交全仓 typecheck：既有受限阻塞，未绕过。
- 当前提交默认 build：本轮未执行。
- Chrome/Edge 真实浏览器：后续仅对既有旧 `dist/web` 做了本地同产物预检；PWA 为 Edge 通过、Chrome 可重复失败，Web v1 为两浏览器失败，严格门未通过。详见 [既有 dist v13 本地同产物预检](./既有dist-v13本地同产物预检-2026-08-26.md)。
- 公开 HTTPS staging、真实响应头、部署、Release、回滚：未执行。
- 内容真值、专家真值、来源权利法律结论：不由本门建立。
- 发布就绪：`not_ready`。
- 公开发布授权：`not_authorized`。
