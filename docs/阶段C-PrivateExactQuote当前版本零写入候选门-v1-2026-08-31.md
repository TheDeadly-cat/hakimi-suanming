# 阶段 C：Private Exact Quote 当前版本零写入候选门 v1（2026-08-31）

## 结论

本阶段新增了一个独立、非生产可达、零写入的 current-line 私有材料完整性候选门。它只回答一个窄问题：某个由合法持有人在仓库外提供的私有 UTF-8 底本文本，是否在一次点时观察中精确匹配当前候选链的正文哈希、字节数、UTF-16 定位、行号、quote 哈希和重叠唯一性。

它不把历史 verifier 自动重标为当前版本，不修改历史 verifier，不创建正式 SourceRights、SourceCarrier 或 KnowledgeDocument，不冻结 binding，不建立作品/版本/载体身份，不得出许可或法律结论，不建立内容真值或专家真值，也不改变发布与公开授权。

当前没有纳入任何真实私有底本，因此没有产生真实成功收据；`verified-private` 计数仍为 0，12 条 binding 仍为 0/12。机械组件成功测试和端到端失败关闭测试不能替代这条 expected red。

## 新增文件及最终字节身份

| 文件 | 字节数 | SHA-256 |
| --- | ---: | --- |
| `scripts/bazi-private-exact-quote-version-aware-candidate-lib.mjs` | 84875 | `ddaee54c87f5ac75b604649373991701f3d94d67d0835d8b5518267d09d26962` |
| `scripts/verify-bazi-private-exact-quote-version-aware-candidate.mjs` | 1719 | `3529c43000dc7c848b4c0447823cc05c544e93277e6e8f7d08c0176cbd8b8935` |
| `scripts/verify-bazi-private-exact-quote-version-aware-candidate.test.mjs` | 41734 | `46f52040857f23d67564c6750f4c189c986bf7a0f9e3b1d62ca3efa5460f3063` |

没有把该候选门接入 `package.json`、正式 manifest、admission registry、Web、Browser 或其他 `apps/**` / `packages/**` 消费者；`activeAdmissionEffect` 固定为 `none`。

## 历史 verifier 隔离证明

历史 verifier 及其测试的字节身份保持不变：

| 文件 | 字节数 | SHA-256 |
| --- | ---: | --- |
| `scripts/bazi-private-exact-quote-material-verifier-lib.mjs` | 40160 | `ea32d341431d6973421ae665d750225995d02fae5a21a7a72b5441cf27677881` |
| `scripts/verify-bazi-private-exact-quote-material.test.mjs` | 28237 | `a77f5bd10eee80bb0c656d2713471109fec0a77227a8d1026008e2360b60b9df` |

新 companion 不 import 历史 high-level verifier。它在自身边界内实现并硬化 current-line reader、quote kernel 和 canonicalizer，从而不改变历史模块字节或依赖图，也避免在运行时借用不承诺 post-import poisoning 韧性的旧 canonicalizer。

## 当前父证据精确身份

| 角色 | 路径/ID | raw 字节 | raw SHA-256 | 语义 digest |
| --- | --- | ---: | --- | --- |
| source 1.6 | `content/bazi-strength-source-binding-candidates.v1.6.0.json` | 50427 | `62f6a68b99246a802bcf2055aa09a8ac8113df37a7ede1c55d8a2ea64deaea98` | `6f008058b282613fd131344206b27fccb1d80596bb49789f0554acdd69c1e44c` |
| rights 1.2 | `content/bazi-strength-source-rights-candidates.v1.2.0.json` | 23947 | `678632a8875672f58bb5c9f1ec4a299a4f0c6e750b8ff4a02bfe4df889e1243a` | `300e092c4913885cff626221b8734786128639c7d6cfd7c2be7bea2acc6bbefc` |
| readiness 1.7 | `content/system-admission/bazi-binding-freeze-requirements.v1.7.0.json` | 32629 | `7565a1c1ae51c09c78cf8f906e544bd8ee822020f76587237bc909ef1e6408a2` | `afdebfa1fb7a797f02d136373eb9aef1afa26b38b755926f8930ea5de97316b8` |
| reconciliation v2 | `content/system-admission/bazi-dtt-notice-reconciliation.v2.json` | 8881 | `e2656a19955db0ce908df88aa696cd40847e7536af58c79548ac1fbce9a7464b` | `2a47fc6fe281a4362c36dfc67c2a6dee195b5b069065ffc0e86ac1afcd7aa8a0` |
| supersession | `content/system-admission/bazi-dtt-versioned-parent-supersession.v1.json` | 9229 | `aa9e62089990d8ba699c441114914173141e8228f027605b47f5c5e238fac0e3` | `601b4e07b94e62b73812a7a26f1108a094272dca660a188bb660fa860f031264` |

current-line 范围固定为 3 个 topic、2 个 binding、4 个 quote ref。DTT 必须使用 current source/rights v2；SMT 必须保持其 current 父链中身份未变化的 v1。old/new 混配、错误 supersession、raw 空白漂移或重新 seal 均不能取得 current 私有品牌。

## 私有材料与零写入边界

- 请求 schema 固定为 `1.1.0`，`requestId` 只接受 `req-` 加 32 位小写十六进制，不进入收据。
- 请求必须是无 BOM、严格 UTF-8、重复键失败关闭的有限被动 JSON。
- private root 必须位于 workspace 外；拒绝路径逃逸、UNC/设备形式、ADS、Windows 保留名、末尾点/空格、终端或中间 symlink/junction、hardlink 和非普通文件。
- reader 使用 held handle、`maxBytes + 1` 上限、open/read 前后文件身份与目录链检查；攻击回归包含父目录换绑、同尺寸读中修改和增长越界。
- 生产依赖图没有文件写 API；成功和失败结果均不返回或打印 private root、路径、正文、quote 或 stack。
- request 文件与 source body 声明为同一相对路径时失败关闭；Windows 上按大小写折叠处理。

## 私有品牌与收据边界

current parent bundle、current quote context、material integrity result、terminal receipt 使用四个独立 WeakSet 品牌。builder 与品牌写入口均未导出；clone、重新 seal、普通对象或调用方布尔字段不能伪造品牌。

只有在未来取得真实、合法、当前身份精确匹配的私有底本时，生产链才可能构造分类为 `private_material_integrity_verified` 的点时观察收据。即使届时成功，收据仍固定：

- `verificationScope = current_line_point_in_time_private_material_integrity_only`
- `activeAdmissionEffect = none`
- `observationTimeSource = process_wall_clock_unattested`
- `observationTimeCallerSupplied = false`
- `observationTimeAuthorityEstablished = false`
- `currentCandidateDistributionBoundary = link_only_no_redistribution_clearance`
- `publicDomainEstablished = false`
- `redistributionLicenseEstablished = false`
- `attributionObligationsSatisfied = false`
- `personDataPresenceAssessed = false`
- `personDerivedDigestExcluded = false`
- `safeToPublish = false`
- `crossFileAtomicSnapshot = false`
- `mutationEpochAvailable = false`
- `mutationEpochReceipt = null`
- `intervalMutationExcludedAcrossFiles = false`
- `abaExcluded = false`
- `receiptDigestIsDigitalSignature = false`

收据不得含 request ID、相关性 digest、private root、请求路径、正文路径、正文、quote、载体字节、页面图像或 OCR 文本。`knowledgeDocumentCreatedForCandidate` 固定为 false；正式 SourceRights/SourceCarrier 计数均为 0；binding 仍为 0/12；内容真值、专家真值、权利法律结论、release ready、public deployment authorization、expert claims authorization 均为 false。

## 本轮验证分账

### 绿色工程证据

- `node --check`：三个新增 `.mjs` 文件均通过。
- 新 C companion：9/9 tests 通过。
- 新 C + 历史 ExactQuote + current readiness + supersession：97/97 tests 通过。
- release governance + Web storage import boundary：207/207 tests 通过。
- `check:release-governance`：通过；继续为 `legacy-v13 / targetSchema 13 / migrationId null`，`publicDeploymentAuthorized=false`，`expertClaimsAuthorized=false`。
- `check:web-storage-import-boundary`：通过。
- companion 本地路径的 post-import poisoning 回归把 `globalThis.String`、`globalThis.Object`、`globalThis.Reflect`、`globalThis.JSON` 改为“一读即抛”的 accessor，并覆盖继承 `Object.prototype.toJSON` / `Array.prototype.toJSON`、Object/Reflect 方法、Array、WeakSet、FileHandle、path 和原型 setter 污染；live-global 与 inherited-toJSON 调用计数均为 0，未产生伪品牌或伪收据。
- `apps/**`、`packages/**` 静态禁入扫描无命中；扫描明确跳过受限文件 `apps/web/src/lib/local-user-data-cleanup.ts`，没有读取该文件。

### 预期红与未执行证据

- 没有真实合法私有底本，因此生产成功收据构造、二次 raw-pin revalidation 和 terminal brand return 没有运行时成功样本；不得用 test-only synthetic projector 填平。
- 完整父 loader 的既有传递依赖在 post-import live-global getter 污染下会以 `CURRENT_PARENT_BRAND_LOAD_FAILED` 失败关闭；这是单列的非阻断可用性/DoS 边界，不会生成收据、伪造品牌或提升权限，也不得宣称整条父加载链能在这种主动污染下继续成功运行。
- `check:system-contract-draft-boundaries` 仍 exit 1，恰为 10 条既有边界问题：1 条受限文件跳过、6 条旧 `bazi-expert-review-packet-lib.mjs` 未注册 import、3 条既有非字面动态 import；没有新增 C companion 归因。
- 未运行全仓 typecheck 或默认 Web build；既有受限阻塞文件未读、未改。
- 未执行完整应用启动、正式仓储边界、PWA/Service Worker、Chrome/Edge 跨浏览器、公开主机、Release Evidence、部署或回滚确认。
- 未完成 12 条 binding 的可靠底本/版本、正文、exact quote、作品层与载体层许可依据冻结。
- 未取得现实专家身份、资质、独立性核验或两份并列意见。
- 不建立内容权威、专家权威、许可结论、发布就绪或公开发布授权。

## 操作边界

本阶段未执行 Git 操作；未清理、覆盖、重置、checkout、暂存或提交任何现有修改。发布治理仍固定在 legacy-v13，不因本候选门或其测试结果发生提升。
