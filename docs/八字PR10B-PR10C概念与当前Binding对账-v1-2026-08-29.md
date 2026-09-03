# 八字 PR10B／PR10C 概念与当前 Binding 对账 v1

日期：2026-08-29

状态：`scope_reconciliation_only / no_parallel_binding_created / bindings_frozen_0_of_12`

## 1. 本轮关闭的问题

第二轮深审曾把八字旺衰后九项写成 5 个“规则表和季节关系”概念与 4 个“工程启发式和分数语义”概念。当前仓库 `strength-claim-registry.ts#sourceBindings` 的精确注册范围却是另一种分解：

- 7 条工程候选 binding；
- 4 条历史文本候选 binding；
- 1 条可靠版本仍缺失的 review gate；
- 合计 12 条，当前冻结数仍为 `0/12`。

后九个深审 topic ID 与当前 binding ID 精确命中数为 0。直接按旧名字新增九条 binding，会制造与当前 12 条范围并行的第二套身份；直接称为 PR10B／PR10C 冻结，则会把通用五行关系、藏干事实、透干出现和工程分数误写成已经取得逐值来源或专家权威的规则表。

深审文本自身还包含两套不同顺序：最初清单把两项 `strength.*` 工程主题放在第 4／5 位、五项 `support.*` 规则表放在第 6～10 位；后续“推荐分三批”又把五项 PR10B 调到第 4～8 位、四项 PR10C 放在第 9～12 位。账本同时保存 `originalTopicOrder` 与 `recommendedBatchOrder`，执行分批对账采用后者，不把推荐执行序伪装成原始列举序。

本轮因此新增独立对账门：

- `content/system-admission/bazi-pr10bc-scope-reconciliation.v1.json`
- `scripts/bazi-pr10bc-scope-reconciliation-lib.mjs`
- `scripts/verify-bazi-pr10bc-scope-reconciliation.mjs`
- `scripts/verify-bazi-pr10bc-scope-reconciliation.test.mjs`

账本可从当前 binding readiness、工程候选账、来源候选账、claim registry 精确 `sourceBindings` 枚举和 scoped producer／consumer 字节重建。topic→binding、相邻来源及“非等价近邻”的选择是本轮 repository-authored 范围判断，不是机器从源码语义自动推导，也没有绑定用户附件原字节或获得领域专家批准；机器只验证这份预设投影与当前字节、注册 7／4／1 inventory 及失败关闭值一致。任何人若把旧 topic 改成新 binding、增加未登记的 alias binding、把相邻 quote candidate 写成完整规则表、把藏干索引权重写成柱位衰减、把工程分数升级为正式评分，或把任一真值／权利／发布门改成通过，verifier 都会失败。

## 2. PR10B 五项的当前真值

| 旧深审 topic | 当前机械观察 | 当前 binding 关系 | 不能宣称 |
| --- | --- | --- | --- |
| `support.season_production` | 单独的五行 relation 函数无季节参数；整体管线另有非等价的月令输入、月柱位置和工程加权 | 无专属 binding；core、factor inclusion、direction、weights、month duplication 只是非等价近邻；SMT-v5 relation、DTT yueling、SMT-v10 yueling quote candidates 仅作 link-only 相邻语境 | 已有季节生扶表，或月令工程路径等价于该表 |
| `support.season_control` | 单独的五行 relation 函数无季节参数；整体管线同样存在非等价月令路径 | 与上一项相同的五条工程近邻和三条相邻 quote candidates，不构成专属 binding | 已有季节制约表，或月令工程路径等价于该表 |
| `support.season_storage` | scoped producer、字段和 current binding 均未观察到 | 无 | 已实现季节收藏／墓库表 |
| `support.rooting_tables` | `ZHI_HIDE_GAN` 只派生 experimental 藏干事实，旺衰侧只按藏干列表索引计工程权重 | `binding:policy:weights` 只是非等价近邻；滴天髓 rooting 段与渊海子平藏干表均为 link-only 相邻候选 | 已有根气强弱、适用范围或逐值来源表 |
| `support.tougan_tables` | 旺衰侧观察到天干显性出现并给工程权重 | `binding:policy:factor-inclusion` 只是非等价近邻；《三命通会》卷十段落为 link-only 相邻候选 | 已有透干判定、等级或逐值来源表 |

这里的“未观察到”严格限定于账本锁定的 scoped producer／consumer；账本只对 claim registry 的当前 `sourceBindings` 做精确 12 条枚举，不证明仓库其他命名、新模块、所有可能传统流派或仓外材料不存在规则表。一旦出现新模型，必须显式扩展 scope，而不能继续沿用本次 `0`。

PR10B 后续若要形成可冻结候选，至少还缺：明确规则模型与适用范围、表内每个值的来源或第一方派生 provenance、作品／版本／载体身份、三层权利依据及至少两份独立真人领域意见。相邻古籍段落不能自动为现代结构化表中的每个值背书。

## 3. PR10C 四项的当前真值

| 旧深审 topic | 对账结果 |
| --- | --- |
| `strength.zhushou_position_decay` | 未映射为 current binding。当前 `strengthFactorWeight(group, hiddenStemIndex)` 的第二维是藏干列表索引，不接收年／月／日／时柱位；不能称为柱位衰减。 |
| `support.position_decay` | 与上项同样处于概念未定义状态；须先由人明确“位置”指柱位、藏干次序还是其他维度，才能讨论规则与系数。 |
| `strength.score_observation_only` | 映射到现有 7 条工程候选 binding，不新增平行 binding；固定 `scoreMeaning=observational_engineering_candidate_only`。 |
| `support.score_semantics` | 与上项映射到同一 7 条工程候选；当前锁定的 scoped 工件没有一等 `scoreMeaning` 字段，且不存在正式评分许可；这不证明仓库范围绝对不存在同类命名。 |

两项 score topic 覆盖的只是当前 support／demand、比例、分档和六个扰动场景的工程投影。账本固定：

```text
originClassification: project_engineering_heuristic_candidate_projection
scoreMeaning: observational_engineering_candidate_only
formalScoringAllowed: false
bindingFreezeEffect: none
```

这不把 `4/2/2/1`、`0.25/0.43/0.57/0.75` 或六场景包装成古籍原文、专家定论、科学标定或预测有效性。

## 4. 机械结果

账本摘要：`5e742a8a92a8ca4ebf2337f5eb0866be6c962e53801e3d259de4571b0cd65116`。

当前门值：

- 9 个旧概念的预设范围投影已与当前字节对账；语义等价的机械建立数 `0`、专家批准 mapping 数 `0`；
- claim registry `sourceBindings` 精确有序枚举为 12，旧 topic 与 current binding ID 精确命中 `0`；
- PR10B 在 scoped 工件中的专属规则表观察数 `0/5`，逐值来源 bundle 完整数 `0`；仓库范围不存在性未建立；
- 4 个 topic 绑定了相邻历史 quote candidates；这些候选不等于表值来源或语义等价证明；
- PR10C 中 2 项映射到现有 7 条工程候选，2 项位置衰减仍有歧义；
- scoped 工件中的一等 score meaning 字段观察数 `0`；仓库范围不存在性未建立；
- 新建平行 binding `0`，冻结 binding `0/12`。

新 verifier 为 `1 file / 11 tests`，覆盖可重建身份、严格 UTF-8／无 BOM／无重复 JSON key、冲突顺序双列保存、claim registry 精确 12 条 AST 枚举及额外／非 literal alias 拒绝、旧 topic 不得冒充 binding、PR10B 表缺口与月令非等价路径、quote candidate 身份、藏干／透干非等价边界、位置衰减歧义、score observational-only、分账红线及伪造完成状态／artifact hash 的失败关闭。与前三 Exact Quote 私有过渡、来源候选、三层权利候选和冻结准备账合并复跑为 `5 files / 57 tests`，全部通过。

三个 basis ledger 各自的 parse／validation 输入与 SHA-256，以及每个 scoped source 的字段检查与 SHA-256，均来自对应文件的同一读取 Buffer；这只收紧各文件端点观察的一致性。跨文件不是原子快照，Schema 13 没有 mutation epoch，本门明确不声称排除跨文件交错、读取区间 mutation 或 ABA。

## 5. 中央闭包和发布边界

本对账门没有接入 `package.json`、正式 lifecycle、八字 domain manifest 或四体系 registry，也没有重签任何中央摘要。它锁定当前 `packages/bazi-core/src/index.ts` 字节，只表示 scoped runtime fact 观察，不表示该文件已重新获得中央准入。

此前已经单列的闭包漂移保持不变：`packages/bazi-core/src/index.ts`、`scripts/audit-bazi-source-binding-candidates-live.ps1` 与根 `package.json` 仍不得通过只重算摘要被洗绿；八字 domain manifest、四体系 registry、专家候选包和 historical natal runtime closure 的红门也未被本账本关闭。

## 6. 证据分账

| 账 | 当前结论 |
| --- | --- |
| 工程证据 | repository-authored 的 9 概念范围投影已与精确注册 binding inventory 和 scoped producer／consumer 当前字节保持机械一致；映射语义本身未由机器建立；新门 11/11、C 合并切片 57/57 通过 |
| 浏览器／运行时证据 | 未建立；Web 文件只作为源码 consumer identity 被观察，没有启动应用或浏览器 |
| 内容真值 | 未建立；没有新增来源正文、逐值来源包或人工校勘 |
| 专家真值 | 未建立；现实独立专家仍为 `0/2` |
| 权利／法律判断 | 未建立；相邻候选继续 `link_only / not_established` |
| Binding 冻结 | `0/12`；没有新建平行 binding |
| 发布就绪 | 未达到 |
| 公开发布授权 | 未授权 |

默认发布治理继续固定为 `legacy-v13 / targetSchema 13 / migrationId null`，Schema 13 不伪造 mutation epoch，`publicDeploymentAuthorized=false`、`expertClaimsAuthorized=false`。本轮未读取或修改受限文件，未运行全仓 typecheck、默认 Web build、Git、网络、浏览器、部署或外部平台操作。
