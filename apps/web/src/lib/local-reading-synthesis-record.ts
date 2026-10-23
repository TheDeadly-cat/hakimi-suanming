import type { RevisionRecord } from "@hakimi/contracts";
import type { BaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import type { BaziComprehensiveReading } from "../../../../packages/bazi-interpretation/src/comprehensive-reading";
import type { LocalAnnualOutlook } from "./local-annual-outlook";
import type { LocalLifeOutlook } from "./local-detailed-outlook";
import type { LocalReadingTimeline } from "./local-reading-timeline";
import type { LocalReadingAnnualDomains } from "./local-annual-domain-record";
import type { LocalContextualReadingBundle } from "./local-contextual-reading-record";
import type { LocalPersonalReading } from "./local-personal-reading";
import { buildReadingSynthesis, type LocalReadingSynthesis } from "./local-reading-synthesis";
import { buildReadingPriorities, type LocalReadingPriorities } from "./local-reading-priorities";
import type { createOutlookJudgmentRecordWriter } from "./local-outlook-judgment-record";

const stable = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const lines = (label: string, items: readonly string[]) => items.map((item) => `- ${label}：${item}`);
const originLabels = { calculated: "按命盘综合", contextual: "结合自述背景", personal: "已采用的个人修订" };

/** Rebuild from the same sources at save time, so a stale summary cannot be
 * recorded alongside a newer context, review, range or branch calculation. */
export function describeReadingSynthesis(reading: LocalReadingSynthesis, source: {
  revision?: RevisionRecord; assessment: BaziPreliminaryAssessment; comprehensive?: BaziComprehensiveReading | null;
  life?: LocalLifeOutlook | null; annual?: LocalAnnualOutlook | null; timeline?: LocalReadingTimeline | null;
  contextual?: LocalContextualReadingBundle | null; personal?: LocalPersonalReading | null;
}, referenceLines = lines): string[] {
  if (!source.revision || !source.comprehensive) throw new Error("综合总评缺少本次命盘或章节来源，已停止保存。");
  const expected = buildReadingSynthesis({ ...source, revision: source.revision, comprehensive: source.comprehensive });
  if (stable(reading) !== stable(expected)) throw new Error("综合总评与本次命盘、背景或个人采用记录不一致，已停止保存。");
  const sectionEvidence = new Set(reading.sections.flatMap((section) => section.evidence));
  const sectionConditions = new Set(reading.sections.flatMap((section) => section.conditions));
  return ["## 综合总评", reading.headline, reading.summary,
    ...(reading.keyPoints ?? []).flatMap((point) => [`### ${point.label}`, point.text, `摘要来源主题：${point.sourceSubjects.join("、")}`]),
    ...reading.sections.flatMap((section) => [`### ${section.title}`, `正文来源：${originLabels[section.origin]}`,
      ...(section.answer && section.origin !== "personal" ? [`本段结论：${section.answer}`] : []),
      ...section.paragraphs, ...referenceLines("条件", section.conditions), ...referenceLines("依据", section.evidence),
      `主题标识：${section.sourceSubjects.join("、")}`, ...(section.sourceIds?.length ? [`本段原典出处：${section.sourceIds.join("、")}`] : [])]),
    "各段相同依据与条件只记录一次，以下为其余总评依据与条件。",
    ...referenceLines("条件", reading.conditions.filter((item) => !sectionConditions.has(item))),
    ...referenceLines("依据", reading.evidence.filter((item) => !sectionEvidence.has(item))),
    `总评命盘来源：${JSON.stringify(reading.sourceBinding)}`,
    `背景引用：${JSON.stringify(reading.contextRef)}`, `个人采用引用：${JSON.stringify(reading.personalRefs)}`,
    `总评规则：${reading.version}`, `总评来源版本：${reading.sourceVersions.join("、")}`,
    ...(reading.sources?.length ? ["### 本命补断的实际原典来源", ...reading.sources.map((source) =>
      `${source.title} · ${source.locator}\n${source.url}\n原文短引：${source.excerpt}\n本地解释：${source.interpretation}\n来源完整记录：${JSON.stringify(source)}`)] : [])];
}

export function describeReadingPriorities(reading: LocalReadingPriorities, source: {
  revision?: RevisionRecord; annual: LocalAnnualOutlook | null; life?: LocalLifeOutlook | null;
  timeline?: LocalReadingTimeline | null; annualDomains?: LocalReadingAnnualDomains | null;
}, judgmentRecords: ReturnType<typeof createOutlookJudgmentRecordWriter>, referenceLines = lines): string[] {
  if (!source.revision || !source.annual) throw new Error("重点年份缺少本次命盘或年度来源，已停止保存。");
  const expected = buildReadingPriorities({ ...source, revision: source.revision, annual: source.annual });
  if (stable(reading) !== stable(expected)) throw new Error("重点年份与本次原始分支、分段或选择依据不一致，已停止保存。");
  return ["## 重点年份与逐年对照", reading.headline, reading.summary,
    ...reading.branches.flatMap((branch) => [`### ${branch.label}`, `优先阅读标识：${branch.priorityYearIds.join("、")}`,
      ...referenceLines("分支条件", branch.conditions),
      ...branch.years.flatMap((year) => [`#### ${year.year} ${year.yearGanZhi ?? ""} · ${year.caption}`,
        `阅读位置：${branch.priorityYearIds.includes(year.id) ? "重点年份" : "其余年份"}；${year.id}`,
        ...(!year.segments.length ? [year.summary] : []),
        `时间节点：${JSON.stringify(year.nodeRef)}`, `年份区间：${year.startInstant} 至 ${year.endExclusiveInstant}（不含终点）`,
        ...year.selectionReasons.flatMap((reason) => [`入选理由：${reason.text}`, `入选依据：${JSON.stringify(reason)}`]),
        ...year.segments.flatMap((segment) => [`##### ${segment.startInstant} 至 ${segment.endExclusiveInstant}（不含终点）`,
          `分段：${segment.id}；分支 ${segment.branchId}`, `原判断：${segment.caption}`,
          ...(segment.personalStartInstant ? [`个人适用起点：${segment.personalStartInstant}；年龄：${segment.ageLabel}；阶段：${segment.ageStage}`] : []),
          `主轴：${segment.primaryAxis}；作用 ${segment.primaryEffect}；原类别 ${segment.category}`,
          ...judgmentRecords.describe(segment.judgment, year.nodeRef, `分段判断 ${segment.id}`, segment),
          ...segment.domains.flatMap((domain) => [`${domain.title}：${domain.headline}`, domain.summary, ...domain.paragraphs,
            ...lines("可发挥之处", domain.opportunities), ...lines("主要阻力", domain.obstacles),
            ...lines("对应生活情境", domain.examples), ...lines("后续观察", domain.watchPoints),
            ...referenceLines("领域条件", domain.conditions), ...referenceLines("领域依据", domain.evidence),
            `领域出处：${domain.sourceIds.join("、")}`, `领域来源版本：${domain.sourceVersions.join("、")}`]),
          ...referenceLines("适用条件", segment.conditions)]),
        ...year.turningPoints.flatMap((point) => [`变化节点：${point.id}；${point.kind}；${point.atInstant}`, point.headline, point.summary,
          `此前：${point.before.caption}`, `此后：${point.after.caption}`, ...referenceLines("变化条件", point.conditions)]),
        ...year.gaps.flatMap((gap) => [`${gap.year}年覆盖说明：${gap.message}`, `${gap.startInstant} 至 ${gap.endExclusiveInstant}（不含终点）`, ...gap.conditions]),
        ...referenceLines("年份条件", year.conditions)]),
      ...branch.gaps.flatMap((gap) => [`${gap.year}年覆盖说明：${gap.message}`, `${gap.startInstant} 至 ${gap.endExclusiveInstant}（不含终点）`, ...gap.conditions])]),
    ...lines("阅读范围", reading.limitations), `重点年份命盘来源：${JSON.stringify(reading.sourceBinding)}`,
    `定位时刻：${reading.lifeReferenceInstant}`, `重点年份规则：${reading.version}`, `重点年份来源版本：${reading.sourceVersions.join("、")}`];
}
