import type { RevisionRecord } from "@hakimi/contracts";
import type { BaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import type { LocalMonthlyOutlook } from "./local-detailed-outlook";
import { buildMonthlyDomainReadings, type LocalMonthlyDomainReadings, type LocalMonthlyDomainReading } from "./local-monthly-domain-reading";
import type { LocalContextualReadingBundle } from "./local-contextual-reading-record";

type Branch = LocalMonthlyDomainReading["branches"][number];
type Segment = Branch["segments"][number];
type Domain = Segment["domains"][number];
const stable = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const narrative = (domain: Domain) => [domain.headline, domain.summary, ...domain.paragraphs,
  ...domain.opportunities.map((text) => `可以发挥：${text}`), ...domain.obstacles.map((text) => `容易费力：${text}`),
  ...domain.examples.map((text) => `可能情境：${text}`), ...domain.watchPoints.map((text) => `实际对照：${text}`)];

export function monthlyDomainFeedbackText(collection: LocalMonthlyDomainReadings, reading: LocalMonthlyDomainReading,
  branch: Branch, segment: Segment, domain: Domain): string {
  return [`${collection.year}年 · ${reading.label} ${reading.ganZhi} · ${domain.title} · ${branch.label}`,
    `${segment.startInstant} 至 ${segment.endExclusiveInstant}（不含终点）`, `背景：${segment.backgroundLabels.join("、")}`,
    `原判断：${segment.judgmentCaption}`, `个人生活语境从 ${segment.personalStartInstant} 起；${segment.ageLabel}`,
    ...narrative(domain), ...domain.conditions.map((text) => `条件：${text}`), ...domain.evidence.map((text) => `依据：${text}`),
    ...segment.conditions.map((text) => `分段条件：${text}`), ...branch.conditions.map((text) => `分支条件：${text}`),
    ...(collection.contextRef ? [`阅读背景记录：${JSON.stringify(collection.contextRef)}`] : []),
    `月度分领域解读版本：${collection.version}`, `来源版本：${collection.sourceVersions.join("、")}`].join("\n");
}

/** Rebuild only the prose view, preserving the original monthly judgments.
 * An export cannot pair a previous month's view with a newly selected year. */
export function describeMonthlyDomainReadings(collection: LocalMonthlyDomainReadings, source: {
  revision?: RevisionRecord; assessment: BaziPreliminaryAssessment; monthly?: LocalMonthlyOutlook | null;
  contextual?: LocalContextualReadingBundle | null;
}): { months: Map<string, string[]>; appendix: string[] } {
  if (!source.revision || !source.monthly) throw new Error("月度分领域解读缺少本次命盘或流月来源。");
  if (source.revision.id !== source.assessment.sourceBinding.revisionId
    || source.revision.manifest.resultHash !== source.assessment.sourceBinding.chartResultHash) throw new Error("月度分领域解读与本次命盘不一致。");
  const expected = buildMonthlyDomainReadings({ revision: source.revision, assessment: source.assessment, monthly: source.monthly, contextual: source.contextual });
  if (stable(collection) !== stable(expected)) throw new Error("月度分领域解读与本次月份、分支或原判断不一致。");
  const notes = new Map<string, string>();
  const refer = (label: string, texts: readonly string[]) => texts.length ? [`${label}：${texts.map((text) => {
    if (!notes.has(text)) notes.set(text, `月度依据-${notes.size + 1}`);
    return notes.get(text)!;
  }).join("、")}`] : [];
  const months = new Map(collection.months.map((reading) => [reading.monthId, ["#### 本月分领域详读", reading.headline, reading.summary,
    `节令月节点：${JSON.stringify(reading.nodeRef)}`, `${reading.startInstant} 至 ${reading.endExclusiveInstant}（不含终点）`,
    ...reading.branches.flatMap((branch) => [`##### ${branch.label}`,
      ...branch.segments.flatMap((segment) => [`分段：${segment.id}`, `背景：${segment.backgroundLabels.join("、")}`,
        `阶段：${segment.startInstant} 至 ${segment.endExclusiveInstant}（不含终点）；${segment.judgmentCaption}`,
        `个人生活语境从 ${segment.personalStartInstant} 起；${segment.ageLabel}`,
        ...segment.domains.flatMap((domain) => [`###### ${domain.title}`, ...narrative(domain),
          ...refer("适用条件", domain.conditions), ...refer("对应依据", domain.evidence), `领域出处：${domain.sourceIds.join("、")}`]),
        ...refer("分段适用条件", segment.conditions), `年月运背景节点：${JSON.stringify(segment.backgroundRefs)}`,
        `分段判断版本：${segment.judgmentVersion}；${segment.policyVersion}`]),
      ...branch.gaps.flatMap((gap) => [gap.message, ...(gap.startInstant && gap.endExclusiveInstant ? [`${gap.startInstant} 至 ${gap.endExclusiveInstant}（不含终点）`] : [])]),
      ...refer("分支适用条件", branch.conditions)])]]));
  return { months, appendix: ["## 月度分领域条件与依据原文", ...Array.from(notes, ([text, id]) => `### ${id}\n${text}`),
    ...(collection.contextRef ? [`月度阅读背景记录：${JSON.stringify(collection.contextRef)}`] : []),
    ...collection.limitations, `月度分领域规则：${collection.version}`, `月度分领域来源版本：${collection.sourceVersions.join("、")}`,
    `所属年份：${collection.year}；${collection.yearGanZhi}`, `所属年节点：${JSON.stringify(collection.yearNodeRef)}`] };
}
