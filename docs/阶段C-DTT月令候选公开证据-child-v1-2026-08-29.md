# 阶段 C：DTT 月令候选公开证据 child

日期：2026-08-29

状态：`binding:dtt:month-command` 的一条月令 hash-only quote locator、两个载体的两条月令 normalized collation 候选及两份公开载体整文件 SHA-256 已作操作员记录；本 child 仍为 link/hash-only，不建立正式载体、正式权利、KnowledgeDocument、Binding、专家、法律或发布结论

## 1. 本批次只处理一个候选主题

本 child 单向投影父来源候选 `dtt-chanwei-wikisource-r2600158-candidate-v1` 与父权利候选 `dtt-chanwei-wikisource-r2600158-rights-candidate-v1` 中的 `binding:dtt:month-command`／`bazi.strength.binding.dtt.month-command.v1`。投影范围严格限于：

- `dtt-yueling-minimal-v1`：只保存固定 revision 内的字符 locator、字符／UTF-8 byte 数、唯一出现次数与 SHA-256；不保存 quote 文本。
- `dtt-yueling-ssid-11335994-page-170-normalized-collation-v1`：只保存既有候选 ID、页定位、归一化摘要与 candidate digest。
- `dtt-yueling-cadal-07005210-page-178-normalized-collation-v1`：只保存既有候选 ID、页定位、归一化摘要与 candidate digest。

没有投影父候选中的其他 quote 或其他 collation。两条 normalized collation 都明确不是 exact glyph equality，也没有现实人工校勘或领域专家审定；它们的 `rightsEffect` 与 `bindingFreezeEffect` 均为 `none`。

## 2. 当前公开读取的操作员记录

2026-08-29T15:17:27.103Z 至 15:17:44.685Z，使用无需登录、无凭据的公开 HTTPS GET 读取完成一次内存／临时文件捕获。捕获执行 receipt、TLS peer certificate 与 wire bytes 未保存；以下均是操作员记录，离线 verifier 只能核对本 child 的固定目录，不能重放或证明远端读取。

### 2.1 固定 Wikisource revision

2026-08-29T15:17:27.115Z 至 15:17:29.109Z，Wikisource content API 返回 HTTP 200、无 redirect、`application/json`；交付给客户端的 decoded body 为 413611 bytes，SHA-256 为 `50a6dcd01360f2cf48df8ca0fe51db7b4e87255505b1aa530506ba307b56e7e9`。

操作员记录的固定身份仍为 page `340255`、revision `2600158`、parent revision `1163183`、revision timestamp `2025-09-25T13:22:02Z`、MediaWiki SHA-1 `6ac3dc412881525c2c0544b75e51512cc0daa573`。main-slot wikitext 为 143701 characters／401801 UTF-8 bytes／SHA-256 `1d1a3d61c1b9a26618b41b8ead857a6b966992fdf2adabdc607a0c6cb4c8f04d`，但正文没有写入仓库。

唯一投影的月令 locator 为 `[38616, 38628)`、12 characters／36 UTF-8 bytes、SHA-256 `03df5322e1504e142e673e7d11c2d0ad4e08fa84ddbdea3d5c75532d520cc3b9`，在该 revision 内出现 1 次；quote 文本没有保存。

### 2.2 Commons 元数据与文件页 main slot

2026-08-29T15:17:29.268Z 至 15:17:30.434Z，Commons imageinfo API 的 decoded JSON 为 5215 bytes／SHA-256 `9bc0b63a255ff926fd7154a4de8495eb06f4066a670f7157f6976a914359bfc1`；2026-08-29T15:17:30.447Z 至 15:17:31.763Z，固定文件页 revision API 的 decoded JSON 为 2633 bytes／SHA-256 `f1b2082c7d64b90fdc1da44525a82faedcfdc27f4c9475f22f62f54463a7a17b`。两次均为 HTTP 200、无 redirect、`application/json`，响应正文均未保存。

文件页 main-slot 观察出现一个必须保留的分歧：

- SSID 文件页 `125728441`、current/fixed revision `708090379`（`2022-11-20T09:29:18Z`，MediaWiki SHA-1 `781410219e98836c08901c4d66bf762dfe9d2f20`）的 main slot 为 901 characters／933 UTF-8 bytes／SHA-256 `55d405f7cc909c4ee2f356e3bacd7da2903bc759596e6ab1cae13b58014fbc05`，观察到 `PD-scan` 1 次、`PD-old` 0 次。
- CADAL 文件页 `126125545`、current/fixed revision `1104458375`（`2025-10-24T20:27:06Z`，MediaWiki SHA-1 `3df322a75e5f71d1772344c139dcf21833d5534b`）的 main slot 为 883 characters／975 UTF-8 bytes／SHA-256 `30194bbd8c92409dc8efb02f536b0909a6b29fa793528bc6ac81063bb04bc001`，观察到 `PD-scan` 0 次、`PD-old` 1 次。

这不是两个独立许可结论。SSID 文件页观察到的 category token 为 `PD Old`、`PD-scan (PD-old)`、`CC-PD-Mark`；CADAL 为 `PD Old`、`CC-PD-Mark`，没有任何 `PD-scan` token。`CC-PD-Mark` 只按 category token 记录，`publicDomainMarkCountsAsLicense=false`，标记者身份、权限与标记正确性均未验证。

SSID 与 CADAL 的 MediaInfo/Structured Data 不能作为独立于各自 Commons 文件页的第二权利来源；两个 imageinfo 记录虽然显示同一 uploader label `Bot for Freedom` 与数值 ID `11190818`，但本 child 没有核验现实身份或账号控制，`uploaderIdentityVerified=false`。来源族只按操作员记录分为 `DTT_WIKISOURCE_REVISION_2600158_FAMILY` 与 `DTT_COMMONS_METADATA_AND_HOSTING_FAMILY` 两组；两个载体都位于后一组，所以 Commons upstream group 仍只计 1。分歧保持 `unresolved`，阻断任何正式权利、正式载体或分发升级。

Wikisource `oldid=2600158` 的 main-slot literal 中没有 `PD-old`，固定正文自身只有 `清朝作品` token。2026-08-29T15:21:32.094Z 至 15:21:33.589Z 的 public parse API 操作员记录为 HTTP 200、876 decoded bytes／SHA-256 `f010e2cc374b0290222c7499c6e6461b3bdb809c04303536de16be4632b4ad51`，动态模板列表包含 `Template:清朝作品`、`Template:PD-old` 与 `Template:License`；响应没有保存。

2026-08-29T15:21:33.605Z 至 15:21:34.760Z 又以固定 revision IDs 读取这三个依赖，记录为 HTTP 200、1839 decoded bytes／SHA-256 `9cc78b51e9bc7a0fb6be0597695e1309c2a2a7929cfa38e1bca2dccde66a6f36`：`Template:License` revision `2319541`、`Template:PD-old` revision `2636674`、`Template:清朝作品` revision `2636660`。这些依赖 revision 只是在本次捕获时固定记录，并不由源页面 `oldid` 单独冻结。因此，固定 oldid 不能被解释为同时冻结动态渲染的权利通知。

CADAL revision 是多 slot revision。2026-08-29T15:28:56.053Z 至 15:28:57.881Z 的 `rvslots=*` 操作员读取为 HTTP 200、4238 decoded bytes／SHA-256 `473117b638a05f8b08204eee8b3031ce803083ffca4634fc67545b899fb08060`。revision aggregate size 为 4306，aggregate MediaWiki SHA-1 为 `3df322a75e5f71d1772344c139dcf21833d5534b`；main slot 是前述 975 bytes／SHA-256 `30194bbd8c92409dc8efb02f536b0909a6b29fa793528bc6ac81063bb04bc001`，MediaInfo slot 的 content model 为 `wikibase-mediainfo`、content format 为 `application/json`，2402 characters／bytes／SHA-256 `cb1703b72f307f1a12f9efed976d1e95d9e39bd94554f037d465c21f410a4394`。aggregate、main 与 MediaInfo 三种身份没有混写；两个 slot 正文均未保存，MediaInfo 也不计独立权利来源。

### 2.3 两份载体整文件

两个公开文件只下载到经边界检查的系统临时目录用于流式 SHA-256，随后删除；仓库中没有保存载体、页图或派生文本：

| 载体 | 捕获窗口 | HTTP／长度 | 响应标签 | 本轮整文件 SHA-256 | 父候选比较 |
|---|---|---|---|---|---|
| SSID-11335994 PDF | 15:17:31.801Z–15:17:37.601Z | 200／14751242 bytes | ETag `ddc30202f8dd1a30450b172363630243`；Last-Modified `Sun, 20 Nov 2022 09:29:18 GMT` | `d6a7d1daf6513ce9fb9940ff8331b96804c10cdafbeac00d4d3d0a37229e1803` | exact match |
| CADAL07005210 DJVU | 15:17:37.657Z–15:17:44.652Z | 200／17912324 bytes | ETag `f3be2ba747b8454f560d1eac8310cedb`；Last-Modified `Wed, 30 Nov 2022 06:30:20 GMT` | `1d0a16f528ed3074cdefad33b2d2f9233a47199cf88a8b02001c897e16996e60` | exact match |

两份文件分别对应 SSID scan page 170／书内“二八”／“月令”和 CADAL scan page 178／书内“二八”／“月令”。2026-08-29T15:28:57.924Z 至 15:28:59.016Z 对两个精确 `Index:` title 与四个精确 `Page:` title 的 public API probe 为 HTTP 200、1179 decoded bytes／SHA-256 `b6bb339591b4a605f104c54070839da3dee0eb0133c4dd35ebc2efdc9ad8a56c`，六个 title 均 `missing=true / pageid=null`。这是时间点观察，不证明未来永久缺失；但当前两个 `?page=` viewer 定位没有 Page namespace revision、timestamp、SHA-1 或 proofread state，不能伪装成逐页固定 revision。两份载体是两个不同文件；父账把两者描述为 1947 上海大东书局同版关系，但本 child 未独立建立 SSID↔CADAL 同版身份，独立版本见证数与独立权利来源数仍为 0。

## 3. 父身份与法规则观察只作单向引用

本 child 单向锁定当前父来源账、父权利账及 `bazi-prc-copyright-law-public-evidence.v1.json` 的 raw SHA-256 与各自语义 digest。父文件没有增加 backlink，也没有重签中央 manifest、registry 或 cross-system receipts。

中国现行著作权法公开证据 child 仅提供“作品层、整理／注释／汇编层、载体层需要分账”的操作员规则观察；它不替本 DTT 候选裁判作者身份、死亡时间、版本贡献、扫描贡献、Wikisource provenance、目标司法辖区、署名或 ShareAlike 履约。Commons 的 `Public domain` 元数据、SSID 的 `PD-scan`、CADAL 的 `PD-old` 与 Wikisource 动态模板都只是页面标签观察，不是法律结论。

## 4. 准入、存储、完整性与发布边界

- `distributionPolicy=link_only`；source body、response body、quote、page image、carrier file、carrier glyph sequence 与 repository derivative 的持久化数量全部为 0。
- `KnowledgeDocument=0`、正式 `SourceRightsRecord=0`、正式 `SourceCarrierRecord=0`、物化来源包 0、可再分发来源 0。
- 作品层、版本层、转录层、载体层均未 cleared；`legalConclusion=not_established`，没有现实法律 reviewer。
- `bindingFrozenVerified=0/12`；本主题 Binding 未冻结；内容真值、八字规则真值、专家真值、版本／转录身份、exact collation 均未建立，现实独立专家审定仍为 `0/2`。
- 逐文件 raw identity 检查不是跨文件原子快照；没有 mutation epoch，不能排除 interval mutation 或 ABA。
- 默认继续 `legacy-v13 / targetSchema 13 / migrationId null`，`expertClaimsAuthorized=false / publicDeploymentAuthorized=false`。本 child 不证明全仓 typecheck、默认 Web build、浏览器/PWA、Release Evidence、部署、回滚、release readiness 或公开发布授权。
