/** Frozen compatibility-only source. Original SHA-256: 95398a3321029f81bdf51861d9713d832214e9fad8d3933ae01fbb4cbf19f586.
 * Replays historical choices only; never a current automatic reading. */
import type { RevisionRecord, TransitNodeRef } from "@hakimi/contracts";
import { LunarUtil } from "lunar-typescript";
import type { BaziPreliminaryAssessment } from "../../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { canonicalizeStrengthTenGod } from "../../../../../packages/bazi-interpretation/src/strength-policy";
import { evaluateNatalWealthResourceTask, type NatalWealthResourceTask } from "../../../../../packages/bazi-interpretation/src/natal-wealth-resource-task";
import { createPatternActionVerifier, LOCAL_OUTLOOK_JUDGMENT_VERSION, OUTLOOK_STEM_ACTIONS_VERSION, type LocalOutlookJudgmentSegment, type OutlookEffect, type OutlookStemAction } from "../legacy-outlook-v09/local-outlook-judgment";
import type { LocalAnnualYear } from "../legacy-outlook-v09/local-annual-outlook";
import { buildAnnualRelationshipSignals } from "../annual-relationship-signals";
import { createAnnualRelationshipTimingBuilder } from "../annual-relationship-timing";

export const ANNUAL_EVENT_SIGNALS_VERSION = "hakimi.annual-event-signals/0.3.0" as const;
export interface AnnualEventPatternContext {
  version: typeof ANNUAL_EVENT_SIGNALS_VERSION;
  scope: {
    revisionId: string; chartResultHash: string; includeHour: boolean;
    year: number; yearGanZhi: string; branchId: "locked" | "forward" | "backward"; segmentId: string;
    targetRef: TransitNodeRef; backgroundRefs: TransitNodeRef[];
    startInstant: string; endExclusiveInstant: string;
  };
  axisId: string; pathId: string; effect: OutlookEffect; summary: string;
  /** Natal-only, verified once by the factory. Future/background stems never
   * enter this task; it is an in-memory prose input, not another event record. */
  natalTask: NatalWealthResourceTask;
  satisfiedConditions: string[]; blockers: string[]; rescues: string[];
  unresolvedConditions: string[]; evidence: string[]; sourceIds: string[];
}
export interface AnnualEventStemActionSignal {
  visibility: "visible" | "main_hidden";
  stem: string; tenGod: string; effect: OutlookEffect;
  evidence: string[]; blockers: string[]; satisfiedConditions: string[];
  /** True means the original axis summary also describes this action. It
   * remains an axis statement, including its separately identified rescues. */
  summaryBasis: boolean;
}

export function createAnnualEventSignalBuilder(revision: RevisionRecord, assessment: BaziPreliminaryAssessment) {
  const includeHour = revision.input.timePrecision !== "unknown_hour" && revision.input.timePrecision !== "date_only";
  const stable = (value: unknown) => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item)
    ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
  const binding = { revisionId: revision.id, chartResultHash: revision.manifest.resultHash, includeHour };
  if (assessment.sourceBinding.revisionId !== binding.revisionId || assessment.sourceBinding.chartResultHash !== binding.chartResultHash
    || assessment.sourceBinding.includeHour !== includeHour || stable(assessment.balance.structural.sourceBinding) !== stable(binding)) throw new Error("年度事项的本命任务来源不一致。");
  for (const position of ["year", "month", "day", ...(includeHour ? ["hour" as const] : [])] as const) {
    if (stable(assessment.balance.structural.inputFacts.pillars[position]) !== stable(revision.facts.pillars[position])) throw new Error("年度事项的本命任务所选柱与源修订不一致。");
  }
  const natalTask = evaluateNatalWealthResourceTask({ facts: assessment.balance.structural.inputFacts, includeHour });
  const verify = createPatternActionVerifier(revision, assessment);
  const timingFor = createAnnualRelationshipTimingBuilder(revision, assessment);
  return (year: LocalAnnualYear, segment: LocalOutlookJudgmentSegment) => {
    // This existing guard binds the exact original member, branch, target and
    // background intersection before metadata is expanded for language.
    const relationshipSignals = buildAnnualRelationshipSignals({ revision, year, segment });
    const judgment = segment.judgment, pattern = judgment.axes.find((axis) => axis.axis === "pattern");
    if (judgment.version !== LOCAL_OUTLOOK_JUDGMENT_VERSION || !pattern?.stemActions || pattern.stemActions.version !== OUTLOOK_STEM_ACTIONS_VERSION) throw new Error("当前年度应事缺少受支持的结构化作用；旧保存文字不在此重新解释。");
    const actions = pattern.stemActions.items;
    if (actions.length !== 2 || new Set(actions.map((item) => item.visibility)).size !== 2) throw new Error("作用元数据的透干与支本气重复或缺失。");
    const targetStem = year.yearGanZhi![0]!, mainStem = (LunarUtil.ZHI_HIDE_GAN as Record<string, string[]>)[year.yearGanZhi![1]!]![0]!;
    const indexes = (values: number[], lines: string[]) => {
      if (!Array.isArray(values) || new Set(values).size !== values.length || values.some((value) => !Number.isSafeInteger(value) || value < 0 || value >= lines.length)) throw new Error("作用元数据依据索引重复或越界。");
      return values.map((index) => lines[index]!);
    };
    const expand = (action: OutlookStemAction): AnnualEventStemActionSignal => {
      const stem = action.visibility === "visible" ? targetStem : action.visibility === "main_hidden" ? mainStem : null;
      const god = stem ? canonicalizeStrengthTenGod((LunarUtil.SHI_SHEN as Record<string, string>)[revision.facts.pillars.day.stem + stem]!) : null;
      if (action.stem !== stem || action.tenGod !== god || !["assists", "obstructs", "mixed", "neutral", "unresolved"].includes(action.effect) || typeof action.summaryBasis !== "boolean") throw new Error("作用元数据与目标透藏、十神或作用类型不一致。");
      return { visibility: action.visibility, stem: action.stem, tenGod: action.tenGod, effect: action.effect,
        evidence: indexes(action.evidenceIndexes, pattern.evidence), blockers: indexes(action.blockerIndexes, pattern.blockers),
        satisfiedConditions: indexes(action.satisfiedConditionIndexes, pattern.satisfiedConditions), summaryBasis: action.summaryBasis };
    };
    const expanded = actions.map(expand);
    const backgrounds = judgment.backgroundRefs.map((ref) => {
      const actual = year.dayunSegments.find((item) => item.direction === segment.branchId && JSON.stringify(item.nodeRef) === JSON.stringify(ref));
      if (!actual) throw new Error("作用元数据没有同分支实际大运背景。");
      return { nodeType: "dayun" as const, ganZhi: actual.ganZhi };
    });
    verify(pattern, { nodeType: "year", ganZhi: year.yearGanZhi! }, backgrounds);
    if (natalTask.preferredPathId && natalTask.preferredPathId !== pattern.pathId) throw new Error("年度事项的本命任务与原结构路径不一致。");
    const patternContext: AnnualEventPatternContext = { version: ANNUAL_EVENT_SIGNALS_VERSION,
      scope: { ...judgment.sourceBinding, year: year.year, yearGanZhi: year.yearGanZhi!, branchId: segment.branchId, segmentId: segment.id,
        targetRef: structuredClone(judgment.targetRef), backgroundRefs: structuredClone(judgment.backgroundRefs), startInstant: segment.startInstant, endExclusiveInstant: segment.endExclusiveInstant },
      axisId: pattern.id, pathId: pattern.pathId, effect: pattern.effect, summary: pattern.summary, natalTask: structuredClone(natalTask),
      satisfiedConditions: [...pattern.satisfiedConditions], blockers: [...pattern.blockers], rescues: [...pattern.rescues], unresolvedConditions: [...pattern.unresolvedConditions], evidence: [...pattern.evidence], sourceIds: [...pattern.sourceIds] };
    return { patternContext, targetAction: expanded.find((item) => item.visibility === "visible")!, mainQiAction: expanded.find((item) => item.visibility === "main_hidden")!, relationshipSignals, relationshipTiming: timingFor(year, segment) };
  };
}
