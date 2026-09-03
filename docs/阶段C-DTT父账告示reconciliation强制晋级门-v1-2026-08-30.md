# 阶段 C：DTT 父账告示 reconciliation 强制晋级门 v1

日期：2026-08-30

## 结论先行

本批次完成的是 `binding:dtt:month-command` 的机械组合门，不是来源许可、版本权威、内容真值、专家真值或发布授权。

旧 source／rights 父账继续保持原始字节与语义身份，C-L2 继续作为不可改写的历史发现。新增 C-L3 versioned overlay 将历史父账与当前父账分开记录；当前父账仍是存在告示投影矛盾的旧版本，因此：

- `noticeDiscrepancyResolved=false`
- `currentParentsVersionedSupersessionComplete=false`
- `promotionBlocked=true`
- distribution 仍为 `link_only`
- formal `SourceRightsRecord=0`、`SourceCarrierRecord=0`
- Binding 仍为 `0/12`
- 内容、专家、法律、发布就绪及公开发布授权继续全红

## 为什么不能直接修改父账

C-L2 已冻结一个历史事实：旧 source 父账把 SSID 与 CADAL 两个 carrier 都投影成同一复合告示，旧 rights 父账又把 Wikisource 的 `PD-old` 写成 page-specific observation；但固定观察显示：

- Wikisource oldid main slot 没有 `PD-old` literal；`PD-old` 来自捕获时的动态 rendered dependency，oldid 单独不能固定该渲染告示。
- SSID 固定 filepage 观察到顶层 `PD-scan`。
- CADAL 固定 filepage 观察到顶层 `PD-old`，未观察到 `PD-scan` template。

若原地改写父账，会抹去 C-L2 所指向的历史身份；若让 readiness 直接依赖 C-L2 full loader，未来新版本父账又会被旧 raw pin 卡死。因此 C-L3 采用独立 overlay：

1. held-handle 读取固定 C-L2 child 原始字节，只调用其纯 artifact verifier；不要求当前父账继续保持旧字节。
2. `historicalParents` 永久记录 C-L2 所见旧身份。
3. `currentParents` 另行稳定读取，并通过 source／rights 完整 verifier。
4. 未来必须使用成对的新版本父账、显式 `supersedes` 与新版 overlay；禁止改写 C-L2 或旧父账。
5. readiness 的 source／rights trust-chain 第三个必需输入是品牌化 C-L3；缺失、克隆或自封对象均失败关闭。

### C-L3 信任边界加固

C-L3 不把共享 C-L2 parser、可变全局 intrinsic 或动态原型调用直接当作品牌依据：

- 私有捕获的 fatal UTF-8 decoder、严格 JSON AST 重复键检查和捕获的 `JSON.parse` 先独立解析，再与共享 C-L2 parser 的规范结果比对；共享 decoder／parser 污染不能把无效字节升级为有效 overlay。
- `Object.freeze`、WeakSet、Buffer／TypedArray 内部槽、FileHandle `read/stat/close` 与 Stats 类型判断均在模块初始化时捕获；等长磁盘漂移仍由真实读取字节决定 hash。
- schema key、父账组合、Promise 结果、目录链与 `path.resolve` 参数全部改用索引或捕获方法处理；运行期不再消费 Array iterator。污染 `Array.prototype[Symbol.iterator]` 不能改写 schema、把固定请求路径重定向到替代文件，或改变品牌化 full-load 的字节与摘要。
- full-load 结果先完成递归冻结审计，再写入私有品牌；污染 `Object.freeze` 或 WeakSet 原型不能产出可变或伪造品牌。
- 该边界不声称能自证预导入 runtime、`NODE_OPTIONS`、Node builtin 或 OS 内核整体未被攻陷；也不改变 cross-file atomic、interval mutation 与 ABA 继续未证明的结论。

## 固定身份

### C-L3 overlay

- artifact：`content/system-admission/bazi-dtt-notice-reconciliation.v1.json`
- bytes：`8709`
- raw SHA-256：`e3f014e8f87457b09ae866b79fe2581f87553658829515db61f597c345f6ff68`
- reconciliation digest：`fabf96fddf7f3710b86f22b0d3f7aa7844087351f30c53fbb823780f3d81ba2f`
- verifier lib SHA-256：`5587c19a5c0df8973cfb4183c3cbd51eabc2c8c32bec3c692d72bd7db919c8cb`
- CLI SHA-256：`a52cf55e093435d214c9f30b8af8eea6f91043120c2865f9289f4d6ac4e4d7a1`
- tests SHA-256：`e63cf86008d14903d0f23f6a88b57feab63813ea1c59e39503a3c5a6d0c9bc3e`

### readiness v1.6.0

- artifact：`content/system-admission/bazi-binding-freeze-requirements.v1.json`
- bytes：`30655`
- raw SHA-256：`1db59e2f7d3c5448f27b32d96bc8cf5a75968e8470dd0592d70594b44b3ec809`
- ledger digest：`97406785d688d3ab8b4dc824d7980c890a80bfc829a75279109edcc1c3d48f0c`
- verifier lib SHA-256：`ae56d0015f944a67eae3adf56186625568a32d090d5cfd18ca6eea5615402b59`
- CLI SHA-256：`e840e37febffae2f7e04b6d1722f1717b16e7410297410b459ceb308cf4eb681`
- tests SHA-256：`1aebdd3f9d12e65927f9c2355ba998241e375d35cb2c456634539e6e0b2ca8ec`

readiness `1.6.0` 是对 `1.5.0` 的可见版本晋级，不是静默覆盖语义。它新增：

- C-L3 artifact raw identity；
- 历史／当前父账分离投影；
- `activeParentNoticeReconciliationRequiredBeforePromotion=true`；
- required/resolved/blocked 为 `1/0/1`；
- cross-file atomic、mutation epoch、interval mutation、ABA 均继续为 false／null 边界。

## 验证

- C-L3 定向：默认 `18/18`；`--test-concurrency=1` 亦为 `18/18`
- C-L2 + C-L3 + source + rights 的独立串行组合：`86/86`
- engineering binding + source + rights + C-L2 + C-L3 + readiness 消费者切片：默认与串行均 `103/103`
- source + rights + C-L1 法规则观察 + C-L2 + C-L3 + readiness：默认并发 `126/126`
- 同一六文件集合、`--test-concurrency=1`：`126/126`
- Array iterator 定向复现：schema、reader path／bytes／hash 与 full-load brand 单项回归 `1/1`；目标 iterator 未被消费。
- C-L3 CLI：exit `0`，但只输出 `offlineDttNoticeReconciliationOverlayMechanicallyVerified=true`
- readiness CLI：exit `0`，明确输出 reconciliation `0/1`、promotion blocked、Binding `0/12` 及全部 authority 红门

局部门与中央门分账：source、rights、C-L2、C-L3、readiness 为机械绿；专家 packet、八字 domain manifest、四体系 registry 与跨体系 receipts 未重签并继续 expected-red。这里的红不是测试回归，而是避免把新子账身份冒充成中央闭包。

一次探索性扩围误纳入既有 policy-weights consumer 时仍出现 `8` 个 `PARENT_LEDGER_DRIFT`；该范围未修改，也未计入上述定向通过数。因此本批不能表述为全部 C 消费者或全仓测试绿色。

## 公开材料补充观察及其边界

只读公开研究没有找到可把当前两个 Commons carrier 直接升级为独立 1947 版本见证的可靠捷径：

- Creative Commons 的 [Public Domain Mark 1.0](https://creativecommons.org/publicdomain/mark/1.0/) 本身不是许可，并明确保留司法辖区、准确性及担保边界；本项目仍不能据此生成候选专属法律结论。
- [FAU IKGF 的《滴天髓闡微》研究页](https://www.ikgf.fau.de/research/research-projects/techniques-and-practices/critical-edition-and-translation-of-the-the-leaking-essence-of-heaven.shtml) 可作为作品／版本史研究线索，但不直接证明当前 1947 carrier 的独立馆藏身份或权利。
- [Commons CADAL filepage](https://commons.wikimedia.org/wiki/File%3ACADAL07005210_%E6%BB%B4%E5%A4%A9%E9%AB%93%E9%97%A1%E5%BE%AE.djvu) 仍属于与 SSID 相同的 Commons 上游组，不能把两份不同 bytes 自动算作两个独立版本或两份法律意见。
- 检得的 [WorldCat 条目](https://search.worldcat.org/zh-cn/title/815245567) 是 1984 五洲版，不是当前 1947 上海大东书局 carrier 的独立书目见证。

本轮临时视觉核验曾观察到 SSID 与 CADAL 前置页的同一题名／民国三十六年四月初版信息；但页面图像未存入仓库，观察不是独立书目证明、版本同一性证明、exact transcription、版权结论或专家审定。

## 明确未完成

- 父账告示矛盾仍未解决；尚无成对的新版本 source／rights 父账及 supersession。
- 作品层、版本／转录层、载体层许可依据仍未闭合。
- formal Rights／Carrier／KnowledgeDocument 仍为 0。
- 现实专家身份、资质、独立性和两份意见仍为 0/2。
- 未运行全仓 typecheck、默认 Web build、完整浏览器／PWA、公开主机、Release Evidence、部署或回滚确认。
- `publicDeploymentAuthorized=false`，`expertClaimsAuthorized=false`。
- 默认治理继续是 `legacy-v13 / targetSchema 13 / migrationId null`。
