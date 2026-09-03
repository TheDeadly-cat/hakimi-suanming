# 阶段 C／D：PR10A 私有引文当前线与八字 v1.7 当前机器身份（2026-09-01）

## 0. 状态结论

本轮继续按阶段 C、D 优先级，以 append-only successor 方式完成两项窄机械工作：

1. 阶段 C 新增 PR10A 私有 exact-quote 当前线能力。它消费当前 Binding-Citation child 的 exact persisted 私有品牌，固定 `3 conceptual topics / 2 current bindings / 4 quote refs`，但没有取得、读取或保存固定真实正文，因此没有发行任何真实 receipt。
2. 阶段 D 新增八字 v1.7 当前机器身份 successor，并用它生成四体系当前状态 v2.4 child。八字当前 10 个正式组件、28 个唯一文件身份已被观察；正式 Domain Manifest 仍未 current，专家仍为 0/2。紫微、西洋、吠陀只继承 v2.3 的原有独立状态，没有被八字结果提升。

本轮不建立内容真值、专家真值、作品／版本／载体许可结论、发布就绪或公开发布授权。项目治理仍固定为：

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

### 1.1 阶段 C：PR10A 私有 exact-quote 当前线能力

| 文件 | Bytes | Raw SHA-256 |
|---|---:|---|
| [current-line library](../scripts/bazi-private-exact-quote-smt-v2-current-line-successor-lib.mjs) | 68,565 | 1c4ef9ac5a3d76234932f8ec643a7faf6994c52697fa882601d36b025bf14c1c |
| [zero-instance CLI](../scripts/verify-bazi-private-exact-quote-smt-v2-current-line-successor.mjs) | 2,592 | 8358569ce9c09961c3120f3de30a5af66da61c94a2f5308c81b5b95369612a04 |
| [adversarial tests](../scripts/verify-bazi-private-exact-quote-smt-v2-current-line-successor.test.mjs) | 39,068 | ead4ddb9f5e248df3e7c976af3ecc892def3405df3692a77c6751916e0937558 |

本 child 没有 persisted receipt artifact。原因不是“无需 receipt”，而是固定真实正文没有被授权提供或读入，成功 receipt 路径没有执行。当前状态明确固定为：

- `privateVerificationApiStatus = candidate_unexecuted_against_fixed_real_body`；
- `fixedRealBodyProvidedToThisChild = false`；
- `successfulReceiptPathExecuted = false`；
- `receiptBrandAndRedactionSuccessVerified = false`；
- `receiptBrandAndRedactionSuccessUnverified = true`；
- `currentReceipts = 0`。

### 1.2 阶段 D：八字当前机器身份 successor

| 文件 | Bytes | Raw SHA-256 |
|---|---:|---|
| [machine identity artifact](../content/system-admission/bazi-current-machine-identity-successor.v1.0.0.json) | 30,801 | 9360655d17b23ea8c7c68e44af3177f8ccc72b350046d4f7dca5f8a8c83b717d |
| [loader library](../scripts/bazi-current-machine-identity-successor-lib.mjs) | 38,151 | 1b240bf22609a3355e7a6d764fff206672d723118a211e63adc36cfacf38d6c5 |
| [observation CLI](../scripts/verify-bazi-current-machine-identity-successor.mjs) | 1,772 | c400a060a8885dc61f30c9ce73a20b6ca3e23de74c8f559a3ea75124592c98fa |
| [adversarial tests](../scripts/verify-bazi-current-machine-identity-successor.test.mjs) | 16,002 | 35ad06b37cd3357a16c3fc84b553cbed2a4403993c9629b1e1dbb7e5f29f0bbe |

语义身份：

| 字段 | 值 |
|---|---|
| successorId | hakimi.bazi.current-machine-identity-successor/1.0.0 |
| receiptDigest | f7ae6009bea62156a82de86ee0be3c353b022035194881001a913066ed8c4b05 |
| currentMachineIdentityDigest | 58c82e1bbe601638130c0fefe6341d680e7d018f0a72ea44ca5704d83792ee78 |
| formal components observed | 10 |
| ordered unique files observed | 28 |

### 1.3 阶段 D：四体系当前状态 v2.4

| 文件 | Bytes | Raw SHA-256 |
|---|---:|---|
| [four-system v2.4 artifact](../content/system-admission/four-system-current-status-observation-child.v2.4.0.json) | 16,791 | fa70f8dbe13cacb0a4af282cfed4055a088d9c29d3d76fbb85a4bf52aa737e58 |
| [loader library](../scripts/four-system-current-status-observation-child-v2-4-lib.mjs) | 25,012 | 3beedef59a94544e5ac59c9e148e1173e90924b3c30007d585499cbbb5c57a31 |
| [observation CLI](../scripts/verify-four-system-current-status-observation-child-v2-4.mjs) | 1,844 | 3b8a0952df6751dd72167ec62bfb996d5e1866a76394ea9ecae5f3003c68c2c6 |
| [adversarial tests](../scripts/verify-four-system-current-status-observation-child-v2-4.test.mjs) | 15,861 | 351e0042440fb6687bfd6622fd04911b8e63004a49207f7acda079500aaaae74 |

artifact semantic child digest：

`bc685bb8da2f4a285eda645ab883da002c526cc80d800f2406fe9e0386a04840`

两个 persisted artifact 的 `createdAt` 均为可 round-trip 的真实 UTC：

- 八字 machine identity：`2026-09-01T08:10:46.766Z`；
- 四体系 v2.4：`2026-09-01T08:17:44.862Z`。

## 2. 阶段 C：PR10A 当前线的精确范围

### 2.1 当前父件与历史观察

当前能力只消费以下父件的 exact persisted 私有品牌：

| 项 | 固定身份 |
|---|---|
| parent ledger | hakimi.bazi.binding-citation-locator-link-requirements/1.0.0 |
| parent semantic digest | 2fdc1fcafcb28795823b3cac92db707e88df6325c197f08cb6a59a96fa3f9dc4 |

source v1.7、rights v1.3、SMT supersession v2、carrier readiness v1.1、materialization v1.1 与 PR10BC v1.1 共 6 个旧工件，只在同一 held handle 上做 raw SHA-256 与 self digest 历史观察。它们的旧 full loader 没有被 import 或调用，也没有被称为当前品牌。

固定的 PR10A 范围为：

- conceptual topics：`strength.yueling_exact_quote`、`strength.rooting_exact_quote`、`strength.tougan_exact_quote`；
- current bindings：`binding:dtt:month-command`、`binding:smt-v10:whole-chart`；
- quote refs：4；
- source／rights candidate versions：`dtt-chanwei-wikisource-r2600158-candidate-v2`、`smt-siku-v10-wikisource-r761703-candidate-v2`。

匹配使用完整 tuple，不依赖候选数组位置；协调换线、交叉接线或重算 self digest 均不能获得当前 receipt 品牌。

### 2.2 显式 caller bytes 与 fail-closed 边界

私有验证内核只接受调用者显式传入的 exact `Buffer`／`Uint8Array`，并复制输入以隔离调用方后续别名修改。它拒绝：

- 路径、普通对象、其他 view、typed-array subclass、Proxy、accessor、SharedArrayBuffer；
- 空正文、超限正文、BOM、非法 UTF-8；
- source size／hash 漂移；
- UTF-16 character offset、quote digest、line 坐标不一致；
- 重叠 occurrence 的伪唯一性。

公共验证 API 不接受路径，也不读取私有根目录。`TestOnly` 不暴露通用 FS／path reader。CLI 不接受正文、路径或 stdin operand，只能输出零实例 capability 摘要。

### 2.3 成功路径未执行的校准

测试验证的是内核对合成字节、负例和不变量的机械行为；它没有用伪造 production brand 冒充真实 receipt，也没有声称已经对固定真实正文执行成功路径。因此当前不能证明：

- receipt 私有品牌在真实固定正文上的成功发行；
- receipt redaction 在真实固定正文上的成功结果；
- lawful material access；
- exact quote 的最小充分性；
- 作品、版本、载体权利；
- KnowledgeDocument／Citation／SourceRights／SourceCarrier／materialization 的同内容闭合。

当前正式计数继续为 document 0、rights 0、carrier 0、materialization 0、citation locator links 0、Binding frozen 0/12。

## 3. 阶段 D：八字当前机器身份

### 3.1 当前双父品牌与历史 Manifest

successor 只消费两个当前 full-loader 私有品牌：

1. 当前 single-chart-report component identity drift receipt candidate；
2. 当前 expert zero-instance child。

Domain Manifest v2.2 只作为 held-handle raw+self 历史基线；旧 Manifest full loader 没有被调用，也没有把历史 Manifest 重新称为 current。专家 child 只是 overlay，不进入 10 个正式组件或 `currentMachineIdentityDigest`。

### 3.2 10 个组件、28 个文件与唯一漂移

按组件首次出现顺序去重后，当前观察为 10 个正式组件、28 个唯一文件。相对 Manifest v2.2 基线恰有一个文件漂移和一个组件漂移：

| 项 | persisted baseline | current observation |
|---|---|---|
| `packages/research-export/src/single-chart-report.ts` | 161,365 bytes / `215a470e79ea6eb844b41a5aad18867279d1a7ae60fd2b9cf6a364cc2c1b5082` | 164,210 bytes / `43da8ce98eb0b09c061e6997dd140ffd3ad3dd597cb30720413fd67cf724d2dc` |
| `report_contract` component digest | `621cb0422729a3e5e12434f5c1c9ff5bf0f06e2d7bd2493deb5b5387f4957268` | `6dd730cabb3035567694599692439a1b27f48e89ea0ee0970bbb33f5f7ee95f2` |

独立 frozen golden 文件保持 60,900 bytes，SHA-256 仍为：

`aba357d98a99271cc9a9b2727ad1c7c516424c94b7cf34f765cb38b0e9a74b29`

所以本轮建立的是“当前完整组件文件集的机械观察”，不是“正式 Manifest 已重新绑定／重签”。`persistedAsDomainManifest=false`，Manifest rebind／resign 与 owner decision 均未发生。

### 3.3 专家与权限仍为零

当前 expert child 仍是仓内零实例观察：

| 门 | 当前值 |
|---|---:|
| Binding frozen | 0/12 |
| independent expert reviews | 0/2 |
| current reality attestation | false |
| current full Domain Manifest | false |
| releaseReady | false |
| publicDeploymentAuthorized | false |

这不证明现实世界不存在专家或私有意见；只证明当前正式工件没有可承认实例。现实专家身份、资质、scope、彼此独立性、原创意见和分歧处理仍需单独核验。

## 4. 四体系 v2.4：只更新八字，不外推权威

v2.4 只允许相对 v2.3 改变八字 endpoint 与 status；紫微、西洋、吠陀投影必须是 v2.3 的 canonical exact copy。当前结果为：

| 体系 | 当前窄工程状态 | 正式 full Domain Manifest | Admission gates | 公开发布授权 |
|---|---|---:|---:|---:|
| 八字 | 当前 machine identity successor，完整组件文件集已观察 | false | 0 | false |
| 紫微 | 当前专家晋级边界 drift receipt；Manifest 与浏览器证据仍 stale | false | 0 | false |
| 西洋 | 当前 source／Manifest identity drift receipt；正式 source／Manifest 链仍 stale | false | 0 | false |
| 吠陀 | 当前 observation + engineering manifest + 隔离事实浏览器 child；尚无产品身份 | false | 0 | false |

四体系合计 32 个 admission gates 满足 0；正式 admitted systems 为 0，release-ready systems 为 0，public-release-authorized systems 为 0。central registry 未修改。八字 v1.7 的 golden、规则或机器身份不能外推成其他体系的事实、规则、来源、权利、专家或产品权威。

## 5. 聚焦验证

| 验证 | 结果 | 仅能证明 |
|---|---:|---|
| C 专用默认 tests | 26/26 | 当前父品牌、固定 PR10A tuple、显式 bytes 内核、负例、zero-instance 校准 |
| C 专用串行无隔离 tests | 26/26 | 同一进程顺序执行下的 C 窄机械回归 |
| C + D machine identity + four-system v2.4 串行无隔离 tests | 3 files / 65 tests | 三个新 current-line 入口的合并机械闭包 |
| D machine identity tests | 20/20 | 当前双父品牌、10 组件／28 文件、唯一 drift、golden、authority 红门 |
| D four-system v2.4 tests | 19/19 | 仅八字差异、其他三体系 exact copy、32 门全红、治理不继承 |
| 3 个窄 CLI | 均 exit 0 | 校准后的机械 observation；不是 runtime attestation |
| 9 个新 `.mjs` 的 `node --check` | 9/9 | lib／CLI／test 语法闭合 |
| release governance CLI | exit 0 | 默认仍为 legacy-v13 / 13 / null；公开部署与专家授权仍关闭 |
| C、D 独立终审 | 无剩余 P1／P2 | 只覆盖列明实现、身份、负例与语义边界 |

测试与 CLI 假设没有任意 pre-evaluation 代码执行；它们不是 Node runtime、loader、launcher、OS 或公开主机的可信 attestation。

## 6. 必须分账的 expected-red

下列历史入口仍因固定上游身份漂移而 fail-closed。它们没有被本轮 successor 修改或“洗绿”，本轮也没有把其失败计入新 successor 的绿色测试：

| 历史入口 | 已知当前结果 | 本轮处理 |
|---|---:|---|
| private exact-quote v1.1 | 5/9 | 保持 expected-red；不调用旧 full loader |
| SMT v2 supersession | 3/21 | 保持 expected-red；仅 raw+self 历史观察 |
| source-carrier successor | import red | 保持 expected-red；不绕过旧 basis drift |
| PR10BC v1.1 | 8/11 | 保持 expected-red；不把部分通过冒充 current |
| Bazi Domain Manifest v2.2 CLI | exit 1 | `COMPONENT_FILE_IDENTITY_DRIFT`；只作历史基线 |

这些结果与新 C／D successor 的通过线是不同账本。新 current-line 子件不能反向证明旧工件 current，也不能把旧失败改写为 release-ready。

## 7. 七账分离

| 账本 | 本轮结论 |
|---|---|
| 工程证据 | C 当前线能力、D machine identity、四体系 v2.4 的固定身份、私有品牌与对抗回归已机械验证 |
| 浏览器／运行时证据 | 未新增；没有启动完整应用、PWA、Chrome／Edge 或公开主机 |
| 内容真值 | not_established；没有读取固定真实正文，没有真实 receipt |
| 专家真值 | not_established；现实专家 0/2，意见 0/2 |
| 权利法律判断 | not_established；作品／版本／载体与项目副本许可未闭合 |
| 发布就绪 | false；没有新的 Release Evidence、部署或回滚确认 |
| 公开发布授权 | publicDeploymentAuthorized=false / publicReleaseAuthorized=false / expertClaimsAuthorized=false |

## 8. 本轮未做与下一真实输入

本轮没有运行全仓 typecheck 或默认 Web build；既有阻塞文件 `apps/web/src/lib/local-user-data-cleanup.ts` 未读取或修改。也没有运行完整应用、PWA／Service Worker、Chrome／Edge、正式仓储边界、公开主机、部署或回滚，没有执行任何 Git 操作。

阶段 C 的下一真实输入不是再加零实例账本，而是由有权提供者显式交付 `r2600158`／`r761703` 对应的固定真实正文 bytes 与可靠版本身份。只有在授权输入下，才能执行真实 receipt 成功路径；即使成功，也仍需另行完成人工最小充分判断、作品／版本／载体许可、同内容 materialization 和 12 条 Binding 的逐条冻结。

阶段 D 的下一真实输入是 owner 对正式 Domain Manifest rebind／resign 的明确决定，以及至少两位现实专家的身份、资质、scope、彼此独立性与原创意见。两份意见必须并列保存；分歧不得多数表决、平均或由生成模型自动选赢家。

其他体系仍需各自独立推进：

- 紫微：补 current Manifest 与 current browser/runtime evidence；
- 西洋：重建 current formal source 与 Manifest 链；
- 吠陀：从隔离 civil-time／事实浏览器证据推进到独立产品身份，同时保持窄事实与解释／建议分离。

任何体系都还需自己的输入、事实、规则版本、来源、权利、专家审定、高风险表达边界、Release Evidence、部署与回滚。当前没有公开发布授权。
