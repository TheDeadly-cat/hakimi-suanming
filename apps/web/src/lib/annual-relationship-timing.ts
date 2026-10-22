import { storedRevisionRecordSchema, type RevisionRecord, type TransitNodeRef } from "@hakimi/contracts";
import { calculatePillarRelations, type RelationFact } from "@hakimi/relations-core";
import { LunarUtil } from "lunar-typescript";
import type { BaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import type { PillarPosition } from "../../../../packages/bazi-interpretation/src/strength-assessment-core";
import { buildNatalRelationshipFoundation } from "../../../../packages/bazi-interpretation/src/natal-relationship-foundation";
import { NATAL_RELATIONSHIP_SOURCES_VERSION } from "../../../../packages/bazi-interpretation/src/natal-relationship-sources";
import { canonicalizeStrengthTenGod } from "../../../../packages/bazi-interpretation/src/strength-policy";
import type { LocalAnnualYear } from "./local-annual-outlook";
import type { LocalOutlookJudgmentSegment } from "./local-outlook-judgment";
import { buildAnnualRelationshipSignals, ANNUAL_RELATIONSHIP_SIGNALS_VERSION } from "./annual-relationship-signals";
import { ANNUAL_RELATIONSHIP_TIMING_SOURCES_VERSION } from "./annual-relationship-timing-sources";

export const ANNUAL_RELATIONSHIP_TIMING_VERSION = "hakimi.annual-relationship-timing/0.1.0" as const;
export interface AnnualRelationshipTimingSignal {
  id: string; kind: "star_entry" | "star_stem_contact" | "palace_contact" | "hidden_to_visible";
  source: "year" | "dayun"; nodeRef: TransitNodeRef; ganZhi: string;
  relevance: "primary_star" | "related_wealth" | "palace";
  stem: string | null; tenGod: string | null;
  natalOccurrenceIds: string[]; natalPositions: PillarPosition[];
  relationType: "stem_five_combination" | "stem_clash" | "branch_six_combination" | "branch_six_clash" | null;
  factId: string | null; ruleId: string; text: string;
}
export interface AnnualRelationshipTimingLens {
  id: "wealth" | "authority"; label: string; traditionalRole: string;
  focus: "annual_focus" | "background_only" | "none";
  overlap: "multiple_layers" | "single_layer" | "none";
  signals: AnnualRelationshipTimingSignal[];
  annualSignalIds: string[]; backgroundSignalIds: string[];
  triggerSignalIds: string[]; conditions: string[]; sourceIds: string[];
}
export interface AnnualRelationshipTiming {
  version: typeof ANNUAL_RELATIONSHIP_TIMING_VERSION;
  sourceBinding: { revisionId: string; chartResultHash: string; includeHour: boolean; sex: RevisionRecord["input"]["sex"] };
  scope: { year: number; yearGanZhi: string; branchId: "locked" | "forward" | "backward"; segmentId: string;
    targetRef: TransitNodeRef; backgroundRefs: TransitNodeRef[]; startInstant: string; endExclusiveInstant: string };
  triggered: boolean; coverage: "selected_four_pillars" | "hour_excluded";
  lenses: AnnualRelationshipTimingLens[]; conditions: string[]; sourceIds: string[]; sourceVersions: string[];
}
export type AnnualRelationshipTimingBuilder = (year: LocalAnnualYear, segment: LocalOutlookJudgmentSegment) => AnnualRelationshipTiming;
const stable = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);

/** The implementation binds the original interval before deriving any trigger.
 * A background-only signal or indirect-wealth entry alone is not a new annual
 * relationship window. */
export function createAnnualRelationshipTimingBuilder(revision: RevisionRecord, assessment: BaziPreliminaryAssessment): AnnualRelationshipTimingBuilder {
  const r = storedRevisionRecordSchema.parse(structuredClone(revision));
  const foundation = buildNatalRelationshipFoundation(r, assessment);
  const labels: Record<PillarPosition, string> = { year: "年柱", month: "月柱", day: "日柱", hour: "时柱" };
  const unique = <T>(values: readonly T[]) => [...new Set(values)];
  const relationNames: Partial<Record<RelationFact["relationType"], string>> = { stem_five_combination: "天干五合", stem_clash: "天干冲", branch_six_combination: "地支六合", branch_six_clash: "地支六冲" };
  const relationName = (type: RelationFact["relationType"]) => {
    const label = relationNames[type]; if (!label) throw new Error("年度关系时机出现未支持的关系类型。"); return label;
  };
  const stemPair = (ganZhi: string, natalGanZhi: string) => calculatePillarRelations({ year: ganZhi, month: natalGanZhi, day: ganZhi, hour: natalGanZhi }).facts
    .filter((fact) => fact.completeness === "binary" && fact.participants.length === 2
      && (fact.relationType === "stem_five_combination" || fact.relationType === "stem_clash")
      && fact.participants.every((p) => p.component === "stem")
      && fact.participants.some((p) => p.position === "year") && fact.participants.some((p) => p.position === "month"));
  return (year, segment) => {
    // Reuse the existing exact original-member, node, branch and half-open
    // intersection guard. Never locate a background from a neighboring year.
    const palace = buildAnnualRelationshipSignals({ revision: r, year, segment });
    const target = segment.judgment.targetRef;
    const actors = [{ source: "year" as const, nodeRef: target, ganZhi: year.yearGanZhi! }, ...segment.judgment.backgroundRefs.map((ref) => {
      const originals = year.dayunSegments.filter((item) => item.direction === segment.branchId && stable(item.nodeRef) === stable(ref));
      if (originals.length !== 1) throw new Error("年度关系时机缺少完整引用唯一对应的大运。");
      const original = originals[0]!;
      return { source: "dayun" as const, nodeRef: ref, ganZhi: original.ganZhi };
    })];
    for (const actor of actors) if (LunarUtil.getJiaZiIndex(actor.ganZhi) < 0) throw new Error("年度关系时机的原目标干支无效。");
    const lenses: AnnualRelationshipTimingLens[] = foundation.perspectives.map((perspective) => {
      const signals: AnnualRelationshipTimingSignal[] = [];
      const relevanceFor = (god: string) => perspective.primaryTenGods.includes(god) ? "primary_star" as const : "related_wealth" as const;
      for (const actor of actors) {
        const stem = actor.ganZhi[0]!, god = canonicalizeStrengthTenGod((LunarUtil.SHI_SHEN as Record<string, string>)[r.facts.pillars.day.stem + stem]!);
        const prefix = actor.source === "year" ? `本年${actor.ganZhi}` : `同段${actor.ganZhi}大运背景`;
        const base = { source: actor.source, nodeRef: structuredClone(actor.nodeRef), ganZhi: actor.ganZhi };
        if ([...perspective.primaryTenGods, ...perspective.relatedTenGods].includes(god)) {
          const matches = perspective.occurrences.filter((o) => o.stem === stem);
          signals.push({ ...base, id: `${actor.source}:entry:${stem}`, kind: "star_entry", relevance: relevanceFor(god), stem, tenGod: god,
            natalOccurrenceIds: matches.map((o) => o.id), natalPositions: unique(matches.map((o) => o.position)), relationType: null, factId: null, ruleId: "annual-relationship-timing:visible-star-entry:v1",
            text: `${prefix}透${stem}${god}，在${perspective.label}中${relevanceFor(god) === "related_wealth" ? "仅为相关投入线索，不直接当作妻星" : "增加一个可对照的明透角色"}。` });
          const hidden = matches.filter((o) => o.visibility !== "visible");
          if (hidden.length && !matches.some((o) => o.visibility === "visible")) signals.push({ ...base, id: `${actor.source}:hidden-visible:${stem}`, kind: "hidden_to_visible", relevance: relevanceFor(god), stem, tenGod: god,
            natalOccurrenceIds: hidden.map((o) => o.id), natalPositions: unique(hidden.map((o) => o.position)), relationType: null, factId: null, ruleId: "annual-relationship-timing:same-stem-hidden-visible:v1",
            text: `原局${hidden.map((o) => `${labels[o.position]}藏${o.stem}${o.tenGod}`).join("、")}；${prefix}同字${stem}明透。这是不同时间层的同字对应，原局藏位仍保留。` });
        }
        for (const original of perspective.occurrences.filter((o) => o.visibility === "visible")) for (const fact of stemPair(actor.ganZhi, original.ganZhi)) {
          signals.push({ ...base, id: `${actor.source}:star-contact:${original.id}:${fact.ruleId}`, kind: "star_stem_contact", relevance: relevanceFor(original.tenGod), stem, tenGod: god,
            natalOccurrenceIds: [original.id], natalPositions: [original.position], relationType: fact.relationType as "stem_five_combination" | "stem_clash", factId: fact.id, ruleId: fact.ruleId,
            text: `${prefix}干${stem}与原局${labels[original.position]}明透${original.stem}${original.tenGod}有${relationName(fact.relationType)}${relevanceFor(original.tenGod) === "related_wealth" ? "；该原字为偏财相关线索" : ""}。` });
        }
      }
      for (const signal of palace) signals.push({ id: `${signal.source}:palace:${signal.ruleId}`, kind: "palace_contact", source: signal.source, nodeRef: structuredClone(signal.nodeRef), ganZhi: signal.ganZhi,
        relevance: "palace", stem: null, tenGod: null, natalOccurrenceIds: [], natalPositions: ["day"], relationType: signal.relationType, factId: signal.factId, ruleId: signal.ruleId,
        text: `${signal.source === "year" ? "本年" : "同段大运背景"}${signal.ganZhi}与原局日支${foundation.dayPalace.branch}有${relationName(signal.relationType)}。` });
      const eligible = (signal: AnnualRelationshipTimingSignal) => signal.kind === "palace_contact" || signal.kind === "star_stem_contact" || signal.relevance === "primary_star";
      const triggerSignals = signals.filter((signal) => signal.source === "year" && eligible(signal));
      // Entry and same-stem emergence describe one star layer, not two votes.
      const layers = unique(signals.filter(eligible).map((signal) => signal.kind === "star_entry" || signal.kind === "hidden_to_visible" ? "star_presence" : signal.kind));
      return { id: perspective.id, label: perspective.label, traditionalRole: perspective.traditionalRole,
        focus: triggerSignals.length ? "annual_focus" : signals.some((signal) => signal.source === "dayun") ? "background_only" : "none",
        overlap: !triggerSignals.length ? "none" : layers.length > 1 ? "multiple_layers" : "single_layer", signals,
        annualSignalIds: signals.filter((signal) => signal.source === "year").map((signal) => signal.id), backgroundSignalIds: signals.filter((signal) => signal.source === "dayun").map((signal) => signal.id),
        triggerSignalIds: triggerSignals.map((signal) => signal.id),
        conditions: [...perspective.conditions, "只用本年新作用形成年度观察入口；大运背景单独存在不生成每年的新关系事件。", "同字藏位与岁运明透属于两个时间层，不称原局藏干已经移出或必然应事。", "不同事实层重合只表示可一并对照，不是概率、更强吉凶或发生保证。"],
        sourceIds: unique([...perspective.sourceIds, "relationship-foundation-zq-counterconditions", "relationship-foundation-zq-combination-limits", "relationship-timing-zq-luck-objects", ...(perspective.id === "authority" ? ["relationship-timing-smt-female-luck"] : [])]) };
    });
    return { version: ANNUAL_RELATIONSHIP_TIMING_VERSION, sourceBinding: structuredClone(foundation.sourceBinding),
      scope: { year: year.year, yearGanZhi: year.yearGanZhi!, branchId: segment.branchId, segmentId: segment.id, targetRef: structuredClone(target), backgroundRefs: structuredClone(segment.judgment.backgroundRefs), startInstant: segment.startInstant, endExclusiveInstant: segment.endExclusiveInstant },
      triggered: lenses.some((lens) => lens.focus === "annual_focus"), coverage: foundation.sourceBinding.includeHour ? "selected_four_pillars" : "hour_excluded", lenses,
      conditions: [...foundation.conditions, "星透、同字藏转显与多线索窗口是本地候选组织规则，并非古籍直接断婚专条；不把事业、格局或扶抑方向转作关系好坏，也不据此断结婚离婚。", "性别未指明时两种传统视角并列；一个视角触发不替另一视角下结论。"],
      sourceIds: unique(lenses.flatMap((lens) => lens.sourceIds)),
      sourceVersions: [ANNUAL_RELATIONSHIP_TIMING_VERSION, foundation.version, NATAL_RELATIONSHIP_SOURCES_VERSION, ANNUAL_RELATIONSHIP_SIGNALS_VERSION, ANNUAL_RELATIONSHIP_TIMING_SOURCES_VERSION] };
  };
}
