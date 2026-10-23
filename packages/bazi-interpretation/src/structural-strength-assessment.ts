import { revisionRecordSchema, type ChartFacts, type PillarFact, type RevisionRecord } from "@hakimi/contracts";
import { LunarUtil } from "lunar-typescript";
import { calculatePillarRelations, type RelationFact } from "@hakimi/relations-core";
import { deriveBaziStrengthAssessment, strengthElementForStem, strengthElementRelation,
  type FiveElement, type PillarPosition, type StrengthAssessment } from "./strength-assessment-core";
import { BAZI_STRENGTH_POLICY, canonicalizeStrengthTenGod, strengthTenGodGroup, type StrengthBand, type TenGodGroup } from "./strength-policy";
import type { PreliminarySource } from "./preliminary-assessment-sources";
import { evaluateStructuralRelativeStrength } from "./structural-relative-strength";

export const STRUCTURAL_STRENGTH_ASSESSMENT_VERSION = "hakimi.structural-strength-assessment/0.4.0" as const;
export type WorkingBalanceDirection = "support" | "drain" | "balanced" | "conditional";
export type StructuralStrengthFocus = "wealth_after_output" | "output_after_resource" | "wealth_moderates_resource" | "rooted_peer_mixed_authority" | "raw_support" | "raw_drain" | "raw_balanced";
export interface StructuralStrengthRoot {
  position: PillarPosition; branch: string; stem: string; layer: "main" | "other"; sameStem: boolean;
}
export interface StructuralStrengthActor {
  position: PillarPosition; stem: string; tenGod: string; group: TenGodGroup; roots: StructuralStrengthRoot[];
}
export interface StructuralStrengthFinding {
  ruleId: string; status: "matched" | "blocked" | "not_applicable";
  satisfiedConditions: string[]; blockers: string[]; unresolvedConditions: string[]; evidence: string[]; sourceIds: string[];
}
export interface StructuralWorkingBalance {
  version: typeof STRUCTURAL_STRENGTH_ASSESSMENT_VERSION;
  selection: "structural_rule" | "raw_fallback"; ruleId: string; band: StrengthBand; label: string; direction: WorkingBalanceDirection;
  favorableElements: FiveElement[]; unfavorableElements: FiveElement[]; conditionalElements: FiveElement[];
  summary: string; focus: StructuralStrengthFocus; evidence: string[]; conditions: string[]; sourceIds: string[];
}
export interface StructuralStrengthFacts {
  monthCommand: { branch: string; mainStem: string; tenGod: string; group: TenGodGroup };
  dayMaster: { stem: string; element: FiveElement };
  dayMasterRoots: StructuralStrengthRoot[];
  peerStems: StructuralStrengthActor[]; resourceStems: StructuralStrengthActor[]; demandStems: StructuralStrengthActor[];
  interactions: RelationFact[];
}
export type StructuralStrengthInputFacts = { pillars: Pick<ChartFacts["pillars"], "year" | "month" | "day"> & { hour?: PillarFact } };
export interface StructuralStrengthEvaluation {
  version: typeof STRUCTURAL_STRENGTH_ASSESSMENT_VERSION;
  includeHour: boolean; rawPolicyVersion: string; raw: StrengthAssessment;
  inputFacts: StructuralStrengthInputFacts; facts: StructuralStrengthFacts; findings: StructuralStrengthFinding[];
  working: StructuralWorkingBalance; disagreesWithRaw: boolean; limitations: string[];
}
export interface StructuralStrengthAssessment extends StructuralStrengthEvaluation {
  sourceBinding: { revisionId: string; chartResultHash: string; includeHour: boolean };
}
export interface StructuralStrengthInput { facts: StructuralStrengthInputFacts; includeHour: boolean; raw: StrengthAssessment }
export interface StructuralStrengthBuildInput { revision: RevisionRecord; raw: StrengthAssessment }
export interface StructuralBalanceCarrier {
  balance: { structural: StructuralStrengthAssessment };
  sourceBinding?: { revisionId: string; chartResultHash: string; includeHour: boolean };
}

export const STRUCTURAL_STRENGTH_SOURCES: readonly PreliminarySource[] = [
  { id: "structural-zq-relative-season-root", title: "《子平真诠》·论十干得时不旺失时不弱（季令与全局）",
    url: "https://upload.wikimedia.org/wikipedia/commons/f/fe/NLC416-11jh010455-35296_%E5%AD%90%E5%B9%B3%E7%9C%9F%E8%A9%AE.pdf#page=22",
    locator: "NLC35296，世界图书馆本；PDF22（1-based），书十三，得时不旺、失时不弱的相反组合；沈氏正文，非徐注。", excerpt: "年月日時亦有損益之權",
    interpretation: "季令是重要支点，但年日时的根与其他力量可以改变整体相对强弱；当令不能一票判强，失令也不能使有根之字归零。本地R3相对模型据此分列季令、根质、透干与财官杀负荷，具体权重及宽中和阈值是可修订工程假设，不是古籍公式或准确率。本轮只在已核R3准入后应用，不覆盖既有R1、R2、R4，也不由模型的中和标签推定所有火土或金水为喜。" },
  { id: "structural-zq-root-quality-over-stem-count", title: "《子平真诠》·论十干得时不旺失时不弱（根质与透干）",
    url: "https://upload.wikimedia.org/wikipedia/commons/f/fe/NLC416-11jh010455-35296_%E5%AD%90%E5%B9%B3%E7%9C%9F%E8%A9%AE.pdf#page=23",
    locator: "NLC35296，世界图书馆本；PDF22—23（1-based），书十三—十四，根轻重、比肩与通根对照及夏水冬火反例；沈氏正文，非徐注。", excerpt: "干多不如根重",
    interpretation: "根的层次与透干数量应分开：同类浮干、余气墓库根、较强根不能机械等价，失令的有根火水也不能直接忽略。本地按柱位、地支、实际藏干去重共享根，再将透干作为作用通道；这是一种实现选择，不是原文给出的数值算法。现main/other仍是粗代理，甲亥、丙寅、庚巳、壬申等真实阳长生可记录根类但本轮不另加权；不凭阴干十二运造无藏干实根，不把印根当作日主自身根，不因二元合冲删除根。" },
  { id: "structural-smt-season-sequence", title: "《三命通会·论五行旺相休囚死并寄生十二宫》",
    url: "https://www.shidianguji.com/zh/book/SK1610/chapter/1kf5v6ol1tqg5", locator: "该篇首段春、夏、六月、秋、冬之序；季令五行关系",
    excerpt: "冬水旺，水生木則木相，金生水則金休，土尅水則土囚，水尅火則火死",
    interpretation: "只提供季令关系排序；1.4、1.15、1、0.85、0.7是本地工作系数，死不等于该字或根不存在。原段六月土旺不推为四库月整月土旺，因此本轮辰戌丑未采用中性季系数，并保留未细分节后司令的条件。" },
  { id: "structural-zq-resource-wealth", title: "《子平真诠》·论印（正文，印多用财与相反条件）",
    url: "https://upload.wikimedia.org/wikipedia/commons/f/fe/NLC416-11jh010455-35296_%E5%AD%90%E5%B9%B3%E7%9C%9F%E8%A9%AE.pdf#page=74",
    locator: "NLC35296，PDF74（1-based），书六十五；有印多而用财者段及紧接印轻财重段；沈氏正文，非徐注。辅助转录 https://www.tianyashuku.com/yijing/9643/814136.html",
    excerpt: "印重身強，透財以抑太過",
    interpretation: "沈氏正文在印重身强前提下，以透财约束过多的印；同页另列印轻财重无劫救的相反分支。R4的印月令、月令外自身本气根、两个不同位置的印透根、恰一财透根、无透食伤官杀，是本地保守联合谓词，不是原书给出的计数阈值。身根与印根分读；财印相合或受克不自动判化去、失效或删根。该特定财字的任务不等于该五行全部用法或后续所有财运均吉。" },
  { id: "structural-zq-food-rooted", title: "《子平真诠》·论食神（正文，梁丞相例）",
    url: "https://upload.wikimedia.org/wikipedia/commons/f/fe/NLC416-11jh010455-35296_%E5%AD%90%E5%B9%B3%E7%9C%9F%E8%A9%AE.pdf#page=76",
    locator: "世界图书馆本，NLC35296；PDF76（1-based），书内六七，论食神首段；沈氏正文", excerpt: "如身強食旺而財透",
    interpretation: "正文以丁未、癸卯、癸亥、癸丑说明身强食旺财透。用于区分有根承接与单纯数量；本地食神令、日支本气根、另根、透比连根、财透根及冲突排除是保守建模条件，不是原书给出的量化阈值。此处财是食神产出的承接角色，不等于该五行在所有用法下恒吉。" },
  { id: "structural-zq-resource-rooted", title: "《子平真诠》·论印（正文，李状元例）",
    url: "https://upload.wikimedia.org/wikipedia/commons/f/fe/NLC416-11jh010455-35296_%E5%AD%90%E5%B9%B3%E7%9C%9F%E8%A9%AE.pdf#page=73",
    locator: "世界图书馆本，NLC35296；PDF73（1-based），书内六四，戊戌、乙卯、丙午、乙亥例；沈氏正文", excerpt: "身強印旺，恐其太過，洩身以爲秀氣。",
    interpretation: "正文是在身强印旺的具体前提下用食伤泄身；不把印旺直接等同身旺，不将仅有印根替作日主自身本气根。本地联合谓词只给输出角色的条件性取向，不扩为财官一律有利或该五行永久喜用。" },
  { id: "structural-xu-food-overdrain", title: "《子平真诠评注》·论食神取运（徐乐吾评注，沈路分例）", url: "https://luckclub.cn/bazi/002/040/",
    locator: "徐注：至于身轻食旺者，如本篇沈路分造；丁亥、癸卯、癸卯、甲寅段。另核公开排印转录PDF127；四柱在NLC35296正文PDF76", excerpt: "癸水虽通根于亥",
    interpretation: "徐注接着判为身轻泄气太重。此例有亥根和癸比肩，但日支卯、时柱甲寅的泄身负荷不同，不能由任意位置有根加比肩自动改强。亥卯合的存在也不等于可以无条件删除亥根。强弱评价属于徐注，不是人物经历证明。" },
  { id: "structural-xu-heavy-print", title: "《子平真诠评注》·论食神取运（徐乐吾评注，常国公例）", url: "https://luckclub.cn/bazi/002/040/",
    locator: "徐注：食用煞印者，弃月令食神而用煞印也；辛卯、辛卯、癸酉、己未例。另核公开排印转录PDF128；四柱在NLC35296正文PDF76", excerpt: "弃食用煞印也。印旺而身不强",
    interpretation: "两辛透、酉为印根，徐注仍不把印旺视为日主强。该例是卯月食令转用煞印，不是印令，因此只约束印与日主承接必须分开，不能谎称它验证了所有印令联合条件。" },
  { id: "structural-xu-residual-roots", title: "《子平真诠评注》·论食神（徐乐吾评注，胡会元例）", url: "https://luckclub.cn/bazi/002/039/",
    locator: "徐注：胡会元造，戊戌、壬戌、丙子、戊戌。另核公开排印转录PDF125；四柱在NLC35296正文PDF76", excerpt: "日元虽通根于戌，不得为旺，戊土重重",
    interpretation: "多处丁火余根没有使徐注直接判旺，须结合戊土泄身负荷；余根数不能替代根的层次和作用。此例有根，不能归作无同类藏根，也不能推广成所有戌根无效。" },
  { id: "structural-zq-lu-role-selection", title: "《子平真诠》·论建禄月劫（正文，另取财官杀食）",
    url: "https://upload.wikimedia.org/wikipedia/commons/f/fe/NLC416-11jh010455-35296_%E5%AD%90%E5%B9%B3%E7%9C%9F%E8%A9%AE.pdf#page=89",
    locator: "世界图书馆本 NLC35296；PDF89（1-based），书内八十，《论建禄月劫》开篇；沈氏正文。网页对照 https://www.tianyashuku.com/yijing/9643/814146.html", excerpt: "別取財官煞食爲用。",
    interpretation: "建禄、月劫不能仅凭月令自身定全部喜忌，要另看透干及地支配合中的财官杀食。本地R3只把月令比劫本气、另支同类本气根及有根财官杀透出作为可复核的联合事实，输出得令有根、财官杀并见；这组谓词是本地建模，不是原典规定的数量阈值，不据此判全局身强、中和或土火一律为喜用。" },
  { id: "structural-zq-lu-load-balance", title: "《子平真诠》·论建禄月劫取运（正文，财食轻重分取）",
    url: "https://upload.wikimedia.org/wikipedia/commons/f/fe/NLC416-11jh010455-35296_%E5%AD%90%E5%B9%B3%E7%9C%9F%E8%A9%AE.pdf#page=92",
    locator: "世界图书馆本 NLC35296；PDF92（1-based），书内八十三，起‘禄劫用财而带伤食’段；沈氏正文。网页对照 https://www.tianyashuku.com/yijing/9643/814147.html", excerpt: "財食重則喜印綬，而不忌比肩；財食輕則宜助財，而不喜印比。",
    interpretation: "同为禄劫，取向仍随所成路径及财食轻重变化，得令不等于全局必旺，也不能用一个计数结论替所有作用排序。本段直接适用于禄劫用财且带伤食，不能谎称它已直接裁决无透食伤的财官杀组合；R3仅借此保留根气与负荷分别判断，不推导固定五行喜忌或改动原计权审计值。" },
  { id: "structural-zq-clash-remaining", title: "《子平真诠》·论刑冲会合解法（正文，月令逢冲仍可保留）",
    url: "https://upload.wikimedia.org/wikipedia/commons/f/fe/NLC416-11jh010455-35296_%E5%AD%90%E5%B9%B3%E7%9C%9F%E8%A9%AE.pdf#page=25",
    locator: "世界图书馆本 NLC35296；PDF25（1-based），书内十六，甲生酉月、卯日冲之、时逢子位例；沈氏正文。网页对照 https://www.tianyashuku.com/yijing/9643/814108.html", excerpt: "月官猶在，其格不破。",
    interpretation: "原段在另位刑冲牵制的具体配置中说明月令之冲无力，月官仍在。因此相冲关系不应直接等同删除地支或全部藏根；应先保留根与冲的事实，再另判作用。本段不是说所有冲都无害，更未直接裁定子午冲、巳亥冲的胜负或实际折减；R3保留这些牵制，不用有冲便删根的布尔规则制造无根结论。" }
];

const POSITIONS: PillarPosition[] = ["year", "month", "day", "hour"];
const LABEL = { year: "年柱", month: "月柱", day: "日柱", hour: "时柱" };
const ELEMENTS: FiveElement[] = ["wood", "fire", "earth", "metal", "water"];
const unique = <T>(values: readonly T[]) => [...new Set(values)];
const stable = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const same = (left: unknown, right: unknown) => stable(left) === stable(right);
const fail = (message: string): never => { throw new Error(`结构旺衰：${message}`); };
const rootText = (root: StructuralStrengthRoot) => `${LABEL[root.position]}${root.branch}中${root.stem}${root.layer === "main" ? "本气" : "余气"}`;
const actorText = (actor: StructuralStrengthActor) => `${LABEL[actor.position]}透${actor.stem}${actor.tenGod}${actor.roots.length ? `，同五行根见${actor.roots.map(rootText).join("、")}` : "，所选地支未见同五行根"}`;
const rawDirection = (band: StrengthBand): Exclude<WorkingBalanceDirection, "conditional"> => band === "weak" || band === "very_weak" ? "support"
  : band === "strong" || band === "very_strong" ? "drain" : "balanced";

function selectedFacts(facts: StructuralStrengthInputFacts, includeHour: boolean): StructuralStrengthInputFacts {
  if (!facts?.pillars?.day) return fail("缺少日主事实。");
  const dayStem = facts.pillars.day.stem;
  strengthElementForStem(dayStem);
  const selected = POSITIONS.filter((position) => includeHour || position !== "hour");
  const pillars = Object.fromEntries(selected.map((position) => {
    const pillar = facts.pillars[position];
    if (!pillar || LunarUtil.getJiaZiIndex(pillar.ganZhi) < 0 || pillar.stem !== pillar.ganZhi[0] || pillar.branch !== pillar.ganZhi[1]
      || pillar.name !== position) return fail(`${LABEL[position]}干支或位置不一致。`);
    const hidden = (LunarUtil.ZHI_HIDE_GAN as Record<string, string[]>)[pillar.branch]!;
    const gods = hidden.map((stem) => canonicalizeStrengthTenGod((LunarUtil.SHI_SHEN as Record<string, string>)[dayStem + stem]!));
    if (!same(pillar.hiddenStems, hidden) || !same(pillar.branchTenGods.map(canonicalizeStrengthTenGod), gods)
      || (position !== "day" && canonicalizeStrengthTenGod(pillar.stemTenGod) !== canonicalizeStrengthTenGod((LunarUtil.SHI_SHEN as Record<string, string>)[dayStem + pillar.stem]!))) return fail(`${LABEL[position]}透藏或十神与日主不一致。`);
    return [position, structuredClone(pillar)];
  })) as StructuralStrengthInputFacts["pillars"];
  return { pillars };
}

function project(facts: StructuralStrengthInputFacts, includeHour: boolean): StructuralStrengthFacts {
  const positions = POSITIONS.filter((position) => includeHour || position !== "hour"), dayStem = facts.pillars.day.stem;
  const rootsFor = (stem: string): StructuralStrengthRoot[] => positions.flatMap((position) => {
    const pillar = facts.pillars[position]!;
    return pillar.hiddenStems.flatMap((hidden, index) => strengthElementForStem(hidden) === strengthElementForStem(stem)
      ? [{ position, branch: pillar.branch, stem: hidden, layer: index === 0 ? "main" as const : "other" as const, sameStem: hidden === stem }] : []);
  });
  const visible = positions.filter((position) => position !== "day").map((position): StructuralStrengthActor => {
    const pillar = facts.pillars[position]!, tenGod = canonicalizeStrengthTenGod(pillar.stemTenGod), group = strengthTenGodGroup(tenGod);
    if (!group) return fail("无法识别实际透干十神。");
    return { position, stem: pillar.stem, tenGod, group, roots: rootsFor(pillar.stem) };
  });
  const month = facts.pillars.month, monthGod = canonicalizeStrengthTenGod(month.branchTenGods[0]!), monthGroup = strengthTenGodGroup(monthGod);
  if (!monthGroup) return fail("无法识别月令主气。");
  const interactions = calculatePillarRelations({ year: facts.pillars.year.ganZhi, month: month.ganZhi, day: facts.pillars.day.ganZhi,
    hour: includeHour ? facts.pillars.hour!.ganZhi : facts.pillars.day.ganZhi }).facts.filter((fact) => fact.participants.every((participant) => positions.includes(participant.position)));
  return { monthCommand: { branch: month.branch, mainStem: month.hiddenStems[0]!, tenGod: monthGod, group: monthGroup },
    dayMaster: { stem: dayStem, element: strengthElementForStem(dayStem) }, dayMasterRoots: rootsFor(dayStem),
    peerStems: visible.filter((actor) => actor.group === "peer"), resourceStems: visible.filter((actor) => actor.group === "resource"),
    demandStems: visible.filter((actor) => actor.group !== "peer" && actor.group !== "resource"), interactions };
}

/** Rules are joint local predicates abstracted from the cited cases. Counts
 * here describe required distinct positions, never add a strength score. */
export function evaluateStructuralStrength({ facts: suppliedFacts, includeHour, raw: suppliedRaw }: StructuralStrengthInput): StructuralStrengthEvaluation {
  const inputFacts = selectedFacts(suppliedFacts, includeHour);
  // The frozen factor function consumes only pillars; no birth/calendar data is
  // invented for a classical four-pillar assertion supplied to this pure API.
  const raw = deriveBaziStrengthAssessment(inputFacts as ChartFacts, includeHour);
  if (!same(raw, suppliedRaw)) return fail("原计权结果与同盘、同一时柱范围不一致。");
  const facts = project(inputFacts, includeHour), roots = facts.dayMasterRoots;
  const dayMainRoot = roots.find((root) => root.position === "day" && root.layer === "main");
  const otherRoot = roots.some((root) => root.position !== "day");
  const rootedPeers = facts.peerStems.filter((actor) => actor.roots.length > 0);
  const rootedPrints = facts.resourceStems.filter((actor) => actor.roots.length > 0);
  const wealth = facts.demandStems.filter((actor) => actor.group === "wealth"), output = facts.demandStems.filter((actor) => actor.group === "output"), authority = facts.demandStems.filter((actor) => actor.group === "authority");
  const conditions = ["结构规则为本地联合谓词，不是古籍规定的数值阈值，也不把根数、透干数相加为分数。",
    "日主自身同类根与印星的根分别保留；印多、印有根不直接等于日主强。",
    "原局合冲与三合、三会线索单列，未裁决合化或去根时不删除任何根；有根也不等于已足量有效。",
    ...(!includeHour ? ["当前仅用已知三柱；未知时柱未加入透根或冲合判断，工作方向只对应已知范围。"] : [])];
  const findings: StructuralStrengthFinding[] = [];
  function check(ruleId: string, applicable: boolean, checks: [boolean, string, string][], sourceIds: string[]) {
    const satisfiedConditions = checks.filter(([passes]) => passes).map(([, yes]) => yes), blockers = checks.filter(([passes]) => !passes).map(([, , no]) => no);
    const result: StructuralStrengthFinding = { ruleId, status: !applicable ? "not_applicable" : blockers.length ? "blocked" : "matched",
      satisfiedConditions, blockers: applicable ? blockers : ["当前月令不属于这条规则的适用背景。"], unresolvedConditions: [...conditions],
      evidence: [`月令${facts.monthCommand.branch}主气${facts.monthCommand.mainStem}${facts.monthCommand.tenGod}。`,
        ...roots.map((root) => `日主同类根：${rootText(root)}。`), ...[...facts.peerStems, ...facts.resourceStems, ...facts.demandStems].map(actorText)], sourceIds };
    findings.push(result); return result;
  }
  const food = check("rooted-peer-food-wealth-v1", facts.monthCommand.tenGod === "食神", [
    [Boolean(dayMainRoot), "日支有日主同类本气根。", "日支未见日主同类本气根；其他位置的根不能冒充坐下本气根。"],
    [otherRoot, "另一支另有日主同类根。", "所选其他地支未见另一个同类根支点。"],
    [rootedPeers.length >= 2, "至少两个不同非日干位置的比劫已透，且均连接到同类根。", "本地保守谓词所需的重复透比连根未齐。"],
    [wealth.some((actor) => actor.roots.length), "财已透且有同五行根，可作为食神产出的承接对象。", "尚无实际透出且有根的财来承接食神。"],
    [!authority.some((actor) => actor.roots.length), "未见另一个已透有根的官杀负担。", "已有官杀透出且有根，承接负担超出这条简化规则的覆盖。"],
    [!output.some((actor) => actor.roots.length), "月令食神之外未再见有根透食伤，未把额外强输出负荷忽略。", "月令之外另有有根透食伤，本版不按食旺仍可继续扩大输出处理。"]
  ], ["structural-zq-food-rooted", "structural-xu-food-overdrain", "structural-xu-residual-roots"]);
  check("rooted-resource-output-v1", facts.monthCommand.group === "resource", [
    [Boolean(dayMainRoot), "日主自身在日支另有同类本气根，独立于印根。", "未见日主自身坐下同类本气根；不以印根替代身根，也不据此直接判弱。"],
    [rootedPrints.length > 0, "印已透且连接到印星自己的根。", "印透根这一支持通道未齐。"],
    [output.some((actor) => actor.roots.length), "食伤已透且有根，已有可辨的输出出口。", "尚无有根的可见食伤出口，不凭印旺补造输出。"],
    [wealth.length === 0 && authority.length === 0, "原局未另透财官杀来引入财印或职责分歧。", "原局另透财或官杀，本版保留其实际冲突而不自动认作单纯印旺可泄。"]
  ], ["structural-zq-resource-rooted", "structural-xu-heavy-print"]);
  const resourceWealth = check("rooted-resource-wealth-v1", facts.monthCommand.group === "resource", [
    [roots.some((root) => root.position !== "month" && root.layer === "main"), "月令印根之外，另支有日主同类本气根，身根不限于坐下。", "月令之外未见日主同类本气根；印根或多处余根不能替代本条身根前提。"],
    [rootedPrints.length >= 2, "至少两个不同非日干位置的印已透，且各连接到印星同五行根。", "本地保守谓词所需的两处透印连根未齐，不由月令印或单一透印直接判印重。"],
    [wealth.length === 1 && wealth[0]!.roots.length > 0, "恰有一处实际透财且有同五行根，裁印对象可明确到具体财干。", "透财未齐、财无根或多处财并透，不能套单一有根财裁印分支。"],
    [output.length === 0 && authority.length === 0, "未另透食伤或官杀，未把食伤生财等其他链条及官杀负荷混入单纯印财取舍。", "另有食伤或官杀透出，须保留其实际配合，本条不代判。"]
  ], ["structural-zq-resource-wealth", "structural-xu-heavy-print", "structural-xu-residual-roots"]);
  const mixedAuthority = check("rooted-peer-mixed-authority-v1", facts.monthCommand.group === "peer", [
    [roots.some((root) => root.position === "month" && root.layer === "main"), "月令比劫本气是日主同类根，得令与得根分别有据。", "月令未形成日主同类本气根，不能仅凭其他位置同类套用本条。"],
    [roots.some((root) => root.position !== "month" && root.layer === "main"), "别支另有日主同类本气根，不只依靠月令一处。", "月令之外未见同类本气根；余气根或印根不能替代本条前提。"],
    [wealth.some((actor) => actor.roots.length), "财星实际透出并有同五行根，资源承接与耗身两面都须保留。", "尚无实际透出且有根的财星，不能补造财与官杀配合。"],
    [authority.some((actor) => actor.tenGod === "正官" && actor.roots.length), "正官实际透出并有同五行根，职责与制身对象明确。", "正官未实际透根；藏官或七杀不能冒充正官角色。"],
    [authority.some((actor) => actor.tenGod === "七杀" && actor.roots.length), "七杀实际透出并有同五行根，与正官分别记录而不相加评分。", "七杀未实际透根；藏杀或重复正官不能冒充七杀角色。"]
  ], ["structural-zq-lu-role-selection", "structural-zq-lu-load-balance", "structural-zq-clash-remaining"]);
  const direction = rawDirection(raw.band), supporters = ELEMENTS.filter((element) => ["same_element", "generates_day_master"].includes(strengthElementRelation(raw.dayMaster.element, element)));
  const demanders = ELEMENTS.filter((element) => !supporters.includes(element));
  const matches = findings.filter((finding) => finding.status === "matched");
  let working: StructuralWorkingBalance;
  if (matches.length === 1 && matches[0] === mixedAuthority) {
    const relative = evaluateStructuralRelativeStrength({ facts: inputFacts, includeHour });
    const ownRoots = roots.filter((root) => root.layer === "main").map(rootText).join("、");
    const actors = (group: StructuralStrengthActor[]) => group.filter((actor) => actor.roots.length).map((actor) => `${LABEL[actor.position]}${actor.stem}${actor.tenGod}`).join("、");
    const interactions = facts.interactions.filter((fact) => fact.completeness === "binary" && ["stem_five_combination", "branch_six_clash"].includes(fact.relationType));
    working = { version: STRUCTURAL_STRENGTH_ASSESSMENT_VERSION, selection: "structural_rule", ruleId: mixedAuthority.ruleId,
      band: relative.band, label: `得令有根，${relative.label}`, direction: "conditional", focus: "rooted_peer_mixed_authority",
      favorableElements: [], unfavorableElements: [], conditionalElements: [...ELEMENTS],
      summary: `${relative.summary}月令${facts.monthCommand.branch}中${facts.monthCommand.mainStem}${facts.monthCommand.tenGod}当令，同类本气根见${ownRoots}。${actors(wealth)}与${actors(authority)}均已透根，财的资源任务、官的职责与杀的制约仍分别取舍；相对强弱已给出工作主判，格局与调候的用向继续保留条件，不由分档直接指定整组五行喜忌。`,
      evidence: [...mixedAuthority.evidence, ...relative.evidence, ...interactions.map((fact) => `${fact.participants.map((part) => `${LABEL[part.position]}${part.ganZhi}的${part.value}`).join("与")}见${fact.relationType === "branch_six_clash" ? "地支六冲" : "天干五合"}；${fact.id}。`)],
      conditions: ["R3准入使用本地联合谓词，不以根数或透干数相加决定命中；命中后的相对量级模型另行登记参数，不冒称古籍规定的数值阈值。", ...conditions.slice(1), ...relative.conditions, "本条的conditional指格局喜用仍须按具体角色取舍，不表示相对旺衰没有主判断；均衡也不是缺失判断的代称。",
        "正官、七杀与财分别保留实际透藏和同五行根；有根不证明作用已足量，官杀并见也不自动宣告破格。",
        "相合未判合去，相冲未判根已被拔；根与负荷的实际作用仍须结合具体配合，不按关系出现就删根。",
        "先沿已存在的格局任务和有出处的调候前提取用；本条不另造任何日干月份的调候用字，不由金水或木火土整组定喜忌。"],
      sourceIds: [...mixedAuthority.sourceIds, ...relative.sourceIds] };
  } else if (matches.length === 1 && matches[0] === resourceWealth) {
    const chosenWealth = wealth[0]!, wealthElement = strengthElementForStem(chosenWealth.stem);
    const selfRoots = roots.filter((root) => root.position !== "month" && root.layer === "main").map(rootText).join("、");
    const printNames = rootedPrints.map((actor) => `${LABEL[actor.position]}${actor.stem}${actor.tenGod}`).join("、");
    const wealthName = `${LABEL[chosenWealth.position]}${chosenWealth.stem}${chosenWealth.tenGod}`;
    const linked = facts.interactions.filter((fact) => fact.completeness === "binary" && ["stem_five_combination", "stem_clash"].includes(fact.relationType)
      && fact.participants.some((part) => part.position === chosenWealth.position && part.component === "stem"));
    working = { version: STRUCTURAL_STRENGTH_ASSESSMENT_VERSION, selection: "structural_rule", ruleId: resourceWealth.ruleId,
      band: "strong", label: "印旺身有根，财作裁印", direction: "drain", focus: "wealth_moderates_resource",
      favorableElements: [wealthElement], unfavorableElements: [], conditionalElements: ELEMENTS.filter((element) => element !== wealthElement),
      summary: `印星当令，${printNames}已透根；日主另有${selfRoots}，身根与印根分别有据。当前以已透有根的${wealthName}约束过多生扶，印仍保留其支持任务；重点是这项财怎样裁印，不把食伤、官杀或更多财一并列喜。`,
      evidence: [...resourceWealth.evidence, ...linked.map((fact) => `${fact.participants.map((part) => `${LABEL[part.position]}${part.value}`).join("与")}见${fact.relationType === "stem_five_combination" ? "天干五合" : "天干冲"}；${fact.id}。`)],
      conditions: [...conditions, "两印与一财描述本地保守准入条件，不是古籍数量阈值，也不由透干数替代所有命局的轻重判断。",
        "当前财作用是裁印；印的支持仍须保留，食伤或官杀加入、财势增加时要重看配合，不把未来财运一律判为支持。",
        "财受合或克时仍保留该字和实际根，不宣告合去、化成或自由裁印已成功；具体合克及位置条件须与财的任务一起阅读。"],
      sourceIds: [...resourceWealth.sourceIds] };
  } else if (matches.length === 1) {
    const matched = matches[0]!, foodRoute = matched === food;
    const favored = ELEMENTS.filter((element) => strengthElementRelation(raw.dayMaster.element, element) === (foodRoute ? "controlled_by_day_master" : "generated_by_day_master"));
    working = { version: STRUCTURAL_STRENGTH_ASSESSMENT_VERSION, selection: "structural_rule", ruleId: matched.ruleId,
      band: "strong", label: "结构承接偏强", direction: "drain", favorableElements: favored, unfavorableElements: [], conditionalElements: ELEMENTS.filter((element) => !favored.includes(element)),
      summary: foodRoute ? "日主坐下本气根、别支根与透比形成实际承接，食神当令且财已透根；当前以财承接已有食神产出，原加权结果保留作对照，不单凭因素累计决定继续生扶。"
        : "印月令与透印有根之外，日主自身坐下也有本气根，且食伤已透根；当前以已有输出疏通印与身的支持，不把印多直接当作身强。",
      focus: foodRoute ? "wealth_after_output" : "output_after_resource", evidence: [...matched.evidence], conditions: [...conditions,
        foodRoute ? "此工作用向只优先财承接；食伤已旺时不一概继续增食，官杀与印比的具体作用仍按格局与岁运条件判断。" : "此工作用向只优先现有食伤出口；财官、印比与调候的作用保留条件，不扩大成所有泄耗克都为喜。"], sourceIds: [...matched.sourceIds] };
  } else {
    working = { version: STRUCTURAL_STRENGTH_ASSESSMENT_VERSION, selection: "raw_fallback", ruleId: "raw-weight-fallback-v1",
      band: raw.band, label: raw.label, direction,
      favorableElements: direction === "support" ? supporters : direction === "drain" ? demanders : [],
      unfavorableElements: direction === "support" ? demanders : direction === "drain" ? supporters : [], conditionalElements: direction === "balanced" ? [...ELEMENTS] : [],
      summary: `本轮结构联合条件未完整成立，当前继续沿原计权${raw.label}方向；这不是结构规则已重新裁决旺衰。`, focus: `raw_${direction}`,
      evidence: [`原支持/泄耗克 ${raw.supportWeight}/${raw.demandWeight}；原支持占比 ${raw.supportRatio ?? "未定"}。`, ...findings.filter((finding) => finding !== mixedAuthority && finding !== resourceWealth).flatMap((finding) => finding.blockers)],
      conditions: [...conditions, "未覆盖或条件不足不等于相反方向成立，也不根据尚未见到的时柱补足条件。"], sourceIds: ["dtt-strength", "smt-position"] };
  }
  return { version: STRUCTURAL_STRENGTH_ASSESSMENT_VERSION, includeHour, rawPolicyVersion: BAZI_STRENGTH_POLICY.policyVersion,
    raw: structuredClone(raw), inputFacts, facts, findings, working, disagreesWithRaw: working.direction !== direction,
    limitations: ["这是当前工作规则与原加权法的并列判断，不改写历史原分数、旧修订或旧解读。", "身根、印根与透藏位置是真实事实；轻重仍只覆盖已列联合模式，不能外推从格、专旺或合化成立。",
      "原典命例和后世评注分别登记，均不构成实际人生预测准确率或古籍数值权重认证。"] };
}

export function buildStructuralStrengthAssessment({ revision, raw }: StructuralStrengthBuildInput): StructuralStrengthAssessment {
  const checked = revisionRecordSchema.parse(revision), includeHour = checked.input.timePrecision !== "unknown_hour" && checked.input.timePrecision !== "date_only";
  return { ...evaluateStructuralStrength({ facts: checked.facts, includeHour, raw }),
    sourceBinding: { revisionId: checked.id, chartResultHash: checked.manifest.resultHash, includeHour } };
}

/** All current consumers use this one validated working direction. Raw factors
 * and their six perturbations remain separately labelled legacy comparisons. */
export function getWorkingBalance(assessment: StructuralBalanceCarrier): StructuralWorkingBalance {
  const structural = assessment?.balance?.structural;
  if (!structural || structural.version !== STRUCTURAL_STRENGTH_ASSESSMENT_VERSION) return fail("当前初判缺少受支持的结构工作结果。");
  const { sourceBinding, ...evaluation } = structural;
  if (!sourceBinding || sourceBinding.includeHour !== structural.includeHour
    || (assessment.sourceBinding && (sourceBinding.revisionId !== assessment.sourceBinding.revisionId || sourceBinding.chartResultHash !== assessment.sourceBinding.chartResultHash
      || sourceBinding.includeHour !== assessment.sourceBinding.includeHour))) return fail("结构工作结果与当前初判来源不匹配。");
  const expected = evaluateStructuralStrength({ facts: structural.inputFacts, includeHour: structural.includeHour, raw: structural.raw });
  if (!same(evaluation, expected)) return fail("结构工作结果的事实、规则、用向或版本已改变。");
  return structuredClone(structural.working);
}
