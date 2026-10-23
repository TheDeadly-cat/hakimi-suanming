/** Frozen compatibility-only implementation. Original SHA-256: a8211f8b3c6657ff85067b950618667c1f9a6e9efda7f1d46de281924c03a29f.
 * Never use this module for current automatic reading output. Import paths only are relocated. */
import type { RevisionRecord, TransitNodeRef } from "@hakimi/contracts";
import { LunarUtil } from "lunar-typescript";
import type { BaziPreliminaryAssessment } from "../../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { canonicalizeStrengthTenGod } from "../../../../../packages/bazi-interpretation/src/strength-policy";
import { createPatternActionVerifier, LOCAL_OUTLOOK_JUDGMENT_VERSION, OUTLOOK_STEM_ACTIONS_VERSION, type LocalOutlookJudgmentSegment, type OutlookEffect, type OutlookStemAction } from "../legacy-outlook-v09/local-outlook-judgment";
import type { LocalAnnualYear } from "../legacy-outlook-v09/local-annual-outlook";
import { buildAnnualRelationshipSignals } from "../annual-relationship-signals";
import { createAnnualRelationshipTimingBuilder } from "../annual-relationship-timing";

export const ANNUAL_EVENT_SIGNALS_VERSION = "hakimi.annual-event-signals/0.2.0" as const;
export interface AnnualEventPatternContext {
  version: string;
  scope: {
    revisionId: string; chartResultHash: string; includeHour: boolean;
    year: number; yearGanZhi: string; branchId: "locked" | "forward" | "backward"; segmentId: string;
    targetRef: TransitNodeRef; backgroundRefs: TransitNodeRef[];
    startInstant: string; endExclusiveInstant: string;
  };
  axisId: string; pathId: string; effect: OutlookEffect; summary: string;
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
    const patternContext: AnnualEventPatternContext = { version: ANNUAL_EVENT_SIGNALS_VERSION,
      scope: { ...judgment.sourceBinding, year: year.year, yearGanZhi: year.yearGanZhi!, branchId: segment.branchId, segmentId: segment.id,
        targetRef: structuredClone(judgment.targetRef), backgroundRefs: structuredClone(judgment.backgroundRefs), startInstant: segment.startInstant, endExclusiveInstant: segment.endExclusiveInstant },
      axisId: pattern.id, pathId: pattern.pathId, effect: pattern.effect, summary: pattern.summary,
      satisfiedConditions: [...pattern.satisfiedConditions], blockers: [...pattern.blockers], rescues: [...pattern.rescues], unresolvedConditions: [...pattern.unresolvedConditions], evidence: [...pattern.evidence], sourceIds: [...pattern.sourceIds] };
    return { patternContext, targetAction: expanded.find((item) => item.visibility === "visible")!, mainQiAction: expanded.find((item) => item.visibility === "main_hidden")!, relationshipSignals, relationshipTiming: timingFor(year, segment) };
  };
}
