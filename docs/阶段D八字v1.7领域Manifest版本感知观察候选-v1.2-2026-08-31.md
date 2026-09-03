# 阶段 D：八字 v1.7 领域 Manifest 版本感知观察候选 v1.2

日期：2026-08-31  
状态：candidate-only 只读观察；无 admission effect；不重签、不重绑、不进入正式准入或生产消费者

## 结论

本切片新增一个与 v1.1 并行的 v1.2 观察候选，冻结当前八字 v1.7 保存 Manifest、非权威 current preview、frozen golden、四个 direct 与一个 transitive、仍可由原模块 private WeakSet 验证的机械 context loader result，以及两个 raw／semantic artifact 自身未变但 loader 已因 package-lock basis 漂移而失败关闭的 stale context。

它不覆盖旧 v1.1、D0、正式 Manifest 或中央 registry，也不修改 package.json、package-lock.json、prebuild、默认 Web 或运行时消费者。默认治理继续固定为 legacy-v13 / targetSchema 13 / migrationId null。

## 候选机器身份

- candidate ID：hakimi.bazi.domain-release-manifest.version-aware-observation-candidate/1.2.0
- candidate semantic digest：8634c6dba6591014040107d53b0dd6bb38a98fc67cc977f022f234525b47e6a2
- persisted artifact：content/system-admission/bazi-domain-release-manifest-version-aware-observation-candidate.v1.2.0.json
- raw bytes／SHA-256：22454 / 88ada4ca435228e7802b97eb0f19665392fb03445d7b065a36aac7a7efe18491
- activeAdmissionEffect：none
- verifiedDirectMechanicalContextBrandCount：4
- verifiedTransitiveMechanicalContextBrandCount：1
- verifiedMechanicalContextBrandResultCount：5
- staleObservedContextCount：2
- verifiedReleaseParentBrandCount：0
- authorityInherited：false

candidateDigest 与 raw SHA-256 只证明本候选确定机械投影的语义和字节身份，不是密码学签章、owner acceptance、领域权威、内容真值、专家意见、许可法律结论、发布就绪或公开授权。

## 保存 Manifest、current preview 与 golden 分账

保存 Manifest：

- 路径：content/domain-release/bazi.single-chart-report.v1.7.0.json
- raw：12777 / d63d80502c6186a66f2eabc4bd2749687978a8cfb22d420842aa4a9d6e0eccd6
- semantic digest：60711da42ebc71e1f23ec300dffd5ed44f418c9bcc83ee394bf106f7354dc932
- releaseStatus：engineering_candidate
- v1.2 内部观察关系：MANIFEST_MISMATCH（保存 Manifest 与重算的非权威 preview 不同）
- v1.2 未重放或捕获正式 verifier 输出；本轮另行定向执行的正式 verifier 仍以“Manifest 与当前组件、失败关闭门或证据分账不一致”失败关闭，MANIFEST_MISMATCH 只作为本候选的关系码
- savedManifestCurrent：false

以保存 createdAt 重放的当前非权威 preview：

- digest：0c6a1003b3b26215da6be7dc5f68999684993564785cc99ffe0373f9019247d0
- 组件：9
- 未变组件：5
- 漂移组件：4
- component-file 漂移槽：11
- 唯一路径：8
- 稳定 held-handle 单文件读取的唯一组件文件：34

当前漂移组件为 fact_contract、source_bundle、rights_bundle、high_risk_policy。current preview 只是逐文件端点观察；跨文件原子快照、Schema 13 mutation epoch receipt、区间 mutation 排除和 ABA 排除均未建立。

报告 frozen golden 当前实际 SHA-256 仍为：

aba357d98a99271cc9a9b2727ad1c7c516424c94b7cf34f765cb38b0e9a74b29

golden 未漂移只证明报告 fixture 的当前字节匹配，不使保存 Manifest 当前化，也不提高 binding、专家、许可或发布门。

## 四个 direct 与一个 transitive 当前机械 context brand

| context | 直接 artifact | raw bytes / SHA-256 | semantic digest |
|---|---|---|---|
| DTT versioned parent supersession | source v1.6 | 50427 / 62f6a68b99246a802bcf2055aa09a8ac8113df37a7ede1c55d8a2ea64deaea98 | 6f008058b282613fd131344206b27fccb1d80596bb49789f0554acdd69c1e44c |
| DTT versioned parent supersession | rights v1.2 | 23947 / 678632a8875672f58bb5c9f1ec4a299a4f0c6e750b8ff4a02bfe4df889e1243a | 300e092c4913885cff626221b8734786128639c7d6cfd7c2be7bea2acc6bbefc |
| DTT supporting receipt | supersession v1 | 9229 / aa9e62089990d8ba699c441114914173141e8228f027605b47f5c5e238fac0e3 | 601b4e07b94e62b73812a7a26f1108a094272dca660a188bb660fa860f031264 |
| readiness | readiness v1.7 | 32629 / 7565a1c1ae51c09c78cf8f906e544bd8ee822020f76587237bc909ef1e6408a2 | afdebfa1fb7a797f02d136373eb9aef1afa26b38b755926f8930ea5de97316b8 |
| project copy | C-M1 v1.1 | 10887 / 7e98e6042cd1ccb00a2cff749f0000a989baacd683271edffc3158a80ee02b83 | d877ac00042d9e9635b0bf2cfe7b5f387f3aad82faa96c8a7214548299045d3f |
| expert intake gap | D-intake v1.1 | 32579 / 7a7088a3fdc660ccca3ef0d9765e36421563c7feee1c3dfa6bc4d7169d0f91df | 5318b9543bad20c52e5129901e94aa2ca3d2dd68f342ba11ab9611f4f767d582 |

四个 direct context 与 PR10BC transitive context 均由各自原模块 private WeakSet brand 验证：总计 5 个 branded loader result，按 4 direct + 1 transitive 分账。它们逐项保持 active admission、release、public、expert claims、epoch 和 ABA 红门。五个直接逻辑 parent artifact 加一份 supporting receipt 不能组成 release parent；verifiedReleaseParentBrandCount 仍为 0。

## 两个 stale observed context

| context | artifact raw | semantic digest | 当前 loader |
|---|---|---|---|
| policy v1.1 | 13295 / 0b221bfc2669310298d9082711ad111b205c5881e419a90f92776229102f53c1 | 95a1edb8d0228231229b561c97fd4960385e581cef87c3e1f2aa57e979c12c5b | UNCHANGED_BASIS_RAW_DRIFT |
| engineering-gap v1.1 | 71168 / f8ed780ce8e3fbaca59b295faff2f12b939a8b0c193bc0c20ce1198690528d4e | d578b6e76c325bf79593b728b78035d3481ec60fa7fb99c815748d9f806a8330 | UNCHANGED_BASIS_RAW_DRIFT |

两份 artifact 自身 raw 和 semantic identity 仍匹配，但 engineering-gap 保存的 package-lock SHA-256 为 9c9b3a1c569929b46d3dd5a2f084f6e44209ae0d55f27ff8467990f98e524013，当前 package-lock 为：

- 174994 bytes
- 5c0a532cc8061e970e4b0fb8e13a68546f558fc487d8249abc65983a95dccd25

因此 policy 和 engineering-gap 都只能列为 stale observed，不能计入 verifiedDirectMechanicalContextBrandCount。PR10BC v1.1 仍由自身 loader 通过，计入 transitive brand 与总 branded result，但不计 direct brand。

若未来要恢复第五个 direct brand，必须另行版本化升级 engineering-gap → policy 链，并明确审查新的 dependency basis；不得在本观察器内静默 re-pin。

## 历史点位保留

旧 v1.1：

- raw：21859 / 7768590bc117a229919bcd119a2bfada97d7e77712677947a2a650d6f518233d
- semantic：be41925d72904e8eb90eea2b77f7de553f7c743d87fd975ae33fa99040571dc2
- 保存 preview：85e0a454c76bead4eac239a98a56b55fb662bcc77ff6f1e49e52ee2a6e65ea68
- v1.2 内部观察关系：CURRENT_PREVIEW_CHANGED（保存 preview digest 与当前 preview digest 不同）
- v1.2 未重放或捕获旧 v1.1 loader 输出；本轮另行定向执行时，旧 loader 的首个实际可见失败码为 UNCHANGED_BASIS_RAW_DRIFT

历史 D0：

- raw：11291 / 91e6cda96190b43f65018c913ffa31f5346500d82842f6ebbd4e8af543734486
- semantic：5b82b545a2c5b0cd5714342c1bdaca742f4de44e196cc32817e8310926850d0f
- 保存 preview：be637b1e37ae92a9fd047af28d0117334405a39408dc470c766b7ddb8ab96954
- owner decisions：0
- v1.2 内部观察关系：CURRENT_EXPECTED_MANIFEST_CHANGED（保存 preview digest 与当前 preview digest 不同）
- v1.2 未重放或捕获 D0 verifier 输出；本轮另行定向执行时仍以“当前 expected-manifest preview 摘要已变化”失败关闭，CURRENT_EXPECTED_MANIFEST_CHANGED 只作为本候选的关系码

v1.2 只观察并精确固定 digest 差异关系，不把本轮候选外的定向 CLI 输出冒充其 branded closure；它不刷新 D0、不代填 owner decision，也不修改或替代 v1.1。

## 红门与隔离

- owner decisions：0
- binding：0/12
- 独立专家：0/2
- source bundle complete：false
- rights bundle complete：false
- expert review bundle complete：false
- admissionAuthorized：false
- formalActivationAllowed：false
- releaseReady：false
- publicDeploymentAuthorized：false
- expertClaimsAuthorized：false
- content truth、expert truth、rights legal conclusion：均未建立
- browser/PWA/Service Worker/runtime/deployment/rollback：均未建立
- cross-file atomic、Schema 13 epoch receipt、interval mutation exclusion、ABA exclusion：均未建立

本候选不得注册到 content/system-admission/four-system-admission.v1.json，不得加入 package scripts、prebuild、默认 Web 或其他生产消费者。调用方即使复制、自重算 candidateDigest 或改红门，也不能取得本 v1.2 模块 private WeakSet brand。

## 定向验证

本切片完成以下窄验证：

- lib、CLI、test 三个 JavaScript 文件的 node --check：3/3 通过；
- 固定 CLI 正常路径：通过，窄输出保持 4 direct + 1 transitive = 5 branded loader result / 2 stale observed / 0 release parent；
- 同层 node:test：14/14 通过，0 skip；
- 负测覆盖 clone／self-reseal 不获 private brand、custom prototype 拒绝、`__proto__`／accessor descriptor 不产生 digest collision；导入后 WeakSet add／has、Reflect ownKeys／descriptor、Map has／get／size、全局 String、Array iterator／toJSON 与 Hash update／digest poisoning 不能伪造品牌、跳过 34 个稳定组件读取、留下可变 artifact receipt 或折叠公开 digest；
- 额外 argv 与可见 NODE_OPTIONS 均失败关闭；脚本内自检不证明预加载前的 invocation integrity，能够在脚本启动前自隐藏的注入必须由外部 launcher／父进程证据排除；
- 历史 v1.1、D0、保存 Manifest 的 raw identity 保持原值；
- package.json、中央 registry、registry builder 与 Quick CI 不含 v1.2 consumer 引用；
- 五个新文件均为 LF，且只有一个末尾换行。

未运行全仓 typecheck、默认 Web build、浏览器、PWA／Service Worker、正式仓储、公开主机、部署或回滚验证。

验证结果只解释为本候选及其当前机械依赖的工程证据；不是浏览器证据、内容权威、专家真值、许可法律结论、发布就绪或公开授权。
