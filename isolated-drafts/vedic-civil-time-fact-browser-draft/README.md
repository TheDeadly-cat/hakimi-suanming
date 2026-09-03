# Vedic civil-time fact-only browser draft

这是一个私有、隔离、`research-only / not-integrated / not-authoritative` 的吠陀体系工程页面。它只把现有吠陀输入草案中的五项民用时子集，在调用者明确指定的内容寻址 tzdb `2026c` snapshot 下解析为 UTC instant、UTC offset、本地墙时重叠／空档处理结果和 tzdb identity；它不判定偏移变化是否属于 DST。

页面不接 `apps/web`、吠陀 input-admission preflight、正式存储、星历、规则层或跨体系比较。它不会选择 sidereal zodiac、ayanamsa、Rahu／Ketu、Bhava、D1／D9／D10、Vimshottari Dasha、Chara Karaka、Shadbala 或 Ashtakavarga，也不会签发正式 input acceptance、normalization、time-scale、fact、rule 或 success receipt。

## 信任边界

- 主线程先对六个固定根字段做 descriptor-safe、exact-key 输入快照，再为本次请求计算 Web Crypto SHA-256。声明、getter、symbol、alias/cycle、额外键、非法日期／时间、非 exact uncertainty、未知策略或非固定 tzdb 身份都会在 Worker 创建前失败关闭。
- 每次提交创建新的 Dedicated Worker。Worker 内的私有 receipt brand 不穿过 structured clone；Worker 先验品牌后只投影必要工程事实，主线程再重验 exact shape、固定身份、时间算术、全否定 authority/privacy 和 projection digest。
- Worker 是同一锁定构建中的受信计算组件。主线程不独立运行第二套 tzdb resolver，因此不能声称抵抗恶意 Worker 或形成多样化计算复核；无密钥 SHA-256 也不是数字签名、发布者认证或来源真值。
- Worker 的自报不能证明网络被 CSP 阻断。协议固定 `externalNetworkAccess=not_runtime_verified_by_worker`；每个部署 origin 都必须重新观察响应头与运行时。
- 表单控件没有 `name`，动作按钮不是 submit，CSP 使用 `form-action 'none' / connect-src 'none'`。脚本未初始化时不得把输入降级到 URL query。
- 构建与 preview 都必须显式使用 OS temp 下真实、既存、GUID 命名的专用目录；build 在配置加载和 build start 要求目录为空，并在 close bundle 复核目录 identity。最终 manifest 与独立验收器重验 exact allowlist、文件／配置摘要和三份许可 notice。该点时检查明确排除同一账户下与构建并发、精确穿插的恶意 outDir 路径替换，也排除 Vite runner 已读取配置源码但模块尚未执行到自校验初始化行之间的并发配置字节替换；不据此声称 OS 级敌对并发防护。
- 输入变化或失败会清空旧事实；UI generation 只抑制 stale view，不是数据库 mutation epoch，也不证明跨文件原子、interval integrity 或 ABA 排除。
- 精确民用时、时区及其确定性摘要属于 person-derived 数据：`candidateDigestIsAnonymous=false / safeToLog=false / safeToPersist=false / safeToPublish=false`。
- tzdb 的 `1900-01-01 — 2100-12-31` 只声明请求的本地民用日期范围。链路另将最终 UTC 瞬时点保守限制在 `1900-01-01T00:00:00.000Z — 2100-12-31T23:59:59.999Z`；这是失败关闭的 containment guard，不是新的 tzdb 覆盖或独立真值结论。
- 项目发布背景继续固定为 `legacy-v13 / targetSchema 13 / migrationId null`。吠陀自身 `releaseIdentity / targetSchema / migrationId` 均为 `null`，不继承八字、紫微或西洋 authority；内容、专家、权利、发布和公开授权全部为 `false`。

## 本地验证

```powershell
node node_modules/typescript/bin/tsc -p isolated-drafts/vedic-civil-time-fact-browser-draft/tsconfig.json --noEmit
node node_modules/vitest/vitest.mjs run --config isolated-drafts/vedic-civil-time-fact-browser-draft/vitest.config.ts
node --test scripts/verify-vedic-civil-time-fact-browser-observation.test.mjs
# 双构建身份、浏览器观察与 candidate 已冻结后再运行：
node scripts/verify-vedic-civil-time-fact-browser-observation.mjs
$vedicOut = Join-Path ([IO.Path]::GetTempPath()) ('hakimi-vedic-facts-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $vedicOut | Out-Null
$env:HAKIMI_VEDIC_FACT_ONLY_OUT_DIR = $vedicOut
node apps/web/node_modules/vite/bin/vite.js build --config isolated-drafts/vedic-civil-time-fact-browser-draft/vite.config.mjs --configLoader runner
node apps/web/node_modules/vite/bin/vite.js preview --config isolated-drafts/vedic-civil-time-fact-browser-draft/vite.config.mjs --configLoader runner --host 127.0.0.1 --port 4226 --strictPort
```

Vite `7.3.6` 借用仓库中 `apps/web` 已安装的构建工具，只是工具链依赖，不是产品 runtime import。构建端点锁定 `tzdb-core`、Moment、Moment-Timezone 当前与 retained 实现、IANA tzdb `2026c`／`2025b` packed data、package metadata 与三份许可原字节；这不等于完整供应链认证、权利法律结论或 Release Evidence。
