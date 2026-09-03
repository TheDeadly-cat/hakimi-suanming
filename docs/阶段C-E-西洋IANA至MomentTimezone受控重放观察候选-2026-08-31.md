# 阶段 C/E：西洋 IANA 至 Moment-Timezone 受控重放观察候选

- 日期：2026-08-31
- 体系：`western-astrology`
- 范围：IANA tzdb 2026c → `moment-timezone@0.6.3` 数据变换的操作员记录、点时、两次运行、逐字节观察候选
- 默认发布治理：`legacy-v13 / targetSchema 13 / migrationId null`
- 正式西洋 Binding：`0/28`
- 观察 subject：`0/2` fully satisfied
- 状态：`operator_recorded_point_in_time_two_run_byte_exact_observation_candidate_only`

## 1. 当前结论

一次临时 Windows 探针使用固定 IANA `tzdata2026c`／`tzcode2026c`、Moment-Timezone tag `0.6.3` 的固定任务文件、Zig 0.16.0 编译出的会话工具以及隔离 npm cache，执行了两次成功转换。两次的 `meta`、`collect`、`unpacked` 与 `packed` 输出逐字节一致：

| 输出 | bytes | SHA-256 |
| --- | ---: | --- |
| `meta` | 97,948 | `89fdbb1808eb6b9a5d40ff63b694a3952bcf294384659b88c05f736c50d86ab5` |
| `collect` | 20,285,927 | `ed166fef0b9697f47725339b68517412ca2dc1790afee17ffb21fc4f52d80a03` |
| `unpacked` | 11,572,929 | `038699f5d72273ef90c7abe94b8f485776012840b340ddad79cd55cfe743565a` |
| `packed` | 715,527 | `43f7878a298740ff6acabb9c726c7e5431a94bdca79abad274a6fe6e355bfe81` |

每次均生成 597 个 TZif 与 597 个 `.zdump`。生成的 `meta` 与项目安装依赖的 `meta`、生成的 `packed` 与项目安装依赖的 `packed`、生成的 `unpacked` 与 tag committed `unpacked` 分别 `SequenceEqual=true`。输出语义计数为：meta `version=2026c`、418 zone keys、247 countries；packed `version=2026c`、340 zones、257 links、247 countries。

这只能证明“这组固定输入、已记录工具代码和本轮 Windows host adaptation 在两个成功运行中重建了相同目标字节”。它不是发布者原构建 provenance，不是跨主机工具位级可复现证明，也不建立完整 transformation provenance。

## 2. 来源与 tag 的点时身份

| 对象 | bytes | SHA-256 |
| --- | ---: | --- |
| GitHub tag-ref API JSON | 347 | `3b8ab2f4cafdc8cfa050283a2de1f45720e2a8bf36d0f943bcee9c7a77d996d0` |
| GitHub commit API JSON | 265,289 | `2d79eefdfa48375b6aa61e39239ec1eabdc5f2b8255058147de17cc4c51b1c46` |
| Moment-Timezone 0.6.3 source archive | 34,395,189 | `ed1a494f029c4fd67b91a98bb4b31c9b570d1bc27c3046138a2dd5219cd31e87` |
| `tzdata2026c.tar.gz` | 475,694 | `e4a178a4477f3d0ea77cc31828ff72aa38feff8d61aa13e7e99e142e9d902be4` |
| `tzcode2026c.tar.gz` | 325,445 | `b1cffc3ace4c4c7cd0efba2f7add86ec3d0b79da48bcf03582671fd3c8feace8` |
| Zig `index.json` | 76,660 | `13832f90796d8a4849a081ead72f7133f6ce1c9b8c1c61fa432a3f2ef18c7a8b` |
| Zig Windows x86_64 0.16.0 zip | 97,217,739 | `68659eb5f1e4eb1437a722f1dd889c5a322c9954607f5edcf337bc3684a75a7e` |
| `zig.exe` | 177,108,480 | `086ce9d47ba42f33a514e1a6e04eb1d4a8fa1d75e0868e0213caad447c91e864` |

tag 观察为 `refs/tags/0.6.3` → commit `f5373b73ed47995924b53a0cac1e59730799887d`、tree `87ffb5e7c6a87facc3ddc75c685ee35dcf940220`、commit time `2026-07-19T07:56:36Z`。GitHub API 报告 `verified=false / unsigned`。API JSON raw body 只是该次点时动态表示，不作为稳定 publisher pin；archive、tag ref 与 commit API 也只是分别观察的对象。没有验证 commit/tag 签名、PGP、signing key trust 或 publisher authenticity。

完整 probe 起止窗口没有采样，固定为 `unavailable_not_sampled`，不得事后编造。唯一采样到的 compiler-cache 子窗口为 created `2026-08-31T05:29:08.8528987Z`、lastWrite `2026-08-31T05:39:59.9596076Z`，它不是 probe full window。

## 3. 固定变换代码与 lock 身份

| 文件 | bytes | SHA-256 |
| --- | ---: | --- |
| `package.json` | 1,076 | `131fc5c4b7ad0c5ebcc00b5670c49ef54c2cf0cd26f68670bee10bfd66276a2b` |
| tag `package-lock.json` | 291,520 | `282251670f309243ced632791aa9f025a5b5ac8e4ca1caabd90af19de16f50c5` |
| `Gruntfile.js` | 1,995 | `08ac5403aca02bc49ceaeda82b5d832a57cea8554796ce00f94a1b6389a5843e` |
| `tasks/data.js` | 584 | `622d24ec5c89d808cd77151d0960913f135db2b180f706b3a0f0b30fd0a72a3c` |
| `tasks/data-meta.js` | 4,725 | `441690ae8c041955dbc56885f0f794cc325c2cd72afb48ca0d6e1e130edae7d4` |
| `tasks/data-zic.js` | 1,616 | `20403322da9be80987107bb3cf4153c9096bd0af3cb1f1df02f194f1e152db2c` |
| `tasks/data-zdump.js` | 2,931 | `6ea0171a4d84c792f87503a9722c63b666780784618ab5aec1cd9be7ec4a9b41` |
| `tasks/data-collect.js` | 2,933 | `1e2341c3c9d2cbd93c25ae02445aadc925c3e4713b5de1310e1ee4215f1d1743` |
| `tasks/data-dedupe.js` | 1,507 | `bb4de7ce8b94d1b03546fbb88968f5f61e0c573eade6d9660d81e9b12ef35182` |
| `tasks/data-pack.js` | 878 | `d4b315590835f8d725df303ec96163123253b4e141156dee9005e85acd0b5a6f` |
| `tasks/population.json` | 13,000 | `8669bfea8568dc369689976f984da88e8d31796bdeb16753925dab80f2ef5927` |
| `tasks/group-leaders.json` | 10,049 | `cb35d8264d15e972ba90ea522e91796049cee52c6e50cc268d6603d2b0258224` |
| `moment-timezone-utils.js` | 7,741 | `f0772f4dd6c857021cc1518ab5d2c1cca7b19e0d479ffb1b6a07848d84c7bd66` |
| `.github/workflows/build-data.yml` | 2,613 | `84f4639083cce5d0b03932f7d04e2e59d59382d4c9cf66dca581a1111ccb3349` |
| `CONTRIBUTING.md` | 8,532 | `1c2ae21a13e20d04cc5a6a63a119d8f3efd4da1f1f960ba36f129f781d56b2cf` |

`packed` 并非只由 IANA data 得出；它还依赖 population、group leaders、Moment 与 Moment-Timezone utils。操作员记录项目安装的 `meta`／`packed` 只在成功输出产生后用于逐字比较，审计到的静态任务路径未显示把它们作为 transformation input；但没有完整进程 read-set trace，所以不能机械排除其他读取或证明比较顺序。

另需排除一个看似方便但会污染证明的 transformer：项目安装的 `node_modules/moment-timezone/moment-timezone-utils.js` 为 7,741 bytes／SHA-256 `f0772f4dd6c857021cc1518ab5d2c1cca7b19e0d479ffb1b6a07848d84c7bd66`，其 CommonJS 路径执行 `require('./')`；项目安装的 `index.js` 为 114 bytes／SHA-256 `b93bc1a0ab15d56e12f0e281bf005d39166952d9208b828e8d056563f3ff1fd1`，会立即 `require('./data/packed/latest.json')` 并加载目标 packed artifact。因此项目安装的 utils 不能用作本次独立 transformer；探针使用的是隔离 tag source 与隔离依赖树。

## 4. tzcode 与运行工具身份

| 对象 | bytes | SHA-256 |
| --- | ---: | --- |
| tzcode `Makefile` | 56,279 | `41406412425d58e5ba4327785557a3a79134d2b747584a1304e77892e617955f` |
| `zic.c` | 114,982 | `642f4dfccdf7fcadc36eb8e241d0d10404d3d6e4c24329d8ad7224433ec5a8c4` |
| `zdump.c` | 32,871 | `7ea2a00dfaf88491f99988d7d661af27b1c437ec09910c4a5e05a831c0860c68` |
| `localtime.c` | 83,406 | `e362fcc65b89034b0ed2ee54f213a52a860b044055b62103c983b662133b307d` |
| `strftime.c` | 19,380 | `119fd12398d687c366df07dbbde6530caf74979ea5ec2f90718f111b4e7fb717` |
| `private.h` | 31,916 | `e67d07e54606d68df765b7e69c1c5c29d29464c40c2b695d870d4fa7f26ce52e` |
| `tzfile.h` | 4,194 | `449eceb0318327d7e885c9ab537a88084c98f03735758e4cf3e9ad1ebae79a1c` |
| `version` | 6 | `b8b066b540bc2870e6f1f3cd76f1b0e6c3629b2e3a12f14ba9e47085a1abb781` |
| `version.h` | 133 | `e7814004c7a2b4ea599725dc56ff19590dad907529f24fd947d032d5be033508` |
| `tzdir.h` | 159 | `eca5f1e44f56b3a110fd8d094d2dca1eebca11634428f644f05b774b7c077b3f` |
| `zic.exe` | 302,080 | `9417c6e96848cef83b85d00f3f3e9edadc2de637737a965b683fddad445632c6` |
| `zdump.exe` | 272,384 | `e0f1ebe57d5da07f3a48b92fafa4a8e792b0ad8f48ffd6b54def926035558e29` |
| `node.exe` | 92,279,112 | `b3094d0b49f9ad602262a9921551737bb97637c05dd357a06ae98188d7290aa3` |
| `npm.cmd` | 538 | `21b46c69ad6e2f231f02a9e120f4ba6c8e75fef5a45637103002eab99f888ab8` |

观察版本：Windows NT `10.0.26200.0` x64、.NET `10.0.10`、Node `v24.16.0`、npm `11.13.0`、Zig `0.16.0`、Moment `2.29.4`、grunt `1.5.3`、grunt-cli `1.4.3`、zic/zdump tzcode `2026c`。

成功 `zdump` 编译增加 `SUPPRESS_TZDIR=1 / HAVE_TZNAME=1 / time_tz=__int64`。它们是本次 Windows 单用途 host adaptations：`time_tz=__int64` 改变内部时间类型／符号范围，`HAVE_TZNAME=1` 适配无 `tm_zone` 的缩写来源，`SUPPRESS_TZDIR=1` 改变 Windows 绝对路径查找。它们不是上游 workflow 默认值，也不授权成为通用产品 build 默认值。上游 workflow 是 `ubuntu-latest + Node lts/* + tzcode make`；本探针是 `Windows + Zig + portability macros`。

固定偏移 zone 的 `zdump UTC <src>` fallback 会读取当前时钟，所以 raw `.zdump` 中间层不是严格时间无关。两次最终规范化输出一致不能扩写为每个中间层都确定性。

## 5. decoy、quarantine 与失败运行边界

两个不同 decoy 均没有改变成功 `packed`：

- decoy A：空 `zones/links/countries`；结果仍为 715,527 bytes／`43f787…fe81`。
- decoy B：包含 `Etc/Decoy|DCOY|0|0||`；结果仍为 715,527 bytes／`43f787…fe81`。

clean run 前，tag committed `meta/packed/unpacked` 被移入同 cwd 的 quarantine，任务的已审计静态路径没有读取它们。但 quarantine 在同一 cwd 中理论可访问，且没有 ProcMon/ETW/syscall read-set trace，因此：

```text
targetInvisibilityMechanicallyEstablished = false
osLevelReadSetTraceCaptured = false
quarantinedTargetsTheoreticallyAccessible = true
```

两次诊断失败输出只作为失败记录；操作员记录和审计到的静态输入路径未显示其被成功运行消费，但在缺少完整进程 read-set trace 的条件下不能机械排除其使用：

| 失败诊断 | bytes | SHA-256 |
| --- | ---: | --- |
| missing `SUPPRESS_TZDIR` unpacked | 162,529 | `b690927225f9005e187f630368e9e46326d54c21d57e36983f9e8e0adb6dc017` |
| missing `SUPPRESS_TZDIR` packed | 29,296 | `6ce2321ffa4efa29c4491c7408f8bf7fc58e3641d971c1739177e174ca8f6704` |
| abbreviation missing before private `time_t` unpacked | 12,379,767 | `229dac1864bea1bb23574862700ed201144a2c922d2f182f9245fa8f094802c5` |
| abbreviation missing before private `time_t` packed | 720,209 | `881b41090f0dd44fbfa541354414f1829871b2fe5891566ccfae617a4586054d` |

两次失败 run 的 collect bytes/hash 都是 `unavailable_not_captured`，不能补写或猜测。

## 6. 执行、网络与环境边界

clean run 使用隔离 npm cache，并在命令行使用 `npm.cmd ci --offline --ignore-scripts --no-audit --no-fund`；随后审计到的命令依次执行 `data-meta data-zic`、`data-zdump`、`data-collect data-dedupe data-pack`，没有显式 download task。首次 cache 填充需要网络；由于没有 OS 级网络隔离或完整进程网络 trace，只能声明 `npmOfflineFlagUsed=true`，不能机械声明运行期零网络访问。

观察到的网络读取集合包括 GitHub codeload、GitHub tag-ref／commit API、IANA tzdata／tzcode、Zig index／zip，以及 lock 命名的 npm registry tarballs。没有 credentials 或第三方后台访问。ambient `PATH` 未封闭；Zig 使用了默认共享 compiler cache，编译含 host CPU `alderlake`，外层完整编译 argv 也没有持久 raw receipt。因此：

```text
networkIsolationEstablished = false
networkIsolationMechanicallyEstablished = false
environmentClosureEstablished = false
crossHostToolBitReproducibilityEstablished = false
toolchainCrossHostBitReproducibilityEstablished = false
publisherOriginalBuildProvenanceEstablished = false
publisherBuildProvenanceEstablished = false
osLevelExpectedOutputInvisibilityEstablished = false
completeProcessReadSetMechanicallyTraced = false
probeReceiptCryptographicallyAttested = false
replayableFromThisRecordAlone = false
```

## 7. 落盘与快照边界

probe runner 与 raw probe report 都没有持久化。本说明和机器账只是操作员记录的最小观察投影，不是原始执行 receipt。操作员记录 probe root 与本探针创建的 Zig cache 清理后均 `existsAfter=false`，并记录 `remoteBodiesPersistedInRepo=0`、`projectFilesModified=0`、`projectFilesDeleted=0`；这些均不是 workspace-wide 机械扫描证明：

```text
workspaceWideAbsenceMechanicallyVerified = false
remoteBodiesPersistedInThisRecord = 0
remoteBodiesPersistedByThisProbeInRepoAfterCleanupOperatorRecorded = 0
```

逐文件 held-handle 与两次临时运行没有建立跨文件原子快照、mutation epoch、interval integrity 或 ABA exclusion：

```text
crossFileAtomicSnapshotEstablished = false
mutationEpochReceipt = null
intervalMutationExcluded = false
abaExcluded = false
```

仓库提供的 writer 使用 exclusive create（`wx`），但当前 observation JSON 在初次创建后经过定向修订，不能声称当前字节本身由该 writer 一次性生成：

```text
providedWriterUsesExclusiveCreate = true
currentArtifactWriteProvenanceEstablished = false
```

CLI 会在动态加载业务模块前拒绝仍可见的 preload／loader flags、`NODE_OPTIONS` 与 `NODE_PATH`，这只是一道防误用门。Node preload 可在入口前执行并抹除 `process.execArgv`，因此 `preEntryExecutionOrErasureExcluded=false`、`launcherIntegrityEstablished=false`；机器测试显式保留这条可绕边界。

## 8. 真值、权利与发布分账

| 账 | 当前结果 |
| --- | --- |
| 工程证据 | 操作员记录的两次逐字节重建观察；未形成持久 raw receipt 或完全密封执行环境 |
| 浏览器／运行时证据 | 未运行应用、浏览器、PWA、Service Worker 或公开主机 |
| 内容真值 | `false` |
| 专家真值 | `0/2` |
| 权利法律判断 | `false`；来源与变换观察不等于许可 clearance |
| 发布就绪 | `false` |
| 公开部署／公开发布授权 | `false / false` |

本 observation child 只能给 `western.input.calendar-time-zone-and-dst` 与 `western.rights.ephemeris-time-data-redistribution` 两个 subject 提供 partial evidence。两者都保持 `subjectFullySatisfied=false`、`transformationProvenanceEstablished=false`、无 frozen binding。它不修改 Binding、manifest、registry 或 owner admission，active effect 为 `none`。
