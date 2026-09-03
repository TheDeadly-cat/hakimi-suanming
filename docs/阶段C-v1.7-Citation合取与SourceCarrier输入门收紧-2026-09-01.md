# 阶段 C：v1.7 Citation 合取与 SourceCarrier 输入门收紧（2026-09-01）

## 0. 结论

本增量关闭两个不需要外部原文、权利裁定或真人专家授权的机械治理缺口，同时保持 `single-chart-report` 输出格式 `1.7.0` 与 frozen golden 不变：

1. 旺衰 binding 只有在**同一条 Citation** 同时包含当前 Case／Revision 的有效 `chart_field` 与目标 binding 的 `evidence_subject` 时才进入机械准入与汇总；
2. `SourceRights` 单独满足 rights-only 公式不再足以进入报告内 redistributable 投影。构建输入还必须提供唯一、精确闭合且通过共享 material gate 的 `SourceCarrierRecord`。

这是工程失败关闭收紧，不产生任何新的来源正文、exact quote、许可结论、专家意见、Binding freeze、发布就绪或公开发布授权。

## 1. 固定边界

| 账户 | 本增量状态 |
|---|---|
| release identity | `legacy-v13` |
| targetSchema | `13` |
| migrationId | `null` |
| mutation epoch | 未绕过；本增量不修改存储或迁移 |
| frozen v1.7 golden | 原始 SHA-256 仍为 `aba357d98a99271cc9a9b2727ad1c7c516424c94b7cf34f765cb38b0e9a74b29` |
| Binding freeze | `0/12`，未提升 |
| formal KnowledgeDocument／SourceRights／SourceCarrier／materialization | `0/0/0/0`，未提升 |
| content truth／expert truth／rights legal conclusion | 均未建立 |
| release ready／public deployment／expert claims | 均为 `false` |

## 2. 同一 Citation 合取

### 2.1 Builder 与汇总

- 原始 Citation 只有同时命中目标 binding subject，并至少包含一个 `caseId`、`revisionId` 与当前报告完全相同的 `chart_field`，才进入该 binding 的 `candidate／rejected／verified` 分区。
- `subject-only`、其他 Case、其他 Revision，以及“C1 只有 chart field、C2 只有 subject”的拆分引用均可作为普通结构化 Citation 保留，但不得贡献当前单盘旺衰准入或汇总计数。
- 当前 Revision 中不存在的字段仍由既有字段路径检查拒绝；本增量没有放宽该门。

### 2.2 序列化与 standalone 边界

v1.7 序列化 Citation 只保留可见的 `命盘字段 <field>` 标签，不保留 target 的 Case／Revision ID。因此必须分开两种能力：

- standalone report schema 与 Web 展示校验只能证明“同一 C# 内可见 chart-field 标签 + subject + admission/summary”的投影自洽；
- 精确 current Case／Revision 身份只能由 builder，或 `validateSingleChartResearchReport(report, rawInput, options)` 使用原始输入规范重建并 exact compare 建立。

测试明确保留这一边界：从 subject-only 报告添加任意伪造字段标签并同步内部投影，standalone schema 可能接受；带原输入 validator 必须拒绝。若以后要求序列化报告独立证明 Case／Revision ID，必须升格式并新增 golden，不能覆盖 frozen v1.7。

## 3. SourceCarrier／material gate

### 3.1 输入合同

- `sourceCarriers` 是可选输入，默认 `[]`，保持既有 private／user-import 调用兼容。
- 数量上限固定为 `512`，并进入 raw collection 预检与 whole-input aggregate 容量检查。
- `carrierId` 与 `documentId` 均必须唯一；未被当前报告 redistributable 资料消费的 carrier、重复记录和无关夹带全部拒绝。

### 3.2 再分发闭合

当 `isRedistributableSourceRights(rights)` 为真时，构建器必须取得同一 `documentId` 与同一正文 SHA-256 的 SourceCarrier，并通过共享 `isRedistributableSourceMaterial(rights, carrier)`：

- rights 与 carrier 精确绑定同一文档及正文摘要；
- carrier 使用 `public_repo`；
- carrier 权利状态明确并完成双人结构化复核；
- reproduction／quotation／redistribution 三项均明确允许；
- rights evidence refs 非空。

缺 carrier、documentId／hash 错绑、私有存储、单审、未知权利、任一许可为 false、证据为空、重复或未消费 carrier 均失败关闭。多个 C# 可复用同一 D# 与同一 carrier，不放大记录计数。

### 3.3 不外推的事实

- `sourceCarriers` 不进入 v1.7 序列化输出，匿名输出也不携带 carrier ID 或元数据；
- SourceCarrier 重复、缺失或 material gate 失败使用不含 `carrierId`／`documentId` 的固定错误消息；匿名 builder 与带原输入 validator 的失败路径均不得通过异常回显这些 UUID；
- standalone schema／Web 解析无法从 v1.7 文本独立重演 material gate；只有 builder 或带原输入 validator 能证明本次构建消费过 carrier；
- 结构化双 reviewer 仍不证明现实身份、彼此独立、专业资质或法律权限；
- 本门不把候选 carrier、网页 notice、哈希观察或测试通过升级为正式 SourceCarrierRecord 实例或法律结论。

## 4. 聚焦验证

| 验证 | 结果 | 能证明的范围 |
|---|---:|---|
| `packages/research-export/src/index.test.ts` + Web `single-chart-report.test.tsx` | `2 files / 103 tests` 通过 | builder、validator、standalone 投影边界、Web 可见投影、carrier 负例与匿名边界 |
| 四文件 strict TypeScript slice | 通过 | 本增量四个生产／测试文件及其依赖的静态类型闭合 |
| v1.7 golden raw SHA-256 | `aba357…4b29` | frozen 文件字节未改变 |
| 既有 Binding readiness v1.9 CLI | 通过 | current-line 机械观察仍为 binding `0/12`、formal records `0`、authority 全红 |
| 既有 v1.9 tests | `32/32` 通过 | v1.9 current-line builder／loader／CLI 与红门负例；不是新增 verifier |
| Domain Manifest v2.2 exact tests | `5/25` 通过、`20/25` 失败关闭 | 20 个失败均由同一个前置根因级联：`packages/research-export/src/single-chart-report.ts` 当前字节与既有 v2.2 组件 identity 不同；不是 20 个独立缺陷，也不是 Stage C 功能测试失败 |

测试过程只出现 Vite 已知的 esbuild／oxc 迁移警告，测试与类型检查退出码均为 0。

Stage C 对生产源文件的收紧使既有 `bazi.single-chart-report.v1.7.0.manifest.v2.2.0` 按设计触发 `COMPONENT_FILE_IDENTITY_DRIFT`。因此 v2.2 只能作为历史已持久化清单保留，不能再称为当前机器身份。该失败是 D 阶段需要显式记账的 fail-closed 结果；本增量没有改写、重绑定或重签正式 v2.2，也没有取得这样做的 owner 授权。上表 Domain Manifest 一行本身退出码为 1，不包含在前一句“测试与类型检查退出码均为 0”的通过集合中。

## 5. 未验证与下一真实输入

本增量未运行全仓 typecheck、默认 Web build、完整应用、PWA／Service Worker、Chrome／Edge、公开主机、部署或回滚；也未进行新的浏览器验收。受限文件 `apps/web/src/lib/local-user-data-cleanup.ts` 未读取或修改，既有全仓阻塞仍只作已知阻塞记录。

Stage C 的正式准入计数仍不能靠仓内工程继续提升。下一项真实输入仍需由有权提供者在工作区外提供合法持有的 revision `761703` 精确 UTF-8 正文，并明确授权仅作本地私有验证；随后仍需正文／exact quote 冻结、作品／版本／载体三层权利依据，以及身份与独立性可核验的自然人复核。仅提供原文与私有验证授权也不等于再分发授权。
