import type { RevisionRecord } from "@hakimi/contracts";
import type { RelationFact } from "@hakimi/relations-core";
import type { BaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import {
  buildNatalRelationshipFoundation,
  type NatalRelationshipFoundation,
  type NatalRelationshipInteraction,
  type NatalRelationshipOccurrence,
} from "../../../../packages/bazi-interpretation/src/natal-relationship-foundation";
import { NATAL_RELATIONSHIP_SOURCES_VERSION } from "../../../../packages/bazi-interpretation/src/natal-relationship-sources";
import { strengthTenGodGroup } from "../../../../packages/bazi-interpretation/src/strength-policy";
import { ANNUAL_RELATIONSHIP_TIMING_VERSION, type AnnualRelationshipTiming } from "./annual-relationship-timing";

export const ANNUAL_RELATIONSHIP_NATAL_CONTEXT_VERSION = "hakimi.annual-relationship-natal-context/0.1.0" as const;

export type AnnualRelationshipNatalOccurrence = Pick<NatalRelationshipOccurrence,
  "id" | "position" | "ganZhi" | "stem" | "tenGod" | "visibility">;
export interface AnnualRelationshipNatalPresence {
  /** Visible takes precedence, while occurrences still retain every hidden position. */
  presence: "visible" | "hidden_only" | "absent";
  tenGods: string[];
  occurrences: AnnualRelationshipNatalOccurrence[];
}
export interface AnnualRelationshipNatalInteraction {
  id: string;
  factId: string;
  ruleId: string;
  relationType: "stem_five_combination" | "stem_clash" | "branch_six_combination" | "branch_six_clash";
  participants: RelationFact["participants"];
  starOccurrenceIds: string[];
}
export interface AnnualRelationshipNatalContext {
  version: typeof ANNUAL_RELATIONSHIP_NATAL_CONTEXT_VERSION;
  sourceBinding: NatalRelationshipFoundation["sourceBinding"];
  sourceVersions: string[];
  sourceIds: string[];
  dayPalace: {
    ganZhi: string; branch: string; mainStem: string; mainTenGod: string;
    roleGroup: "peer" | "resource" | "output" | "wealth" | "authority";
  };
  palaceInteractions: AnnualRelationshipNatalInteraction[];
  lenses: {
    id: "wealth" | "authority"; label: string; traditionalRole: string;
    primary: AnnualRelationshipNatalPresence;
    related: AnnualRelationshipNatalPresence;
    visibleStarInteractions: AnnualRelationshipNatalInteraction[];
  }[];
}
export type AnnualRelationshipNatalContextBuilder = (timing: AnnualRelationshipTiming) => AnnualRelationshipNatalContext;

const occurrence = ({ id, position, ganZhi, stem, tenGod, visibility }: NatalRelationshipOccurrence): AnnualRelationshipNatalOccurrence =>
  ({ id, position, ganZhi, stem, tenGod, visibility });
const presence = (tenGods: string[], items: NatalRelationshipOccurrence[]): AnnualRelationshipNatalPresence => {
  const selected = items.filter((item) => tenGods.includes(item.tenGod));
  return { presence: selected.some((item) => item.visibility === "visible") ? "visible" : selected.length ? "hidden_only" : "absent",
    tenGods: [...tenGods], occurrences: selected.map(occurrence) };
};
const interaction = (item: NatalRelationshipInteraction, allowedStars?: Set<string>): AnnualRelationshipNatalInteraction => {
  const { relationType } = item.fact;
  if (relationType !== "stem_five_combination" && relationType !== "stem_clash"
    && relationType !== "branch_six_combination" && relationType !== "branch_six_clash") throw new Error("年度关系本命上下文含未支持的二元关系。");
  return { id: item.id, factId: item.fact.id, ruleId: item.fact.ruleId, relationType,
    participants: structuredClone(item.fact.participants),
    starOccurrenceIds: item.starOccurrenceIds.filter((id) => !allowedStars || allowedStars.has(id)) };
};

/** Build natal facts once per revision. The caller supplies an already-derived
 * timing; this checks its natal binding, not the upstream annual calculation.
 * No timing verdict, root strength, life event or personality is inferred here. */
export function createAnnualRelationshipNatalContextBuilder(
  revision: RevisionRecord, assessment: BaziPreliminaryAssessment,
): AnnualRelationshipNatalContextBuilder {
  const foundation = buildNatalRelationshipFoundation(revision, assessment);
  const roleGroup = strengthTenGodGroup(foundation.dayPalace.mainTenGod);
  if (!roleGroup) throw new Error("年度关系本命日支本气角色不可识别。");
  const context: AnnualRelationshipNatalContext = {
    version: ANNUAL_RELATIONSHIP_NATAL_CONTEXT_VERSION,
    sourceBinding: structuredClone(foundation.sourceBinding),
    sourceVersions: [ANNUAL_RELATIONSHIP_NATAL_CONTEXT_VERSION, foundation.version, NATAL_RELATIONSHIP_SOURCES_VERSION, assessment.version, ANNUAL_RELATIONSHIP_TIMING_VERSION],
    sourceIds: foundation.sources.map((source) => source.id),
    dayPalace: { ganZhi: foundation.dayPalace.ganZhi, branch: foundation.dayPalace.branch,
      mainStem: foundation.dayPalace.mainStem, mainTenGod: foundation.dayPalace.mainTenGod, roleGroup },
    palaceInteractions: foundation.interactions.filter((item) => item.scope === "day_palace").map((item) => interaction(item)),
    lenses: foundation.perspectives.map((perspective) => {
      const visibleIds = new Set(perspective.occurrences.filter((item) => item.visibility === "visible").map((item) => item.id));
      return { id: perspective.id, label: perspective.label, traditionalRole: perspective.traditionalRole,
        primary: presence(perspective.primaryTenGods, perspective.occurrences),
        related: presence(perspective.relatedTenGods, perspective.occurrences),
        visibleStarInteractions: foundation.interactions.filter((item) => item.scope === "visible_star"
          && item.starOccurrenceIds.some((id) => visibleIds.has(id))).map((item) => interaction(item, visibleIds)) };
    }),
  };
  return (timing) => {
    const binding = timing.sourceBinding, expected = context.sourceBinding;
    if (timing.version !== ANNUAL_RELATIONSHIP_TIMING_VERSION
      || binding.revisionId !== expected.revisionId || binding.chartResultHash !== expected.chartResultHash
      || binding.includeHour !== expected.includeHour || binding.sex !== expected.sex
      || timing.coverage !== (expected.includeHour ? "selected_four_pillars" : "hour_excluded")
      || !timing.sourceVersions.includes(foundation.version) || !timing.sourceVersions.includes(NATAL_RELATIONSHIP_SOURCES_VERSION)) {
      throw new Error("年度关系时机与本命上下文来源不匹配。");
    }
    if (timing.lenses.length !== foundation.perspectives.length
      || timing.lenses.some((lens, index) => lens.id !== foundation.perspectives[index]?.id)) throw new Error("年度关系时机与本命观察视角不匹配。");
    for (const lens of timing.lenses) {
      const original = foundation.perspectives.find((item) => item.id === lens.id)!;
      const byId = new Map(original.occurrences.map((item) => [item.id, item]));
      for (const signal of lens.signals) {
        if (new Set(signal.natalOccurrenceIds).size !== signal.natalOccurrenceIds.length) throw new Error("年度关系时机重复引用本命星位置。");
        const selected = signal.natalOccurrenceIds.map((id) => {
          const item = byId.get(id);
          if (!item) throw new Error("年度关系时机引用了其他视角或未选本命星位置。");
          return item;
        });
        const positions = signal.kind === "palace_contact" ? ["day"] : [...new Set(selected.map((item) => item.position))];
        if (positions.length !== signal.natalPositions.length || positions.some((position, index) => position !== signal.natalPositions[index])) throw new Error("年度关系时机的本命星位置不一致。");
        if (signal.kind === "star_stem_contact" && (!selected.length || selected.some((item) => item.visibility !== "visible"))) throw new Error("年度关系时机不能把藏星当明透星作用。");
        if (signal.kind === "hidden_to_visible" && (!selected.length || selected.some((item) => item.visibility === "visible" || item.stem !== signal.stem)
          || original.occurrences.some((item) => item.stem === signal.stem && item.visibility === "visible"))) throw new Error("年度关系时机的同字藏显对应不一致。");
        if (signal.kind === "star_entry" && selected.some((item) => item.stem !== signal.stem || item.tenGod !== signal.tenGod)) throw new Error("年度关系时机的同字星位置不一致。");
      }
    }
    return structuredClone(context);
  };
}
