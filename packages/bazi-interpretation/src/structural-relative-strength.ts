import { LunarUtil } from "lunar-typescript";
import { strengthElementForStem, strengthElementLabel, type FiveElement, type PillarPosition } from "./strength-assessment-core";
import { canonicalizeStrengthTenGod } from "./strength-policy";
import type { StructuralStrengthInputFacts } from "./structural-strength-assessment";

export const STRUCTURAL_RELATIVE_STRENGTH_VERSION = "hakimi.structural-relative-strength/0.1.0" as const;
export const STRUCTURAL_RELATIVE_SOURCE_IDS = ["structural-zq-relative-season-root", "structural-zq-root-quality-over-stem-count", "structural-smt-season-sequence"] as const;
/** These are local modelling parameters, not numbers supplied by a classical text. */
export const STRUCTURAL_RELATIVE_POLICY = Object.freeze({
  branchBudget: 1, mainShare: 0.7, rootedVisibleChannel: 0.25, rootlessVisibleChannel: 0.1, elementChannelCap: 0.5,
  seasonal: Object.freeze({ 旺: 1.4, 相: 1.15, 休: 1, 囚: 0.85, 死: 0.7, 未细分: 1 }),
  resourceTransfer: 0.65, largestLoad: 1, remainingLoads: 0.5, weakBelow: 0.4, strongAbove: 0.6
});
export interface StructuralRelativeRoot {
  id: string; position: PillarPosition; branch: string; stem: string; element: FiveElement;
  layer: "main" | "other"; kind: "main" | "other_yang_growth" | "other"; quantity: number;
}
export interface StructuralRelativeElement {
  element: FiveElement; rootQuantity: number; channelQuantity: number;
  seasonalState: keyof typeof STRUCTURAL_RELATIVE_POLICY.seasonal; seasonalMultiplier: number; effectiveQuantity: number;
}
export interface StructuralRelativeResult {
  version: typeof STRUCTURAL_RELATIVE_STRENGTH_VERSION;
  band: "weak" | "balanced" | "strong"; label: string; summary: string;
  roots: StructuralRelativeRoot[]; elements: StructuralRelativeElement[];
  supportQuantity: number; loadQuantity: number; supportShare: number;
  sensitivity: { id: "main_share_60" | "main_share_80" | "without_season"; band: "weak" | "balanced" | "strong"; supportShare: number }[];
  evidence: string[]; conditions: string[]; sourceIds: string[];
}
const ELEMENTS: FiveElement[] = ["wood", "fire", "earth", "metal", "water"];
const POSITIONS: PillarPosition[] = ["year", "month", "day", "hour"];
const SEASON: Readonly<Record<string, FiveElement>> = { 寅: "wood", 卯: "wood", 巳: "fire", 午: "fire", 申: "metal", 酉: "metal", 亥: "water", 子: "water" };
const YANG_GROWTH: Readonly<Record<string, string>> = { 甲: "亥", 丙: "寅", 庚: "巳", 壬: "申" };
const bandFor = (share: number): StructuralRelativeResult["band"] => share < STRUCTURAL_RELATIVE_POLICY.weakBelow ? "weak" : share > STRUCTURAL_RELATIVE_POLICY.strongAbove ? "strong" : "balanced";
const number = (value: number) => Number(value.toFixed(6));

function validate(facts: StructuralStrengthInputFacts, includeHour: boolean): PillarPosition[] {
  const selected = POSITIONS.filter((position) => includeHour || position !== "hour"), dayStem = facts.pillars.day?.stem;
  strengthElementForStem(dayStem);
  for (const position of selected) {
    const p = facts.pillars[position];
    if (!p || p.name !== position || LunarUtil.getJiaZiIndex(p.ganZhi) < 0 || p.ganZhi !== p.stem + p.branch) throw new Error("相对旺衰模型的所选柱身份无效。");
    const expected = (LunarUtil.ZHI_HIDE_GAN as Record<string, string[]>)[p.branch];
    if (!expected || p.hiddenStems.length !== expected.length || p.hiddenStems.some((stem, index) => stem !== expected[index])
      || p.branchTenGods.length !== expected.length || expected.some((stem, index) => canonicalizeStrengthTenGod(p.branchTenGods[index]!) !== canonicalizeStrengthTenGod((LunarUtil.SHI_SHEN as Record<string, string>)[dayStem + stem]!))
      || (position === "day" ? p.stemTenGod !== "日主" : canonicalizeStrengthTenGod(p.stemTenGod) !== canonicalizeStrengthTenGod((LunarUtil.SHI_SHEN as Record<string, string>)[dayStem + p.stem]!))) throw new Error("相对旺衰模型的透藏或十神事实无效。");
  }
  return selected;
}

/** Pure quantity proposal. The caller must retain the R3 eligibility gate;
 * computing this diagnostic on another chart does not authorize its adoption. */
export function evaluateStructuralRelativeStrength(input: { facts: StructuralStrengthInputFacts; includeHour: boolean }): StructuralRelativeResult {
  const { facts, includeHour } = input, selected = validate(facts, includeHour), dayElement = strengthElementForStem(facts.pillars.day.stem);
  const calculate = (mainShare: number, useSeason: boolean) => {
    const roots: StructuralRelativeRoot[] = selected.flatMap((position) => {
      const p = facts.pillars[position]!;
      return p.hiddenStems.map((stem, index) => ({ id: `${position}:${p.branch}:${stem}`, position, branch: p.branch, stem, element: strengthElementForStem(stem),
        layer: index === 0 ? "main" as const : "other" as const, kind: index === 0 ? "main" as const : YANG_GROWTH[stem] === p.branch ? "other_yang_growth" as const : "other" as const,
        quantity: STRUCTURAL_RELATIVE_POLICY.branchBudget * (p.hiddenStems.length === 1 ? 1 : index === 0 ? mainShare : (1 - mainShare) / (p.hiddenStems.length - 1)) }));
    });
    if (new Set(roots.map((root) => root.id)).size !== roots.length) throw new Error("相对旺衰根身份重复。");
    const seasonElement = SEASON[facts.pillars.month.branch], seasonIndex = seasonElement ? ELEMENTS.indexOf(seasonElement) : -1;
    const elements = ELEMENTS.map((element): StructuralRelativeElement => {
      const rootQuantity = roots.filter((root) => root.element === element).reduce((sum, root) => sum + root.quantity, 0);
      const visibleCount = selected.filter((position) => position !== "day" && strengthElementForStem(facts.pillars[position]!.stem) === element).length;
      const channelQuantity = Math.min(STRUCTURAL_RELATIVE_POLICY.elementChannelCap, visibleCount * (rootQuantity > 0 ? STRUCTURAL_RELATIVE_POLICY.rootedVisibleChannel : STRUCTURAL_RELATIVE_POLICY.rootlessVisibleChannel));
      const offset = (ELEMENTS.indexOf(element) - seasonIndex + 5) % 5;
      const seasonalState = !useSeason || seasonIndex < 0 ? "未细分" : (["旺", "相", "死", "囚", "休"] as const)[offset]!;
      const seasonalMultiplier = STRUCTURAL_RELATIVE_POLICY.seasonal[seasonalState];
      return { element, rootQuantity, channelQuantity, seasonalState, seasonalMultiplier, effectiveQuantity: (rootQuantity + channelQuantity) * seasonalMultiplier };
    });
    const dayIndex = ELEMENTS.indexOf(dayElement), value = (offset: number) => elements[(dayIndex + offset) % 5]!.effectiveQuantity;
    const supportQuantity = value(0) + STRUCTURAL_RELATIVE_POLICY.resourceTransfer * value(4), loads = [value(1), value(2), value(3)];
    const largest = Math.max(...loads), loadQuantity = STRUCTURAL_RELATIVE_POLICY.largestLoad * largest + STRUCTURAL_RELATIVE_POLICY.remainingLoads * (loads.reduce((sum, load) => sum + load, 0) - largest);
    const supportShare = supportQuantity / (supportQuantity + loadQuantity);
    return { roots, elements, supportQuantity, loadQuantity, supportShare, band: bandFor(supportShare) };
  };
  const result = calculate(STRUCTURAL_RELATIVE_POLICY.mainShare, true);
  const sensitivity = [
    { id: "main_share_60" as const, result: calculate(0.6, true) },
    { id: "main_share_80" as const, result: calculate(0.8, true) },
    { id: "without_season" as const, result: calculate(STRUCTURAL_RELATIVE_POLICY.mainShare, false) }
  ].map(({ id, result: row }) => ({ id, band: row.band, supportShare: row.supportShare }));
  const label = result.band === "balanced" ? "强弱相对均衡" : result.band === "strong" ? "相对偏强" : "相对偏弱";
  const own = result.elements.find((item) => item.element === dayElement)!;
  const summary = result.band === "balanced" ? `当前工作模型判为强弱相对均衡，${result.supportQuantity >= result.loadQuantity ? "支持侧略占上风" : "负荷侧略重"}；自身承接与泄耗克负荷同时保留。`
    : result.band === "strong" ? "当前工作模型判为相对偏强，日主自身根气与生扶侧占上风；这不直接指定全部泄耗克五行为喜。"
      : "当前工作模型判为相对偏弱，泄耗克负荷侧占上风；原有身根仍按事实保留，不由弱判抹去已经存在的根。";
  const evidence = [
    `相对旺衰模型 ${STRUCTURAL_RELATIVE_STRENGTH_VERSION}；仅在原R3准入后采用。参数 ${JSON.stringify(STRUCTURAL_RELATIVE_POLICY)}。`,
    ...result.roots.map((root) => `独立根 ${root.id}；${root.layer}/${root.kind}；根量 ${number(root.quantity)}。`),
    ...result.elements.map((item) => `${strengthElementLabel(item.element)}：去重根量 ${number(item.rootQuantity)}，透干通道 ${number(item.channelQuantity)}，季势 ${item.seasonalState}×${item.seasonalMultiplier}，有效量 ${number(item.effectiveQuantity)}。`),
    `支持量=自身+${STRUCTURAL_RELATIVE_POLICY.resourceTransfer}×印；负荷量=${STRUCTURAL_RELATIVE_POLICY.largestLoad}×max(食伤,财,官杀)+${STRUCTURAL_RELATIVE_POLICY.remainingLoads}×其余两项。支持 ${number(result.supportQuantity)}；负荷 ${number(result.loadQuantity)}；支持占比 ${number(result.supportShare)}（工程量级比，非概率）。<${STRUCTURAL_RELATIVE_POLICY.weakBelow}偏弱，>${STRUCTURAL_RELATIVE_POLICY.strongAbove}偏强，其间含边界为相对均衡。`,
    ...sensitivity.map((row) => `敏感性 ${row.id}：支持占比 ${number(row.supportShare)}；${row.band}；不代替本次固定参数主判断。`)
  ];
  const conditions = [
    "所有根量、通道、季系数、印的折算、负荷合并及阈值都是可修订的本地工作参数，不是古籍数值、物理量或预测准确率。",
    "main/other只按真实藏干主气与其余分层，是粗代理；甲亥、丙寅、庚巳、壬申的真实阳长生另记kind但本轮不另加权；不从阴干十二运创造无藏干根。",
    "同一柱的同一藏干只计一次；戊己可共享同一组土根作为角色依据，但不各复制整组根量。印根单列折算，不冒充日主自身根。",
    "辰戌丑未月本轮季系数一律为1，未把整个月当作土旺，也未计算节后分日司令。",
    "失令仍保留有根之字的正量；二元合冲不删除根、不直接扣除固定力量，相合是否化去、冲是否损根另按具体作用解释。",
    "仅已命中R3时采用这项相对强弱；R1、R2、R4和其他组合保留各自工作规则，不用这张通用数值表覆盖有来源的相反组合。",
    ...(sensitivity.some((row) => row.band !== result.band) ? ["所列参数扰动会改变相对分档；当前仍显示固定参数的试用主判断，反馈应同时保留这项敏感性。"] : []),
    ...(!includeHour ? ["此纯量级计算只对应已知三柱；当前应用层不借未知时柱补齐R3条件。"] : [])
  ];
  return { version: STRUCTURAL_RELATIVE_STRENGTH_VERSION, ...result, label, summary: `${summary}日主${strengthElementLabel(dayElement)}的季势记录为${own.seasonalState}，具体根与负荷分别列于依据。`, sensitivity, evidence, conditions, sourceIds: [...STRUCTURAL_RELATIVE_SOURCE_IDS] };
}
