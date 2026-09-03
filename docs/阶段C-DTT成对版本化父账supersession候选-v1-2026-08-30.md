# 阶段 C：DTT 成对版本化父账 supersession 候选 v1

日期：2026-08-30

## 结论先行

本批次创建了 `binding:dtt:month-command` 的一对新版候选父账，并用独立 receipt 机械绑定二者：

- source-binding `1.6.0` 显式 supersede 历史 `1.5.0`；
- source-rights `1.2.0` 显式 supersede 历史 `1.1.0`，并精确绑定新版 source ledger digest；
- Wikisource oldid main slot literal 与捕获时 rendered template dependency 分开记账；
- SSID 的顶层 `PD-scan` 与 CADAL 的顶层 `PD-old`（未观察到 `PD-scan` template）按 carrier 分开记账；
- Public Domain Mark 只作为页面标识观察，不被提升为 license 或候选专属法律结论。

这只是“新版候选父账已经成对形成”的 C 阶段增量，不是 bound readiness 晋级。专用 loader 已读取并固定当前 readiness 的 raw／semantic identity，并用自身 held-handle reader 逐条核对其八项 basis 的 point-in-time raw identity；该 readiness 仍消费历史父账：

- `boundReadinessConsumesSupersedingParents=false`
- `boundReadinessStillPinsHistoricalParents=true`
- `promotionBlocked=true`
- distribution 仍为 `link_only`
- formal `SourceRightsRecord=0`、`SourceCarrierRecord=0`、`KnowledgeDocument=0`
- Binding 仍为 `0/12`
- work／edition／carrier 三类 cleared count 均为 `0`，transcription 仍为 `terms_observed_not_cleared`
- 法律、内容、专家、发布就绪和公开发布授权继续全红

## 公开事实与判断边界

本轮只使用无需登录的公开只读页面，并优先使用托管方或权利工具发布方自己的页面。

### SSID carrier

[Commons SSID file page](https://commons.wikimedia.org/wiki/File%3ASSID-11335994_%E6%BB%B4%E5%A4%A9%E9%AB%93%E9%97%A1%E5%BE%AE.pdf) 显示上海大东书局、1947、516 pages；其 Licensing 区显示 mechanical scan／photocopy 相关 `PD-scan` 表述，并同时显示 Public Domain Mark。捕获时 current filepage revision 固定为 `708090379`。

新版候选只把页面观察分别记为：

- source：`commons_pd_scan_top_level_notice_observed_not_adjudicated`
- rights：`pd_scan_top_level_observed_not_adjudicated`

SSID anchor role 也明确写成托管页所描述的 1947 上海大东扫描候选，不是作品或版本身份依据。它不等于项目已独立确认原作、1947 版本、扫描增强、司法辖区或再分发条件。

### CADAL carrier

[Commons CADAL file page](https://commons.wikimedia.org/wiki/File%3ACADAL07005210_%E6%BB%B4%E5%A4%A9%E9%AB%93%E9%97%A1%E5%BE%AE.djvu) 显示“据上海大东书局 1947 年 04 月第 1 版影印”、CADAL `07005210`、521 pages。捕获时 current filepage revision 固定为 `1104458375`；其顶层告示是 `PD-old`，C-L2 main-slot 观察未见 `PD-scan` template。

新版候选只把页面观察分别记为：

- source：`commons_pd_old_top_level_notice_observed_without_pd_scan_template_not_adjudicated`
- rights：`pd_old_top_level_observed_without_pd_scan_template_not_adjudicated`

CADAL anchor role 明确写成托管页所描述的 1947 第一版影印候选，不是同版或转录身份依据；同版关系、作品身份、版本身份与载体身份均显式为 `false`。Commons 页面中的 CADAL／复旦来源描述仍只是托管页元数据；本批没有进入第三方后台、没有验证上传者身份，也没有把它算成独立馆藏证明或第二份法律意见。

### Wikisource oldid 与 rendered dependency

[Wikisource 固定页面](https://zh.wikisource.org/w/index.php?title=%E6%BB%B4%E5%A4%A9%E9%AB%93%E9%97%A1%E5%BE%AE&oldid=2600158) 的渲染页显示清朝作品公有领域告示；但 C-L2 捕获证明，oldid main slot literal 只有 `Template:清朝作品`，渲染依赖目录才出现 `Template:License` 与 `Template:PD-old`。由于模板 revision 会独立变化，oldid 单独不能固定后续渲染告示。

新版 rights candidate 因此同时保存：

- `oldidMainSlotPdOldLiteralObserved=false`
- `renderedPagePdOldDependencyObserved=true`
- 捕获时三个 template revision 已钉住
- `oldidAlonePinsRenderedNotice=false`
- `applicabilityEstablished=false`
- `legalConclusion=not_established`

### Public Domain Mark 与 Commons reuse

[Creative Commons Public Domain Mark 1.0](https://creativecommons.org/publicdomain/mark/1.0/) 描述的是作品被识别为无已知版权限制，同时明确提示司法辖区、其他权利和无担保边界。它不是许可方对本项目签发的 license，本项目继续固定 `publicDomainMarkCountsAsLicense=false`。receipt 只把该 URL 保存为未冻结的当前外部解释链接，明确记录 `fixedRevisionIdentityAvailable=false`、`legalConclusionEffect=none`、`admissionEffect=none`。

[Commons reuse 指南](https://commons.wikimedia.org/wiki/Commons%3AREUSE) 明确要求再使用者自行核对每个文件的 copyright status，并说明 Wikimedia Foundation 不保证页面版权与许可信息准确。这个公开规则观察支持 fail-closed，而不支持自动 clearance。

## 新版父账与历史身份

历史文件没有修改，也没有增加 backlink：

- source `1.5.0`：raw `47753` bytes；SHA-256 `e2ac6a7a0ea1209dd92a38dfae82c494df4792da1a102c11d2fdb2caa80e41f7`；ledger digest `44ed9e23490c11c625602b77574efbf7331305bd1bf87634c5b91f568e8b85af`。
- rights `1.1.0`：raw `20806` bytes；SHA-256 `433116caf1a2b9c233739093b0a2436f13c7f268dfa8af6c1ce481964b48b179`；ledger digest `3776e4b8799ca5221c1765a735c3e34c637b4f4952c9243836fedfbf1ee30a36`。

新增候选父账：

### Source binding `1.6.0`

- path：`content/bazi-strength-source-binding-candidates.v1.6.0.json`
- raw：`50427` bytes
- raw SHA-256：`62f6a68b99246a802bcf2055aa09a8ac8113df37a7ede1c55d8a2ea64deaea98`
- ledger ID：`hakimi.bazi.strength.source-binding-candidates/1.6.0`
- ledger digest：`6f008058b282613fd131344206b27fccb1d80596bb49789f0554acdd69c1e44c`
- DTT candidate：`dtt-chanwei-wikisource-r2600158-candidate-v2`
- DTT candidate digest：`2c59ee25081c6e0a88ee7f9da18395be2ea615bb289c28798e324e23befeeb59`

除 DTT notice projection、显式 supersession、候选账本与 candidate 的版本标识和必要 digest 外，另外三条 source candidates 保持语义完全相同。正文、quote literal、扫描文件及页面图像仍未写入仓库。

### Source rights `1.2.0`

- path：`content/bazi-strength-source-rights-candidates.v1.2.0.json`
- raw：`23947` bytes
- raw SHA-256：`678632a8875672f58bb5c9f1ec4a299a4f0c6e750b8ff4a02bfe4df889e1243a`
- ledger ID：`hakimi.bazi.strength.source-rights-candidates/1.2.0`
- ledger digest：`300e092c4913885cff626221b8734786128639c7d6cfd7c2be7bea2acc6bbefc`
- DTT rights candidate：`dtt-chanwei-wikisource-r2600158-rights-candidate-v2`
- DTT rights candidate digest：`674a0b64179f5fbb0dff331fdad6b6ac93e3093de4a8459abf6ff9bdd6cd418c`

该账绑定新版 source ledger digest，并把 work rendered notice 与两个 carrier notice 拆开；reviewer arrays、clearance、distribution 和 formal record 状态没有晋级。

### Paired supersession receipt

- path：`content/system-admission/bazi-dtt-versioned-parent-supersession.v1.json`
- raw：`9229` bytes
- raw SHA-256：`aa9e62089990d8ba699c441114914173141e8228f027605b47f5c5e238fac0e3`
- receipt ID：`hakimi.bazi.dtt-versioned-parent-supersession/1.0.0`
- receipt digest：`601b4e07b94e62b73812a7a26f1108a094272dca660a188bb660fa860f031264`

receipt 同时绑定新 source／rights raw identity 和 semantic digest；还绑定当前 readiness `1.6.0` 的 `30655` bytes、raw SHA-256 `1db59e2f7d3c5448f27b32d96bc8cf5a75968e8470dd0592d70594b44b3ec809`、ledger digest `97406785d688d3ab8b4dc824d7980c890a80bfc829a75279109edcc1c3d48f0c` 及其历史 parent identities。专用 loader 独立核对 readiness 八项 basis 的 intended-path raw identity，并直接固定 C-L2／C-L3 raw 与 semantic identity；这不等于旧 full verifier 的同 realm intrinsic closure，也不等于原子读取。receipt 明确记录 cross-file atomic、mutation epoch、跨文件 interval mutation 排除与 ABA 排除仍为 false；其 digest 是 canonical checksum，不是数字签名。

## 机械验证

验证入口：

- `scripts/bazi-dtt-versioned-parent-supersession-lib.mjs`
- `scripts/verify-bazi-dtt-versioned-parent-supersession.mjs`
- `scripts/verify-bazi-dtt-versioned-parent-supersession.test.mjs`

当前固定身份：

- lib：`58453` bytes；SHA-256 `ef49d484a24d4cf76f68dbb09cef50b580e81af10321a98879d9a1cb5b45473e`
- CLI：`377` bytes；SHA-256 `131b17b98b46814ba28c41abb4b31f2511848c8cd299bbf7edf8e368f0c0be2b`
- tests：`36189` bytes；SHA-256 `0249abe70fa76b08c97482991736d363b76762d78dd7b2151c1d67576bbdc478`

2026-08-30 后续 C 切片只扩展了该专用 loader 的只读、深冻结品牌结果：显式暴露固定 historical／superseding tuple、分层 notice projection 与 `mutationEpochReceipt=null`，并把 held-handle reader／strict JSON parser 作为窄生产 helper 导出给独立 version-aware candidate consumer。三份持久化 supersession 工件、receipt digest、候选父账 digest 与 `45/45` 原测试不变；这次接口扩展不把候选对接入旧 active readiness。

定向测试 `45/45` 通过。覆盖：

- live persisted package 与机械派生结果一致；
- 非 DTT source／rights candidates 不变；
- SSID／CADAL notice 不可交换；
- oldid literal 与 rendered dependency 不可合并；
- source／rights 不可单边 supersede；
- builder 不接受虽能自洽重封、但不是固定历史身份的 parent；
- rights 必须绑定新版 source digest；
- bound readiness 必须存在并保持固定 raw／semantic identity、历史 parent 指向及八项 basis point-in-time raw identity；旧 full readiness verifier 的正常环境结果另列在相邻契约组合测试中，不作为本品牌的 transitive intrinsic 依据；
- Public Domain Mark 不可自封 license；
- 不可伪造 source body、quote、redistributable、formal records 或 Binding freeze；
- 不可伪造 bound readiness 对新版父账的 adoption、mutation epoch、ABA、内容真值、法律结论或公开发布授权；
- literal／escaped duplicate JSON key、语义不变的 raw reformat、协同全链 reseal、hardlink、raw digest 漂移和 workspace path escape 均失败关闭；
- held handle 采用 `maxBytes+1` 有界读取，并核对 pre-path／handle-before／handle-after／post-path 端点与前后目录链；pre-open alias swap、post-read replacement 和并发增长均失败关闭；
- 导入后污染 `WeakSet`、`Object.freeze`、Array iterator／species、Hash prototype 或 `FileHandle.readFile` 不能伪造品牌、可变结果、basis 路径或同长度 raw identity；
- `syncBuiltinESMExports()` 对 `open/lstat/realpath/createHash` 的重绑定、clean-clone redirect 与 basis redirect 也不能绕过专用 loader 的捕获入口。

CLI exit `0` 只表示：新版候选父账对与 receipt 能从固定历史父账、固定 bound readiness、C-L2 公开证据和 C-L3 历史 reconciliation 机械复算。输出同时明确：

- `boundReadinessConsumesSupersedingParents=false`
- `boundReadinessStillPinsHistoricalParents=true`
- `boundReadinessLedgerDigest=97406785d688d3ab8b4dc824d7980c890a80bfc829a75279109edcc1c3d48f0c`
- `boundReadinessBasisArtifactsPointInTimeRawVerified=8`
- `promotionBlocked=true`
- `formalSourceRightsRecordCount=0`
- `formalSourceCarrierRecordCount=0`
- `bindingFrozenVerified=0`
- `releaseReady=false`
- `publicDeploymentAuthorized=false`
- `expertClaimsAuthorized=false`

相邻 C 契约显式组合为 `140/140`，发布治理测试为 `193/193`。系统草案边界测试仍是已知的 `69/70`：受限 `local-user-data-cleanup.ts` 被明确记录且未检查，另有既存 expert helper 未登记 imports 与旧 exact-quote test 非 literal dynamic import；本批新增 supersession 文件没有出现在失败清单中。这个已知失败没有被写成当前通过。

## 下一步顺序与当前已知红门

当前 `bazi-binding-freeze-requirements.v1.json` 仍是 `1.6.0`，依赖历史 source／rights 父账和 unresolved C-L3；本批没有把它静默改写为消费新版候选父账。

现有通用 `verifyBaziSourceBindingCandidateLedger`／`verifyBaziSourceRightsCandidateLedger` 仍只接受历史 schema/path，会明确拒绝新版 `1.6.0/1.2.0` 的 `supersession` envelope；测试已把“旧 verifier 必须拒绝”冻结为当前红门。因此这两个文件目前只能由专用 supersession loader 机械验证，不能被称为普通 active parent。下一版 reconciliation／readiness 必须先提供 version-aware consumer，再允许显式采用新版 pair。

因此下一批应先创建新版 reconciliation／readiness，使新版 source／rights pair 成为 active inputs，同时仍保持 `0/12` 和全部 authority 红门；随后一次性 rebind：

- PR10BC scope reconciliation；
- engineering value-subject gap；
- policy-weights child；
- C-M1 project-copy materialization requirements。

这些现有 child 仍钉住旧 readiness `26038` bytes／`662c91e6...`，而当前 readiness 已是 `30655` bytes／`1db59e2f...`；它们的 historical pass 不得冒充当前闭包。若现在先逐个修复，会在新版 active parents/readiness 落地后再次漂移。

本批没有运行全仓 typecheck、默认 Web build、完整浏览器/PWA、公开主机、Release Evidence、部署或回滚；也没有访问第三方后台、复制受限正文或联系现实专家。默认治理继续固定 `legacy-v13 / targetSchema 13 / migrationId null`。
