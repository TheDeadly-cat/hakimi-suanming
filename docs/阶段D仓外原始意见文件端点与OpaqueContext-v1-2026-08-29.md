# 阶段 D 仓外原始意见文件端点与 Opaque Context v1

日期：2026-08-29  
状态：D1 机械边界已落盘；现实专家实例仍为 0；不构成专家真值、发布就绪或公开授权

## 1. 目的与分账

本合同只描述八字 `single-chart-report / 1.7.0` 专家审阅 intake 中，两份仓外原始意见文件如何在本地机械读取、与 seal receipt 结构绑定，并通过模块私有 opaque context 进入完整 bundle 结构预检。

本合同建立的是工程端点证据，不建立现实专家身份、资质、独立性、意见真实性、first-seen、custody、内容真值、专家真值、发布就绪或授权。测试中的意见、seal、identity、independence、inventory 与 bundle 均为 synthetic fixture，不是现实专家实例，也不使现实实例数从 0 增加。

## 2. 当前冻结身份

| 工件 | 字节数 | SHA-256 |
| --- | ---: | --- |
| `scripts/bazi-expert-review-packet-lib.mjs` | 130203 | `3ea16896a1e908e16069d988f445f95bd237cf70520db6f2050e8e8f4e659931` |
| `scripts/verify-bazi-expert-review-packet.test.mjs` | 73605 | `723c33cc3cd194f69dfeb127aa2b6726c8b70e935d656836251b5da22f8b5e16` |

定向验证结果为 `38/38`。这些身份只冻结本轮 D1 实现与测试观察，不重签专家 packet、不改变保存 manifest、不形成现实审阅 bundle，也不授权公开部署或专家声明。

### D2 取代说明

上述字节、SHA 与 `38/38` 是 D1 的 point-in-time 身份，不是当前 verifier 身份。后续 D2 在同一共享 resolver 上增加 identity dossier 端点，并修复调用者可伪造 `workspaceRoot` 的 P2：当前 root 必须与 verifier 模块所在固定项目根的 realpath 和目录端点身份同时一致。当前 D2 工件、`47/47` 验证与 D0 身份见 [仓外身份 Dossier 端点与 Opaque Identity Context](./阶段D仓外身份Dossier端点与OpaqueIdentityContext-v1-2026-08-29.md)。本文件其余内容保留为 D1 历史合同，不得覆盖解释为当前完整边界。

## 3. 仓外文件路径与目录链

调用方必须显式提供 `workspaceRoot`、`privateRoot`、正斜杠相对路径和对应 seal receipt。这里的“仓外”只表示 `privateRoot` 与调用方显式提供并成功解析的 `workspaceRoot` 双向不重叠；该机械结论不能自行证明调用方传入的就是现实项目根，也不能认证目录所有者或 custody。

相对路径固定执行以下失败关闭检查：

- 禁止绝对路径、盘符、UNC、反斜杠、空段、`.`、`..`、NUL 与非规范化路径；
- 任意位置出现 `:` 均拒绝，因此末端 ADS 与中间目录 ADS 都不能进入读取；
- 解析后的目标与其 parent 必须保持在显式 `privateRoot` 内。

`privateRoot` 与从 root 到目标 parent 的每一级目录均在读取前后接受 `lstat`、`realpath` 和普通目录检查。symlink、junction 与特殊端点被拒绝；目录链以 BigInt `dev`、`ino`、`nlink`、`size`、`mtimeNs`、`ctimeNs` 和 realpath 建立快照，并在打开后、读取后复核同一链身份。

## 4. Held handle、端点身份与同 Buffer

目标必须是单链接普通文件：symlink、hardlink、目录和特殊端点失败关闭。打开使用只读 held handle，并在平台可用时加入 `O_NOFOLLOW`；打开前、打开后与读取后会交叉核对路径端点、held-handle metadata、realpath、长度和目录链。

读取结果受输入上限约束。原始 SHA-256 与严格 JSON 解析使用同一个 held-handle Buffer：

1. 从 held handle 读取受限字节；
2. 对该 Buffer 计算 raw SHA-256；
3. 将同一 Buffer 交给禁止 BOM、非法 UTF-8、重复键和非 JSON 对象的严格解析器；
4. 将 raw SHA、字节数、media type、encoding、opinion ref、reviewer binding ref、submitted time、review purpose 与完整 session binding 同 seal receipt 精确核对。

这证明一次成功调用中被摘要和被解析的是同一份已读取字节，并证明它与传入 seal 的结构字段一致；它不证明 seal 签发者、作者、原始形成时间、仓储历史或内容真实性。

原生文件系统异常会被收敛为稳定领域错误；错误不回显绝对 private root、相对路径或意见正文。关闭 held handle 时的原生路径错误也不会覆盖既有失败关闭结果。

## 5. 模块私有 Opaque Context

成功文件校验返回深冻结、脱敏的 context，并把完整、已深冻结的 opinion 与 seal 保存到模块私有 `WeakMap`。公开 context 不含 `record`、`payload`、意见正文、`privateRoot` 或相对路径，只暴露结构引用、raw artifact 摘要/长度及窄义机械结果。

bundle 入口只接受同一模块、同一进程实际签发的两个 context 对象。以下输入均失败关闭：

- 手写伪造对象；
- spread、`structuredClone` 或 JSON 往返产生的副本；
- 同一 context 或同一 opinion 的重复绑定；
- Proxy、访问器数组、稀疏数组、异常原型或额外数组字段。

WeakMap object identity 是进程内 capability，不是可序列化签名。context 在模块重载或进程退出后不能恢复为 capability；同一真实 context 在当前模块进程内可以重复用于结构预检，因此本合同不声明一次性消费、持久化 replay 防护或跨进程 authority。

## 6. Bundle-from-context

`bundle-from-context` 不接受调用方再次提交 `originalOpinions` 或 `sealReceipts`。它从两个 opaque context 的私有 WeakMap state 注入原始 opinion 与 seal，只让调用方提供其余 exact component records，然后执行完整专用 bundle preflight。

完整预检会重新检查：

- bundle 与所有组件使用完全相同的 `reviewPurpose` 和精确 session binding；
- 两席 reviewer、A/B slot、identity binding、pairwise independence 与两份原始意见互相一致；
- 每份 opinion 只有一个精确匹配的 seal，raw artifact 和提交时间已在文件端点校验；
- component refs、record digests、全局唯一 record/response IDs、实际组件形成时间和 chronology 一致；
- 四题 response refs、agreement/disagreement inventory、reconciliation 与 supplement DAG 完整且不选赢家。

成功结果中的 `bundleAssemblyStructurallyPreflighted=true` 和 `privateOriginalOpinionFilesMechanicallyBound=2` 只表示上述结构和文件绑定通过。它们不能单独用作身份、真实性、专家门或发布权限；当前仓内也没有非测试消费者把这些字段接成授权 gate。

## 7. 必须继续为 false 或 0 的投影

本端点、context 与 bundle preflight 必须继续保持以下结论为 false 或 0：

- `identityVerified=false`、`realIdentityEstablished=false`；
- `authenticityEstablished=false`、`opinionAuthenticityEstablished=false`；
- `firstSeenEstablished=false`、`immutableFirstSeenEstablished=false`；
- `custodyEstablished=false`、`privateStorageVerified=false`；
- `independenceVerified=false`、`pairwiseIndependenceEstablished=false`；
- `countsTowardExpertGate=false`、`expertGateEligible=false`；
- `expertReviewBundleComplete=false`、`expertTruthEstablished=false`；
- `bindingFrozenVerified=0`、source binding/rights closure 均为 false；
- candidate feedback collection、release closure review 与 `releaseReady` 均为 false；
- `publicDeploymentAuthorized=false`、`expertClaimsAuthorized=false`。

first-seen 或 retrieval receipt ref 的存在只允许导出“引用字段存在”，不得升级为相应事实已建立。record self-digest 不是数字签名，seal receipt 的结构通过也不是真实性结论。

## 8. Mutation epoch 与残余边界

当前发布治理仍为 `legacy-v13 / targetSchema 13 / migrationId null`。Schema 13 没有可供本端点绑定的 mutation epoch，目录链和文件 metadata 只能形成若干离散观察点。

因此，本合同明确不证明：

- 打开前至读取后整个区间从未发生 mutation；
- inode、目录或路径端点不存在 ABA；
- opinion、seal、identity、independence、inventory 与 bundle 属于一个跨文件原子快照；
- 文件最初由声称的现实专家形成，或 seal/receipt 由真实 custodian 在声称时间签发；
- 两位现实专家身份、资质、范围和彼此独立性已经核验。

如未来要把现实意见接入专家门，必须另行建立受批准的现实身份与资质验证、first-seen/retrieval/custody 证据、数字签名或等价真实性机制、明确 mutation epoch 或事务性快照边界，并由下游 gate 重新执行全部 fail-closed 投影；不能把本合同中的机械 `true` 重新命名为现实真值。

## 9. 本轮验证范围

`38/38` 定向测试覆盖了正常双原件 bundle、路径逃逸与 root 重叠、末端 ADS、hardlink、文件 symlink、Windows 中间 junction、BOM、重复 JSON 键、raw-byte 漂移、seal digest/长度/ref/time/media/encoding 错链、supplement 误入、context 伪造/克隆/重复/Proxy/访问器/稀疏数组，以及完整 bundle DAG 的交叉引用与时间顺序。

本轮没有访问第三方后台，没有接入现实专家，没有复制第三方 prompt、知识库、断语或受限资产；也没有执行网络、Git、全仓 typecheck、默认 Web build、浏览器、PWA/Service Worker、公开主机、部署或回滚验证。上述未执行项不得由 `38/38` 替代。
