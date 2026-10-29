# 当前阅读范围保存：数据合同与实现

状态：Web 首版已实现，专项工程验证已完成；整仓 CI 按具体提交单独报告。当前交付与未完成项统一见[当前状态](../status/mobile-reading-current.md)。数据库仍为 Schema 13；旧完整报告格式、8 MiB 上限与未知写入锁保留。以下草案对象保留设计历史，实际 wire 以实现和严格读器为准。

## 已实现的首版合同

- 实现位于 `apps/web/src/lib/scoped-reading-report.ts`。格式 `hakimi.scoped-reading-report/1`，保留标记为 `<!-- hakimi.reading-report-bundle/scoped-v1 -->`，主标签为“本机范围阅读快照”，兼容目录标签为“本地解读快照”。使用既有压缩封装，旧日志保持只读，旧完整报告读器明确拒绝范围子类型。
- 支持本命概览、单领域本命、指定年份和分支的单领域、单条月份结论；当前范围之外明确标示未纳入。未知时辰保留候选组，首版不生成唯一命盘的范围报告。
- 封套含报告与尝试 ID、实际范围、来源身份、选中索引闭包、冻结白话及阅读稿，各部分验证 UTF-8 长度和 SHA-256，整体验证规范表示及摘要。只读当时 literal，不用现行生产者重写。
- 白话 0.1.3 明确保留禁止推断的否定角色；历史 0.1.2 解码、再编码逐字节不变。规则出处只补原规则实际引用的已有来源，不升级为句级验证或专家认可。
- 准备与编码后再次核对页面选择和资料；复用原仓储写入锁、逐字节读回及结果未知防重复。新旧混合 ZIP、来源错配、同 ID 内容冲突、损坏/未知格式均有实际预检和恢复测试。
- 新格式同时接入保存入口、报告列表、个人档案、保存时白话、全文导出和具体结论复盘，不是只写入的新类型。Android 生命周期和真机成本仍未完成。

## 问题与两个独立操作

当前 `local-reading-container.tsx` 的 `prepareCompleteReport()` 会调用 `monthPreparation.all()`，确认全部年份月份完整，再生成阅读稿和依据稿。`encodeReadingReportBundle()` 校验两个文本与整体摘要，`packReadingSnapshot()` 负责保存编码。旧报告继续严格读回。

“保存完整报告”继续使用这一流程。“保存当前阅读范围”是另一个明确标识的不可变报告类型，保存用户确认的主题、年份/月区间与分支及其依据。缺少其他内容显示“未纳入本次保存”，不能显示“无结论”或冒充完整十年。

第一阶段原按钮只保存完整报告。当前实现已增加独立的“保存当前阅读范围”，不会调用全十年准备；完整保存明确保留为“保存完整报告”。

## 草案对象

以下保留历史字段草案，不作为现行 wire 定义；当前支持范围见上文及严格读器实现。

```ts
type ScopedReadingManifestDraft = {
  format: "hakimi.scoped-reading-report/1";
  kind: "scoped_reading";
  reportId: string;
  saveAttemptId: string;
  createdAt: string;
  source: {
    caseId: string;
    revisionId: string;
    chartResultHash: string;
    includeHour: boolean;
    ruleProfileDigest: string;
    reportVersion: string;
    explanationIndexVersion: string;
    presentationVersion: string;
    sourceVersions: { sourceId: string; version: string; digest: string }[];
    personalContextDigest: string | null;
  };
  scope: {
    topics: ("natal" | "career" | "wealth" | "relationship" | "timing")[];
    segments: {
      level: "natal" | "year" | "month";
      year: number | null;
      branchId: string | null;
      startInstant: string | null;
      endExclusiveInstant: string | null;
    }[];
    conclusionIds: string[];
    excludedScopeLabels: string[];
  };
  parts: {
    reading: { utf8Bytes: number; sha256: string; text: string };
    evidence: { utf8Bytes: number; sha256: string; text: string };
    originalConclusions: { utf8Bytes: number; sha256: string; text: string };
  };
  manifestSha256: string;
};
```

实际实现应复用现有 sourceSnapshot / conclusion / ruleApplication 校验，不复制第二套规则模型。原始结论、条件、限制、依据引用及来源版本必须随快照自包含或指向同一备份内可验证的不可变对象；不允许依赖届时可能变化的 current 索引。原始输入只按现有备份权限保存，不进入反馈身份复制文本。

## 范围与来源不变量

1. 所有结论必须属于同一资料修订、计算结果哈希、时柱覆盖与规则口径。资料或背景在准备期间变化，取消旧请求，不保存串用结果。
2. 本命段的年月与分支遵守原索引语义；年度/月段必须有实际 branchId 和半开时间区间。节令月不能改写成公历自然月。
3. 用户选中一条分支只表示本次查看范围。确认页面明示另有分支未保存，不代表其不成立，也不自动择优或平均。
4. 每个原结论 ID 都必须存在；对应的条件、限制、状态、个人采用身份与全部被引用依据可解析。缺失任何依赖则拒绝保存，不能默默丢弃。
5. 白话展示版本和原结论版本分开保存。打开旧报告读保存时原文；“按当前规则继续阅读”另起计算，不能覆盖旧快照。
6. 来源权利和专家状态沿用当时记录，不能因保存成功、哈希匹配或界面变绿而升级。
7. 未知时辰继续保存候选组；不将其拼成唯一命盘的范围报告。未来共同解释必须逐候选逐结论验证，并有独立合同。
8. 保存前明确列出主题、年份/月实际区间、分支、修订和未纳入范围。用户取消不产生记录。

## 保存事务与界面状态

| 状态 | 数据事实 | 可见反馈与下一步 |
|---|---|---|
| 准备中 | 尚未写入 | 显示核对范围、整理依据、编码等真实阶段；禁止重复提交 |
| 已取消 | 写入尚未开始且取消完成 | 未保存，已填资料保留 |
| 写前拒绝 | 大小、绑定、缺失依赖或权限未通过 | 本次未保存，旧报告不变；缩小范围或修复问题后重新确认 |
| 写入/读回中 | 尚不能确认成功 | 不显示成功，不自动创建第二份 |
| 结果待核对 | 写入开始后回执丢失或读回未知 | 按同一 saveAttemptId / reportId 核对，保留写入锁 |
| 已保存并核对 | 仓库读回内容逐字节及身份一致 | 显示本机、明确范围与“打开这份已保存报告” |
| 页面刷新失败 | 保存与读回已经确认 | 保留成功事实并提供原报告链接，单独提示列表刷新未完成 |

同一保存尝试重试核对时不能换 ID 产生重复报告。写入开始后不再提供取消，不能假报事务已回滚。复用现有未知写入协调器，不能绕过 call_unknown 的全局写入约束。

## 容量、编码与恢复

- 当前范围报告不抬高现有上限。大小口径为规范化 UTF-8 未压缩载荷（包括所有文本、元数据与引用闭包），并执行写前校验；不能用压缩体积掩盖超限。
- 范围报告采用独立保留标记和严格解析。未知版本、损坏标记、摘要不符、重复字段、缺失依据一律报告无法读取，不能回落为普通文字后显示成功。
- 旧 `hakimi.local-reading-report-bundle/1` 与既有 snapshot 读取/导出路径继续保留，新 reader 不改写旧记录。
- 备份须包含新的记录类型及依赖闭包，恢复先预检。同一记录 ID 但内容不同按冲突处理，不覆盖。旧版本遇到不支持的新格式必须明确拒绝，不能静默丢失。
- manifest + 不可变分块 + 共享依据引用另行设计版本、原子提交、引用计数/保留、孤儿恢复与完整导出；不作为本次 UI 提交的一部分。
- 浏览器和 Android 是独立资料区。平台迁入仍通过完整备份、预检、恢复；不能假定共享 IndexedDB。

## 实施前必须通过的验收

| 场景 | 需要的证据 |
|---|---|
| 只保存一个主题/年份/月 | 清单与可见原文一致；未包含内容显式标注；未调用全十年准备 |
| 双分支选一支 | 两条路径仍可见；保存范围正确；无确认真实分支或择优措辞 |
| 准备中换年份/背景/修订 | 原请求拒绝、0 写入、当前界面不串用 |
| 条件/限制/来源缺失或哈希错配 | 写前拒绝、旧数据不变 |
| 容量临界前后、Unicode、损坏/未知版本 | 字节口径准确、无部分成功、原文无损导出 |
| 写入前取消/失败与写后回执未知 | 对应状态正确、同尝试核对、防重复写入 |
| 保存后退出再开 | 从同一档案定位保存时原文、范围、修订和来源版本 |
| 新旧混合备份恢复 | 预检、冲突拒绝、逐字节读回与导出；旧报告不重算 |
| Android WebView | 真机容量、生成/编码/写入/读回耗时、峰值内存与杀进程后恢复 |

实现与工程回执见当前状态入口。设计文字不能代替工程结果，更不能作为真机或真人验收的证据。
