import { LunarUtil } from "lunar-typescript";
import { calculatePillarRelations, type RelationFact } from "@hakimi/relations-core";
import { strengthElementForStem, type PillarPosition } from "./strength-assessment-core";
import { canonicalizeStrengthTenGod, strengthTenGodGroup } from "./strength-policy";
import type { StructuralStrengthInputFacts, StructuralStrengthRoot } from "./structural-strength-assessment";

export const NATAL_WEALTH_RESOURCE_TASK_VERSION = "hakimi.natal-wealth-resource-task/0.1.0" as const;
export interface NatalWealthResourceActor {
  position: PillarPosition; stem: string; tenGod: string; roots: StructuralStrengthRoot[];
}
export interface NatalWealthResourceIntervening {
  position: PillarPosition; stem: string; tenGod: string; isDayMaster: boolean;
}
export interface NatalWealthResourcePair {
  id: string; wealth: NatalWealthResourceActor; resource: NatalWealthResourceActor;
  intervening: NatalWealthResourceIntervening[]; separatedByPeers: boolean;
  hasCombination: boolean; relations: RelationFact[];
}
export type NatalWealthResourceTaskKind = "official_joint" | "resource_first" | "wealth_first" | "conditional" | "not_applicable";
export interface NatalWealthResourceTask {
  version: typeof NATAL_WEALTH_RESOURCE_TASK_VERSION; includeHour: boolean;
  monthCommand: { stem: string; branch: string; tenGod: string; family: "official" | "hurting" | "other" };
  applicable: boolean; pairs: NatalWealthResourcePair[];
  task: NatalWealthResourceTaskKind;
  preferredPathId: "official-resource" | "hurting-resource" | "hurting-wealth" | null;
  summary: string; conditions: string[]; evidence: string[]; sourceIds: string[];
}

const POSITIONS: PillarPosition[] = ["year", "month", "day", "hour"];
const LABEL = { year: "年干", month: "月干", day: "日干", hour: "时干" };
const SOURCE = {
  officialSeparated: "natal-zq-official-wealth-resource-separated",
  officialCombined: "natal-zq-official-wealth-resource-combined",
  wealthHeavy: "natal-zq-hurting-wealth-heavy",
  resourceHeavy: "natal-zq-hurting-resource-heavy"
} as const;
const unique = <T>(items: readonly T[]): T[] => [...new Set(items)];
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const fail = (message: string): never => { throw new Error(`本命财印任务：${message}`); };
const name = (actor: { position: PillarPosition; stem: string; tenGod: string }) => `${LABEL[actor.position]}${actor.stem}（${actor.tenGod}）`;
const rootText = (root: StructuralStrengthRoot) => `${root.position}:${root.branch}中${root.stem}${root.layer === "main" ? "本气" : "其余藏气"}`;

/** A natal-only projection. No calendar, score, strength band or future stem is
 * synthesized here. The caller binds these selected facts to its revision. */
export function evaluateNatalWealthResourceTask({ facts, includeHour }: {
  facts: StructuralStrengthInputFacts; includeHour: boolean;
}): NatalWealthResourceTask {
  const selected = POSITIONS.filter((position) => includeHour || position !== "hour");
  const dayStem = facts?.pillars?.day?.stem;
  strengthElementForStem(dayStem);
  // Validate only selected pillars: an unknown hour never supplies a partner,
  // a root or an intervening stem, even if a stored placeholder is present.
  for (const position of selected) {
    const pillar = facts.pillars[position];
    if (!pillar || pillar.name !== position || LunarUtil.getJiaZiIndex(pillar.ganZhi) < 0
      || pillar.ganZhi !== pillar.stem + pillar.branch) return fail(`${position}柱身份不一致。`);
    const hidden = (LunarUtil.ZHI_HIDE_GAN as Record<string, string[]>)[pillar.branch];
    const expectedGod = (stem: string) => canonicalizeStrengthTenGod((LunarUtil.SHI_SHEN as Record<string, string>)[dayStem + stem]!);
    if (!hidden || !same(pillar.hiddenStems, hidden) || !same(pillar.branchTenGods.map(canonicalizeStrengthTenGod), hidden.map(expectedGod))
      || (position === "day" ? pillar.stemTenGod !== "日主" : canonicalizeStrengthTenGod(pillar.stemTenGod) !== expectedGod(pillar.stem))) {
      return fail(`${position}柱透藏或十神不一致。`);
    }
  }
  const month = facts.pillars.month, monthGod = canonicalizeStrengthTenGod(month.branchTenGods[0]!);
  const monthCommand: NatalWealthResourceTask["monthCommand"] = { stem: month.hiddenStems[0]!, branch: month.branch, tenGod: monthGod,
    family: monthGod === "正官" ? "official" : monthGod === "伤官" ? "hurting" : "other" };
  const rootsFor = (stem: string): StructuralStrengthRoot[] => selected.flatMap((position) => {
    const p = facts.pillars[position]!;
    return p.hiddenStems.flatMap((hidden, index) => strengthElementForStem(hidden) === strengthElementForStem(stem)
      ? [{ position, branch: p.branch, stem: hidden, layer: index === 0 ? "main" as const : "other" as const, sameStem: hidden === stem }] : []);
  });
  const visible = selected.filter((position) => position !== "day").map((position): NatalWealthResourceActor => {
    const p = facts.pillars[position]!;
    return { position, stem: p.stem, tenGod: canonicalizeStrengthTenGod(p.stemTenGod), roots: rootsFor(p.stem) };
  });
  const wealth = visible.filter((actor) => strengthTenGodGroup(actor.tenGod) === "wealth");
  const resource = visible.filter((actor) => strengthTenGodGroup(actor.tenGod) === "resource");
  const conditions = [
    "本条只处理所选本命正官月令或伤官月令的实际财印对象；不改变原计权、结构旺衰分档或调候用字。",
    "相隔不碍只在财印之间至少一干、且中间全部为日主或比劫的本地限定下保留；不推广为所有远干不合克，也不把岁运来干排成第五柱。",
    "财印与日主的根分别记录；本气及同五行根只作本地准入证据，不是古籍根数公式，不宣告财印已制化成功。",
    "原二元合冲事实完整保留；隔护不删除五合，不判合化、合去，也不由财印同透承诺人生结果。",
    ...(!includeHour ? ["未知时辰只读已知三柱；时柱中的财、印、根和隔干不参与本条。"] : [])
  ];
  const base = { version: NATAL_WEALTH_RESOURCE_TASK_VERSION, includeHour, monthCommand, conditions };
  if (monthCommand.family === "other" || !wealth.length || !resource.length) {
    return { ...base, applicable: false, pairs: [], task: "not_applicable", preferredPathId: null,
      summary: monthCommand.family === "other" ? "当前月令不属于本条官格或伤官财印分用范围。" : "所选柱未同时明透财与印，未补造财印并用任务。",
      evidence: [`月令${month.branch}主气${monthCommand.stem}${monthGod}；实际透财${wealth.length}处、透印${resource.length}处。`], sourceIds: [] };
  }
  const relationFacts = calculatePillarRelations({ year: facts.pillars.year.ganZhi, month: month.ganZhi,
    day: facts.pillars.day.ganZhi, hour: includeHour ? facts.pillars.hour!.ganZhi : facts.pillars.day.ganZhi }).facts
    .filter((fact) => fact.completeness === "binary" && fact.participants.every((participant) => selected.includes(participant.position)));
  const pairs = wealth.flatMap((w) => resource.map((r): NatalWealthResourcePair => {
    const from = Math.min(POSITIONS.indexOf(w.position), POSITIONS.indexOf(r.position)), to = Math.max(POSITIONS.indexOf(w.position), POSITIONS.indexOf(r.position));
    const intervening = POSITIONS.slice(from + 1, to).filter((position) => selected.includes(position)).map((position): NatalWealthResourceIntervening => {
      const p = facts.pillars[position]!;
      return { position, stem: p.stem, tenGod: position === "day" ? "日主" : canonicalizeStrengthTenGod(p.stemTenGod), isDayMaster: position === "day" };
    });
    const relations = relationFacts.filter((fact) => ["stem_five_combination", "stem_clash"].includes(fact.relationType)
      && fact.participants.length === 2 && fact.participants.every((part) => part.component === "stem")
      && fact.participants.some((part) => part.position === w.position && part.value === w.stem)
      && fact.participants.some((part) => part.position === r.position && part.value === r.stem));
    return { id: `${w.position}:${w.stem}-${r.position}:${r.stem}`, wealth: structuredClone(w), resource: structuredClone(r), intervening,
      separatedByPeers: intervening.length > 0 && intervening.every((actor) => actor.isDayMaster || strengthTenGodGroup(actor.tenGod) === "peer"),
      hasCombination: relations.some((fact) => fact.relationType === "stem_five_combination"), relations: structuredClone(relations) };
  }));
  const pair = pairs.length === 1 ? pairs[0]! : null, ownRoots = rootsFor(dayStem);
  let task: NatalWealthResourceTaskKind = "conditional", preferredPathId: NatalWealthResourceTask["preferredPathId"] = null;
  let summary = "财印均已明透，当前保留两者的实际支持、投入与牵制，不仅凭同见便选定单一主次。";
  if (pair?.separatedByPeers && wealth.length === 1 && resource.length === 1) {
    const separator = pair.intervening.map(name).join("、");
    if (monthCommand.family === "official") {
      task = "official_joint"; preferredPathId = "official-resource";
      summary = `正官月令中，${name(pair.wealth)}与${name(pair.resource)}由${separator}相隔，财辅官与印支持可分工阅读；不将这对财印直接判作财坏印。`;
    } else if (pair.wealth.roots.length > 0 && pair.resource.roots.length === 0 && ownRoots.length === 0) {
      task = "resource_first"; preferredPathId = "hurting-resource";
      summary = `伤官月令中，${name(pair.wealth)}有同五行根，${name(pair.resource)}与日主在所选支内均未见各自同类根；当前先保留${pair.resource.stem}印支持与调节的任务。财印由${separator}相隔，不据远干五合一概判为已受牵制。`;
    } else if (pair.resource.roots.some((root) => root.layer === "main") && pair.wealth.roots.length === 0 && ownRoots.some((root) => root.layer === "main")) {
      task = "wealth_first"; preferredPathId = "hurting-wealth";
      summary = `伤官月令中，${name(pair.resource)}有本气根，日主另有同类本气根，而${name(pair.wealth)}未见同五行根；当前以${pair.wealth.stem}财调节印的投入为优先任务。财印由${separator}相隔，未把财缺根解释为已经裁印成功。`;
    }
  }
  if (task === "conditional") {
    conditions.push(wealth.length !== 1 || resource.length !== 1 ? "不止一组透财透印，须逐对分读；本条不从多组中挑一对充当全盘结论。"
      : !pair?.separatedByPeers ? "当前财印未满足限定隔护条件；相邻或中间另有食伤财官印时，不能借其他命例直接称两不相碍。"
        : "财、印与日主根的组合未满足本条相反任务的保守准入；不据此反推另一任务或强弱方向。" );
  }
  const sourceIds = monthCommand.family === "official"
    ? unique([SOURCE.officialSeparated, ...(pairs.some((p) => p.hasCombination && !p.separatedByPeers) ? [SOURCE.officialCombined] : [])])
    : task === "resource_first" ? [SOURCE.wealthHeavy] : task === "wealth_first" ? [SOURCE.resourceHeavy] : [SOURCE.wealthHeavy, SOURCE.resourceHeavy];
  const evidence = [`任务模型 ${NATAL_WEALTH_RESOURCE_TASK_VERSION}；月令${month.branch}主气${monthCommand.stem}${monthGod}。`,
    "准入按真实角色与位置判断：仅一透财、一透印且有日主/比劫隔护时选任务；伤官的有根/无根与本气根组合是本地保守谓词，不是原文数量阈值。",
    ...pairs.flatMap((p) => [
      `${name(p.wealth)}；同五行根：${p.wealth.roots.map(rootText).join("、") || "所选支内未见"}。`,
      `${name(p.resource)}；同五行根：${p.resource.roots.map(rootText).join("、") || "所选支内未见"}。`,
      `实际中间干：${p.intervening.map(name).join("、") || "无，双方相邻"}；限定隔护${p.separatedByPeers ? "成立" : "未成立"}。`,
      ...p.relations.map((fact) => `原关系 ${fact.id}；${fact.ruleId}；${fact.relationType}；保留事实，不据此删除对象。`)]),
    `日主自身同类根：${ownRoots.map(rootText).join("、") || "所选支内未见"}。`];
  return { ...base, applicable: true, pairs, task, preferredPathId, summary, conditions: unique(conditions), evidence: unique(evidence), sourceIds };
}
