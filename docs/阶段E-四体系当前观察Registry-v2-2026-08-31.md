# 阶段 E：四体系当前观察 Registry v2

日期：2026-08-31  
状态：四体系当前机器身份／版本观察已冻结；`authority-free observation candidate`；不是正式中央 Registry、跨体系比较授权、领域权威、Release Candidate 或公开发布授权

## 结论

既有 `content/system-admission/four-system-admission.v1.json` 已不能表示当前工作区：其正式 verifier 因八字 Manifest 身份不一致继续失败关闭。本切片不覆盖、不重签、不替换旧中央账，而是新增只读投影：

- `content/system-admission/four-system-current-observation-registry.v2.json`；
- registry ID：`hakimi.system-admission/four-system-current-observation/2.0.0`；
- raw identity：`22,261 bytes / 1b73a55f74597712f84706b2a2046fe3907fd3726261d1f8703469c5fa9abc39`；
- semantic registry digest：`fa521f30a40fd1c006e886c30f8da5295fbb82784db5671d59df2691117f3738`；
- `formalCentralRegistry=false`；
- `formalCrossSystemComparisonAuthorized=false`。

该 Registry 只回答“当前四个体系各自有哪些已由私有品牌验证的机器身份或版本观察”。它没有中央 owner acceptance，也没有任何体系准入能力。

## 四体系独立分账

| 体系 | 当前主观察 | Binding | 体系发布身份 / Schema | 当前边界 |
| --- | --- | ---: | --- | --- |
| 八字 | Manifest v2 `5236c63f…5c80` | `0/12` | `legacy-v13 / 13 / null` | 既有 research surface 的当前工程身份；未正式准入 |
| 紫微 | Manifest v2 `f16f4e02…f34e` | `0/27` | `null / null / null` | 隔离工程草案；不继承八字权威 |
| 西洋 | Manifest `5c44fce9…93e` + version-aware observation `6f71eb3e…deeb` | `0/28` | `null / null / null` | 隔离工程草案；旧中央账对西洋已 stale |
| 吠陀 | version-aware observation child v1.2 `46249824…171` | `0/38` | `null / null / null` | 仅研究边界；没有 domain Manifest、产品身份或 comparison support |

项目默认发布治理另账保持 `legacy-v13 / targetSchema 13 / migrationId null`。它只对当前八字 surface 表达既有发布线语境，不会被紫微、西洋或吠陀继承。

## 32 个准入门

每个体系精确投影 8 个互不替代的门：

1. input contract；
2. deterministic facts；
3. versioned ruleset；
4. source bundle；
5. rights bundle；
6. expert review bundle；
7. system-specific high-risk policy；
8. formal release evidence。

当前总账为 `0/32`：四体系正式准入数为 0，现实独立专家意见均为 `0/2`，各体系 `contentTruthEstablished / expertTruthEstablished / rightsLegalConclusionEstablished / releaseReady / publicDeploymentAuthorized / publicReleaseAuthorized / expertClaimsAuthorized` 全部为 false。

工程身份可验证不能抵扣来源冻结、许可判断、现实专家审定或发布证据。

## 跨体系禁止项

当前 comparison draft 只声明八字、紫微和西洋三个工程 system ID，未支持吠陀。Registry v2 固定以下能力全部关闭：

- facts frozen for formal comparison；
- scoring／weighting；
- majority vote／opinion averaging；
- 生成模型选择赢家；
- 自动合并同一人；
- 八字权威继承；
- 概念等价推断；
- formal comparison authorization。

`财星`、`财帛宫`、`第二宫`、`D2/Hora` 只作为非等价概念示例分别保留体系命名空间，不能因都涉及财富主题而自动映射或投票裁决。

既有 `generated-engineering-fact-receipts.v1.json` 没有消费 Registry v2，且 `currentForFormalComparison=false`。本切片没有重签旧 receipts。

## Lineage 与失败关闭

旧中央账继续保持原始身份：

- `19,093 bytes`；
- raw SHA-256 `a81550320e25b5dc696eaa1e2490f93aaf3ccfc0e41a9fb1fa088ceddf434959`；
- registry digest `a992d58ce2c98b5282ffafafb38e05c20c1d294e99b150674fdf01684f86097a`。

v2 固定 `predecessorPreservedUnmodified=true / predecessorCurrent=false / replacesOrMutatesPredecessor=false`。旧中央 verifier 继续以“八字体系 manifest 与当前组件、失败关闭门或证据分账不一致”退出 1；旧 cross-system receipts verifier 继续以“expected-manifest preview 摘要已变化”退出 1。这两条红灯是当前证据，不是待隐藏的测试噪声。

## 快照与 mutation 边界

所有上游通过既有 held-handle endpoint reader 和私有 WeakSet 品牌复核，但跨文件集合不是事务：

- `heldHandleEndpointSnapshots=true`；
- `crossFileAtomicSnapshot=false`；
- `mutationEpochAvailableForSchema13=false`；
- `mutationEpochReceipt=null`；
- `intervalMutationExcludedAcrossFiles=false`；
- `abaExcluded=false`；
- registry digest 不是数字签名。

canonical 捕获拒绝 duplicate JSON key、Proxy、accessor、alias、cycle、非 JSON 原型与危险属性图；`__proto__` 只按自有 data key 处理。自重签的 authority、expert、binding、comparison 或 epoch 晋级会因固定 raw／semantic 身份失败关闭。exclusive writer 第二次执行以 `EEXIST` 拒绝覆盖物化件。

## 定向验证

- Registry v2 专用对抗测试：默认模式 `15/15`，`--test-concurrency=1` 串行模式 `15/15`；
- 显式受影响闭包：Registry v2、八字 Manifest v2、紫微／西洋独立 Manifests、西洋 version-aware observation、吠陀 v1.2 observation、release governance 共 `287/287`，默认与串行模式均通过，`0 fail / 0 skip`；
- Registry v2 CLI：exit 0，精确报告四体系 observed、零正式准入、`0/32` 和所有 authority false；
- `npm run check:release-governance`：exit 0，继续报告 `legacy-v13 / 13 / null`、`publicDeploymentAuthorized=false / expertClaimsAuthorized=false`；
- 旧中央 Registry 与旧 cross-system receipts CLI：均保持 expected-red／exit 1，未重签。

## 证据分账与未建立事项

- 工程证据：建立了四个当前机器身份／版本观察的确定性、不可覆盖 Registry v2；
- 浏览器／运行时证据：本切片未评估；
- 内容真值：未建立；
- 专家真值：未建立，现实身份、资质、彼此独立性和两份原始意见仍不存在；
- 权利／法律判断：未建立，作品层、版本层、载体层许可与再分发授权不能由依赖告示或链接观察推出；
- 发布就绪：未建立；
- 公开发布授权：未授权。

本轮没有运行全仓 typecheck、默认 Web build、完整应用、真实仓储、浏览器／PWA／Service Worker、公开主机、Release Evidence、部署或回滚；没有读取或修改受限源码，也没有执行 Git 操作。
