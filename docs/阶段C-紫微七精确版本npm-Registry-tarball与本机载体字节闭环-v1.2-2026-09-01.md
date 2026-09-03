# 阶段 C：紫微七精确版本 npm Registry tarball 与本机载体字节闭环（v1.2，2026-09-01）

## 1. 结论

本轮只把操作员已经完成的一次公开 npm Registry 点时观察固化为 append-only 工程证据：七个精确版本的 metadata `dist.integrity`、`dist.shasum`、`dist.tarball` 分别与下载 tarball 的 SHA-512 SRI、SHA-1、当前 lock `integrity` / `resolved` 对齐；tarball 内七份 `package/package.json` 与七份 `package/LICENSE` 又分别与当前本机载体精确字节相等。

结果是 7 个 tarball、14 个所选 entry 均一致，没有缺失 `LICENSE`，没有发现字节不匹配。该结论只覆盖本次给定的精确版本、固定 lock 与当前本机所选载体，不覆盖完整安装目录、完整 runtime/build closure 或其他版本。

操作员报告使用公开 npm Registry、精确版本 `npm view` 与 `npm pack --ignore-scripts`，使用隔离 cache，并关闭 audit、fund 与 update notifier；没有执行 lifecycle script。本轮 verifier 不联网，也没有重新发起在线观察。

本次没有直接保存 metadata 原始响应、HTTP status、final URL、redirect chain、response headers、TLS session 或网络观察时间，因此这些事实全部明确为未捕获，不能从 `npm` 命令成功、HTTPS URL 或 tarball 字节一致性反推。

## 2. 七个精确版本与字节身份

所有七项均满足：

- metadata `dist.integrity` = 下载 tarball SHA-512 SRI = 当前 lock `integrity`；
- metadata `dist.tarball` = 当前 lock `resolved`；
- metadata `dist.shasum` = 下载 tarball SHA-1；
- tarball 内 `package/package.json` 与当前本机 package manifest exact-byte equal；
- tarball 内 `package/LICENSE` 与当前本机 LICENSE carrier exact-byte equal。

| package | tarball bytes / SHA-256 | package.json bytes / SHA-256 | LICENSE bytes / SHA-256 |
|---|---|---|---|
| `@babel/runtime@7.29.7` | 55,313 / `4d7f1bd502a1a64d47625cc738d13284865f0666d2ed01f244de0adf05b69aa5` | 41,106 / `8c4bf20c55e3f3a93df034b12746bf72185cf2acb0ef52847a3465d6e67c61e7` | 1,106 / `117da2af0d4ce0fe1c8e19b5cff9dcd806adf973d328d27b11d4448c4ff24f76` |
| `dayjs@1.11.21` | 147,879 / `290ec8bf81878ae4927581d9be74125f07722ea8bbea2ff77a2226dce12df876` | 2,676 / `dcb46b4045ace466baa3972d8d85d81f9036ac0ca23f48a8fe77d0d786de0400` | 1,072 / `5faab7526d055651be3aab769d58897be6bd91f3d39d137f25f12dba1b31d5dc` |
| `i18next@23.16.8` | 139,913 / `283f7f0da577e8ee54eb5fdeb4c97cdaecbb54e28fc85b32e5c908731d131015` | 4,379 / `eed0139050cc6d3b62e97a29529bd4d729d1d5f993af8e78fe48564c246648fc` | 1,074 / `c83b2035d5a4740f8739869a994acc24559e2946219b15091922b52e7b2a7287` |
| `iztro@2.5.8` | 534,282 / `8293c6a587de521b0713e45826745ba4b7482fc507bd2da43fc820cadf06deca` | 2,255 / `a5a85df951d28965caa7bf9a9fe6b44e3df676c8dd938573061257cff681a20f` | 1,073 / `e6c7b6e313cbda3135b41bccc66c98be132cb8319d0d465903d17e669e748b36` |
| `lunar-lite@0.2.8` | 8,520 / `963f134a8a46b92ec6e243a98be90dc5a33c33637581b151b7c11e5833d0b157` | 1,465 / `be39ac7d686fd9e1eee487e4e1960ff670e368ad6529bd435d2d0222521147dd` | 1,062 / `21c79dc1c4df538c682573291f8824be1b1313e309a32f1e2367e3fd4c66d62a` |
| `lunar-typescript@1.8.6` | 335,460 / `257163cff2e2bb8359861721e72e5dbed2f583340b1400e459fd27816ac2ac39` | 2,188 / `f66f1217e67e227f77b7a35b3c5b40d3835842856920e99ebd7e10f2d940e21c` | 1,062 / `097ec7989106eb9a27b6eff71dbaf1cd6bb04a9b35b6c94b54fff0829a041a8c` |
| `zod@4.4.3` | 759,588 / `ee38f17f533fd500610685a483ae2f413c26f4eb33a51684314563c8d60f279c` | 3,796 / `c630bd10b52dcf71c112a2bf78dbf2734b9db58d62de663b8d86c2ec2c8cda2e` | 1,072 / `3f1189b28e3866e0d979968d466b78f813f76827cfdca1fbb124cc0a5c8841f8` |

精确 tarball URL、SRI、SHA-1、SHA-256、SHA-512 以及每个所选 entry 的本机路径均保存在 child；artifact 不保存 tarball body 或 LICENSE 正文副本。

## 3. 临时目录和清理

操作员观察使用的固定临时目录是：

`C:\Users\Administrator\AppData\Local\Temp\hakimi-ziwei-npm-parity-20260901-01`

清理前，目标为 hardcoded exact path，并验证其父目录精确等于系统 temp。操作员随后使用 `[IO.Directory]::Delete(path,$true)` 递归清理，报告 `REMOVED=True`。本轮只读复核同一绝对路径当前不存在。

该清理记录不证明 npm Registry 历史状态、跨文件/网络 atomic snapshot、mutation epoch、区间内未变或 ABA exclusion；它也不把系统 temp 或运行时提升为可信执行环境。

## 4. append-only parity child

新增：

- [artifact](../content/system-admission/ziwei-registry-tarball-parity-observation-child.v1.json)
  - raw：30,844 bytes / SHA-256 `4449cc05c2972c8d50b0a5f76c02baf0d58c8e60f2bc6e07cd302d40a1293410`
  - child ID：`hakimi.ziwei.registry-tarball-parity-observation-child/1.0.0`
  - child digest：`778eac80398629ee92b8bb1fbac902a605766461c26498794960d16b915ea59d`
- [loader](../scripts/ziwei-registry-tarball-parity-observation-child-lib.mjs)
- [fixed-path CLI](../scripts/verify-ziwei-registry-tarball-parity-observation-child.mjs)
- [focused tests](../scripts/verify-ziwei-registry-tarball-parity-observation-child.test.mjs)

child 只单向绑定既有七依赖本机 carrier child：

- predecessor raw：14,812 bytes / SHA-256 `201c5b85cf94bf9467ff18e5391fcbdfee4de54893c5fe997994a39c1f0685e8`；
- predecessor child digest：`714b5e0b1ff2c75a85bd3804ca53f01b07ad2e663c0f89b381b3cdcbb4df0c27`；
- predecessor 未修改，未增加 backlink。

## 5. nonformal requirements v1.2 successor

新增：

- [artifact](../content/system-admission/ziwei-source-binding-requirements.v1.2.0.json)
  - raw：37,570 bytes / SHA-256 `63c0b8776978432dbcaaaaf5b2638acbc5d28d755dc1387c59c7e3421865c9a1`
  - ledger ID：`hakimi.ziwei-doushu.source-binding-requirements/1.2.0`
  - ledger digest：`0ea8fa98ac54926a019cb1aa428cdc8150e5a824400cc144b85bc1a645092624`
- [loader](../scripts/ziwei-source-binding-requirements-successor-v1-2-lib.mjs)
- [fixed-path CLI](../scripts/verify-ziwei-source-binding-requirements-successor-v1-2.mjs)
- [focused tests](../scripts/verify-ziwei-source-binding-requirements-successor-v1-2.test.mjs)

v1.2 必须消费 v1.1 full-loader private brand 与 parity child full-loader private brand。它只增强 v1.1 已存在的 rights candidate：

- HKO 第一 candidate 与 v1.1 canonical-exact，仍保持 index 0；
- 26 个非目标 subject 与 v1.1 canonical-exact；
- candidate ID 数组、顺序与总数不变，`newCandidateIdsAdded=0`；
- 只有 `ziwei.rights.engine-code-and-dependency-notices` 及其既有第二 candidate 增加 parity child identity 和 7 tarballs / 14 entries 计数；
- 两条 candidate 继续为 partial，`subjectFullySatisfied=0`，`bindingFrozenVerified=0/27`；
- formal v1 继续是 current；v1.1 与 v1.2 都是 nonformal，v1.2 `successorActiveEffect=none`。

历史身份保持：formal v1 raw 25,790 bytes / SHA-256 `6ea7baee1e0ea63d7337ea6b6d78b8e7cb5da91a62bb902eaa591245539c7b3f`；nonformal v1.1 raw 32,889 bytes / SHA-256 `c7cecdb82e5a42788c3329fc63d5948115ad58252b092a2b2cc70a9649b2953e`。两者均未修改，也未增加 v1.2 backlink。

## 6. 定向验证

- parity child tests：15/15；
- requirements v1.2 tests：15/15；
- 合计：2 files / 30 tests；
- 两条 fixed-path CLI exit 0；
- 两套 lib / CLI / test，共 6 个 `.mjs` 均通过 `node --check`。

负向用例包括：digest tamper、self-reseal 后的 publisher/HTTP/candidate/binding/rights/legal/redistribution/formal promotion、package/entry/lineage drift、strict duplicate-key 与 BOM 拒绝、canonical/raw pin、private-brand lookalike 拒绝、CLI args 与 visible preload 环境拒绝。

本轮没有联网复验、没有执行 Git、全仓 typecheck、默认 Web build、浏览器/PWA、正式主机、部署或回滚，也没有读取受限文件。

## 7. 持续失败关闭

以下状态全部未升级：

- `legacy-v13 / targetSchema 13 / migrationId null`；
- mutation epoch unavailable，receipt `null`；cross-file/network atomic、interval integrity 与 ABA exclusion 为 false；
- HTTP status、redirect、headers、TLS session 与 network time 未捕获；
- publisher identity、package signature、first-seen 与 package/license authenticity 未建立；
- license applicability、notice satisfaction、作品层/版本层/载体层权利、法律结论与再分发权限未建立；
- source-body/quote/formal locator 新绑定没有发生，仍为 2 partial、0/27；
- 内容真值、传统权威、专家真值和现实独立专家审定未建立；
- runtime、loader、launcher、hidden pre-evaluation 排除与 CLI trusted attestation 未建立；
- formal registry/manifest/owner admission、release readiness、public deployment 与 public release authorization 均为 false。

因此，本轮只是一条真实外部载体字节 parity 工程证据链，不是 publisher/authenticity 证明、许可或法律结论、专家审定、发布就绪或公开发布授权。
