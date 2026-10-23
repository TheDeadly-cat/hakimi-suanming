import { transitNodeRefSchema } from "@hakimi/contracts";
import type { BaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import type { LocalAnnualOutlook } from "./local-annual-outlook";
import { ANNUAL_DOMAIN_READING_VERSION, type LocalAnnualDomainReading } from "./local-annual-domain-reading";

export interface LocalReadingAnnualDomains {
  version: typeof ANNUAL_DOMAIN_READING_VERSION;
  revisionId: string;
  chartResultHash: string;
  includeHour: boolean;
  startYear: number;
  endYear: number;
  years: LocalAnnualDomainReading[];
}

type Branch = LocalAnnualDomainReading["branches"][number];
type Segment = Branch["segments"][number];
type Domain = Segment["domains"][number];
const referenceKey = (value: unknown) => JSON.stringify(transitNodeRefSchema.parse(value));
const sortedReferences = (values: readonly unknown[]) => values.map(referenceKey).sort();
const domainNarrative = (domain: Domain) => [domain.headline, domain.summary, ...domain.paragraphs,
  ...domain.opportunities.map((text) => `可以发挥：${text}`), ...domain.obstacles.map((text) => `容易费力：${text}`),
  ...domain.examples.map((text) => `可能情境：${text}`), ...domain.watchPoints.map((text) => `实际对照：${text}`)];

/** The actual displayed reading is retained with its branch and period, so a
 * response about one life area cannot silently become feedback on a whole year. */
export function annualDomainFeedbackText(reading: LocalAnnualDomainReading, branch: Branch, segment: Segment, domain: Domain): string {
  return [`${reading.year}年 · ${domain.title} · ${branch.label}`,
    `${segment.startInstant} 至 ${segment.endExclusiveInstant}（不含终点）`,
    `个人生活语境从 ${segment.personalStartInstant} 起；${segment.ageLabel}`,
    ...domainNarrative(domain),
    ...domain.conditions.map((text) => `条件：${text}`),
    ...branch.conditions.map((text) => `分支条件：${text}`),
    `分领域解读版本：${reading.version}`, `来源版本：${reading.sourceVersions.join("、")}`].join("\n");
}

/** Validate against the saved source year rather than re-running a reading. */
export function describeAnnualDomainReadings(collection: LocalReadingAnnualDomains, assessment: BaziPreliminaryAssessment,
  annual: LocalAnnualOutlook | null): { years: Map<number, string[]>; appendix: string[] } {
  if (!annual || collection.version !== ANNUAL_DOMAIN_READING_VERSION
    || collection.revisionId !== assessment.sourceBinding.revisionId
    || collection.chartResultHash !== assessment.sourceBinding.chartResultHash
    || collection.includeHour !== assessment.sourceBinding.includeHour
    || collection.startYear !== annual.startYear || collection.endYear !== annual.endYear) {
    throw new Error("年度分领域解读与当前命盘或年份范围不一致。");
  }
  if (collection.years.length !== annual.years.length || new Set(collection.years.map((item) => item.year)).size !== annual.years.length) {
    throw new Error("年度分领域解读的年份缺失或重复。");
  }
  const notes = new Map<string, string>();
  const refer = (label: string, texts: readonly string[]) => texts.length ? [`${label}：${texts.map((text) => {
    if (!notes.has(text)) notes.set(text, `年度依据-${notes.size + 1}`);
    return notes.get(text)!;
  }).join("、")}`] : [];
  const years = new Map(collection.years.map((reading) => {
    const original = annual.years.find((year) => year.year === reading.year);
    if (!original || reading.version !== collection.version
      || reading.sourceBinding.revisionId !== collection.revisionId
      || reading.sourceBinding.chartResultHash !== collection.chartResultHash
      || reading.sourceBinding.includeHour !== collection.includeHour
      || reading.yearGanZhi !== original.yearGanZhi
      || reading.startInstant !== original.startInstant || reading.endExclusiveInstant !== original.endExclusiveInstant
      || (reading.yearNodeRef ? referenceKey(reading.yearNodeRef) : null) !== (original.transitNodeRef ? referenceKey(original.transitNodeRef) : null)) {
      throw new Error("年度分领域解读的来源、节点或区间不一致。");
    }
    const judgments = [original.judgment, original.ownJudgment, ...original.judgmentSegments.map((segment) => segment.judgment)].filter((value) => value !== null);
    const versions = [...new Set([assessment.version, annual.version, ...judgments.flatMap((value) => [value.version, value.policyVersion])])].sort();
    if (JSON.stringify([...reading.sourceVersions].sort()) !== JSON.stringify(versions)) throw new Error("年度分领域解读的来源版本不一致。");
    const branchIds = reading.branches.map((branch) => branch.id);
    if (new Set(branchIds).size !== branchIds.length) throw new Error("年度分领域解读的分支重复。");
    const emittedIds = new Set<string>();
    for (const branch of reading.branches) for (const segment of branch.segments) {
      const source = original.judgmentSegments.find((item) => item.id === segment.id && item.branchId === branch.id);
      if (!source || emittedIds.has(segment.id) || segment.branchId !== branch.id
        || segment.startInstant !== source.startInstant || segment.endExclusiveInstant !== source.endExclusiveInstant
        || segment.judgmentVersion !== source.judgment.version || segment.policyVersion !== source.judgment.policyVersion
        || JSON.stringify(sortedReferences(segment.backgroundRefs)) !== JSON.stringify(sortedReferences(source.judgment.backgroundRefs))
        || !Number.isFinite(Date.parse(segment.personalStartInstant))
        || Date.parse(segment.personalStartInstant) < Date.parse(segment.startInstant)
        || Date.parse(segment.personalStartInstant) >= Date.parse(segment.endExclusiveInstant)
        || JSON.stringify(segment.domains.map((domain) => domain.id).sort()) !== JSON.stringify(["career", "relationship", "wealth"])) {
        throw new Error("年度分领域解读的分支、原区间、大运背景或领域不一致。");
      }
      emittedIds.add(segment.id);
    }
    if ((!original.transitNodeRef || original.label === "暂不可判") && emittedIds.size) throw new Error("不可解读年份不能保存个人领域判断。");
    const lines = ["#### 本年分领域详读", reading.headline, reading.summary,
      ...reading.branches.flatMap((branch) => [`##### ${branch.label}`,
        ...branch.segments.flatMap((segment) => [
          `阶段：${segment.startInstant} 至 ${segment.endExclusiveInstant}（不含终点）；${segment.judgmentCaption}`,
          `个人生活语境从 ${segment.personalStartInstant} 起；${segment.ageLabel}`,
          ...segment.domains.flatMap((domain) => [
            `###### ${domain.title}`, ...domainNarrative(domain),
            ...refer("适用条件", domain.conditions), ...refer("对应依据", domain.evidence), `领域出处：${domain.sourceIds.join("、")}`]),
          `年度节点：${JSON.stringify(reading.yearNodeRef)}`, `分段标识：${segment.id}`,
          `大运背景节点：${JSON.stringify(segment.backgroundRefs)}`,
          `分段判断版本：${segment.judgmentVersion}；${segment.policyVersion}`]),
        ...branch.gaps.flatMap((gap) => [gap.message, ...(gap.startInstant && gap.endExclusiveInstant ? [`${gap.startInstant} 至 ${gap.endExclusiveInstant}（不含终点）`] : [])]),
        ...refer("分支适用条件", branch.conditions)]),
      ...reading.limitations, `年度分领域规则：${reading.version}`, `年度分领域来源版本：${reading.sourceVersions.join("、")}`];
    return [reading.year, lines];
  }));
  return { years, appendix: notes.size ? ["## 年度分领域条件与依据原文", "各领域通过上列标识对应以下完整原文，相同依据只保存一次。",
    ...Array.from(notes, ([text, id]) => `### ${id}\n${text}`)] : [] };
}
