import type { ChartFacts } from "@hakimi/contracts";
import {
  BAZI_STRENGTH_BAND_LABELS,
  canonicalizeStrengthTenGod,
  classifyStrengthBand,
  strengthFactorDirectionForTenGod,
  strengthFactorWeight,
  strengthTenGodGroup,
  type StrengthBand,
  type StrengthFactorDirection,
  type TenGodGroup
} from "./strength-policy";

export type FiveElement = "wood" | "fire" | "earth" | "metal" | "water";
export type PillarPosition = keyof ChartFacts["pillars"];

export interface StrengthFactor {
  id: string;
  group: "month_command" | "visible_stem" | "hidden_stem";
  position: PillarPosition;
  label: string;
  tenGod: string;
  direction: StrengthFactorDirection;
  weight: number;
  detail: string;
  sourceRefIds: string[];
}

export interface StrengthAssessment {
  band: StrengthBand;
  label: string;
  dayMaster: { stem: string; element: FiveElement; elementLabel: string };
  supportWeight: number;
  demandWeight: number;
  supportRatio: number | null;
  directSummary: string;
  factors: StrengthFactor[];
  knownGaps: string[];
}

export type StrengthElementRelation =
  | "day_master_self"
  | "same_element"
  | "generates_day_master"
  | "generated_by_day_master"
  | "controlled_by_day_master"
  | "controls_day_master";

export const BAZI_STRENGTH_PILLAR_ORDER = Object.freeze([
  "year",
  "month",
  "day",
  "hour"
] as const);

export const BAZI_STRENGTH_POSITION_LABELS: Readonly<Record<PillarPosition, string>> = Object.freeze({
  year: "年柱",
  month: "月柱",
  day: "日柱",
  hour: "时柱"
});

const ELEMENT_BY_STEM: Readonly<Record<string, FiveElement>> = Object.freeze({
  甲: "wood", 乙: "wood",
  丙: "fire", 丁: "fire",
  戊: "earth", 己: "earth",
  庚: "metal", 辛: "metal",
  壬: "water", 癸: "water"
});

const ELEMENT_LABELS: Readonly<Record<FiveElement, string>> = Object.freeze({
  wood: "木",
  fire: "火",
  earth: "土",
  metal: "金",
  water: "水"
});

const GENERATED_ELEMENT: Readonly<Record<FiveElement, FiveElement>> = Object.freeze({
  wood: "fire",
  fire: "earth",
  earth: "metal",
  metal: "water",
  water: "wood"
});

const CONTROLLED_ELEMENT: Readonly<Record<FiveElement, FiveElement>> = Object.freeze({
  wood: "earth",
  fire: "metal",
  earth: "water",
  metal: "wood",
  water: "fire"
});

export function strengthElementForStem(stem: string): FiveElement {
  const element = ELEMENT_BY_STEM[stem];
  if (!element) throw new Error(`无法识别旺衰因素天干：${stem}`);
  return element;
}

export function strengthElementLabel(element: FiveElement): string {
  return ELEMENT_LABELS[element];
}

export function strengthElementRelation(
  dayMasterElement: FiveElement,
  factorElement: FiveElement,
  isDayMaster = false
): StrengthElementRelation {
  if (dayMasterElement === factorElement) return isDayMaster ? "day_master_self" : "same_element";
  if (GENERATED_ELEMENT[factorElement] === dayMasterElement) return "generates_day_master";
  if (GENERATED_ELEMENT[dayMasterElement] === factorElement) return "generated_by_day_master";
  if (CONTROLLED_ELEMENT[dayMasterElement] === factorElement) return "controlled_by_day_master";
  if (CONTROLLED_ELEMENT[factorElement] === dayMasterElement) return "controls_day_master";
  throw new Error(`无法识别五行关系：${dayMasterElement}/${factorElement}`);
}

export function expectedElementRelationForTenGodGroup(group: TenGodGroup): StrengthElementRelation {
  if (group === "peer") return "same_element";
  if (group === "resource") return "generates_day_master";
  if (group === "output") return "generated_by_day_master";
  if (group === "wealth") return "controlled_by_day_master";
  return "controls_day_master";
}

function factorDetail(tenGod: string, direction: StrengthFactorDirection): string {
  const group = strengthTenGodGroup(tenGod);
  if (direction === "support") {
    return group === "peer" ? "比劫与日主同类，计入支持侧。" : "印星生助日主，计入支持侧。";
  }
  if (group === "output") return "食伤由日主所生，计入泄身侧。";
  if (group === "wealth") return "财星由日主所克，计入耗身侧。";
  return "官杀克制日主，计入压力侧。";
}

function addFactor(
  factors: StrengthFactor[],
  input: Omit<StrengthFactor, "tenGod" | "direction" | "detail"> & { tenGod: string; detailPrefix?: string }
): void {
  const tenGod = canonicalizeStrengthTenGod(input.tenGod);
  const direction = strengthFactorDirectionForTenGod(tenGod);
  if (!direction) return;
  factors.push({
    id: input.id,
    group: input.group,
    position: input.position,
    label: input.label,
    tenGod,
    direction,
    weight: input.weight,
    detail: `${input.detailPrefix ?? ""}${factorDetail(tenGod, direction)}`,
    sourceRefIds: input.sourceRefIds
  });
}

export function collectBaziStrengthFactors(facts: ChartFacts, includeHour: boolean): StrengthFactor[] {
  const factors: StrengthFactor[] = [];
  const month = facts.pillars.month;
  const monthMainTenGod = month.branchTenGods[0];
  const monthMainStem = month.hiddenStems[0];
  if (monthMainTenGod && monthMainStem) {
    addFactor(factors, {
      id: `month-command:${month.branch}:${monthMainStem}`,
      group: "month_command",
      position: "month",
      label: `月令 ${month.branch} 主气 ${monthMainStem}`,
      tenGod: monthMainTenGod,
      weight: strengthFactorWeight("month_command"),
      detailPrefix: "月令主气在本候选规则中权重最高。",
      sourceRefIds: ["dtt-strength", "smt-position"]
    });
  }

  for (const position of BAZI_STRENGTH_PILLAR_ORDER) {
    if (position === "hour" && !includeHour) continue;
    const pillar = facts.pillars[position];
    if (position !== "day") {
      addFactor(factors, {
        id: `visible:${position}:${pillar.stem}`,
        group: "visible_stem",
        position,
        label: `${pillar.label}透干 ${pillar.stem}`,
        tenGod: pillar.stemTenGod,
        weight: strengthFactorWeight("visible_stem"),
        sourceRefIds: ["smt-ten-gods", "smt-position"]
      });
    }
    pillar.hiddenStems.forEach((stem, index) => {
      const tenGod = pillar.branchTenGods[index];
      if (!tenGod) return;
      addFactor(factors, {
        id: `hidden:${position}:${stem}:${index}`,
        group: "hidden_stem",
        position,
        label: `${pillar.label}${pillar.branch}藏${stem}${index === 0 ? "（主气）" : ""}`,
        tenGod,
        weight: strengthFactorWeight("hidden_stem", index),
        sourceRefIds: ["dtt-strength", "smt-ten-gods"]
      });
    });
  }
  return factors;
}

export function deriveBaziStrengthAssessment(facts: ChartFacts, includeHour: boolean): StrengthAssessment {
  const dayStem = facts.pillars.day.stem;
  const element = strengthElementForStem(dayStem);
  const factors = collectBaziStrengthFactors(facts, includeHour);
  const supportWeight = factors
    .filter((factor) => factor.direction === "support")
    .reduce((sum, factor) => sum + factor.weight, 0);
  const demandWeight = factors
    .filter((factor) => factor.direction === "demand")
    .reduce((sum, factor) => sum + factor.weight, 0);
  const band = classifyStrengthBand(supportWeight, demandWeight);
  const total = supportWeight + demandWeight;
  const supportRatio = total === 0 ? null : supportWeight / total;
  const comparison = band === "undetermined"
    ? "当前事实不足，不能形成旺衰候选"
    : supportWeight === demandWeight
      ? "支持与泄耗克暂时相当"
      : supportWeight > demandWeight
        ? `支持侧高出 ${supportWeight - demandWeight} 个规则权重`
        : `泄耗克侧高出 ${demandWeight - supportWeight} 个规则权重`;
  const knownGaps = [
    "尚未判断从格、专旺、化气与其他特殊格；命中特殊结构时本结果不能替代专家裁决。",
    "尚未把合化、刑冲引动、调候和大运流年纳入力度变化。",
    "0.1.0 权重与阈值是可审计的工程候选，仍待命理专家用边界案例逐项裁决。"
  ];
  if (!includeHour) knownGaps.push("时辰未知或仅有日期，时柱已从旺衰权重和位置解释中排除。");

  return {
    band,
    label: BAZI_STRENGTH_BAND_LABELS[band],
    dayMaster: { stem: dayStem, element, elementLabel: strengthElementLabel(element) },
    supportWeight,
    demandWeight,
    supportRatio,
    directSummary: `日主${dayStem}${strengthElementLabel(element)}${BAZI_STRENGTH_BAND_LABELS[band]}（候选）。支持侧 ${supportWeight}，泄耗克侧 ${demandWeight}；${comparison}。`,
    factors,
    knownGaps
  };
}
