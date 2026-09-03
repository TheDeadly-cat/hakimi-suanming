# 阶段 D：八字专家审阅周期 Fail-Closed 零实例 Kernel v0.1

日期：2026-08-31  
状态：独立 draft；零实例；authority-none；不接正式专家门、Manifest、Registry、Web 或运行时

## 结论

本 tranche 补的是八字现实专家审阅流程此前缺失的“周期状态与转换拒绝边界”，不是现实专家资料，也不是专家审定结论。新增非 workspace 隔离目录 `isolated-drafts/bazi-expert-review-cycle-kernel`：

- 固定八字专属周期状态与转换词汇；
- 对当前 `request_collection_start` 给出确定性 fail-closed 失败响应；
- 定义未来不可变专家包所需的 16 类回执槽，但当前只接受精确零实例空数组；
- 把“更正、撤回、资质吊销和 Artifact 漂移未来追加新生命周期记录并重新关门”仅登记为待 owner 接纳的八字 draft requirement；`countsAsCurrentBaziPolicy=false`、`inheritedFromVedicAuthority=false`；
- 不实现任何正向转换，不接受显式真人姓名、资质、意见、签名、私有 dossier 或引文字段；opaque digest 的来源未评估，不能宣称排除了 person-derived digest。

## 当前机械阻断

`request_collection_start` 精确绑定 13 条红门：

1. formal packet 与 intake gap 绑定漂移；
2. formal packet 当前 artifact lock 闭包不存在；
3. 八字来源 binding 仍为 `0/12`；
4. source bundle 未完成；
5. 作品／版本／载体三层 rights bundle 未完成；
6. owner 对仓外现实 intake 的明确授权不存在；
7. 两席参与同意回执不存在；
8. verifier authority 实例不存在；
9. reviewer identity／credential／scope 实例不存在；
10. pairwise independence 实例不存在；
11. 原始意见与 seal 实例不存在；
12. immutable bundle manifest 实例不存在；
13. Schema 13 mutation epoch、原子快照与 ABA 回执不存在。

失败响应固定 `acceptedReceipt=false`、`commitObserved=false`、`nonceConsumed=false`；响应投影中的 previous/next state、review-cycle epoch、state digest、chain head、consumed-nonce head 与 credential-revocation head 完全相等。由于没有 store 或 commit observer，这不证明任何外部持久状态实际保持不变。

## 与现有证据的关系

kernel 固定观察以下当前工件身份，但运行时不读取它们：

| 工件 | 当前用途 |
|---|---|
| 历史 expert packet `1.5.0` | 只记录历史模板身份；不重签 |
| version-aware intake candidate `1.1.0` | 只记录当前 `0/2`、意见 `0/2` 与 packet drift |
| binding readiness `1.7.0` | 只记录 `0/12`、source/rights/expert closure 全红 |
| domain Manifest observation candidate `1.2.0` | 只记录当前非权威 preview 与正式 Manifest 漂移 |

定向测试从同一读取缓冲计算各自 raw SHA-256 并核对这些观察 pin；这属于当前工作区工程证据，不是 kernel runtime 的上游真实性、数字签名、first-seen、custody、跨文件原子快照或发布授权。

## Epoch 与不可变性分账

新增的 `reviewCycleEpoch` 仅是 D 线未来周期账的独立身份，不是 `legacy-v13` 缺失的 mutation epoch。当前继续明确：

- `mutationEpochAvailableForSchema13=false`；
- `reviewCycleEpochIsSchema13MutationEpoch=false`；
- 没有持久 append-only store；
- 没有跨进程 replay／CAS／ABA 证明；
- 没有数字签名、trust anchor、first-seen 或 custody；
- 当前 failure response 的 digest 不是 accepted receipt。
- opaque 64-hex ID/head 的来源未评估：`personDataPresenceAssessed=false`、`personDerivedDigestExcluded=false`、`safeToPublish=false`。

## 封闭输入与 post-import 原语边界

closed JSON capture 在 Manifest 精确形状校验前，对递归遇到的**每一个数组**应用 `4096` 的防御性长度上限。它不允许 1–4096 份回执：16 个回执 family 仍分别必须精确 `length=0`；任何非空 family 继续拒绝。`4096` 也不是请求总字节、总节点、对象键、字符串、递归深度、CPU、内存或整体拒绝服务预算。

独立红队曾复现同一 P2 家族：模块加载后污染 `Array.prototype.push` 可把已存在的一份伪证据捕获成空数组，污染 `Array.prototype.map` 可让不同 failure response 得到相同 digest；污染数组 iterator 还可跳过运行时循环；污染 `Object.prototype.value` 可把 accessor descriptor 误认成 data descriptor。当前实现已捕获相关 Object／WeakSet 原语，descriptor map 与 descriptor field 必须通过 captured own-property 检查，并把 capture、精确键校验、family 遍历、freeze、canonicalization 与 replay-guard append 改成不依赖 live 数组方法／iterator／继承数字 setter 的路径；聚焦回归覆盖 `push`、`map`、iterator、WeakSet methods、继承数字 setter 与继承 descriptor `value`。该修复只建立已测试的 post-import 工程边界，不是安全沙箱，也不证明模块求值前已受污染的 realm 安全。

## 最终定向验证账

当前独立 draft 最终字节的聚焦 TypeScript 检查 exit `0`；独立 Vitest 为 `1 file / 63 tests`，全部通过。回归中包括上述 post-import P2 复现，以及 oversized sparse array 在遍历前失败关闭。

与既有证据链的只读复验分别记账：

- v1.2 Manifest observer CLI exit `0`、测试 `14/14`；preview 仍为 9 components、5 unchanged／4 changed、11 drift entries／8 unique paths，非权威 preview digest 仍为 `0c6a1003...`；
- version-aware expert intake CLI exit `0`、测试 `27/27`；现实专家仍 `0/2`、binding 仍 `0/12`，全部 authority red gate 不变；
- release-governance CLI exit `0`、测试 `204/204`；`publicDeploymentAuthorized=false`、`expertClaimsAuthorized=false`；
- offline lockfile dry-run exit `0`；`package-lock.json` 保持 `174994` bytes、SHA-256 `5c0a532cc8061e970e4b0fb8e13a68546f558fc487d8249abc65983a95dccd25`。

既有红线也原样保留：formal expert packet CLI exit `1`，首个失败为 `INTAKE_GAP_BINDING_DRIFT`，测试仍 `44/47`；formal Bazi Manifest CLI exit `1`（`MANIFEST_MISMATCH`），测试仍 `2/3`；generic system-contract boundary CLI exit `1`，仍为原有 10 条其他路径问题，测试 `69/70`，没有本 draft 路径相关失败。它们不能被本 tranche 记成通过。未运行全仓 typecheck、默认 Web build、完整应用、PWA、跨浏览器、公开主机、部署或回滚验证。

## 分账

| 账本 | 本 tranche 结论 |
|---|---|
| 工程证据 | 独立 closed parser、确定性 failure-response projection、零实例 manifest preflight 与响应前后同值可定向验证；不等于持久状态证明 |
| 浏览器／运行时证据 | 未建立；未接 Web、PWA、Service Worker、正式仓储、公开主机、部署或回滚 |
| 内容真值 | `not_established` |
| 专家真值 | `not_established`；现实专家 `0/2`、原始意见 `0/2` |
| 来源／权利法律判断 | `not_established`；binding `0/12`、三层 rights 未闭合 |
| 发布就绪 | `false` |
| 专家宣称授权 | `expertClaimsAuthorized=false` |
| 公开部署授权 | `publicDeploymentAuthorized=false` |

默认治理继续固定为 `legacy-v13 / targetSchema 13 / migrationId null`。本目录没有修改或重签旧 packet、intake gap、保存 Manifest、四体系 Registry 或根 `package.json`；`package-lock.json` 最终 raw identity 保持原值。其路径不在 Bazi v1.7 Manifest builder 的精确组件路径集合内。定向 isolation observation 在列明的 code／JSON／YAML／PowerShell／shell／HTML／CSS／Markdown／text 扩展名以及选定根工具链文件中未发现字面引用，但明确跳过并未读取受限文件 `apps/web/src/lib/local-user-data-cleanup.ts`，也不覆盖未扫描二进制格式。本目录未登记进 generic workspace draft gate，因此这不是对受限文件或所有未来 computed import 的永久排除证明。
