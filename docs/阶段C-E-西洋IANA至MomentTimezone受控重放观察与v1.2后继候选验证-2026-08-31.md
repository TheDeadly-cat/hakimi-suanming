# 阶段 C/E：西洋 IANA 至 Moment-Timezone 受控重放观察与 v1.2 后继候选验证

- 日期：2026-08-31
- 体系：`western-astrology`
- 默认发布治理：`legacy-v13 / targetSchema 13 / migrationId null`
- 正式来源 Binding：`0/28`
- 受控重放 observation subjects：`0/2` fully satisfied
- 状态：局部工程观察与非正式后继候选通过；无正式 active effect

## 1. 当前结论

本阶段在既有 IANA tzdb 2026c 来源／权利 evidence child 与非正式 v1.1 来源候选账之上，增加了两层互相分账的机械材料：

1. `western-tzdb-2026c-controlled-reproduction-observation.v1.json` 保存一次临时 Windows 探针的操作员记录、点时、两次运行、最终逐字节一致观察。它没有保存 probe runner 或 raw receipt，也没有建立发布者原构建 provenance。
2. `western-source-binding-requirements.v1.2.0.json` 只把该 observation 追加到两个既有 partial source candidate subject。它不替换 v1.1 的来源 identity、三条最小 quote 观察、rights 字段或 candidate evidence。

正式 current 始终是 v1：

```text
formal v1 is current = true
nonformal v1.1 is current = false
nonformal v1.1 remains formal current = false
nonformal v1.2 is current = false
v1.2 active effect = none
manifest / registry / owner admission = false / false / false
```

v1.2 以 v1.1 为比较基线：`western.input.calendar-time-zone-and-dst` 与 `western.rights.ephemeris-time-data-redistribution` 只追加 observation 字段，其余 26 个 subject 与 v1.1 canonical-exact。两个目标仍为 unbound／unsatisfied，`sourceBodyDigest=null`，`exactQuotesBound=0`，正式冻结 Binding 仍为 `0/28`。

## 2. 当前冻结身份

| artifact | bytes | raw SHA-256 | semantic digest |
| --- | ---: | --- | --- |
| source-rights child | 16,931 | `ee61453078f7e4df39c71ee59dcfc94f75ab37a7cd0d967849e1049d748d1ee1` | `14361c93e29d257080b25c0f3e580345243930acb07da450f938fbf6f02b8465` |
| controlled-reproduction observation child | 26,020 | `41ef81e05f428286be7721529dbb0e911ad408b1d8a583b24abadac5f23f3d76` | `5d3eea3297b7cd024fb53f5a9c9e92d5a396f972d802fede6ced7c58f496b612` |
| nonformal v1.1 successor | 34,338 | `7f50fd5a7fd09647d1a91fc1c663e30acc56828962b98624aeeb73e985dba0fc` | `254fbc561d3a82a4b9dfaf969b472de7dfcbb9543299b4f69cc9a9944e6994db` |
| nonformal v1.2 successor | 40,667 | `e9894ce51541d284a58aa59b1d175a121746dbd1d6521b16a700cf64c05c63c1` | `91708bf49785148eede41872717104949fa9725732e661c25a115788a983dd58` |

observation 说明文档固定为 13,880 bytes／SHA-256 `6ce0cafdbc7dab24615f5fe38a35886c48a519555c121035b328aa0872980137`。

## 3. 两次重放实际观察与不能外推的性质

两个成功运行都从固定 IANA `tzdata2026c`／`tzcode2026c`、Moment-Timezone tag `0.6.3` 的任务与 lock、固定 Zig／Node／npm 身份出发。两个不同 decoy 下得到相同最终输出：

| 输出 | bytes | SHA-256 |
| --- | ---: | --- |
| `meta` | 97,948 | `89fdbb1808eb6b9a5d40ff63b694a3952bcf294384659b88c05f736c50d86ab5` |
| `collect` | 20,285,927 | `ed166fef0b9697f47725339b68517412ca2dc1790afee17ffb21fc4f52d80a03` |
| `unpacked` | 11,572,929 | `038699f5d72273ef90c7abe94b8f485776012840b340ddad79cd55cfe743565a` |
| `packed` | 715,527 | `43f7878a298740ff6acabb9c726c7e5431a94bdca79abad274a6fe6e355bfe81` |

每次生成 597 个 TZif 与 597 个 `.zdump`。最终 `meta`／`packed` 与项目安装依赖逐字节相等，最终 `unpacked` 与 tag committed 文件逐字节相等。该观察仍明确保持以下结论为 `false`：

- 完整 transformation provenance 与 publisher build/original build provenance；
- OS 级目标不可见、完整进程 read-set trace、网络隔离与环境封闭；
- 跨主机工具位级可复现、receipt cryptographic attestation、从本记录单独 replay；
- commit/tag signature、signing-key trust 与 publisher authenticity；
- workspace-wide 清理／缺失证明、跨文件原子快照、mutation epoch、interval mutation 排除与 ABA 排除。

quarantine 与 reference 仍物理位于同一临时 cwd，理论可读；没有 ProcMon／ETW／syscall trace。固定偏移 zone 的 `.zdump` fallback 会读取当前时钟，所以不能声称每层中间物都时间无关。项目安装的 `moment-timezone-utils.js` 会通过 package index 循环读入 packed target，因而没有被用作 transformer；临时探针改用固定 source tag 的完整任务链与非目标 decoy。

## 4. 机械信任链与失败关闭

v1.2 loader 必须同时消费真实私有品牌的 v1.1、controlled-reproduction observation 与 source-rights child，并交叉核对 v1.1 与 observation 指向同一 source-rights identity。结构 clone、JSON clone、手工 freeze、伪造 `ok/id/digest/path` 或重新计算 digest 的 self-reseal 都不能替代私有品牌。

输入与运行时边界继续包括：held-handle same-endpoint 重验、严格 duplicate-key JSON、有限 passive capture、拒绝 Proxy／accessor／alias／cycle／异常 prototype／Symbol／sparse／non-enumerable／`-0`、捕获 primordials、安全 pretty materialization、唯一 LF JSON、domain-separated digest、`wx` exclusive writer，以及业务动态导入前的可见 argv／`NODE_OPTIONS`／`NODE_PATH`／preload／cwd guard。

该 launcher 只能拒绝可见误用；preload 可先运行并抹除 `execArgv`，所以 `preEntryExecutionOrErasureExcluded=false / launcherIntegrityEstablished=false`。

## 5. 当前验证

- observation、source-rights、v1.1、v1.2 相关 10 个脚本分别通过 `node --check`。
- 四个关联 test files：默认隔离 `98/98`；显式 `--test-concurrency=1` 也是 `98/98`。
- v1.2 dedicated：默认 `23/23`、串行 `23/23`；observation dedicated：默认 `28/28`、串行 `28/28`。
- observation 与 v1.2 verifier 均 exit 0；CLI 分别保持 `0/28`、`0/2`、无 provenance／legal／release／public authority。
- `npm run check:release-governance` exit 0，保持 `legacy-v13 / 13 / null`、`publicDeploymentAuthorized=false / expertClaimsAuthorized=false`。
- 两轮独立只读对抗审查最终均为 `P1=0 / P2=0`；observation 审查期间发现并修复 inherited `Object/Array.prototype.toJSON` 与缺失显式 false/0 字段问题。

`npm run check:system-contract-draft-boundaries` 当前 exit 1。它明确报告禁读文件未被检查，并另外列出既有／其他范围的 non-literal dynamic import 与未登记依赖；本轮新增 observation／v1.2 文件不在该诊断清单。该红线没有被绕过或包装成通过。

本阶段未运行全仓 typecheck、默认 Web build、完整应用、浏览器、PWA／Service Worker、Chrome／Edge 跨浏览器、公开主机、Release Evidence、部署或回滚。受限文件 `apps/web/src/lib/local-user-data-cleanup.ts` 未读取、未修改。

## 6. 分账结论

| 账 | 当前结果 |
| --- | --- |
| 工程证据 | 两次最终逐字节观察、固定机器身份、私有品牌链与 v1.2 非正式机械闭包通过 |
| 浏览器／运行时证据 | 未执行应用、浏览器、PWA、公开主机或部署运行时验证 |
| 内容真值 | `false` |
| 专家真值 | `0/2` |
| 权利法律判断 | `not_established`；逐字节重放不等于三层许可 clearance 或再分发授权 |
| 发布就绪 | `false` |
| 公开部署／公开发布授权 | `false / false` |

本切片只推进西洋体系时区数据来源链的工程可复核性。它不覆盖 JPL／NAIF、IERS／EOP、闰秒、SOFA、Swiss Ephemeris、星盘规则、解释内容、现实专家审定或高风险表达边界，也不能外推为八字、紫微或吠陀体系权威。
