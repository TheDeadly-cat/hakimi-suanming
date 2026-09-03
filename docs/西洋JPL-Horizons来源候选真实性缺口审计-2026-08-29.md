# 西洋 JPL Horizons 来源候选真实性缺口审计

日期：2026-08-29

## 结论

当前仍不得把 `western.astronomy.official-horizons-differential` 登记为真实来源候选。西洋来源账继续保持 `0/28 candidate`、`0/28 frozen`。

本轮把离线机械入口升级为 `western-horizons-differential-query/0.2-draft` 与 `western-horizons-differential-report/0.2-draft`，并用一次不落盘的公开端点读取确认当前文本形状可穿过 verifier。这只建立查询与解析器的当前运行时兼容性；项目仍没有保存可复核的 raw body、独立 retrieval envelope、来源候选 child、三层权利结论或专家真值。

## 查询错误修正与瞬时兼容探针

旧 `0.1-draft` 把 `START_TIME` 与 `STOP_TIME` 设为同一时刻；官方 API 虽返回 HTTP 200，payload 实际为 `Bad dates -- start must be earlier than stop`。HTTP 200 因而不能充当成功证据。

当前 `0.2-draft` 改用官方离散时刻接口 `TLIST='2025-03-20 09:01:00' / TLIST_TYPE=CAL`，不再混入 `START_TIME`、`STOP_TIME` 或 `STEP_SIZE`。查询共 21 个有序显式参数，并固定 `OBJ_DATA=NO`、`MAKE_EPHEM=YES`、`COORD_TYPE=GEODETIC`、`SITE_COORD='0,0,0'`、`TIME_DIGITS=FRACSEC`、`TIME_TYPE=UT`、`CAL_TYPE=GREGORIAN`、`REF_PLANE=FRAME`、`REF_SYSTEM=ICRF`、`OUT_UNITS=AU-D`、`VEC_TABLE=1`、`VEC_CORR=LT`、`VEC_LABELS=YES`、`VEC_DELTA_T=NO` 与 `CSV_FORMAT=NO`；保留引号、空格、冒号、`@` 和逗号的 RFC 3986 百分号编码。

当前瞬时探针观察到：

- PowerShell 系统网络路径返回 HTTP 200、5,041 UTF-8 bytes；当前 body 报 `API VERSION: 1.2`、Sun (10)／Earth (399)、`DE441`、`DISCRETE TIME-LIST`、Gregorian、AU-D、LT corrected、position only、ICRF、单一 `$$SOE/$$EOE` 区间和一条两行式 epoch + X/Y/Z 记录；
- 相同进程内把 PowerShell 响应以原始 bytes 交给新 verifier，得到 1 条 branded／deep-frozen 机械结果；输出仍固定 `publisherAuthenticityEstablished=false`、`networkProvenanceEstablished=false`、`rightsCleared=false`；
- Node 自带 `fetch` 的独立直连路径本轮超时；这说明网络路径本身仍不统一，不能从 PowerShell 成功外推完整运行时可达性；
- body、record 与 raw digest 均未写入项目，探针结束后没有新增 `evidence/` 文件或来源候选实例。

这里的 5,041 bytes、DE441 与 EOP header 只是本次瞬时观察，不是冻结 source body、长期 API 版本承诺或 JPL 数据真值。

## 已关闭的机械缺口

当前 verifier 已关闭原审计列出的本地结构绕过：

- 完整 `sourceUrl` 必须逐字等于由 manifest 构造的 canonical query；相邻 path、endpoint 前缀和额外 query 全部拒绝；
- `retrievedAtIso` 必须是实际存在的规范毫秒 `Z` UTC；record 只允许精确 v2 data-property key 集，拒绝 getter、Symbol、额外字段和提权位；
- 只接受 exact `Uint8Array` + fixed attached `ArrayBuffer`，拒绝 subclass／Proxy 间接形态、Shared／Resizable／detached buffer、BOM、NUL、空 body 与超限 body；入口立即复制私有快照，hash 与 parse 复用同一 snapshot；
- API version/source、target、center、center site、start/stop、discrete step、units、calendar mode、correction、output format、EOP observation、frame、JDUT／XYZ header 必须唯一并按固定顺序位于 `$$SOE` 之前；
- `$$SOE` 与 `$$EOE` 必须各恰好一次且有序；表内必须是精确两行的固定 JDUT + UTC label 与单一 X/Y/Z，表外额外 epoch／vector 行、重复／倒序 marker、错误 JDUT 和超界 Sun／geocenter 向量均拒绝；
- verifier 返回对象由 module-private WeakSet 标记并深冻结；直接伪造 `VerifiedHorizonsResponse` 不能生成 computed report；旧 `verifyOfficialHorizonsResponse` 对任何机械候选都恒拒，避免把 candidate mechanics 晋级成 official evidence；
- computed report 携带完整 query URL、raw body SHA-256、evidence-record canonical SHA-256、API／DE／EOP 观察值、result digest 与 request + execution + result + failure 的 payload digest；所有真值、来源真实性、网络 provenance 与权利位继续为 false；
- direct constructor 与 orchestration 入口对 null、getter、hostile Proxy、无效 envelope、极端有限数和下游 schema 错误总化为 `failed_closed`，不再出现“verifier 成功、报告阶段抛异常”。

## 仍未关闭的真实性与序列化边界

机械 hash 是无密钥完整性关系。提交者仍可共同构造一份自洽 record/body、重算 SHA-256，并仿造公开 header；本地 parser 无法由这些字符串证明 publisher identity、TLS channel、独立 retrieval provenance 或法律权利。

同理，导出的 `horizonsDifferentialReportSchema` 只校验序列化结构与自洽 digest。攻击者若自行重算 digest，仍可构造 structural-only report。只有当前进程内由受控 constructor 生成的对象具有 module-private report brand；序列化后必须重新携 raw bytes、candidate record 与 astronomy envelope 重放 `runHorizonsDifferential`，不能只凭 schema parse 或 SHA-256 当成 producer attestation。

## 当前缺失

- `packages/western-astronomy-engine-adapter-draft/evidence/` 不存在；
- `horizons-2025-equinox-candidate.txt` 不存在；
- `horizons-2025-equinox-candidate.json` 不存在；
- `npm run demo:western:horizons` 当前以 `HORIZONS_RESPONSE_CANDIDATE_INVALID / exit 1` 失败关闭；
- `sourceCandidateIds=[]`、`frozenBindingId=null`、`sourceBodyDigest=null`；
- work／edition／carrier rights、redistribution、publisher authenticity、独立真实性复核与 expert review 均为 0／false。

测试 fixture 第一行固定写明 `STRUCTURE-ONLY TEST FIXTURE; NEVER AN OFFICIAL RESPONSE`；其 X/Y/Z、DE/EOP 文本均为人工结构值，不得替代当前瞬时 body。

## 当前源码点时身份

| 文件 | bytes | SHA-256 |
| --- | ---: | --- |
| `query-manifest.ts` | 3,411 | `04ed83a8f9f7c177aaa09c45875502ce2408f894ad9386c8c94b9b5e51fb8792` |
| `official-response.ts` | 19,804 | `4348e61ab45ef35eb4c5cbba82b79d1416930b329867e37a20300dbdf0c0d4ab` |
| `differential-report.ts` | 15,450 | `b37f3b00f1ddd472ff7bf5ad59e30693ab3044439f4ccd7cf8ebc801f76811fd` |
| `index.ts` | 3,629 | `1ff66b40376ec7d88986dc4d542af50a6131a7a0690c7787604f1d1cd75e7617` |
| `demo.ts` | 1,922 | `091c4a4784124d06b3af4b8b83f24b755b5781d03c2a91f083093f8046fdfecd` |
| `horizons-differential.test.ts` | 16,868 | `d4d081b586aa8485c9518aa60045ea7f11cd4394fae727c69c5a511581b85ec8` |

这些 hash 只冻结本轮看到的本地工程文件，不建立官方响应、内容真值、来源权利或发布授权。

## 独立账同步与验证分账

西洋独立来源要求账已随当前 basis 文档机械同步：`ledgerDigest=2bb52306841098ee5e83906bffda400ad07efd706c7c294ee4d07115854849bd`；独立 engineering-draft manifest 为 `manifestDigest=5c44fce96357ed80c4274f1f225151764ffe5998956e7e823764499ee45f993e`。两者仍分别保持 28 条 required、0 candidate、`0/28 frozen`，source／rights／expert bundle 不完整，manifest 仍为 draft、`targetSchema=null`、现实专家为 0、`publicDeploymentAuthorized=false`、`expertClaimsAuthorized=false`。这次同步只恢复独立账对当前 basis 字节的机械一致性，不登记 Horizons candidate，也不重签中央登记或回执。

当前验证分账为：scoped TypeScript 通过；Horizons + strict receipt 两文件在默认与显式串行模式均为 16/16；独立来源要求账 9/9、独立 domain manifest 6/6、release governance 193/193；demo 则按预期以 `HORIZONS_RESPONSE_CANDIDATE_INVALID / exit 1` 失败关闭。中央 admission CLI 首错仍是既有八字 `MANIFEST_MISMATCH`，其测试为 1/9；跨体系 receipts CLI 仍为 `REGISTRY_MISMATCH`，其测试为 6/9。`check:system-contract-draft-boundaries` 也继续因与本西洋增量无关的既有受限文件记录、八字专家脚本未登记 import 与 exact-quote 测试 dynamic import 而 exit 1；本轮未读取受限文件，也未修复或绕过这些红线。

## 官方与权利边界

[Horizons API 文档](https://ssd-api.jpl.nasa.gov/doc/horizons.html)要求调用方检查 payload，并把 `TLIST` 定义为与 span 参数分开的离散时间替代；[SSD API fair-use policy](https://ssd-api.jpl.nasa.gov/doc/index.php)是服务使用规则，不是作品、版本或载体再分发许可；[Horizons Manual](https://ssd.jpl.nasa.gov/horizons/manual.html)说明底层数据会随测量、模型和解更新。将来取得的单次 body 只能作为带检索时间、完整查询和实际输出版本的快照。

Astronomy Engine 的 MIT 文件只覆盖对应引擎代码，不能外推覆盖 Horizons 输出。当前必须继续保持：

- `workRightsEstablished=false`；
- `editionRightsEstablished=false`；
- `carrierRightsEstablished=false`；
- `redistributionAuthorized=false`；
- publisher identity、独立真实性复核、法律复核与专家复核均为 0。

JPL 工程差分也不得外推为星座、宫位、相位、吉凶或解释规则真值。

## 安全的下一步

只有取得允许保存的 authoritative raw body 后，才可建立独立 candidate child。正式 intake 应从 held file handle 读取一次、让 digest／parse 复用同一 exact byte snapshot，并另附独立 retrieval envelope、获取时间、完整 URL、HTTP/TLS 观察、API version/source、DE/EOP observation 和 storage/rights disposition；不得把当前瞬时探针、测试 fixture、TypeScript brand 或 schema digest 当作官方权威。

即使该 child 将来成立，也只能是 `single_sun_geocenter_vector_snapshot / candidate_only_unbound`，父账最多从 0 变为 1 个 partial candidate，仍应保持 `0/28 frozen`、三层权利与专家为 0。

当前 exact-byte 入口 snapshot 不是 mutation epoch。它不证明文件读取前后区间无 mutation，也不证明跨文件原子快照、interval mutation 排除或 ABA 排除。中央 registry、跨体系 receipts、发布就绪与两项公开授权不得因本审计改变。
