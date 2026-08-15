# 紫微独立 Browser Workspace 草案

这是一个不接入八字生产面的紫微资料库竖切。它包含两条明确分开的工程路径：

- Node 演示继续用显式注入的内存 Store，验证完整 Node fixture 的不可变 Revision、重开与单 Revision canonical JSON 导出/导入；
- 独立 Browser 研究预览在 `http://127.0.0.1:4218/` 运行，每次计算新建一次性 Worker，主线程验真完整 Browser 工件后才允许用户显式保存。

Browser 预览不进入 `apps/web`，不注册 Service Worker，也不导入八字 `Case/Revision`、Schema v13–v16 或 full v1.2。包保持 `private`、空 `exports`，普通生产代码不能按包名导入；普通 `npm run build` 仍固定为 `legacy-v13 / targetSchema 13`。

## 运行独立 Browser 预览

```powershell
npm run build:ziwei-browser-workspace
npm run preview:ziwei-browser-workspace
```

预览固定使用 `4218` 端口。它既不是八字 `4173` 生产预览，也不是 `4216` 的紫微纯计算工件预览。

## Browser 资料库契约

Browser 路径使用独立 IndexedDB `hakimi-ziwei-browser-workspace-draft`，当前数据库版本为 1；库中只有 `revisions` 与 `mutationState`，不读取或改写八字数据库。每份保存记录都是真正的不可变 Revision：

- `studyId`、`revisionId`、`parentRevisionId` 是明确 UUID；根 Revision 的 parent 为 `null`；
- `browserArtifactSha256` 必须绑定内层完整 Browser 工程工件，`contentSha256` 覆盖身份、谱系、标题、备注、工件与全部边界声明，`contentAddress` 固定为 `sha256:<contentSha256>`；
- 保存是 create-only：相同 Revision 与相同字节可以幂等跳过；Revision ID 复用、内容地址碰撞、缺失父 Revision、跨 study 父链或谱系环都会失败关闭；
- 保存、恢复和清空都比较调用者读到的 mutation epoch，并把业务行与新 epoch 放在同一 IndexedDB 事务；陈旧标签页不能覆盖较新的资料；
- 重开会从 IndexedDB 重新读取并核对精确 Store/索引、计数与字节账、canonical bytes、Browser 工件四层摘要、内容地址和完整父链；它不会重新排盘；
- 最近档案默认有界返回 50 条，API 只允许 1～100 条，不把整个资料库静默物化成无限列表；
- 默认单 Revision 上限 4 MiB、全库 512 个 Revision / 64 MiB，完整备份上限 72 MiB。容量不足或浏览器事务中止不会留下部分写入。

计算和保存是两个动作：计算通过验真后仍只在当前页内存中显示，只有用户点击“保存到独立本地档案”才会写入这一个独立数据库。多标签页只通过 `BroadcastChannel` 通知 epoch 变化，不传递出生资料或工件内容。

2026-08-12 增加的“三方四正事实摘要”仍属于显示投影：用户可选择十二宫中的任一问题宫位，页面按已登记规则列出本宫、对宫与两个三合位，并逐宫展示已验真的本命星曜、亮度和生年四化标记，同时在十二宫盘面标出四个相关位置。该投影不写回 Browser 工件或 Revision，不触碰 IndexedDB mutation epoch，也不生成单星吉凶、组合断语或运限结论。结构几何固定登记为 `ziwei.sanfang_geometry.iztro_docs.v1`，来源为 [iztro 三方四正基础文档](https://docs.iztro.com/learn/basis)。

同日新增的十四主星 `ziwei.major_star.neutral_candidate/0.1` 只接在上述只读显示投影上：注册表按冻结 `starId` 恰好覆盖紫微至破军十四颗主星，每条包含三个中性主题、一段白话观察方向、一段“需合参”提示、古典篇目与现代研习资料的来源定位，以及 `awaiting_expert_review / isolated_candidate_only / expertTruthClaimed:false / directOutcomeAllowed:false / scoringAllowed:false`。主星缺条目或中文标签不一致会直接停止投影；辅／杂曜不会误接主星内容。该候选层不写入 Browser 工件或 Revision，不改变 mutation epoch，也不声称单星即可判断吉凶。完整来源与本轮证据见 `docs/紫微内容-v0.2-十四主星基础语义候选与证据-2026-08-12.md`。

随后增加的 `ziwei.major_star_core_palace.neutral_candidate/0.1` 把十四主星分别落到命、财帛、官禄、迁移四个核心宫位，冻结为 14 × 4 = 56 条独立撰写的位置化候选。每条同时绑定基础星曜、稳定宫位角色、该宫专属合参提示、卷二古典落宫定位和现代宫位资料，并继续固定 `awaiting_expert_review / isolated_candidate_only / requiresCombinationReview:true / expertTruthClaimed:false / directOutcomeAllowed:false / scoringAllowed:false`。只有核心四宫的主星可以命中；其他八宫与辅／杂曜固定返回 `null`，不会套用泛化句子。该层仍是只读显示投影，不进入 Worker、工件、Revision、IndexedDB 或 mutation epoch。完整来源与证据见 `docs/紫微内容-v0.3-十四主星命财官迁位置化候选与证据-2026-08-12.md`。

`ziwei.major_star_core_palace.combination_review/0.1` 继续为盘面中实际命中的核心四宫主星生成动态组合复核包：直接列出本星亮度、生年四化、同宫主／辅／杂曜、对宫与两组三合位主星，绑定规则快照及事实摘要 SHA-256，并提出亮度、四化、同宫和三方四个待审问题。结论固定 `result:null`，状态固定 `awaiting_expert_rule / isolated_review_only / interpretationIncluded:false / expertTruthClaimed:false / directOutcomeAllowed:false / scoringAllowed:false`；不把庙旺自动转为吉、不把忌自动转为凶，也不混入宫干或运限四化。完整来源与证据见 `docs/紫微内容-v0.4-核心四宫组合事实复核包与证据-2026-08-12.md`。

当前 v0.5 显示层把位置候选升级为 `ziwei.major_star_all_palaces.neutral_candidate/0.2`：保留上述命财官迁 56 条逐条人工短解，并为兄弟、夫妻、子女、疾厄、交友、田宅、福德、父母八宫按已登记星曜表达线索与各宫问题域生成 112 条原创中性候选，合计 14 × 12 = 168 条。每宫都有独立的合参和禁止越界条件，例如夫妻宫不预测婚期或结果、子女宫不判断生育能力或数量、疾厄宫不诊断疾病或寿命。`ziwei.major_star_all_palaces.combination_review/0.2` 同步为盘面全部 14 颗主星生成事实复核包；选择任一宫位的三方组时，命中的主星都有位置候选与 `result:null` 复核包。辅／杂曜仍返回 `null`，两层仍只读且不进入 Worker、工件、Revision、IndexedDB 或 mutation epoch。完整来源与证据见 `docs/紫微内容-v0.5-十二宫位置候选与全宫组合事实包证据-2026-08-12.md`。

v0.6 新增 `ziwei.major_star_all_palaces.same_star_synthesis_review/0.1`：它不另造排盘事实或断语，而是为盘面实际出现的每颗主星，把已登记的落宫位置候选、亮度、生年四化、同宫、对宫和两组三合位按固定顺序收拢成一张只读逐星复核包。每包同时绑定位置候选 ID、组合事实包 ID、规则快照 SHA-256、事实 SHA-256 与六个既有来源定位；详细事实、来源和四个专家问题默认折叠。`result / goodBadOrientation / eventOutcome` 固定为 `null`，不按庙旺、四化名称、星数或三方关系相加，也不混入宫干／运限四化、格局、流派权重或现实结论。该投影仍只存在于验真后的主线程显示层，不进入 Worker 回包、Browser 工件、Revision、IndexedDB 或 mutation epoch。完整来源与本轮证据见 `docs/紫微内容-v0.6-逐星合参复核包与证据-2026-08-12.md`。

v0.7 新增 `ziwei.palace_sanfang.first_reading_review/0.1`：页面选择任一目标宫位后，在四宫逐星明细之前只显示一份逐宫总览，把该宫问题域、本宫主星位置候选、本宫／对宫／两组三合位事实及已有逐星包按固定顺序组织起来。每盘恰有 12 份逐宫包；每个逐星包恰好作为目标使用一次、作为四宫组成员使用四次。若本宫在已验真事实中没有十四主星，`targetMainStarState` 固定为 `empty_in_verified_facts`，本宫逐星绑定和位置主线为空，并明确禁止自动借用对宫或三合位主星。三个结果字段仍为 `null`，不新增借星、权重、吉凶或事件规则，也不进入 Worker、工件、Revision、IndexedDB 或 mutation epoch。完整来源与本轮证据见 `docs/紫微内容-v0.7-逐宫直读复核包与证据-2026-08-12.md`。

v0.8 新增 `ziwei.natal_transformation.neutral_candidate/0.1` 与 `ziwei.palace_sanfang.natal_transformation_review/0.1`：前者固定登记禄、权、科、忌四条中性修正候选与三个来源边界，后者只从已验真盘面提取本命生年四化，在每个目标宫的本宫、对宫和两组三合位内逐项绑定宫位问题域、星曜事实及既有主星落宫候选。标准盘面四条四化事实各进入四组三方四正，共 16 次动态引用；某组没有四化时保持空集合，不补入宫干飞化、自化、大限或流年四化。所有 `result / goodBadOrientation / eventOutcome` 仍为 `null`，不把禄权科忌自动换算为吉凶、身份或事件，也不进入 Worker、工件、Revision、IndexedDB 或 mutation epoch。完整来源与本轮证据见 `docs/紫微内容-v0.8-本命生年四化修正候选与证据-2026-08-12.md`。

v0.9 新增 `ziwei.natal_transformation_all_palaces.neutral_candidate/0.1`：按禄、权、科、忌与命、兄弟、夫妻、子女、财帛、疾厄、迁移、交友、官禄、田宅、福德、父母固定形成 4 × 12 = 48 条落宫修正候选。每条同时绑定通用四化候选、宫位问题域和五个既有来源定位，逐条提供位置化短解、宫位专属反向提醒及专家复核问题。真实盘面四化出现项只命中对应的一条位置候选；未命中不补写，宫干飞化、自化与运限仍在范围外。该层继续保持 `result / goodBadOrientation / eventOutcome:null`、专家批准 0、正式发布 0，并且只存在于验真后的 4218 显示投影，不写 Worker 工件、Revision、IndexedDB 或 mutation epoch。完整来源与证据见 `docs/紫微内容-v0.9-四化十二宫位置化审稿矩阵与证据-2026-08-12.md`。

v0.10 新增 48 项离线审稿反馈合同和 4218 只读预检区：用户可下载与当前候选快照、有序内容 ID、五来源登记三重 SHA-256 绑定的固定 JSON，在外部填写自述审稿身份、流派、裁决理由、成立条件、反例、退修要求和条件化方向提案，再用真实 file chooser 导回页面。预检严格拒绝字段、覆盖、快照、摘要、计数、归属、条件或关闭边界失配；每次导入先清除旧结果。有效包只在内存显示已裁决项，不写工件、Revision、IndexedDB 或 mutation epoch；即使 48 项全部完成，身份仍未核验、无数字签名、不可自动整合，`goodBadOrientation / eventOutcome / result` 仍为 `null`。完整合同与证据见 `docs/紫微内容-v0.10-四化十二宫审稿反馈模板与只读预检-2026-08-12.md`。

v0.11 新增 `ziwei.palace_sanfang.four_part_synthesis_candidate/0.1`：每次已验真计算确定性生成十二份逐宫候选，当前宫位固定按“本宫主题—外部牵引—资源／压力观察—矛盾合成”四段展示。本宫段只绑定 `self`；外部段按对宫 `+6`、三合 `+4`、三合 `-4` 展开；后两段并列四宫的逐星合参、亮度和本命生年四化 occurrence。每段同时绑定关系宫位、主星位置候选 ID、规则快照与事实 SHA-256 及来源。真实空宫不借对宫或三合主星补写，无四化的三方组保持空集合；主导主题、资源／压力方向、吉凶、事件和结果仍为 `null`。辅曜、煞曜和杂曜没有在本层新增语义或评分。完整合同与证据见 `docs/紫微内容-v0.11-当前盘三方四正四段式直读候选与证据-2026-08-13.md`。

v0.12 新增核心十二辅煞星 12 条基础中性候选和十二宫 144 条落宫候选。4218 只为当前盘真实命中的精确十二星展示来源绑定内容，并在逐宫直读与四段式之后提供独立补充；不修改 v0.11 四段式的主星绑定和计数。传统分组只作元数据，页面明确标注它不是个人吉凶；禄存、天马、天空、其他 minor 与全部 auxiliary 继续只显示事实、候选为 `null`。所有方向、事件和结果仍为 `null`，计算和切宫不写 Revision、IndexedDB 或 mutation epoch。完整合同、来源与证据见 `docs/紫微内容-v0.12-核心十二辅煞星基础与十二宫144条候选证据-2026-08-13.md`。

## 导出、备份、恢复与清空

- “导出此 Revision”只导出一个已重开验真的 Revision。它不是完整备份，也不自动携带 parent；单条导入 API 仍要求 parent 已存在。
- “导出完整紫微档案”会在只读快照中核对并包含该独立 Browser 资料库的全部 Revision 和完整谱系，生成独立的 canonical JSON 备份。它不包含八字数据库，也不是 full v1.2。
- 选择完整备份后先执行零写入预检，报告新增、已存在、身份/内容冲突以及恢复后的容量。预检返回的 target epoch 会绑定随后一次恢复。
- 恢复是 create-only 原子合并：完全相同的 Revision 跳过，只新增缺少项；任何 Revision ID/内容地址冲突、陈旧 epoch、容量不足或事务中止都会整批失败，不覆盖、不删除现有记录，也不留下部分恢复。
- `clearAll` 是唯一删除例外。界面要求先勾选风险确认并再次接受浏览器确认；它只清空 `hakimi-ziwei-browser-workspace-draft`，不会清理八字资料或 full v1.2 分区。

## 证据与声明边界

当前定向草案基线为 Vitest **13 个文件 / 88 项**通过，隔离边界门 **42/42** 通过，并已通过草案 typecheck 与独立 Browser 构建。2026-08-10 起真实浏览器门由 `npm run test:e2e:ziwei-workspace` 提供；2026-08-11 扩展为 Edge 与 Chrome 各 **10/10、共 20/20**：原有计算→保存→重开→跨标签刷新→唯一清空全链路之外，新增“8 条完整备份导出→清空→原子恢复（8 新增/0 跳过，epoch 8→9→10）”、“多标签陈旧写入失败关闭（旧 epoch 保存被 `EPOCH_CONFLICT` 拒绝，计数保持、无部分写入）”、“计算 Worker 崩溃失败关闭（不出现保存表单、零写入）”、“计算 Worker 畸形回执失败关闭（同上）”、“损坏的完整备份预检失败关闭（`DIGEST_MISMATCH`，恢复按钮保持禁用、零写入）”、“内容冲突恢复预检失败关闭（同 Revision ID 不同字节的两个合法备份：先恢复其一，另一备份预检报告 1 个不可变身份冲突且恢复按钮禁用、计数与 epoch 不变、零写入）”、“保存事务中止失败关闭（确定性注入下一次 readwrite 事务中止，页面显示‘本次事务中止，没有部分写入。’且计数与 epoch 不变、无部分写入）”、“保存遇到设备配额不足失败关闭（确定性注入 `QuotaExceededError`，页面显示容量不足且零写入）”与“三方并发下两个陈旧标签页的保存均失败关闭（两个阻断 BroadcastChannel 的标签页在写入方保存后以旧 epoch 保存均被 `EPOCH_CONFLICT` 拒绝，计数保持、无部分写入）”，控制台 0 问题。浏览器通过仍不认证现实来源或专家真值。

上述 **13 文件 / 88 项、42/42、20/20** 是 2026-08-11 历史基线，本轮未把它冒充为重跑结果。2026-08-12 的新增证据只覆盖三方四正显示竖切：投影定向 Vitest **1 文件 / 12 项**、隔离边界检查、两个 Browser 草案 typecheck、独立构建，以及 Edge 定向主链路 **1/1**；完整记录见 `docs/紫微内容-v0.1-三方四正事实摘要与证据-2026-08-12.md`。

十四主星候选层的本轮新增证据继续保持定向：两个 Browser 草案 typecheck、隔离边界检查、投影 Vitest **1 文件 / 13 项**、独立构建 **96 modules transformed**、应用内浏览器桌面与 **390×844** 窄屏验收，以及 Edge 定向主链路 **1/1**。这些结果证明内容覆盖、来源链接、交互和隔离工程链闭合；不证明十四星语义已获专家批准。完整记录见 `docs/紫微内容-v0.2-十四主星基础语义候选与证据-2026-08-12.md`。

命财官迁位置化层的本轮新增证据为：两个 Browser 草案 typecheck、隔离边界检查、投影 Vitest **1 文件 / 14 项**、独立构建 **97 modules transformed**、应用内浏览器桌面与 **390×844** 窄屏验收，以及 Edge 4218 定向项目 **10/10**。默认命宫组实际显示七杀落命、紫微／天府落迁移、破军落官禄、贪狼落财帛共 5 条候选；切换到非核心宫组后位置候选为 0，窄屏裁切与 console warning/error 均为 0。这些证据只证明 56 条覆盖、来源链接、渲染和原有事务链没有回退，不证明内容已获专家批准。完整记录见 `docs/紫微内容-v0.3-十四主星命财官迁位置化候选与证据-2026-08-12.md`。

组合事实复核层的本轮新增证据为：两个 Browser 草案 typecheck、隔离边界检查、投影 Vitest **1 文件 / 15 项**、独立构建 **98 modules transformed**、应用内浏览器 1280 宽与 **390×844** 验收，以及 Edge 4218 项目 **10/10**。默认命宫组显示 5 个复核包、20 个待审问题、20 个来源链接和 5 个 `result:null`；切换到非核心宫组后复核包为 0。窄屏问题正文由首次检查的 9.92px 调整为 11.2px、行高 18.144px 后复验无裁切或横向溢出，console warning/error 与框架错误层均为 0。这些证据只证明事实投影、审稿门、来源和事务链闭合，不证明组合规则已获专家批准。完整记录见 `docs/紫微内容-v0.4-核心四宫组合事实复核包与证据-2026-08-12.md`。

v0.5 本轮新证据与以上历史记录分开：两个 Browser 草案 typecheck、隔离边界检查、投影 Vitest **1 文件 / 15 项**、独立构建 **98 modules transformed**、应用内浏览器 1280×720 与 **390×844** 验收，以及 Edge、Chrome 4218 定向项目各 **10/10、共 20/20**。默认命宫组仍显示 5 个位置候选、5 个复核包、20 个待审问题和 20 个复核来源链接；切到由兄弟、交友、田宅、疾厄组成的非核心宫组后，显示 4 个位置候选、4 个复核包、16 个待审问题、16 个复核来源链接和 4 个 `result:null`。窄屏 `scrollWidth === clientWidth`，console warning/error 与框架错误层均为 0。这些证据证明 168 条注册覆盖、全宫渲染、来源与原有事务边界闭合；不证明任何位置或组合语义已获专家批准。完整记录见 `docs/紫微内容-v0.5-十二宫位置候选与全宫组合事实包证据-2026-08-12.md`。

v0.6 本轮新证据继续与上述历史证据分开：两个 Browser 草案 typecheck 均为 0 错误，投影 Vitest **1 文件 / 16 项**、隔离边界检查、独立构建 **99 modules transformed** 通过；只运行覆盖本次展示与 mutation epoch 主链路的 Edge、Chrome 4218 用例各 **1/1、共 2/2**，没有重跑其余九类故障注入用例。应用内浏览器默认命宫组显示 5 个逐星包，全部三个结果字段为 `null`，详细内容默认折叠；1280×720 与 **390×844** 下均无横向溢出、裁切、错误层或 console warning/error，窄屏展开首包可见 4 个专家问题和 4 个来源链接。第一次带行首锚点的 Playwright 选例命令只得到 “No tests found”，浏览器测试未启动；按真实标题改正后 2/2 通过。该证据只证明同星投影、来源绑定、响应式渲染和已覆盖的工程链，不证明专家规则、吉凶或事件结论。完整记录见 `docs/紫微内容-v0.6-逐星合参复核包与证据-2026-08-12.md`。

v0.7 本轮新证据继续单列：两个 Browser 草案 typecheck 均为 0 错误，投影 Vitest **1 文件 / 18 项**、隔离边界检查、独立构建 **100 modules transformed** 通过；Edge、Chrome 只跑 4218 主链各 **1/1、共 2/2**，其中使用实际计算输入 `1991-02-14` 覆盖无主星宫位及不借星边界。应用内浏览器核对默认命宫、切换兄弟宫和真实空宫交友宫，桌面 1280×720 与手机 **390×844** 均只有一份逐宫总览、四张关系卡且无横向溢出、错误层或 console warning/error。其余九类故障注入用例未重跑；该证据不证明紫微专家规则、空宫借星规则、吉凶或事件结论。完整记录见 `docs/紫微内容-v0.7-逐宫直读复核包与证据-2026-08-12.md`。

v0.9 本轮新证据与 v0.8 历史记录分开：紫微投影 Vitest **1 文件 / 20 项**、内容目录／帮助页 **2 文件 / 8 项**、两个 Browser 草案 typecheck、根 typecheck、隔离边界检查、独立构建 **103 modules transformed** 和默认 Web 构建 **2051 modules transformed** 通过。应用内浏览器在真实 `1995-08-18 / 午时 / 男` 盘面核对默认迁移宫紫微化科、兄弟宫组三条不同落宫候选及官禄空组；1280×720 与 **390×844** 均无横向溢出，新增位置正文调整为 11.2px / 18.144px，console warning/error 为 0，目标切换前后 mutation epoch 保持 `5 → 5`。Edge、Chrome 的 4218 主链与主应用内容目录门各 **2/2**；其余九类 4218 故障注入用例未重跑。该证据证明 48 条固定矩阵、五来源绑定、只读渲染和目录 246／11 闭合，不证明专家规则、吉凶或事件结论。完整记录见 `docs/紫微内容-v0.9-四化十二宫位置化审稿矩阵与证据-2026-08-12.md`。

v0.10 本轮新证据继续单列：反馈合同与既有投影 Vitest **2 文件 / 24 项**、两个 Browser 草案 typecheck、根 typecheck、隔离边界门、独立构建 **104 modules transformed** 和默认 Web 构建 **2051 modules transformed** 通过；Edge、Chrome 只运行新增审稿链各 **1/1、共 2/2**，没有重跑其余十类 4218 长故障注入。两个浏览器都完成真实模板下载、1 项具名自述反馈导入、`390 × 844` 无横向溢出、摘要篡改失败后旧状态清空，并确认 revision／epoch／bytes 全程不变。应用内 Browser 的既有 epoch 保持 `5 → 5`，控制台 warning/error 为 0。该证据只证明反馈结构、损坏检测、显示和零写入边界闭合，不证明审稿身份、流派结论或吉凶方向正确。完整记录见 `docs/紫微内容-v0.10-四化十二宫审稿反馈模板与只读预检-2026-08-12.md`。

v0.11 本轮新证据继续单列：投影 Vitest **1 文件 / 22 项**、两个 Browser 草案 typecheck、隔离边界门与独立构建 **105 modules transformed** 通过；默认发布身份定向门 **3 文件 / 18 项**继续固定 `legacy-v13 / targetSchema 13 / migrationId null`。Edge、Chrome 只运行新增四段式场景各 **1/1、共 2/2**，覆盖切宫替换、真实空宫不借星、无四化空集合、零存储写入及 `390 × 844` 零横溢；应用内 Browser 亦完成同一路径且页面日志问题为 0。移动端首轮视觉复核发现跳转链接遮挡首卡，修正后重新运行 2/2 并确认遮挡消失。旧 4218 长故障矩阵和整仓全量测试没有重跑；该证据不证明紫微专家规则、资源／压力方向、吉凶或事件结论。完整记录见 `docs/紫微内容-v0.11-当前盘三方四正四段式直读候选与证据-2026-08-13.md`。

v0.12 本轮新证据继续与 v0.11 分开：投影 Vitest **1 文件 / 25 项**、adapter 两个 tsconfig、workspace Browser app typecheck、隔离边界门与独立构建 **106 modules transformed** 通过；默认发布身份门 **3 文件 / 18 项**仍固定 `legacy-v13 / targetSchema 13 / migrationId null`。Edge、Chrome 新增核心十二星场景各 **1/1、共 2/2**，并单独回归 v0.11 四段式各 **1/1、共 2/2**；覆盖命宫陀罗、4 个 auxiliary、禄存／天马空候选、连续切宫、完整存储快照零变化、390px 零横溢和 console 0。截图经人工复核无截断或错误吉凶着色；应用内 Browser 后端不可用，未把它写成已执行。旧长故障矩阵、整仓全量与普通生产 build 未重跑。完整记录见 `docs/紫微内容-v0.12-核心十二辅煞星基础与十二宫144条候选证据-2026-08-13.md`。

v0.13 Web 接线围绕当前**整盘**而不是当前选中宫位：验真后固定投影 12 个 review，标准盘为 48 个 occurrence；用户显式准备后才形成可下载模板。切换三方四正焦点只过滤证据显示，不应令已准备包或有效只读预检失效。编辑输入、重新计算、重开档案、换盘、计算失败或旧异步结果迟到则必须清空旧动态范围。模板下载与本地 JSON 预检不上传、不保存、不推进 Revision 或 mutation epoch；它与旧 v0.10 静态 48 项四化反馈面板完全分离，也不把 v0.13 动态反馈决定继承或回写到 v0.12 静态 12／144 候选。文件虽不含直接身份和原始输入，仍含四宫、星曜、亮度、四化等敏感派生事实；SHA-256 不是加密。所有吉凶、事件、结果、评分、正式激活和自动整合仍为 `null / false`。v0.13 本轮通过 adapter 定向 Vitest **2 files / 30 tests**、三个 typecheck、隔离边界、默认身份 **3 files / 18 tests** 与 **108 modules transformed** 的 4218 build；应用内 Browser 完成桌面与 `390 × 844` 验收，Edge／Chrome 独立场景各 **1/1、共 2/2**，完整存储快照不变、console 0，截图字节及 SHA-256 已核对。完整证据见 `docs/紫微内容-v0.13-核心十二辅煞三方四正命中复核包与证据-2026-08-14.md`。

内外 SHA-256 都没有密钥，只证明当前字节的结构、自洽性和损坏检测；它们不认证历史 Worker、作者或现实来源。Browser Revision 和完整备份均固定声明 `productionEligible:false`、`expertTruthClaimed:false`、不连接八字 Case/Revision，且不构成命理专家真值。

Node 内存路径仍可运行：

```powershell
npm run demo:ziwei:workspace -- 1995-08-18 6 male
```

该命令只打印身份、内容地址、文件信息和边界，不把出生输入或结果写入磁盘。
