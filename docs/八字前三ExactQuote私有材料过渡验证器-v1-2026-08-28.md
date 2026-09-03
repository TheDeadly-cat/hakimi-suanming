# 八字前三 Exact Quote 私有材料过渡验证器 v1

日期：2026-08-28

状态：`engineering_transition_verifier_only / no_private_material_verified / bindings_frozen_0_of_12`

## 1. 本轮真实进展

本轮没有重复创建 `SourceCarrierRecord`，也没有生成一份内容为空但名为“审定就绪”的 packet。新增的是候选来源进入私有证据域时的过渡验证器：

- `scripts/bazi-private-exact-quote-material-verifier-lib.mjs`
- `scripts/verify-bazi-private-exact-quote-material.mjs`
- `scripts/verify-bazi-private-exact-quote-material.test.mjs`

只有操作者以后把有权使用的固定修订正文放在工作区之外的明确私有目录，并提供严格请求文件时，验证器才会读取材料。每个私有文件通过同一持有的 `FileHandle`、前后 `fstat`／realpath 身份核对和 `maxBytes + 1` 有界读取进入内存，再重算正文 SHA-256、UTF-8 字节数、UTF-16 code-unit 定位、行号、最小引文 SHA-256、字节数和包含重叠情况的唯一出现次数；输出只含摘要、定位、计数和失败关闭状态，不含正文、引文字面、私有根路径或材料相对路径。

当前没有向验证器提供真实私有正文，所以本轮只建立工程过渡能力，不产生真实材料回执，不把任何 binding 提升为 frozen。

## 2. 范围不是“三条新 binding”

前三项是 3 个审计主题，不是 3 个当前 binding：

| 审计主题 | 当前 binding | 当前 quote candidate |
| --- | --- | --- |
| `strength.yueling_exact_quote` | `binding:dtt:month-command` | `dtt-yueling-minimal-v1` |
| `strength.yueling_exact_quote` | `binding:smt-v10:whole-chart` | `smt-v10-yueling-minimal-v1` |
| `strength.rooting_exact_quote` | `binding:dtt:month-command` | `dtt-rooting-minimal-v1` |
| `strength.tougan_exact_quote` | `binding:smt-v10:whole-chart` | `smt-v10-tougan-minimal-v1` |

因此机械范围精确为 `3 topics / 2 current bindings / 4 quote candidates`。`rooting` 和 `tougan` 仍没有独立 binding，必须等待领域模型粒度审查；验证器拒绝把 topic ID 偷换成平行 binding。

## 3. 私有请求边界

请求文件必须位于工作区之外的私有根目录。示例只展示元数据，不包含来源正文或引文字面：

```json
{
  "schemaVersion": "1.0.0",
  "recordType": "bazi_private_exact_quote_material_verification_request",
  "requestId": "local-check-001",
  "topicId": "strength.yueling_exact_quote",
  "quoteCandidateId": "dtt-yueling-minimal-v1",
  "sourceBodyRelativePath": "materials/dtt-r2600158.wikitext",
  "handlingBoundary": {
    "privateRootOutsideWorkspaceRequired": true,
    "repositoryStorageAllowed": false,
    "materialRedistributionDecision": "not_established",
    "quotePublicationDecision": "not_established",
    "rightsLegalConclusion": "not_established"
  }
}
```

调用形式：

```text
node scripts/verify-bazi-private-exact-quote-material.mjs --private-root <绝对私有目录> --request <相对请求文件>
```

验证器不判断材料访问是否合法。操作者仍必须在外部完成材料取得授权、隐私和保存范围判断；`private material integrity verified` 只表示提供的字节与既有固定修订和 quote locator 相符。

`requestId` 会作为非敏感关联标识进入脱敏回执；机械校验只能约束其 ASCII 格式，不能判断其语义。操作者必须使用不含姓名、账号、路径、材料标题或其他敏感含义的公开随机／流水标识。

## 4. 失败关闭门

当前实现拒绝：

1. UTF-8 BOM、非法 UTF-8、任意层重复 JSON key；
2. accessor、Proxy、Symbol、非普通 prototype、稀疏数组或额外字段；
3. 绝对路径、反斜杠、`..`、工作区内私有根、包含工作区的过宽私有根、越界 realpath、符号链接、hard-link alias、打开前后对象身份换绑或超过有界读取上限；
4. topic／quote 映射漂移、创建 `rooting`／`tougan` 平行 binding，或把其他来源样板混入前三范围；
5. 正文摘要、UTF-8 字节数、UTF-16 长度、行号、字符区间、引文长度或引文摘要任一漂移；
6. 从上一个命中结尾继续搜索而漏掉重叠重复；验证器固定从 `start + 1` 搜索；
7. 把上游 `link_only / not_established / 0 reviewer / candidate_only_unbound` 提升为公开引用、法律结论或冻结；
8. 在回执中把研究候选映射改写成当前 binding 决策；回执原样保留 `mappingState`，只标注 `research_candidate_only`，未知映射状态失败关闭；
9. 在回执或 CLI 失败输出中保存／回显正文、畸形 JSON 片段、私有路径、载体字节、页图或 OCR 文本。

既有 `audit-bazi-source-binding-candidates-live.ps1` 原来从 `endExclusive` 才搜索第二次出现，会漏掉重叠重复；本轮同步改为从 `start + 1` 搜索。定向测试使用合成正文覆盖汉字、astral Unicode、UTF-16/UTF-8 差异、`aaa` 中 `aa` 的重叠重复、hash/locator 漂移、严格 JSON、descriptor-safe 对象、路径逃逸、hard-link alias、请求体上限、候选权限措辞和库／CLI 脱敏错误输出，并静态锁定 live auditor 的同一搜索语义。回执构造器保持在生产 verifier 模块内且不导出；运行时字段测试只在 OS 临时目录对当前源码加载测试插桩副本，内存中的合成回执不是材料回执或可提交证据。新验证器为 `1 file / 13 tests`，与来源候选、权利候选、冻结准备账合并为 `4 files / 46 tests`，全部通过。

平台证明边界：当前 Windows／Node v24.16.0 的 `fs.constants.O_NOFOLLOW` 不可用，因此本实现不能声称具备内核级 `openat/no-follow` 保证。普通文件换绑会在读取任何字节前因 `FileHandle` 的 `dev/ino` 与路径对象不一致而失败；但尚未执行真实对抗式 junction/reparse-point 竞态，也未验证网络盘或 FAT 类文件系统的标识与纳秒时间戳语义。并发把中间路径换成特殊或阻塞目标仍可能形成 `open()` 返回前的拒绝服务，这一 P3 平台风险不属于“已验证关闭”。

## 5. 当前中央闭包漂移单列

只读基线核验发现，新验证器之前已有两处未确认的上游哈希漂移；本轮又有一处已知、定向验证的 live auditor 修正。当前没有把三者混在一起擅自重签：

| 工件 | 已冻结 SHA-256 | 当前 SHA-256 |
| --- | --- | --- |
| `packages/bazi-core/src/index.ts` | `73e0be8dbb2f40132158ee5dba26e493e18b686f9c888552c3e596c713301b2f` | `4c9b7fc5a16cbd3e3f5ca0bed90cd950b8ef3750f204427a332a6c1a1b4e7e7f` |
| `scripts/audit-bazi-source-binding-candidates-live.ps1` | `36d6bd96467c345782d9c4d5862f0f9ef908c90feafc12490595b59e945fa6ae` | `fe15feff99df887e5810fce508cec4158edd9b19278797ff1943dd9300f0dd3d` |
| `package.json` | `b8d8a31c3c4ae3669e196f0398288bf44284fdc1093ccbf6e510f8fcde0ca62c` | `79ed3e10c5e8b9da4a128d98b9f6c48fbf716d9f4432cef442ee27c355d68dd0` |

当前只读结果：

- 来源候选账：通过，4 candidates，0 frozen；
- 三层权利候选账：通过，正式 SourceRights/SourceCarrier 均为 0；
- 12 条冻结准备账：通过，0/12；
- 专家候选包：失败，因 `packages/bazi-core/src/index.ts` 与其 artifact lock 漂移；
- 八字 domain manifest：失败；
- 四体系 registry：失败；
- historical natal runtime closure：失败，首个报告差异为 sidecar 中根 `package.json` 的 byteLength `20716`，当前为 `26719`；
- release governance：通过，仍为 `legacy-v13 / targetSchema 13 / migrationId null`，但该通过不能替代八字内容闭包。

live auditor 的漂移来自本轮修复重叠唯一性检查，已有合成向量和静态绑定；另两处当前修改的语义和归属仍未确认。在它们完成复核之前，不能只重算 SHA-256 把红门变绿。新过渡验证器也暂不进入正式 lifecycle／domain manifest，避免在中央闭包尚漂移且没有真实私有材料时制造“已完成 PR10A”的错觉。

## 6. 证据分账

| 账 | 当前结论 |
| --- | --- |
| 工程证据 | 已建立私有正文到 hash-only 脱敏回执的验证能力，并修复 live auditor 的重叠唯一性检查；新验证器 13 个、合并切片 46 个定向测试通过 |
| 浏览器／运行时证据 | 未评估；没有启动应用、浏览器、PWA 或公开主机 |
| 内容真值 | 未建立；没有真实私有材料回执，也没有人工校勘 |
| 专家真值 | 未建立；现实独立专家仍为 0/2 |
| 权利／法律判断 | 未建立；验证器不判断材料访问、必要引用或再分发是否合法 |
| Binding 冻结 | `0/12`，前三主题没有变成三条新 binding |
| 发布就绪 | 未达到 |
| 公开发布授权 | 未授权 |

默认发布治理继续固定为 `legacy-v13 / targetSchema 13 / migrationId null`，`publicDeploymentAuthorized=false`、`expertClaimsAuthorized=false`。本轮未读取或修改受限文件，未运行全仓 typecheck、默认 Web build、Git、网络、浏览器、部署或外部平台操作。
