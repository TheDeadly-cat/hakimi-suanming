# 紫微同产物 Chrome / Edge 全矩阵机械回执 child（2026-09-01）

## 结论

本轮只建立一个 `isolated_engineering_browser_observation_only_not_admitted` child：固定 Vite `7.3.6` 只构建一次，把同一个输出目录交给 Chrome 与 Edge，执行现有紫微 workspace 14 个场景，共得到 28 / 28 个通过结果。

该 child 不是 central admission、domain manifest、Release Evidence、生产浏览器回执、内容真值、专家真值、许可结论、发布就绪或公开发布授权。项目默认发布治理仍是 `legacy-v13 / targetSchema 13 / migrationId null`；紫微独立产品 child 自身的 `releaseIdentity / targetSchema / migrationId` 均为 `null`，并明确不继承项目默认发布权威。

权威候选入口：

- `content/system-admission/ziwei-same-artifact-browser-observation-child.v1.0.0.json`
- verifier：`node scripts/verify-ziwei-same-artifact-browser-observation.mjs`

## 当前机械证据

| 项目 | 当前值 |
| --- | --- |
| candidate raw SHA-256 | `7cd6365d6f6ad18f0460418e5b745da0f0e68761cea361886729e55563e4db16` |
| observation digest | `792bba4b3c5307fe3bc08aed849eaeb092787eb9e171e09a9e82b3be4dd71a1b` |
| authored build source graph | 50 个文件，`472545bd8055b8e05049bcfadf204d7cc0903d02daa59141c22ab29549b9de67` |
| evidence tooling graph | 14 个文件，`4518aee1c861682192f4a8f1a5b777c5a2db0a3986b6e447e559fe2df92f4755` |
| build | Node `24.16.0`、Vite `7.3.6`、110 modules、只执行 1 次 |
| single output tree | 8 个文件，`a77b4659e8ed9233426e3d08274ecf5e7e4a1283c952c19042835457674cbe0c` |
| served runtime manifest | 每个浏览器相同 4 个实际响应正文，`a137575fbd13ff23007d45a08bcfc9871b0ea4d8b75e9ea776f9a64ade1c2607` |
| Chrome | `151.0.7922.174`，14 / 14 |
| Edge | `152.0.4191.53`，14 / 14 |
| 合计 | 28 / 28，retry 0，failed 0 |

source graph 覆盖实际 authored build 输入，包括 root manifest / lockfile、root `tsconfig.base.json`、Vite/esbuild 为 workspace / adapter / contracts 自动读取的最近 `tsconfig.json`、HTML、CSS、Vite config、紫微 contracts / adapter / workspace 源码和 iztro `2.5.8` license 输入。tooling graph 覆盖 runner、candidate renderer、verifier/tests、Vite/Playwright config、受控 reporter、现有 14 场景 spec，以及实际调用的 Vite / Playwright 入口版本文件。spec 只需的 console collector 已等价本地化，未再通过 apps/web broad helper 引入无关 rule-packs authored 链。两张图均做运行前后 endpoint digest equality，并在 candidate 生成时重新与当前 endpoint 对账；两图 union 覆盖本次 authored execution closure，installed fake-indexeddb / zod / Playwright / Vite / Node / iztro runtime closure 仍明确不完整。仍不声称跨文件原子快照、区间无变更或 ABA 排除。

同产物绑定不只依赖 `dist` hash：server 按浏览器项目头分别记录实际成功响应正文的 path / bytes / SHA-256；两浏览器的实际 served manifest 必须完全相同，每项必须与 single output tree 对账。每个浏览器在矩阵前后还单独读取 `index.html` 响应正文并核对 output-tree header。candidate 不保存 Playwright error、stdout、stderr、attachment、trace、截图、视频或下载正文。

## storage / backup / recovery 的准确口径

14 个场景均只按当前 spec 中固定的 assertion fragments 归类，不把标题外推成更强语义：

- 每浏览器只有 2 个场景做完整 workspace storage snapshot equality。
- 其余 12 个场景只记录当前 test 明示的 UI、revision count、mutation epoch、byte count、restore-disabled 或错误状态等 scenario-specific assertions。
- `completeStorageValueCoverageAcrossAllScenarios=false`。
- 不由相同 count / epoch 推导完整存储未变、事务原子性、无孤儿记录、逐字恢复、ABA resistance 或生产备份恢复认证。
- 观察的是独立 `hakimi-ziwei-browser-workspace-draft` database version 1；不是项目 schema 13 mutation-epoch receipt。

因此 28 / 28 不能写成“14 个场景都证明了完整存储原子性”。

## 数据与临时产物边界

浏览器场景只使用 synthetic fixture；candidate 明确 `actualPersonDataEntered=false`、`candidateAnonymous=false`。回执不包含出生输入、派生盘 digest、反馈正文、备份正文或 digest、revision / study identifier，以及截图、trace、video、download 或原始 Playwright report。

现有 spec 内显式截图和下载只允许出现在 runner 创建的 UUID 临时树或 Playwright 管理的临时生命周期中。runner 固定时序要求先关闭 server、验证并清理其拥有的临时树，随后才允许以 `wx` 写 sanitized runtime receipt 和输出 success；当次 runner success 行在清理后报告 `runnerOwnedTempTreeCleanupCompleted=true`。candidate schema 本身不保存该 success 字段，也不构成可独立复验的清理证明，并明确 `toolAttestationEstablished=false`、`historicalRuntimeCanBeReverifiedFromCandidateAlone=false`。本轮没有审计整个操作系统的所有浏览器临时目录，因此不声称系统范围“从未持久化”。candidate 仍固定 `safeToLog=false`、`safeToPublish=false`。

## 来源、权利、专家与高风险表达分账

- binding：要求 27，冻结验证 0。
- 独立专家：要求 2，现实身份、资质与独立性核验 0。
- formal source-rights / carrier records：0。
- 高风险 policy 注册面：16；本轮只观察列举的 feedback / projection 浏览器场景，不证明 raw template / download egress closure、candidate callsite wiring、semantic coverage 或 general call-graph closure。
- release / production browser / deployment / rollback / expert / rights-legal formal receipts：全部 0。
- `releaseReady=false`、`publicDeploymentAuthorized=false`、`publicReleaseAuthorized=false`、`expertClaimsAuthorized=false`。

## 聚焦验证

以下验证在候选落盘后通过：

- `node scripts/verify-ziwei-same-artifact-browser-observation.mjs`
- `node --test scripts/verify-ziwei-same-artifact-browser-observation.test.mjs`：6 / 6。
- `node --test scripts/verify-ziwei-same-artifact-config-cwd.test.mjs`：1 / 1；从仓库根与 package 目录分别加载同一 config、绝对 reporter、testDir 和 exact projects。
- config / reporter 聚焦 TypeScript `--noEmit`：通过。

测试还覆盖：current source/tool/formal-context rebuild、normalized 28-outcome idempotence、authority/receipt/storage/outcome/browser-ledger tamper rejection、已知 fixture marker 排除、sanitized runtime 到 candidate 的 frozen renderer 重建，以及 CLI 操作数和 loader 环境失败关闭。

本轮没有执行全仓 typecheck 或默认 Web build，也不把隔离 build 当成两者的替代。既有阻塞文件 `apps/web/src/lib/local-user-data-cleanup.ts` 未读取、未修改；除非用户另行解除限制，仍只记录为已知阻塞。

## 仍未建立

- 完整应用启动与正式仓储边界。
- PWA / Service Worker、公开主机、固定物理设备与生产浏览器矩阵。
- Release Evidence、部署与回滚确认。
- 27 条来源正文、版本、exact quote、作品层与载体层许可冻结。
- 两份现实独立专家意见及分歧并列保存。
- 内容真值、专家真值、权利法律判断、发布就绪或公开发布授权。

这份 child 只能表述为：“当前绑定的 authored source 与 evidence tooling 在一次隔离运行中，产生一个固定 output tree，并由指定版本 Chrome / Edge 对同一 loopback served-body manifest 完成既有 14 × 2 场景观察。”
