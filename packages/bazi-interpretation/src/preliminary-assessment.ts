import { revisionRecordSchema, type RevisionRecord } from "@hakimi/contracts";
import { interpretBaziChart } from "./index";
import {
  BAZI_STRENGTH_PILLAR_ORDER,
  strengthElementForStem,
  strengthElementLabel,
  strengthElementRelation,
  type FiveElement,
  type PillarPosition
} from "./strength-assessment-core";
import { canonicalizeStrengthTenGod, strengthTenGodGroup, type StrengthBand } from "./strength-policy";
import { buildStrengthSensitivityReview } from "./strength-sensitivity-review";
import { BAZI_INTERPRETATION_SOURCE_REFS } from "./source-refs";
import { PRELIMINARY_CLASSIC_SOURCES, type PreliminarySource } from "./preliminary-assessment-sources";
import { PRELIMINARY_SEASONAL_CATALOG, PRELIMINARY_SEASONAL_OBSERVATIONS, PRELIMINARY_SEASONAL_SOURCES } from "./preliminary-seasonal-catalog";
import { selectNatalPatternPath } from "./natal-pattern-path";
import { OUTLOOK_CLASSICAL_SOURCES } from "./outlook-classical-sources";
import { buildStructuralStrengthAssessment, getWorkingBalance, STRUCTURAL_STRENGTH_SOURCES, type StructuralStrengthAssessment, type StructuralWorkingBalance } from "./structural-strength-assessment";

export type { PreliminarySource } from "./preliminary-assessment-sources";
export const BAZI_PRELIMINARY_ASSESSMENT_VERSION = "hakimi.bazi.preliminary-assessment/0.7.0" as const;
export type PreliminaryStatus = "supported" | "conditional" | "conflicting" | "not_covered";
export type PreliminaryBalanceDirection = "support" | "drain" | "balanced" | "conditional";
export type PreliminaryPatternFamily = "official" | "seven_killings" | "resource" | "output" | "wealth" | "peer";

export interface PreliminarySection {
  status: PreliminaryStatus;
  headline: string;
  summary: string;
  evidence: string[];
  conditions: string[];
  sourceIds: string[];
}
export interface PreliminaryPatternCandidate extends PreliminarySection { id: string; label: string }
export interface PreliminaryPattern extends PreliminarySection {
  family: PreliminaryPatternFamily;
  background: string;
  monthMainStem: string;
  monthMainTenGod: string;
  monthHiddenStems: { stem: string; tenGod: string; visibleAt: PillarPosition[] }[];
  candidates: PreliminaryPatternCandidate[];
}
export interface PreliminaryBalanceScenario {
  id: string;
  label: string;
  band: StrengthBand;
  direction: Exclude<PreliminaryBalanceDirection, "conditional">;
  supportWeight: number;
  demandWeight: number;
  favorableElements: FiveElement[];
  unfavorableElements: FiveElement[];
}
export interface PreliminaryBalance extends PreliminarySection {
  structural: StructuralStrengthAssessment;
  basis: "strength_balance_only";
  band: StrengthBand;
  label: string;
  dayMasterElement: FiveElement;
  supportWeight: number;
  demandWeight: number;
  supportRatio: number | null;
  baselineDirection: Exclude<PreliminaryBalanceDirection, "conditional">;
  baselineFavorableElements: FiveElement[];
  baselineUnfavorableElements: FiveElement[];
  baselineSummary: string;
  sensitivitySummary: string;
  direction: PreliminaryBalanceDirection;
  favorableElements: FiveElement[];
  unfavorableElements: FiveElement[];
  conditionalElements: FiveElement[];
  sensitivityLabel: string;
  scenarioDirections: PreliminaryBalanceScenario[];
}
export interface PreliminarySeasonalRule {
  id: string;
  dayStem: string;
  monthBranch: string;
  headline: string;
  summary: string;
  preferredStems: readonly string[];
  conditionalStems: readonly { stem: string; condition: string }[];
  cautions: readonly string[];
  sourceIds: readonly string[];
}
export interface PreliminarySeasonal extends PreliminarySection {
  coverage: "checked_classic_clause" | "simplified_seasonal_observation";
  ruleId: string | null;
  basis: "seasonal_classic_only" | "seasonal_simplified_observation";
  preferredStems: string[];
  preferredElements: FiveElement[];
  conditionalStems: { stem: string; condition: string }[];
  presence: { stem: string; visibleAt: PillarPosition[]; hiddenAt: PillarPosition[] }[];
  balanceConflict: boolean;
  workingConflict: boolean;
}
export interface PreliminaryReading {
  id: string;
  axis: "pattern" | "balance" | "seasonal" | "pillar";
  topic: "overview" | "self" | "career" | "relationship" | "long_term";
  title: string;
  text: string;
  evidence: string[];
  sourceIds: string[];
}
export interface BaziPreliminaryAssessment {
  version: typeof BAZI_PRELIMINARY_ASSESSMENT_VERSION;
  sourceBinding: { revisionId: string; chartResultHash: string; includeHour: boolean; interpretationRuleVersion: string };
  headline: string;
  summary: string;
  pattern: PreliminaryPattern;
  balance: PreliminaryBalance;
  seasonal: PreliminarySeasonal;
  sources: PreliminarySource[];
  limitations: string[];
  readings: PreliminaryReading[];
}
export interface PreliminaryAssessmentOptions {
  seasonalCatalog?: readonly PreliminarySeasonalRule[];
  seasonalSources?: readonly PreliminarySource[];
}

const ELEMENTS: readonly FiveElement[] = ["wood", "fire", "earth", "metal", "water"];
const LU_BRANCH: Readonly<Record<string, string>> = { 甲: "寅", 乙: "卯", 丙: "巳", 丁: "午", 戊: "巳", 己: "午", 庚: "申", 辛: "酉", 壬: "亥", 癸: "子" };
const unique = <T>(values: readonly T[]): T[] => [...new Set(values)];
const positions = (includeHour: boolean) => BAZI_STRENGTH_PILLAR_ORDER.filter((position) => includeHour || position !== "hour");
const labelsForElements = (elements: readonly FiveElement[]) => elements.map(strengthElementLabel).join("、");

function baselineDirection(band: StrengthBand): Exclude<PreliminaryBalanceDirection, "conditional"> {
  if (band === "weak" || band === "very_weak") return "support";
  if (band === "strong" || band === "very_strong") return "drain";
  return "balanced";
}

function elementDirections(element: FiveElement, direction: Exclude<PreliminaryBalanceDirection, "conditional">) {
  const support = ELEMENTS.filter((candidate) => ["same_element", "generates_day_master"].includes(strengthElementRelation(element, candidate)));
  const demand = ELEMENTS.filter((candidate) => !support.includes(candidate));
  return {
    favorableElements: direction === "support" ? support : direction === "drain" ? demand : [],
    unfavorableElements: direction === "support" ? demand : direction === "drain" ? support : []
  };
}

function buildBalance(interpretation: ReturnType<typeof interpretBaziChart>, revision: RevisionRecord): PreliminaryBalance {
  const strength = interpretation.strength;
  const sensitivity = buildStrengthSensitivityReview(interpretation);
  const scenarios = sensitivity.scenarios.map((scenario): PreliminaryBalanceScenario => {
    const direction = baselineDirection(scenario.band);
    return { id: scenario.id, label: scenario.label, band: scenario.band, direction,
      supportWeight: scenario.supportWeight, demandWeight: scenario.demandWeight,
      ...elementDirections(strength.dayMaster.element, direction) };
  });
  const directions = unique(scenarios.map((scenario) => scenario.direction));
  const direction: PreliminaryBalanceDirection = directions.length === 1 ? directions[0]! : "conditional";
  const baseDirection = baselineDirection(strength.band);
  const baseElements = elementDirections(strength.dayMaster.element, baseDirection);
  const stableElements = elementDirections(strength.dayMaster.element, direction === "conditional" ? "balanced" : direction);
  const baselineSummary = baseDirection === "support"
    ? `按当前基线，日主${strength.label}，基础扶抑优先${labelsForElements(baseElements.favorableElements)}的印比生扶；${labelsForElements(baseElements.unfavorableElements)}增加泄耗克时较易承压。`
    : baseDirection === "drain"
      ? `按当前基线，日主${strength.label}，基础扶抑优先${labelsForElements(baseElements.favorableElements)}的泄、耗、制；${labelsForElements(baseElements.unfavorableElements)}继续生扶可能增偏。`
      : "按当前基线，日主相对中和，扶抑不固定偏向某一组五行，先结合本盘已见结构判断作用。";
  const sensitivitySummary = direction === "conditional"
    ? `替代权重场景会改变扶抑方向，详见敏感性对照；当前基线初判仍单独保留。`
    : `六个权重场景的基础扶抑方向一致。`;
  const summary = `${baselineSummary} ${sensitivitySummary}`;
  return {
    structural: buildStructuralStrengthAssessment({ revision, raw: strength }),
    status: direction === "conditional" ? "conditional" : "supported",
    headline: `日主${strength.dayMaster.stem}${strength.dayMaster.elementLabel} · ${strength.label}`,
    summary, evidence: [`支持侧 ${strength.supportWeight}；泄耗克侧 ${strength.demandWeight}。`, ...scenarios.map((scenario) => `${scenario.label}：${scenario.supportWeight}/${scenario.demandWeight}，${sensitivity.scenarios.find((item) => item.id === scenario.id)!.bandLabel}。`)],
    conditions: ["权重为本地规则假设；五行方向只属于扶抑轴，不是永久吉凶标签。", ...(direction === "conditional" ? [`六场景出现${unique(sensitivity.scenarios.map((scenario) => scenario.bandLabel)).join("、")}，不能把基线方向当成各方法共同结论。`] : [])],
    sourceIds: ["dtt-strength", "smt-position"], basis: "strength_balance_only",
    band: strength.band, label: strength.label, dayMasterElement: strength.dayMaster.element,
    supportWeight: strength.supportWeight, demandWeight: strength.demandWeight, supportRatio: strength.supportRatio,
    baselineDirection: baseDirection, baselineFavorableElements: baseElements.favorableElements,
    baselineUnfavorableElements: baseElements.unfavorableElements, baselineSummary, sensitivitySummary,
    direction, ...stableElements,
    conditionalElements: direction === "conditional" || direction === "balanced" ? [...ELEMENTS] : [],
    sensitivityLabel: sensitivity.stabilityLabel, scenarioDirections: scenarios
  };
}

function patternFamily(tenGod: string): PreliminaryPatternFamily {
  if (tenGod === "正官") return "official";
  if (tenGod === "七杀") return "seven_killings";
  const group = strengthTenGodGroup(tenGod);
  if (group === "resource" || group === "output" || group === "wealth" || group === "peer") return group;
  throw new Error("初判缺少可识别的月令主气十神。");
}

function buildPattern(revision: RevisionRecord, includeHour: boolean, working: StructuralWorkingBalance): PreliminaryPattern {
  const facts = revision.facts;
  const selected = positions(includeHour);
  const month = facts.pillars.month;
  const mainStem = month.hiddenStems[0];
  const mainGod = canonicalizeStrengthTenGod(month.branchTenGods[0] ?? "");
  if (!mainStem) throw new Error("初判缺少月令藏干。");
  const family = patternFamily(mainGod);
  const visible = selected.filter((position) => position !== "day").map((position) => ({ position, ...facts.pillars[position], tenGod: canonicalizeStrengthTenGod(facts.pillars[position].stemTenGod) }));
  const shown = (gods: readonly string[]) => visible.filter((item) => gods.includes(item.tenGod));
  const has = (...gods: string[]) => shown(gods).length > 0;
  const monthHiddenStems = month.hiddenStems.map((stem, index) => ({
    stem, tenGod: canonicalizeStrengthTenGod(month.branchTenGods[index] ?? ""),
    visibleAt: selected.filter((position) => facts.pillars[position].stem === stem)
  }));
  const background = family === "peer"
    ? LU_BRANCH[facts.pillars.day.stem] === month.branch ? "建禄背景" : mainGod === "劫财" ? "月劫背景" : "比肩当令背景"
    : `${mainGod}月令背景`;
  const evidence = [`月支${month.branch}，主气${mainStem}对日主为${mainGod}。`,
    ...monthHiddenStems.map((item) => `${month.branch}藏${item.stem}（${item.tenGod}），${item.visibleAt.length ? item.visibleAt.map((position) => facts.pillars[position].label).join("、") + "透出" : "未见透出"}。`),
    ...visible.map((item) => `${item.label}${item.stem}透出，为${item.tenGod}。`)];
  const candidates: PreliminaryPatternCandidate[] = [];
  const add = (id: string, label: string, gods: string[], summary: string, condition: string) => {
    candidates.push({ id, label, status: "conditional", headline: label, summary,
      evidence: shown(gods).map((item) => `${item.label}${item.stem}为${item.tenGod}。`),
      conditions: [condition, "这里只判断结构取向，未据此宣告成格、真化或富贵结果。"],
      sourceIds: [family === "peer" ? "preliminary-ziping-peer" : "preliminary-ziping-month"] });
  };
  // These combinations require visible occurrences. A separate, explicitly
  // labelled month-command fallback below never promotes a hidden stem to one.
  if (has("正官") && has("伤官")) add("official-hurting", "官伤并见", ["正官", "伤官"], "正官与伤官同时透出，规则与表达之间有牵制，需结合财印的调节看作用先后。", "不能见官伤同现便直接断凶；位置、生克次序及调候可改变作用。");
  if (has("正官") && has("七杀")) add("mixed-authority", "官杀同时透出", ["正官", "七杀"], "正官与七杀并见，责任与压力来源较复杂，先保留取清与制化的条件。", "尚未计算去留取清，不能把并见直接判为破格。");
  if (has("食神", "伤官") && has("正财", "偏财")) {
    const outputLabel = has("食神") && has("伤官") ? "食伤" : has("伤官") ? "伤官" : "食神";
    add("output-wealth", `${outputLabel}生财取向`, ["食神", "伤官", "正财", "偏财"], `${outputLabel}与财星透出，形成从表达、技能或产出向资源经营连接的结构线索。`, "仍要看日主能否承担泄耗、财星根气及组合是否受阻；出现生财路径不等于已有财富结果。");
  }
  if (has("正官") && has("正印", "偏印")) add("official-resource", "官印相生取向", ["正官", "正印", "偏印"], "官星与印星透出，责任规范与学习支持之间形成相生线索。", "财印冲突、伤官与位置先后尚会影响这条路径，不能只凭两类十神宣布成格。");
  if (has("正官") && has("正财", "偏财")) add("wealth-official", "财官相生取向", ["正官", "正财", "偏财"], "财星与正官透出，资源投入与责任规则之间有相生取向。", "仍须结合日主承受能力，财官同现也可能增加负担。");
  if (has("七杀") && has("食神")) add("food-killing", "食神制杀取向", ["七杀", "食神"], "食神与七杀透出，存在以产出与方法调节压力的制衡路径。", "制衡是否适量、是否被印财干扰尚未判定，不能将见食见杀直接等同制杀成功。");
  if (has("七杀") && has("正印", "偏印")) add("killing-resource", "杀印相生取向", ["七杀", "正印", "偏印"], "七杀与印星透出，存在把压力转向支持与学习的相生路径。", "尚须看印星承接和日主受益，不能仅凭同时出现断化杀成功。");
  if (has("伤官") && has("正印", "偏印")) add("hurting-resource", "伤官与印相配", ["伤官", "正印", "偏印"], "伤官与印星透出，表达释放与约束支持并存，具有佩印取向。", "身弱伤旺、印星是否适量等条件未完全判定，不直接命名为已成伤官佩印格。");
  if (has("食神") && has("偏印")) add("food-indirect-resource", "食神与偏印并见", ["食神", "偏印"], "食神与偏印同时透出，输出与支持之间存在制约线索。", "不能仅凭并见就判枭神夺食；财星调节、强弱及位置会影响实际作用。");
  if (family === "resource" && has("食神", "伤官")) add("resource-output", "印格背景的食伤泄秀取向", ["食神", "伤官"], "月令印星与透出食伤相配，支持与输出可以形成连接。", "需日主与印星的支持足以承担输出；不能用同一结论覆盖身弱或食伤受制情形。");
  const selectedPath = selectNatalPatternPath({ family, monthMainStem: mainStem, monthMainTenGod: mainGod, visibleTenGods: visible.map((item) => item.tenGod), workingFocus: working.focus });
  if (selectedPath.id === "resource-wealth") {
    const wealthText = shown(["正财", "偏财"]).map((item) => `${item.label}${item.stem}${item.tenGod}`).join("、");
    const resourceText = shown(["正印", "偏印"]).map((item) => `${item.label}${item.stem}${item.tenGod}`).join("、");
    candidates.push({ id: "resource-wealth", label: "印旺用财取向", status: "conditional", headline: "印旺用财取向",
      summary: `${resourceText}与月令印的支持均已存在，日主自身另有本气根；以已透有根的${wealthText}约束过多生扶，保留印的支持与财的裁印两种任务。`,
      evidence: [...working.evidence], conditions: [...working.conditions, "这是财制过印的结构取向，不宣告财印合去、裁印已成或富贵结果。"],
      sourceIds: ["structural-zq-resource-wealth"] });
  }
  const monthCommand = selectedPath.monthCommandRole;
  const monthSourceIds = monthCommand ? ["outlook-zq-month-command", monthCommand.tenGod === "七杀" ? "outlook-zq-killing-month-example" : "outlook-zq-official-month-example"] : [];
  if (monthCommand && selectedPath.candidateId) {
    const partners = shown(selectedPath.required.filter((group) => !group.includes(monthCommand.tenGod)).flat());
    const partnerText = partners.map((item) => `${item.label.replace("柱", "干")}${item.stem}${item.tenGod}已透`).join("、");
    const action: Record<string, string> = {
      "official-resource": "官的责任背景与印的学习支持形成承接候选",
      "official-wealth": "财的资源投入与月令官的责任背景形成相生候选",
      "food-killings": "形成以食神的方法与产出调节七杀压力的制衡候选",
      "killings-resource": "形成由印承接七杀压力、再支持日主的相生候选"
    };
    const roleEvidence = `月令${mainStem}${mainGod}为月支${month.branch}本气，未透；${partnerText}。`;
    candidates.push({ id: selectedPath.candidateId, label: `${selectedPath.title}取向`, status: "conditional", headline: `${selectedPath.title}取向`,
      summary: `月令${mainStem}${mainGod}提供当令背景；${partnerText}，${action[selectedPath.id]}。`,
      evidence: [roleEvidence, `月令来源 outlook-zq-month-command/month-command-1；配合原例 ${monthCommand.tenGod === "七杀" ? "outlook-zq-killing-month-example/month-killing-yi" : "outlook-zq-official-month-example/month-official-xue"}。`],
      conditions: ["月令主气仍属藏干，不加入透干合克或自由救应对象，也不把其他藏干一起提升为已透。", "已透配合的根气、日主承接与轻重仍须分别判断；古籍原例的成立条件与结果不能移植到本盘。", ...(selectedPath.id === "food-killings" ? ["食神的制约角色已有明确对象，但杀旺、食强、身健及印财干扰仍需分读，不宣告制杀已经成功。"] : []), "这里只判断结构取向，未据此宣告成格、真化或富贵结果。"],
      sourceIds: monthSourceIds });
    evidence.push(roleEvidence);
  }
  const priorities: Record<PreliminaryPatternFamily, string[]> = {
    official: ["official-hurting", "mixed-authority", "official-resource", "wealth-official"],
    seven_killings: ["mixed-authority", "food-killing", "killing-resource"],
    resource: ["resource-wealth", "resource-output", "official-resource", "killing-resource"],
    output: ["output-wealth", "hurting-resource", "food-indirect-resource"],
    wealth: ["output-wealth", "wealth-official"], peer: ["output-wealth", "wealth-official", "official-resource", "food-killing"]
  };
  const main = priorities[family].map((id) => candidates.find((candidate) => candidate.id === id)).find(Boolean);
  const fallback: Record<PreliminaryPatternFamily, string> = {
    official: "以正官的责任、秩序与约束为结构起点；当前未出现足以明确命名的透干配合，先保留官星能否得到财印支持的条件。",
    seven_killings: "以七杀的压力和行动要求为结构起点；未见明确的食神制杀或杀印相生透干组合，不把压力自动视为有利或不利。",
    resource: "以印星的支持、学习与承接为结构起点；结合日主是否需要生扶，区别支持适量与生扶过度。",
    output: "以食伤的表达、技能与输出为结构起点；当前未形成明确的透干生财组合，不能把产出直接等同收益。",
    wealth: "以财星的资源配置与经营为结构起点；财代表需要承担的对象，仍须结合日主能否任财，而非见财即富。",
    peer: "以比劫同类支持为背景，再看财官食伤的透出配合；未形成明确主线时保留支持与竞争并存的解释。"
  };
  return { status: "conditional", family, background, monthMainStem: mainStem, monthMainTenGod: mainGod,
    monthHiddenStems, candidates, headline: main ? `${background} · ${main.label}` : background,
    summary: main ? `${background}下，${main.summary}` : fallback[family], evidence,
    conditions: ["月令背景与组合候选分别保留；透出不等于主导，主气也不自动排除其他藏干作用。", "尚未把合化真伪、从格或专旺、格局成败换算成一个分数。"],
    sourceIds: ["preliminary-ziping-month", "preliminary-ziping-change", ...(family === "peer" ? ["preliminary-ziping-peer"] : []), ...monthSourceIds, ...(selectedPath.id === "resource-wealth" ? ["structural-zq-resource-wealth"] : [])] };
}

function buildSeasonal(revision: RevisionRecord, includeHour: boolean, balance: PreliminaryBalance, catalog: readonly PreliminarySeasonalRule[]): PreliminarySeasonal {
  const matches = catalog.filter((rule) => rule.dayStem === revision.facts.pillars.day.stem && rule.monthBranch === revision.facts.pillars.month.branch);
  if (matches.length > 1) throw new Error("调候来源表对同一日干月令重复登记，初判已停止。");
  const rule = matches[0];
  if (!rule) {
    const observation = PRELIMINARY_SEASONAL_OBSERVATIONS[revision.facts.pillars.month.branch];
    if (!observation) throw new Error("初判缺少可识别的节令月支。");
    return { status: "conditional", ruleId: null, coverage: "simplified_seasonal_observation", basis: "seasonal_simplified_observation",
    headline: observation.headline, summary: `${observation.summary}这是现代简化季节观察，本日干月令的古籍调候专条尚未逐条核对。`,
    evidence: [`日干${revision.facts.pillars.day.stem}，节令月支${revision.facts.pillars.month.branch}。`],
    conditions: ["月令季节是传统模型背景，不是出生地点实际气温湿度测量。"], sourceIds: [], preferredStems: [], preferredElements: [], conditionalStems: [], presence: [], balanceConflict: false, workingConflict: false };
  }
  const selected = positions(includeHour);
  const stems = unique([...rule.preferredStems, ...rule.conditionalStems.map((item) => item.stem)]);
  const presence = stems.map((stem) => ({ stem,
    visibleAt: selected.filter((position) => position !== "day" && revision.facts.pillars[position].stem === stem),
    hiddenAt: selected.filter((position) => revision.facts.pillars[position].hiddenStems.includes(stem)) }));
  const preferredElements = unique(rule.preferredStems.map(strengthElementForStem));
  const balanceConflict = preferredElements.some((element) => balance.scenarioDirections.some((scenario) => scenario.unfavorableElements.includes(element)));
  const workingConflict = preferredElements.some((element) => getWorkingBalance({ balance }).unfavorableElements.includes(element));
  return { status: workingConflict ? "conflicting" : "conditional", ruleId: rule.id, coverage: "checked_classic_clause", basis: "seasonal_classic_only",
    headline: rule.headline, summary: `${rule.summary}${workingConflict ? "本条调候与当前工作取用存在取舍，分别保留作用与适用条件。" : ""}`,
    evidence: presence.map((item) => `${item.stem}：${item.visibleAt.length ? item.visibleAt.map((position) => revision.facts.pillars[position].label).join("、") + "透出" : "未透"}；${item.hiddenAt.length ? "藏于" + item.hiddenAt.map((position) => revision.facts.pillars[position].branch).join("、") : "未见藏干"}。`),
    conditions: [...rule.cautions, ...rule.conditionalStems.map((item) => `${item.stem}：${item.condition}`), "季节取用与扶抑分轴；出现用字不等于剂量适当，未出现也不等于现实中应补某种物品。", ...(balanceConflict ? ["本条与原计权的部分扰动场景方向不同；这些旧法对照不替代当前结构工作判断。"] : [])],
    sourceIds: [...rule.sourceIds], preferredStems: [...rule.preferredStems], preferredElements,
    conditionalStems: rule.conditionalStems.map((item) => ({ ...item })), presence, balanceConflict, workingConflict };
}

/** A new local interpretation projection; it never changes a stored chart or legacy result. */
export function buildBaziPreliminaryAssessment(revision: RevisionRecord, options: PreliminaryAssessmentOptions = {}): BaziPreliminaryAssessment {
  const input = revisionRecordSchema.parse(revision);
  const includeHour = input.input.timePrecision !== "unknown_hour" && input.input.timePrecision !== "date_only";
  for (const position of positions(includeHour)) {
    const pillar = input.facts.pillars[position];
    if (pillar.name !== position || pillar.hiddenStems.length !== pillar.branchTenGods.length || pillar.hiddenStems.length === 0) throw new Error("初判四柱位置或藏干十神没有一一对应。");
    strengthElementForStem(pillar.stem);
    for (const god of pillar.branchTenGods) if (!strengthTenGodGroup(god)) throw new Error("初判包含无法识别的藏干十神。");
  }
  const interpretation = interpretBaziChart(input.facts, { includeHour });
  const balance = buildBalance(interpretation, input);
  const working = getWorkingBalance({ balance });
  const pattern = buildPattern(input, includeHour, working);
  const seasonal = buildSeasonal(input, includeHour, balance, options.seasonalCatalog ?? PRELIMINARY_SEASONAL_CATALOG);
  const sources = [...PRELIMINARY_CLASSIC_SOURCES, ...BAZI_INTERPRETATION_SOURCE_REFS.map((source): PreliminarySource => ({
    id: source.id, title: source.title, url: source.url, locator: source.usage, excerpt: "", interpretation: source.usage
  })), ...PRELIMINARY_SEASONAL_SOURCES, ...STRUCTURAL_STRENGTH_SOURCES, ...OUTLOOK_CLASSICAL_SOURCES.filter((source) => pattern.sourceIds.includes(source.id)), ...(options.seasonalSources ?? [])].map((source) => ({ ...source }));
  if (new Set(sources.map((source) => source.id)).size !== sources.length) throw new Error("初判来源标识重复。");
  if (seasonal.sourceIds.some((id) => !sources.some((source) => source.id === id))) throw new Error("调候规则缺少对应来源，初判已停止。");
  if (pattern.sourceIds.some((id) => !sources.some((source) => source.id === id))) throw new Error("格局规则缺少对应来源，初判已停止。");
  const structuralSourceIds = [...working.sourceIds, ...balance.structural.findings.flatMap((finding) => finding.sourceIds)];
  if (structuralSourceIds.some((id) => !sources.some((source) => source.id === id))) throw new Error("结构旺衰规则缺少对应来源，初判已停止。");
  const limitations = ["本地规则根据命盘事实形成初判，组合取向不直接等同具体事件结果。", "格局、扶抑、调候分别解释；存在冲突时不会强选一个全盘喜用。", ...(!includeHour ? ["时辰未定，时柱已从本次初判与用字出现情况中排除。"] : [])];
  const readings: PreliminaryReading[] = [
    ...([['pattern', pattern], ['balance', { ...balance, headline: `日主${input.facts.pillars.day.stem} · ${working.label}`, summary: working.summary, evidence: working.evidence, sourceIds: working.sourceIds }], ['seasonal', seasonal]] as const).map(([axis, section]) => ({ id: `preliminary-${axis}`, axis, topic: "overview" as const, title: section.headline, text: section.summary, evidence: section.evidence, sourceIds: section.sourceIds })),
    ...interpretation.pillars.filter((pillar) => pillar.availability === "available").map((pillar): PreliminaryReading => ({
      id: `preliminary-pillar-${pillar.position}`, axis: "pillar", topic: ({ year: "self", month: "career", day: "relationship", hour: "long_term" } as const)[pillar.position], title: `${pillar.positionLabel} · ${pillar.focusTenGod ?? "十神位置"}`,
      text: pillar.directSummary, evidence: [`原计权位置说明：${pillar.strengthLink}`, `当前工作判断：${working.summary}`], sourceIds: [...new Set([...pillar.sourceRefIds, ...working.sourceIds])]
    }))
  ];
  const referencedSourceIds = new Set([...pattern.sourceIds, ...balance.sourceIds, ...structuralSourceIds, ...seasonal.sourceIds, ...readings.flatMap((reading) => reading.sourceIds)]);
  return { version: BAZI_PRELIMINARY_ASSESSMENT_VERSION,
    sourceBinding: { revisionId: input.id, chartResultHash: input.manifest.resultHash, includeHour, interpretationRuleVersion: interpretation.profile.ruleVersion },
    headline: `${interpretation.strength.dayMaster.stem}${interpretation.strength.dayMaster.elementLabel}${working.label}，${pattern.headline}`,
    summary: `${pattern.summary} ${working.summary}`, pattern, balance, seasonal, sources: sources.filter((source) => referencedSourceIds.has(source.id)), limitations, readings };
}
