import type { RevisionRecord } from "@hakimi/contracts";
import { buildLocalReadingAgeContext } from "./local-reading-age-context";
import type { NatalWealthResourceTask } from "../../../../packages/bazi-interpretation/src/natal-wealth-resource-task";
import type { AnnualDomainReading } from "./local-annual-domain-reading";
import type { LocalMonthlyPeriod } from "./local-detailed-outlook";
import type { LocalAnnualYear } from "./local-annual-outlook";
import type { LocalOutlookJudgment } from "./local-outlook-judgment";
import type { LocalPersonalReading } from "./local-personal-reading";
import type { LocalMonthlyDomainReading, LocalMonthlyDomainReadings, MonthlyDomainSegment } from "./local-monthly-domain-reading";
import { buildPlainOutlookDomainReading, plainOutlookCaption, plainOutlookExample, plainOutlookLabel } from "./plain-outlook-reading";
import type { MonthReadingDirectionRange, MonthReadingRhythmBranch, MonthReadingRhythmPeriod } from "./local-month-reading-rhythm";
import type { LocalContextualReadingBundle } from "./local-contextual-reading-record";
import { CONTEXTUAL_READING_VERSION } from "./local-contextual-reading";
import { READING_CONTEXT_FORMAT, readingContextDraftSchema } from "./local-reading-context";

const stable = (input: unknown) => JSON.stringify(input, (_key, value) => value && typeof value === "object" && !Array.isArray(value)
  ? Object.fromEntries(Object.entries(value).sort(([x], [y]) => x.localeCompare(y))) : value);
const same = (a: unknown, b: unknown) => stable(a) === stable(b);

/** Contrast two independently calculated horizons, without promoting either
 * one's actor into the other horizon or recalculating an overall direction. */
export function plainAnnualMonthContrast(annual: LocalOutlookJudgment, monthly: LocalOutlookJudgment): string {
  const yearEffect = annual.axes.find(axis => axis.axis === annual.primaryAxis)?.effect;
  const monthEffect = monthly.axes.find(axis => axis.axis === monthly.primaryAxis)?.effect;
  if (yearEffect === "assists" && monthEffect === "obstructs") return "全年这一阶段的主线有可推进条件；本月带来的变化仍有阻力，不表示全年机会消失。";
  if (yearEffect === "assists" && monthEffect === "mixed") return "全年这一阶段的主线有可推进条件；本月新变化有助力也有阻力，要与持续背景分开看。";
  if (yearEffect === "obstructs" && monthEffect === "assists") return "全年这一阶段的主线仍有压力；本月出现局部可用配合，不表示全年牵制已经解除。";
  return "";
}

export function plainMonthlyPeriodHeadline(period: MonthReadingRhythmPeriod): string {
  const caption = plainOutlookLabel(period.label, period.primaryEffect);
  // Keep the original month / handover-date prefix; replace only the exact
  // bound caption. A nonstandard prefix falls back to the full source instant.
  return period.headline.endsWith(` · ${period.caption}`)
    ? `${period.headline.slice(0, -period.caption.length)}${caption}`
    : `${period.monthLabel} · ${new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).format(new Date(period.personalStartInstant))}起 · ${caption}`;
}

export function plainMonthlyRangeCaption(branch: MonthReadingRhythmBranch, range: MonthReadingDirectionRange): string {
  const periods = range.periodIds.map(id => branch.periods.find(period => period.id === id));
  if (!periods.length || periods.some(period => !period)) return range.caption;
  return [...new Set(periods.map(period => plainOutlookLabel(period!.label, period!.primaryEffect)))].join("；");
}

/** A shared display binding for the page and new report. Never rebuilds a
 * judgment, changes feedback text, or reads a work status from a global note. */
export function plainMonthlyPresentation(input: {
  reading: LocalMonthlyDomainReading; segment: MonthlyDomainSegment; domain: AnnualDomainReading;
  collection?: LocalMonthlyDomainReadings | null;
  contextual?: LocalContextualReadingBundle | null;
  annualYear?: LocalAnnualYear | null; personal?: LocalPersonalReading | null;
  month?: LocalMonthlyPeriod | null; revision?: RevisionRecord | null; task?: NatalWealthResourceTask | null;
}) {
  const { reading, segment, domain, month, task, revision, collection, contextual, annualYear, personal } = input;
  if (!month || !revision || !collection) return null;
  const includeHour = revision.input.timePrecision !== "unknown_hour" && revision.input.timePrecision !== "date_only";
  const invalid = () => { throw new Error("月份简明正文与原月份、分段或领域来源不一致。"); };
  const found = reading.branches.filter(branch => branch.id === segment.branchId).flatMap(branch => branch.segments.filter(part => part.id === segment.id));
  if (collection.sourceBinding.revisionId !== revision.id || collection.sourceBinding.chartResultHash !== revision.manifest.resultHash || collection.sourceBinding.includeHour !== includeHour
    || collection.months.filter(item => item.monthId === reading.monthId && same(item, reading)).length !== 1
    || revision.id !== month.nodeRef.revisionId || revision.manifest.resultHash !== month.nodeRef.chartResultHash || reading.monthId !== month.id || !same(reading.nodeRef, month.nodeRef)
    || reading.startInstant !== month.startInstant || reading.endExclusiveInstant !== month.endExclusiveInstant
    || found.length !== 1 || !same(found[0], segment)
    || segment.domains.filter(item => item.id === domain.id && same(item, domain)).length !== 1) return invalid();
  const originals = month.judgmentSegments.filter(part => part.id === segment.id && part.branchId === segment.branchId);
  const original = originals[0];
  const yearRef = collection.yearNodeRef;
  if (originals.length !== 1 || !original || original.startInstant !== segment.startInstant || original.endExclusiveInstant !== segment.endExclusiveInstant
    || !yearRef || !same(original.judgment.backgroundRefs.find(ref => ref.nodeType === "year"), yearRef)
    || new Date(Date.parse(yearRef.startInstant) + 8 * 3_600_000).getUTCFullYear() !== collection.year
    || collection.startInstant !== yearRef.startInstant || !collection.endExclusiveInstant
    || Date.parse(segment.startInstant) < Date.parse(collection.startInstant) || Date.parse(segment.endExclusiveInstant) > Date.parse(collection.endExclusiveInstant)
    || original.judgment.version !== segment.judgmentVersion || original.judgment.policyVersion !== segment.policyVersion
    || !same(original.judgment.sourceBinding, collection.sourceBinding)
    || !same(original.judgment.interval, { startInstant: segment.startInstant, endExclusiveInstant: segment.endExclusiveInstant })
    || !same(original.judgment.backgroundRefs, segment.backgroundRefs) || !same(original.judgment.targetRef, month.nodeRef)) return invalid();
  const age = buildLocalReadingAgeContext(includeHour ? revision.timeCalibration.utcInstant : null, segment.startInstant, segment.endExclusiveInstant);
  let appliedWork;
  if (collection.contextRef) {
    if (!contextual) return null;
    const expected = { caseId: revision.caseId, ...collection.sourceBinding }, source = contextual.contextSource;
    if (contextual.version !== CONTEXTUAL_READING_VERSION || source.document.format !== READING_CONTEXT_FORMAT
      || !same(contextual.sourceBinding, expected) || !same(source.document.sourceBinding, expected)
      || !same(source.reference, collection.contextRef)) return invalid();
    const context = readingContextDraftSchema.parse(source.document.context);
    if (age.stage === "adult" && context.fromYear <= collection.year && collection.year <= context.toYear && context.work !== "unspecified") appliedWork = context.work;
  }
  const projected = buildPlainOutlookDomainReading({ judgment: original.judgment, domain: domain.id, original: domain,
    age, horizon: "month", task, appliedWork });
  let annualContext = "";
  if (annualYear) {
    const annualParts = annualYear.judgmentSegments.filter(part => part.branchId === segment.branchId
      && part.startInstant <= segment.startInstant && part.endExclusiveInstant >= segment.endExclusiveInstant);
    const annualPart = annualParts[0];
    if (annualYear.year !== collection.year || !same(annualYear.transitNodeRef, collection.yearNodeRef)
      || annualYear.startInstant !== collection.startInstant || annualYear.endExclusiveInstant !== collection.endExclusiveInstant
      || annualParts.length !== 1 || !annualPart || !same(annualPart.judgment.sourceBinding, collection.sourceBinding)
      || !same(annualPart.judgment.targetRef, collection.yearNodeRef)
      || !same(annualPart.judgment.interval, { startInstant: annualPart.startInstant, endExclusiveInstant: annualPart.endExclusiveInstant })
      || !same(annualPart.judgment.backgroundRefs, original.judgment.backgroundRefs.filter(ref => ref.nodeType !== "year"))) return invalid();
    const expectedBinding = { caseId: revision.caseId, ...collection.sourceBinding };
    if (personal && !same(personal.sourceBinding, expectedBinding)) return invalid();
    const subjects = new Set(["annual-overview", `annual-${collection.year}`,
      `annual-life-story-${collection.year}-${segment.branchId}-${annualPart.id}`,
      `annual-domain-${collection.year}-${annualPart.id}-${domain.id}`,
      `contextual-annual-${collection.year}-${annualPart.id}-${domain.id}`]);
    const adopted = personal?.entries.some(entry => entry.state === "adopted" && entry.personalText
      && (subjects.has(entry.subjectId) || entry.subjectId.startsWith(`annual-event-${collection.year}-${annualPart.id}-`)
        || entry.subjectId.startsWith(`annual-event-composed-${collection.year}-${annualPart.id}-`)));
    // A revised annual conclusion must not be reintroduced through a month
    // card. Keep its independent monthly text and the existing personal scope.
    if (!adopted && domain.id !== "relationship") {
      annualContext = plainAnnualMonthContrast(annualPart.judgment, original.judgment);
      const yearPattern = annualPart.judgment.axes.find(axis => axis.axis === "pattern");
      const monthPattern = original.judgment.axes.find(axis => axis.axis === "pattern");
      const yearly = yearPattern?.stemActions?.items.find(action => action.visibility === "visible");
      const current = monthPattern?.stemActions?.items.find(action => action.visibility === "visible");
      const financial = (action: typeof current) => action && ["正财", "偏财"].includes(action.tenGod) && ["assists", "mixed"].includes(action.effect);
      const special = ["official-resource", "killings-resource", "food-killings", "resource-wealth"].includes(monthPattern?.pathId ?? "")
        || (task?.preferredPathId === monthPattern?.pathId && ["resource_first", "wealth_first", "official_joint"].includes(task?.task ?? ""));
      const adultMoneyContext = age.stage === "adult" && age.segments.every(part => part.stage === "adult")
        && !["student", "seeking_work", "caregiving", "retired"].includes(appliedWork ?? "");
      if (domain.id === "wealth" && adultMoneyContext && !special && financial(yearly) && financial(current) && yearly!.tenGod !== current!.tenGod) {
        annualContext += current!.tenGod === "正财"
          ? "本年侧重新合作或新用途的机会；本月则偏向已有约定的确认、结算或续用，须先有相应事项，不能认定新机会已经兑现。"
          : "本年侧重原约定的兑现；本月另看新合作或新用途，需要实际新增安排，不能把原有款项直接当作新增进账。";
      }
    }
  }
  const examples = [...domain.examples], visible = original.judgment.axes.find(axis => axis.axis === "pattern")?.stemActions?.items.find(item => item.visibility === "visible");
  // Only a complete neutral-adult template can be rewritten. The first source
  // example belongs to the visible actor; preserve all originals for comparison.
  const neutralAdult = !appliedWork && age.stage === "adult" && age.segments.every(item => item.stage === "adult");
  if (neutralAdult && visible && examples[0]) {
    examples[0] = plainOutlookExample(examples[0], visible.effect, domain.id);
  }
  return projected ? { ...projected, summary: projected.summary + annualContext, caption: `本月新增作用及持续牵制 · ${plainOutlookCaption(original.judgment, segment.judgmentCaption)}`, examples,
    displayExamples: neutralAdult ? examples.slice(0, 1) : examples } : null;
}
