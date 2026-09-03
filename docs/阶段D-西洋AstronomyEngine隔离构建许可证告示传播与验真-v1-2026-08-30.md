# 阶段 D：西洋 Astronomy Engine 隔离构建许可证告示传播与验真 v1

日期：2026-08-30

## 结论先行

本批次只把西洋体系两个隔离 Vite 表面使用的 `astronomy-engine@2.1.19` 本地许可证全文，传播到各自构建输出的固定同源路径，并建立失败关闭的双构建机械验真与单向子证据。它没有完成许可证语义解释、作品／版本／载体权利判断，也没有建立再分发授权、notice obligation 已履行、正式准入、专家真值、发布就绪或公开发布授权。

西洋独立 manifest、28 条来源 Binding 要求、四体系中央 registry 与跨体系 receipts 均未改写。八字默认治理继续固定为 `legacy-v13 / targetSchema 13 / migrationId null`；西洋子证据独立保持 `releaseIdentity=null / targetSchema=null / migrationId=null`，不得继承八字 v1.7 权威。

## 传播范围

仅覆盖两个既有隔离工程表面：

- Astronomy Engine Browser parity；
- Western rules preview。

两个 source HTML 均在实际 `<head>` 中声明唯一同源链接：

```html
<link rel="license" type="text/plain" href="./licenses/astronomy-engine-2.1.19-LICENSE.txt" />
```

两个 Vite config 均把以下本地输入锁到 exact bytes 与 SHA-256：

- Astronomy Engine ESM：`412025` bytes；SHA-256 `068f1445ed0c636c94818fe6d20d7d125120e605e0bab9fc4675c3d531be5ad7`；
- Astronomy Engine package manifest：`1078` bytes；SHA-256 `d035702763839ae11f41600cf4b8210005672658dcb19cea4a09591078af4931`；
- 本地许可证全文：`1095` bytes；SHA-256 `690dd98cb13ba4db77c6327deea852a816892bb9debbad5943405c66972f8023`。

主构建插件从 `buildStart` 持有已经验真的 license bytes，并把同一 Buffer 发射为 `licenses/astronomy-engine-2.1.19-LICENSE.txt`。Worker 构建使用独立插件，从 `buildStart` 持有已经验真的 engine ESM source，由插件的 `resolveId/load` 直接提供该 held source，并在 `generateBundle` 确认 Worker 实际消费了它；静态 draft-boundary 门同时强制 `worker.plugins` 接线，删除接线会失败关闭。

这只关闭本次一次性隔离构建内“先 hash、后由 bundler 重新从磁盘读取 engine ESM”的窗口。它不是 mutation epoch，也不证明跨文件原子、读取区间无 mutation或 ABA 排除。

## 机械 verifier

`scripts/verify-western-isolated-build-license-notices.mjs` 的固定执行器会：

1. 在系统临时目录下创建带固定前缀的自有随机根；
2. 分别以独立 Node／Vite build 执行两个固定 config；
3. 枚举输出树，拒绝 symlink／junction、hard link、大小写碰撞、路径逃逸和非 regular endpoint；
4. 以 held file handle 核对读取前后 endpoint identity、实际 bytes 与 SHA-256；
5. 要求两个输出各有 exact `1095`-byte 许可证资产；
6. 用 JSDOM 的 HTML 解析语义要求唯一 `rel=license` 是 `<head>` 的直接 HTML 子元素，并拒绝 base redirect、重复／外部链接、script 假关闭、title／textarea、template／noscript、属性文本和 SVG 外来命名空间伪装；
7. 要求每个输出恰有一个非 sourcemap Browser Worker，且构建代码包含版本与 engine ESM digest marker；这只观察构建字节，不证明 Worker 已在真实浏览器执行；
8. 验证完成后只删除该自有临时根。

低层 output verifier 返回的普通结构没有生成子证据的权限。只有固定双构建执行器产生的 receipt 才进入 module-private WeakMap，并绑定 producer、固定模式和同一个真实 workspace root；clone、同形伪造、任意夹具输出 receipt 或把合法 receipt 改绑到另一个 root，均不能生成子证据。冻结 child 的 loader 还要求 raw bytes 逐字等于唯一 canonical pretty JSON；根级、父绑定、authority 与 digest 的 duplicate key，即使在 `JSON.parse` 后折叠为原来的全红对象，也会在语义验真前拒绝。

## 单向子证据

子证据为：

- `content/system-admission/western-astronomy-engine-build-notice-evidence.v1.json`
- semantic evidence digest：`0645b6a4fd6308576346b9efefd9caabfd42684609702e87c6077e724b046a30`
- raw file：`8994` bytes；SHA-256 `98525929045505831e6f62feaa6a3a9802c5e5680637463464f4f1030e7e45d9`

它只从固定 dependency identity、九个本地 basis artifacts 与本轮受控双构建观察，单向投影到 child。`bindsWesternManifest`、`bindsWesternRequirements`、`bindsFourSystemRegistry`、`bindsCrossSystemReceipts`、`bindsDefaultWeb` 全为 `false`。平台相关 output tree digest、Worker 文件名／hash 未冻结进 child；持久 release build provenance 仍为 `false`。

许可证中的 notice clause 仅作为 byte candidate 定位为 `[506,632)`：`126` bytes，SHA-256 `89fdc900e69446e48038e9db01dd71e62566997bd91135f0afbecc07ae997c8a`；`semanticInterpretationReviewed=false`。本轮没有独立重取 npm tarball，也没有验证 publisher identity 或上游签名。

子证据明确不建立：

- MIT 文本的法律解释、作品／版本／载体权利或再分发决定；
- notice obligation 已满足；
- SOFA、Swiss Ephemeris、JPL／NAIF、时标数据或解释资产权利；
- 28 条西洋 Binding 中任何一条冻结、现实专家意见或高风险表达许可；
- Vite watch／programmatic rebuild 的 Node reference freshness；
- 默认 Web、完整浏览器、PWA、公开主机、部署、Release Evidence 或回滚；
- 八字 Schema 权威、跨体系评分、比较或赢家选择；
- 跨文件原子、interval integrity、ABA resistance 或 mutation epoch。

## Clean-checkout 字节边界

`.gitattributes` 对九个被 raw-byte hash 的 basis artifacts 均设置 exact `text eol=lf`。rules preview HTML 的既有 21 个混合 CR 已在当前工作树实际归一为 LF；测试逐条要求九条 attribute 规则存在，避免本地 evidence 在未来 clean checkout 因换行归一化漂移。

当前关键 basis：

| role | bytes | SHA-256 |
| --- | ---: | --- |
| adapter package manifest | 540 | `e7639fc309f3d92729ce2084275bad75702cb70df151c663bffd8b35cae15786` |
| package lock closure | 960 | `dd12ce93af144ee11965e0b89444150a2d0a6c68fe6bbf67650684ff3476bb39` |
| source lock | 2547 | `a0d929d78cff75aa543e78350aece6a35636c4c081f5620c5a7cc9aaaf400975` |
| adapter license copy | 1095 | `690dd98cb13ba4db77c6327deea852a816892bb9debbad5943405c66972f8023` |
| browser parity Vite config | 6186 | `e300d0170e412ce23cef8f302633ee4e4f321a0ca4fa6ceadfb0cf0e65ff7eb0` |
| browser parity source HTML | 4026 | `ffde5c75bda14e0e41a5579b4d48ef025bc595452b2503200cd1bcbe3b4864dd` |
| rules preview license copy | 1095 | `690dd98cb13ba4db77c6327deea852a816892bb9debbad5943405c66972f8023` |
| rules preview Vite config | 4227 | `07651c18e415635a2bd751e3fce2b77f624b8be09c1f14f86b6ce8e9bbaf99d8` |
| rules preview source HTML | 19202 | `44e4f245ccea8b6e0d35f0a85c69583e86cac90b337c3b9017127ec220e880d8` |

## 工程接线

新增 npm 入口：

- `check:western-isolated-build-license-notices`；
- `test:western-isolated-build-license-notices`。

两个西洋 build 的 prebuild、`typecheck:system-contract-drafts` 与 `test:system-contract-drafts` 已先运行相应机械门；Quick CI 的现有 Ubuntu job 在 `npm ci` 后分别执行正向 check 与负向 rejection suite。这里仅证明仓内配置已接线；本轮没有实际 GitHub Actions run，也没有 Windows CI job，因此不得声称 CI green 或跨平台 CI 已证实。本机 Windows 定向运行结果只能记作本机证据。

根级默认 `prebuild`／`pretest`／`pretypecheck` 没有直接加入会执行两个西洋 Vite build 的新 check，避免把独立西洋 draft 错绑为八字默认 release 的发布前置条件；其中既有 draft-boundary 仍会静态检查许可证 emitter、HTML link 与 Worker plugin 接线。

## 验证分账

- 许可证验真：`27/27`；包含 exact bytes、伪 HTML、sourcemap-only、hard link、symlink／junction、receipt 伪造／改绑、duplicate JSON key、LF clean-checkout、平台字段排除、临时根清理与真实固定双构建。
- Western draft-boundary 定向：`11/11`；包含两个 `worker.plugins` detach 负例。
- 五个西洋 TypeScript config：全部 exit `0`。
- 九个西洋 Vitest 文件：`57/57`。
- 独立来源要求 + 独立 manifest：`38/38`；两个 CLI 均 exit `0`，西洋仍为 `0/28 frozen`、现实专家 `0`。
- release governance CLI：exit `0`；默认仍为 `legacy-v13 / targetSchema 13 / migrationId null`，`publicDeploymentAuthorized=false`、`expertClaimsAuthorized=false`。
- draft-boundary CLI：exit `1`，输出仍只含已知受限文件跳过记录、既有八字专家脚本未登记 imports 与 private exact-quote test 的 non-literal dynamic import；没有本批西洋归因。
- 中央 admission registry：exit `1`，仍为既有八字 manifest mismatch。
- 跨体系 receipts：exit `1`，仍因当前 expected-manifest preview 变化而拒绝沿用旧 D0 决策账。

这些 expected-red 证明本批西洋 child 没有被冒充成中央准入，也没有重签 manifest／registry／receipts。

## 明确未完成

- 未运行全仓 typecheck、默认 Web build、完整应用、Chrome／Edge 真实浏览器、PWA／Service Worker、公开主机、部署或回滚确认。
- 未核验 Astronomy Engine publisher identity、作品层／版本层／载体层权利或法律结论；本地全文传播仍只是 notice candidate mechanics。
- 未取得 28 条西洋 Binding 的可靠底本、exact quote、权利依据与逐条冻结。
- 未取得两名现实、合格且彼此独立专家的意见；没有专家胜者自动选择。
- 未把西洋工程事实外推为星盘解释真值、科学有效性、八字 v1.7 权威或其他体系权威。
- `formalAdmissionAuthorized=false`、`rightsLegalConclusionEstablished=false`、`redistributionAuthorized=false`、`noticeObligationSatisfied=false`、`expertClaimsAuthorized=false`、`releaseReady=false`、`publicDeploymentAuthorized=false`。

本批次未执行任何 Git 操作，也未读取或修改受限 Web 文件。
