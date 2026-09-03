# 阶段 E：紫微当前同产物 Chrome／Edge 回执 v1.1 与四体系 v2.5（2026-09-01）

## 0. 状态结论

本轮按“先推进 C、D 或其他体系”的新优先级，选择紫微作为其他体系的下一项窄机械闭包，完成两件 append-only 工作：

1. 新增紫微 same-artifact browser observation child v1.1。它完整嵌入本轮实际运行得到的当前候选，先通过既有 v1 对象验证，再依据当前工作区的 source／tool graph 重建并做 canonical exact 比较；Chrome 与 Edge 共 28/28 场景结果来自同一 output tree。
2. 新增四体系 current-status child v2.5。它只把紫微的浏览器状态从历史 stale 更新为当前 isolated-loopback 观察；八字、西洋、吠陀与 v2.4 保持 canonical exact，四体系 32 个 admission gates 仍满足 0。

这两项只建立窄工程证据与隔离浏览器／运行时证据，不建立紫微内容真值、专家真值、来源许可结论、正式 Domain Manifest、产品运行时、发布就绪或公开发布授权。历史紫微 v1.0 与正式 Manifest 没有被覆盖、重绑、重签或“洗绿”。

项目治理继续固定为：

| 字段 | 当前值 |
|---|---|
| release identity | legacy-v13 |
| targetSchema | 13 |
| migrationId | null |
| mutation epoch receipt | null |
| cross-file atomic snapshot | false |
| interval mutation excluded | false |
| ABA excluded | false |
| publicDeploymentAuthorized | false |
| expertClaimsAuthorized | false |
| publicReleaseAuthorized | false |

## 1. 新增工件与冻结身份

### 1.1 紫微 browser observation child v1.1

| 文件 | Bytes | Raw SHA-256 |
|---|---:|---|
| [v1.1 artifact](../content/system-admission/ziwei-same-artifact-browser-observation-child.v1.1.0.json) | 57,541 | da3c5da3b0e587e826235af9401df2b5b48618c7e37f89ede3d5a5deb7ed80c5 |
| [loader library](../scripts/ziwei-same-artifact-browser-observation-child-v1-1-lib.mjs) | 36,618 | 5ccfb8621b1b25c7f00a2c519511d98f6a5357ee5d39667fb28da1b21caf72c1 |
| [verification CLI](../scripts/verify-ziwei-same-artifact-browser-observation-child-v1-1.mjs) | 3,184 | d94600602c09f866c10b9aad9d65fa7ab2c6047bfc88d4fbaec12d9f18cf8776 |
| [adversarial tests](../scripts/verify-ziwei-same-artifact-browser-observation-child-v1-1.test.mjs) | 15,288 | c41dd8029c74af013daae1fb2704b805ed030c5d09d67d0182cefa4dd233bafc |

语义身份：

| 字段 | 值 |
|---|---|
| childId | hakimi.ziwei.same-artifact-browser-observation/1.1.0 |
| createdAt | 2026-09-01T09:09:15.323Z |
| childDigest | 08d717d62f84dc3146069d387904aa7e8626cca2f12594154b5e5002b2e355e7 |
| embedded base observationDigest | 4b4b334d9ea029006fba89707fa7d856df844c09bb546598854c2d1f91742d28 |
| embedded base canonical bytes | 37,336 |
| embedded base canonical SHA-256 | dee58c354d8d97cfa2ffdf9ffed616d6278aea1a6023ffe57dce15bb708d8f4a |
| rendered input raw bytes | 47,412 |
| rendered input raw SHA-256 | d448314afa18542495cbbab255090e9f076d3caa3de8e864f45bea878a95c4de |

`rendered input` 是本轮临时组装输入；其路径不进入持久化身份。v1.1 artifact 持久化完整 base observation，并固定其 raw input 身份与 canonical 身份，但这不等于可信外部时间戳、签名或可从临时原文件独立重放。runtime 与 rendered-candidate 两个临时 JSON 已在 artifact／文档冻结后按精确文件名、直接系统临时目录边界与预期 bytes 校验删除。

### 1.2 四体系 current-status child v2.5

| 文件 | Bytes | Raw SHA-256 |
|---|---:|---|
| [v2.5 artifact](../content/system-admission/four-system-current-status-observation-child.v2.5.0.json) | 17,970 | 020ce7b2affa18fa25483ffbded8400ef4bb5151e822fee17d68f33afb610ec2 |
| [loader library](../scripts/four-system-current-status-observation-child-v2-5-lib.mjs) | 35,168 | 268335bbcc9ac760a901e8700acc20d5263690e144f1b751483fee1b6975e534 |
| [verification CLI](../scripts/verify-four-system-current-status-observation-child-v2-5.mjs) | 3,460 | ca4e98bc3a34340ba758c64b200bb538f1c3e76c312698b59afe0f7f0ce3f644 |
| [adversarial tests](../scripts/verify-four-system-current-status-observation-child-v2-5.test.mjs) | 22,850 | 7429a7e1d485a4146fddf5417046dfc04fee3b535c5aa393b710fedc86181717 |

语义身份：

| 字段 | 值 |
|---|---|
| childId | hakimi.system-admission/four-system-current-status-observation-child/2.5.0 |
| createdAt | 2026-09-01T09:30:20.774Z |
| childDigest | 183253a83af0029a525eefe95207e4b4ad39d7febcc00c5c317bbaa5e837cdbc |
| direct parent | four-system current-status v2.4 |
| new direct input | Ziwei browser observation v1.1 |
| activeAdmissionEffect | none |

## 2. 实际 Chrome／Edge 同产物观察

本轮实际执行：

```text
node scripts/run-ziwei-same-artifact-browser-observation.mjs
```

结果为：

| 观察项 | 结果 |
|---|---|
| authored source endpoints | 50，逐文件 bytes／SHA 与当前工作区一致 |
| source graph digest | d3068988b677f78595ae0ef666070ac85d26505b972c757c1089fb5d719cc34d |
| evidence-tool endpoints | 14，逐文件 bytes／SHA 与当前工作区一致 |
| tool graph digest | 4518aee1c861682192f4a8f1a5b777c5a2db0a3986b6e447e559fe2df92f4755 |
| output tree digest | bc8ee283121de68f60290ee08930e41add28e87447b7830212fd49946307a5a6 |
| Chrome | 151.0.7922.174，14/14 |
| Edge | 152.0.4191.53，14/14 |
| total | 28/28 passed，0 failed，0 retried |
| build relationship | 单一构建；两浏览器得到同一 output tree |
| source/output stability | 运行前后 source graph 与 output tree identity 一致 |

数据边界保持为：

- 只使用 synthetic inputs；`actualPersonDataEntered=false`；
- `candidateAnonymous=false` 必须保持原值，不能误写为匿名证据；
- 未包含出生原文、派生命盘 digest、反馈正文、备份正文／digest、Revision／study id、截图、trace、video、download 或 raw Playwright report；
- `safeToLog=false`、`safeToPublish=false`；
- formal production-browser、Release Evidence、部署、回滚、专家和权利 receipt 均为 0。

这条绿色只表示当前 source／tool graph 下的 isolated-loopback same-artifact 浏览器观察。它不覆盖完整主应用、PWA／Service Worker、公开主机、固定物理设备、生产浏览器运行时、正式仓储边界、部署或回滚。

## 3. 应用内 Browser 补充 QA：单独记账

除持久化 v1.1 的 Chrome／Edge runner 外，本轮还用应用内 Browser 对一个临时、受控的 production build 做了补充渲染 QA：

- Vite 7.3.6 完成 110 modules 构建并在 loopback 临时服务；
- 页面标题为“紫微本地研究档案 · 隔离草案”，无框架错误覆盖层，console warning／error 为 0；
- 打开本地档案后记录数为 0；点击“生成完整工程工件”后出现“排盘完成并通过工程核对；尚未写入本地档案。”；记录数仍为 0，没有自动保存；
- 390×844 视口下 `innerWidth=390`、`clientWidth=375`、`scrollWidth=375`，未观察到水平溢出；
- Browser tab、临时 server 与临时 build tree 均已关闭或清理。

这组 QA 没有写入 v1.1 artifact，也不替代持久化 runner 的 Chrome／Edge 证据。它只是额外证明隔离页面可渲染、关键交互保持中性且没有自动写档；不是完整应用、PWA、公开主机或生产环境验收。

## 4. v1.1 的 current、历史与私有品牌边界

v1.1 full loader 的成功合取门包括：

- 从固定路径 stable-read v1.1 artifact，并完成 strict JSON、raw bytes／SHA、self digest 与唯一 LF materialization 精确验证；
- 消费当前 expert-drift receipt 的 fixed-path full-loader 私有品牌；
- 对历史 v1.0 使用同一 held handle 完成 raw＋self identity 验证，同时不调用其 stale loader；
- 对 embedded base 调用既有 v1 object verifier，再用 embedded runtime observation 与 createdAt 对当前 source／tool／formal-context graph 重建并做 canonical exact 比较；
- 对完整 v1.1 current projection 做 exact 比较；只有全部合取门通过后才授予新的 WeakSet 私有品牌。

当前 expert-drift receipt 固定身份为：

| 字段 | 值 |
|---|---|
| path | content/system-admission/ziwei-expert-promotion-boundary-identity-drift-receipt-candidate.v1.0.0.json |
| raw bytes | 7,905 |
| raw SHA-256 | c6728e943d713cf63be2b1d7e01d5170cf2a2b7b308e332abbbc53ff1ab37348 |
| receiptDigest | 09d86df6f23d4c1cbc0a76df359dd0738f793de5bdf84e4784b0620a3a6f05bb |

历史 browser v1.0 只按 held-handle raw＋self identity 观察：

| 字段 | 值 |
|---|---|
| raw bytes | 37,337 |
| raw SHA-256 | 7cd6365d6f6ad18f0460418e5b745da0f0e68761cea361886729e55563e4db16 |
| observationDigest | 792bba4b3c5307fe3bc08aed849eaeb092787eb9e171e09a9e82b3be4dd71a1b |
| current | false |
| rebind／resign | false |
| stale loader invoked by v1.1 | false |

正式 Manifest 的历史身份也只作 stale 账本保存；本轮没有产生 current candidate Manifest，没有 owner promotion receipt，也没有重绑或重签。

## 5. CLI fail-open 的发现、修复与剩余边界

v1.1 初版 focused tests 通过后，独立审计发现一个可复现 P1：CLI 在检查 visible preload 前，先用可被 `--import` 污染的 `String.prototype.toLowerCase()` 判断 direct execution。恶意 preload 可使 `main()` 不运行、无输出并静默 exit 0。

第一次只移除 `toLowerCase()` 的修补仍不充分：visible preload 仍可先改写 `process.argv[1]`，再次绕过 direct dispatch 并静默 exit 0。因此最终修复把 visible `NODE_OPTIONS`／`NODE_PATH`／`process.execArgv` preload 检查提前到任何 direct／import 分流之前，并用逐字符 option 比较避免依赖字符串或正则原型。

最终回归同时固定：

- `toLowerCase` poisoning：exit 1，`VISIBLE_PRELOAD_ARGUMENT_FORBIDDEN`；
- `process.argv[1] = "x"` poisoning：exit 1，`VISIBLE_PRELOAD_ARGUMENT_FORBIDDEN`；
- 普通 CLI：exit 0，且必须输出固定 OK prefix；
- 普通无-preload import：不运行 main，不覆盖调用方既有 `process.exitCode`。

v2.5 CLI 从一开始即把 visible preload 拒绝置于 direct dispatch 前，并对同两种 PoC 返回 exit 1。

这不建立 hidden-preload 排除或 pre-import intrinsic integrity。若 preload 先隐藏／删除自己的 `process.execArgv` 痕迹，当前 CLI 不能把它证明为不存在；v1.1 artifact 已明确固定 `hiddenPreloadExcluded=false`、`preImportIntrinsicIntegrityEstablished=false`，因此不得对外扩大声明。

## 6. 四体系 v2.5：只更新紫微浏览器状态

v2.5 只消费两个 direct fixed-path full-loader 私有品牌：

1. v2.4 parent：16,791 bytes，raw SHA-256 `fa70f8dbe13cacb0a4af282cfed4055a088d9c29d3d76fbb85a4bf52aa737e58`，childDigest `bc685bb8da2f4a285eda645ab883da002c526cc80d800f2406fe9e0386a04840`；
2. 紫微 browser child v1.1：57,541 bytes，raw SHA-256 `da3c5da3b0e587e826235af9401df2b5b48618c7e37f89ede3d5a5deb7ed80c5`，childDigest `08d717d62f84dc3146069d387904aa7e8626cca2f12594154b5e5002b2e355e7`。

相对 v2.4，体系投影只允许紫微改变三个字段：

- `currentStatus` 更新为当前 expert-drift receipt + 当前 isolated same-artifact browser child，同时明确 formal Manifest stale；
- `currentEvidence.browserRuntimeEvidence` 更新为 Chrome／Edge 28/28 当前 source graph 的隔离观察，同时明确不是 Web／PWA／产品运行时；
- `currentEvidence.endpoints` 精确为既有 expert-drift receipt + 新 browser v1.1，顺序固定。

`doesNotEstablish` 中原先会与新隔离浏览器观察冲突的旧表述，被校准为“不建立 current formal Ziwei Domain Manifest 或 production browser runtime evidence”。central registry、既有 Manifest、owner receipt 与任何 admission authority 均未修改。

| 体系 | 当前窄工程状态 | Binding frozen | 现实独立专家 | Admission gates | 正式 full Domain Manifest | 公开发布授权 |
|---|---|---:|---:|---:|---:|---:|
| 八字 | v2.4 machine-identity 状态 canonical exact copy | 0/12 | 0/2 | 0/8 | false | false |
| 紫微 | expert-drift receipt + 当前 isolated Chrome／Edge 28/28 child | 0/27 | 0/2 | 0/8 | false | false |
| 西洋 | v2.4 source／Manifest drift 状态 canonical exact copy | 0/28 | 0/2 | 0/8 | false | false |
| 吠陀 | v2.4 engineering／civil-time isolated 状态 canonical exact copy | 0/38 | 0/2 | 0/8 | false | false |

合计仍为 32 个 admission gates 满足 0；formally admitted systems、domain-authority systems、release-ready systems 与 public-release-authorized systems 均为 0。

v2.5 CLI 摘要中的 `releaseIdentity="legacy-v13"` 只是项目 `activeLine` 的别名，不是紫微产品 release identity；紫微、西洋、吠陀的独立产品 `releaseIdentity / targetSchema / migrationId` 仍分别保持 `null / null / null`。

## 7. 聚焦验证

| 验证 | 结果 | 仅能证明 |
|---|---:|---|
| Ziwei v1.1 focused tests | default 14/14；serial 14/14 | fixed-path raw／self／canonical、current rebuild、历史 stale、expert private brand、数据与权限红线、visible-preload 回归 |
| four-system v2.5 focused tests | default 24/24；serial 24/24 | 双 direct private brand、唯一 Ziwei delta、三体系 exact copy、32 门全红、两种 preload PoC |
| v2.4 + expert drift + Ziwei v1.1 + v2.5 串行合并 | 4 files / 72 tests | `--test-concurrency=1` 文件级串行调度下的机械闭包；未宣称 no-isolation 或同一进程 |
| 6 个新 `.mjs` 的 `node --check` | 6/6 | 两组 lib／CLI／test 语法闭合 |
| Ziwei v1.1 CLI | exit 0 + 固定 OK prefix | exact persisted branded v1.1 当前机械摘要 |
| four-system v2.5 CLI | exit 0 + 固定 OK prefix | 校准后的四体系当前状态与全红 summary |
| release governance CLI | exit 0 | 默认仍为 legacy-v13 / 13 / null；公开部署与专家授权仍关闭 |
| 两轮独立审计 | 初始 CLI P1 被复现并修复；最终指定 PoC 通过 | 列明的仍可见 preload flags 与两条指定 PoC 均 fail-closed；pre-evaluation 代码隐藏自身痕迹的边界未建立 |

测试、CLI、哈希和私有品牌只证明列明的机械关系。它们不是 Node／browser binary、launcher、OS、可信时间源、专家、内容或法律 attestation。

当前还有一个低优先测试缺口：v2.5 已正向固定 persisted raw／canonical 与上游私有品牌，但多数负向篡改用例作用于内存 projection；尚未另建 temp-root 端到端 raw／canonical／upstream drift 拒绝矩阵。这不改变当前红门，也不得被省略为“所有存储漂移路径均已端到端覆盖”。

v1.7 frozen golden SHA-256 保持不变：

`aba357d98a99271cc9a9b2727ad1c7c516424c94b7cf34f765cb38b0e9a74b29`

## 8. 必须单独保存的 expected-red

历史入口继续因固定上游身份漂移而 fail-closed；这些红线没有被 v1.1 或 v2.5 改写为绿色：

| 历史入口 | 当前实际结果 | 本轮处理 |
|---|---:|---|
| Ziwei same-artifact browser v1.0 CLI | exit 1 / `SOURCE_GRAPH_MISMATCH` | 保持历史 raw＋self 身份；不调用 stale loader，不 rebind／reseal |
| independent Domain Manifest aggregate CLI | exit 1 / `MANIFEST_MISMATCH` | 正式 Manifest 继续 stale；不覆盖、不重签 |

新 v1.1 的 isolated browser green 与上述历史 expected-red 是不同账本。它不能反向证明历史 v1.0 current，也不能证明正式 Manifest、内容、专家、权利或发布 current。

## 9. 七账分离

| 账本 | 本轮结论 |
|---|---|
| 工程证据 | v1.1 当前 base rebuild、fixed-path raw／self／canonical、expert receipt 私有品牌，以及 v2.5 唯一投影与三体系 exact copy 已机械验证 |
| 浏览器／运行时证据 | isolated-loopback Chrome 14/14 + Edge 14/14，同一 output tree；另有应用内 Browser 补充渲染 QA；production／PWA／公开主机／固定设备均未建立 |
| 内容真值 | not_established；27 条紫微 binding 仍为 0/27，没有因此证明历法、宫位、规则或解释权威 |
| 专家真值 | not_established；现实独立专家仍为 0/2，意见仍为 0/2 |
| 权利法律判断 | not_established；作品层、版本层、载体层许可与 HKO 相关权利判断均未闭合 |
| 发布就绪 | false；没有正式 Release Evidence、生产部署或回滚确认 |
| 公开发布授权 | publicDeploymentAuthorized=false / publicReleaseAuthorized=false / expertClaimsAuthorized=false |

## 10. 本轮未做与下一真实输入

本轮没有运行全仓 typecheck 或默认 Web build。已知既有阻塞文件 `apps/web/src/lib/local-user-data-cleanup.ts` 没有被读取或修改。也没有执行 Git 操作，没有访问未经授权的第三方后台，没有复制第三方 prompt、知识库、断语或资产。

下一项紫微真实输入不是继续增加同类零权限观察，而是：

1. owner 对正式 Domain Manifest rebind／resign 的明确决定与可验证 receipt；
2. 27 条 binding 逐条取得并冻结可靠底本／版本、来源正文、exact quote，以及作品层／版本层／载体层许可依据；不能再分发的材料继续 private 或 link-only；
3. 至少两位现实专家的身份、资质、scope、彼此独立性、知情同意与原创意见；两份意见并列保存，分歧不得多数表决、平均或由生成模型自动选赢家；
4. HKO 相关 live-check 与权利法律判断的独立闭环；
5. 高风险表达、语义／调用图覆盖与正式 admission 决策；
6. 完整主应用、正式仓储边界、PWA／Service Worker、公开主机、Chrome／Edge 生产验收、Release Evidence、部署与回滚确认。

在这些输入完成前，紫微仍是独立隔离草案；八字 v1.7、西洋或吠陀的任何结果都不能外推为紫微权威，紫微本轮 28/28 也不能外推为其他体系或公开发布授权。
