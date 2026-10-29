import type { RevisionRecord } from "@hakimi/contracts";
import type { BaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import type { BaziComprehensiveReading } from "../../../../packages/bazi-interpretation/src/comprehensive-reading";
import type { LocalAnnualOutlook } from "./local-annual-outlook";
import type { LocalReadingAnnualDomains } from "./local-annual-domain-record";
import { CONTEXTUAL_READING_VERSION, buildContextualNatalReadings, buildContextualAnnualReadings, type ContextualDomainReading } from "./local-contextual-reading";
import { READING_CONTEXT_FORMAT, READING_CONTEXT_WORK_LABELS, READING_CONTEXT_RELATIONSHIP_LABELS,
  type ReadingContextDocument, type ReadingContextReference, type ResolvedReadingContextLatest } from "./local-reading-context";

export interface LocalContextualReadingBundle {
  version: typeof CONTEXTUAL_READING_VERSION;
  sourceBinding: ReadingContextDocument["sourceBinding"];
  referenceYear: number;
  contextSource: { reference: ReadingContextReference; createdAt: string; document: ReadingContextDocument };
  readings: ContextualDomainReading[];
}
export function buildContextualReadingBundle({ revision, assessment, comprehensive, annualDomains, context, referenceYear }: {
  revision: RevisionRecord; assessment: BaziPreliminaryAssessment; comprehensive: BaziComprehensiveReading | null;
  annualDomains: LocalReadingAnnualDomains | null; context: ResolvedReadingContextLatest | null; referenceYear: number;
}): LocalContextualReadingBundle | null {
  if (!context) return null;
  const source = context.document.sourceBinding;
  if (source.caseId !== revision.caseId || source.revisionId !== revision.id || source.chartResultHash !== revision.manifest.resultHash
    || source.includeHour !== assessment.sourceBinding.includeHour || context.record.lifecycle !== "active") throw new Error("阅读背景与当前命盘不一致，请重新读取记录。");
  return { version: CONTEXTUAL_READING_VERSION, sourceBinding: { ...source }, referenceYear,
    contextSource: { reference: { ...context.ref }, createdAt: context.record.createdAt, document: structuredClone(context.document) },
    readings: [
      ...(comprehensive ? buildContextualNatalReadings({ revision, assessment, comprehensive, context: context.context, referenceYear }) : []),
      ...(annualDomains?.years.flatMap((reading) => buildContextualAnnualReadings({ revision, assessment, reading, context: context.context })) ?? [])
    ] };
}

function contextText(bundle: LocalContextualReadingBundle): string[] {
  const { document, reference, createdAt } = bundle.contextSource, context = document.context;
  return [`自述职业状态：${READING_CONTEXT_WORK_LABELS[context.work]}；自述关系状态：${READING_CONTEXT_RELATIONSHIP_LABELS[context.relationship]}`,
    `自述适用年份：${context.fromYear}—${context.toYear}`,
    ...(context.notes ? ["用户补充（原文保留，不作自动推断）：", context.notes] : []),
    `背景记录：${reference.noteId}；编辑版本 ${reference.editVersion}；${createdAt}；SHA-256 ${reference.bodySha256}`,
    `背景来源：${JSON.stringify(document.sourceBinding)}`,
    ...(document.previousRef ? [`前序背景：${JSON.stringify(document.previousRef)}`] : [])];
}
export function contextualFeedbackText(reading: ContextualDomainReading, bundle: LocalContextualReadingBundle): string {
  return [reading.title, reading.headline, reading.contextLabel, reading.summary, ...reading.paragraphs,
    ...reading.examples.map((item) => `生活情境：${item}`), ...reading.focus.map((item) => `重点：${item}`),
    ...reading.basis.map((item) => `依据：${item}`), `适配范围：${JSON.stringify(reading.scope)}`,
    ...contextText(bundle), `解释版本：${reading.sourceVersions.join("、")}`].join("\n");
}
export function contextualFeedbackVersions(reading: ContextualDomainReading, bundle: LocalContextualReadingBundle): string[] {
  const reference = bundle.contextSource.reference;
  return [...new Set([...reading.sourceVersions, READING_CONTEXT_FORMAT, `context-record/${reference.noteId}/${reference.editVersion}/${reference.bodySha256}`])];
}

export function describeContextualReading(bundle: LocalContextualReadingBundle, assessment: BaziPreliminaryAssessment,
  annual: LocalAnnualOutlook | null, comprehensive?: BaziComprehensiveReading | null): string[] {
  const document = bundle.contextSource.document, source = bundle.sourceBinding;
  if (bundle.version !== CONTEXTUAL_READING_VERSION || document.format !== READING_CONTEXT_FORMAT
    || JSON.stringify(source) !== JSON.stringify(document.sourceBinding)
    || source.revisionId !== assessment.sourceBinding.revisionId || source.chartResultHash !== assessment.sourceBinding.chartResultHash
    || source.includeHour !== assessment.sourceBinding.includeHour) throw new Error("背景适配解读与当前命盘或版本不一致，请重新打开后保存。");
  const subjects = new Set<string>();
  for (const reading of bundle.readings) {
    const scope = reading.scope;
    if (subjects.has(reading.subjectId) || !reading.sourceVersions.includes(bundle.version)) throw new Error("背景适配解读主题或版本不一致。");
    subjects.add(reading.subjectId);
    const year = scope.kind === "natal" ? scope.referenceYear : scope.year;
    if (year < document.context.fromYear || year > document.context.toYear) throw new Error("背景适配解读超出本人填写的适用年份。");
    if (scope.kind === "natal") {
      if (year !== bundle.referenceYear || !comprehensive?.chapters.some((chapter) => chapter.id === scope.chapterId)
        || !reading.sourceVersions.includes(comprehensive.version)) throw new Error("背景适配的命局章节或版本不一致。");
    } else {
      const original = annual?.years.find((item) => item.year === scope.year);
      const segment = original?.judgmentSegments.find((item) => item.branchId === scope.branchId
        && item.startInstant === scope.startInstant && item.endExclusiveInstant === scope.endExclusiveInstant);
      if (!segment || !reading.sourceVersions.includes(annual!.version)) throw new Error("背景适配的年度分支或区间不一致。");
    }
  }
  return ["## 结合现实背景的解读", "背景由用户自愿填写，仅用于指定年份与适用主题的生活解释；没有改变原命盘、格局喜用或岁运评分。",
    ...contextText(bundle),
    ...(!bundle.readings.length ? ["本次未在当前年份与年龄范围内套用职业或关系身份，通用解读仍完整保留。"] : []),
    ...bundle.readings.flatMap((reading) => [`### ${reading.title} · ${reading.headline}`, contextualFeedbackText(reading, bundle)]),
    `背景适配解释版本：${bundle.version}`];
}
