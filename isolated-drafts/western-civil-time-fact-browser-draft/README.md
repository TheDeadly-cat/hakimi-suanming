# Western civil-time fact-only browser draft

这是一个私有、隔离、尚未正式准入的西洋体系工程页面。它只把完整的西洋民用时输入在调用者明确指定的内容寻址 tzdb snapshot 下解析为 UTC instant、UTC offset、DST 决策和 tzdb identity，并在主线程以新的 browser fact projection 严格验收。

它不接 `apps/web`、西洋天文适配器、4219 规则预览、跨体系比较或任何存储。页面不生成 UT1、TT、TDB、EOP、RAMC、星历、星盘、宫位、相位、星座规则或解释内容。

## 信任边界

- 每次提交创建新的 Dedicated Worker；Worker 内的私有品牌不会穿过 structured clone。主线程在发送前做 descriptor-safe snapshot 和合同解析，并把 projection 绑定到本次 request digest；回传后重验 exact-shape、已知 tzdb 身份、冗余时间事实的一致性、摘要和全否定 authority/privacy。
- Worker 是同一锁定构建中的受信计算组件。主线程不会独立重跑第二套 tzdb resolver，因此这条链不提供“恶意 Worker 仍可校正”的多样化计算保证；无密钥 SHA-256 也不是来源认证或数字签名。
- Worker 自报不能证明网络被 CSP 阻断；协议固定为 `externalNetworkAccess=not_runtime_verified_by_worker`。受控 preview 的 HTML 与 Worker 响应头可另行观察，但部署到其他主机必须重新验证。
- 表单控件不带 `name`，运行按钮不是 submit，CSP 使用 `form-action 'none'`；脚本未初始化时不得把出生输入降级到 URL query。成功结果在输入改变或失败后清空，避免旧事实与新输入错配。
- UI generation 只阻止旧 Worker 结果覆盖新请求；它不是数据库 mutation epoch，也不证明跨文件原子、interval mutation 或 ABA 排除。
- 精确出生时间、坐标及其确定性摘要属于 person-derived 数据。`containsPersonalData=true`、`candidateDigestIsAnonymous=false`、`safeToLog=false`、`safeToPersist=false`、`safeToPublish=false`。
- 时区 token 保留调用者声明值；当前 resolver 允许部分 Link/alias，因此 `canonicalZoneIdentityEstablished=false`。
- 项目发布背景继续为 `legacy-v13 / targetSchema 13 / migrationId null`。西洋草案自身 `releaseIdentity / targetSchema / migrationId` 均为 `null`，不继承八字 authority，全部内容、专家、权利、发布和公开授权字段为 `false`。

## 本地验证

```powershell
npm run check:western-civil-time-fact-browser-observation
npm run typecheck:western-civil-time-fact-browser-draft
npm run test:western-civil-time-fact-browser-observation
$westernOut = Join-Path ([IO.Path]::GetTempPath()) ('hakimi-western-facts-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $westernOut | Out-Null
$env:HAKIMI_WESTERN_FACT_ONLY_OUT_DIR = (Resolve-Path -LiteralPath $westernOut).Path
node apps/web/node_modules/vite/bin/vite.js build --config isolated-drafts/western-civil-time-fact-browser-draft/vite.config.mjs --configLoader runner
node apps/web/node_modules/vite/bin/vite.js preview --config isolated-drafts/western-civil-time-fact-browser-draft/vite.config.mjs --configLoader runner --host 127.0.0.1 --port 4223 --strictPort
```

专用静态门锁定当前运行时 import 图、Worker／主线程分界、表单边界与可读 `apps/web` 源码中的反向引用。因为 `apps/web/src/lib/local-user-data-cleanup.ts` 继续是明确禁读路径，门的结论固定为 `incompleteProductionReachabilityAudit=true` 与 `wholeRepositoryProductionUnreachableEstablished=false`；它不能证明全仓或部署后不可达。

Vite 7.3.6 目前借用仓库中 `apps/web` 已锁定的构建工具，只是工具链依赖，不是运行时或产品 import；因此本阶段不能声称工具链完全独立。构建门固定 `tzdb-core`、Moment、Moment-Timezone 当前与 retained 实现、IANA tzdb `2026c`／`2025b` packed data、package metadata 与许可字节，并传播三份 notice。它是单次构建端点检查，不声称 mutation epoch、持续时间窗完整性、完整供应链认证或公开部署头部成立。
