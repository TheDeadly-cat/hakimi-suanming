import { revisionRecordSchema, type RevisionRecord } from "@hakimi/contracts";
import { calculatePillarRelations } from "@hakimi/relations-core";
import { LunarUtil } from "lunar-typescript";
import type { BaziPreliminaryAssessment } from "./preliminary-assessment";
import { buildNatalPatternDiagnosis, type NatalPatternDiagnosis } from "./natal-pattern-diagnosis";
import { canonicalizeStrengthTenGod } from "./strength-policy";
import { strengthElementForStem, strengthElementLabel, strengthElementRelation, type FiveElement, type PillarPosition } from "./strength-assessment-core";
import { getWorkingBalance } from "./structural-strength-assessment";
import { evaluateNatalWealthResourceTask, type NatalWealthResourceTask } from "./natal-wealth-resource-task";

export const NATAL_USEFUL_GUIDANCE_VERSION = "hakimi.natal-useful-guidance/0.12.0" as const;
export type NatalUsefulRoleKind = "baseline_favorable" | "baseline_unfavorable" | "not_fixed" | "path_key" | "working_role" | "rescue_candidate" | "seasonal_preferred" | "seasonal_conditional";
export interface NatalUsefulOccurrence { position: PillarPosition; kind: "visible" | "hidden"; branch: string; stem: string }
export interface NatalUsefulRole { axis: "balance" | "pattern" | "seasonal"; kind: NatalUsefulRoleKind; text: string; sourceIds: string[] }
export interface NatalUsefulInteraction { kind: "combination" | "clash" | "controlled_by" | "controls"; text: string; evidence: string[] }
export interface NatalUsefulEntry {
  id: string; stem: string; tenGod: string; roleLabel: string; presenceText: string; judgment: string;
  presence: "exposed_rooted" | "exposed_unrooted" | "hidden_only" | "absent";
  occurrences: NatalUsefulOccurrence[]; sameElementRoots: Omit<NatalUsefulOccurrence, "kind">[];
  roles: NatalUsefulRole[]; interactions: NatalUsefulInteraction[];
  conditions: string[]; evidence: string[]; sourceIds: string[];
}
export interface NatalUsefulGuidance {
  version: typeof NATAL_USEFUL_GUIDANCE_VERSION;
  sourceBinding: { revisionId: string; chartResultHash: string; includeHour: boolean };
  primaryPathId: string; headline: string; verdict: string; summary: string; paragraphs: string[]; priorities: string[];
  answer: NatalUsefulAnswer;
  entries: NatalUsefulEntry[]; balanceText: string; seasonalText: string; conflicts: string[];
  seasonalBalanceConflict: { baseline: boolean; alternativeScenarioIds: string[]; summary: string };
  conditions: string[]; evidence: string[]; sourceIds: string[];
}
/** Current task order within the existing path and working focus; never a claim
 * that every stem of a favored element should be added. */
export interface NatalUsefulAnswer {
  headline: string; summary: string; primaryStems: string[]; companionStems: string[];
  condition: string; evidence: string[]; sourceIds: string[];
}
const POSITIONS: PillarPosition[] = ["year", "month", "day", "hour"];
const LABEL = { year: "年柱", month: "月柱", day: "日柱", hour: "时柱" };
const G = { output: ["食神", "伤官"], wealth: ["正财", "偏财"], resource: ["正印", "偏印"] };
const WEALTH_RESOURCE_SCOPE_BOUNDARY = "原局隔护只适用于已核对的这对财印；岁运来财或来印须重新看它与原局的实际合克，不把来字排成第五柱借用隔护，也不把相合说成合去。";
const unique = <T>(items: readonly T[]) => [...new Set(items)];
const controls = (a: FiveElement, b: FiveElement) => ({ wood: "earth", earth: "water", water: "fire", fire: "metal", metal: "wood" })[a] === b;
const PATH_GODS: Record<string, string[]> = {
  "peer-output-wealth": [...G.output, ...G.wealth], "wealth-food": [...G.output, ...G.wealth],
  "food-wealth": ["食神", ...G.wealth], "hurting-wealth": ["伤官", ...G.wealth],
  "resource-output": [...G.resource, ...G.output], "official-resource": ["正官", ...G.resource],
  "official-wealth": ["正官", ...G.wealth], "food-killings": ["食神", "七杀"],
  "killings-resource": ["七杀", ...G.resource], "hurting-resource": ["伤官", ...G.resource],
  "resource-preservation": [...G.resource, "食神"], "resource-wealth": [...G.wealth, ...G.resource]
};

function wealthResourceAnswer(entries: NatalUsefulEntry[], task: NatalWealthResourceTask, constraints: ReadonlyMap<string, string[]>): NatalUsefulAnswer {
  const wealth = entries.filter((entry) => task.pairs.some((pair) => pair.wealth.stem === entry.stem));
  const resource = entries.filter((entry) => task.pairs.some((pair) => pair.resource.stem === entry.stem));
  const names = (items: NatalUsefulEntry[]) => items.map((entry) => `${entry.stem}${entry.tenGod}`).join("、");
  const primary = task.task === "official_joint" ? [...wealth, ...resource] : task.task === "resource_first" ? resource : task.task === "wealth_first" ? wealth : [];
  const companion = task.task === "resource_first" ? wealth : task.task === "wealth_first" ? resource : task.task === "official_joint"
    ? entries.filter((entry) => entry.stem === task.monthCommand.stem) : [...wealth, ...resource];
  const remaining = unique(primary.flatMap((entry) => constraints.get(entry.stem) ?? []));
  const condition = `${primary.filter((entry) => entry.presence === "exposed_unrooted").map((entry) => `${entry.stem}${entry.tenGod}虽透但所选支内未见同五行根，当前明确的是任务，持续发挥仍有条件。`).join("")}${remaining.length ? `当前优先用字仍有${remaining.join("；")}，不能把分用任务当成已经不受制约。` : ""}`;
  const headline = task.task === "official_joint" ? `${names(wealth)}资官，${names(resource)}承接，各司其职`
    : task.task === "resource_first" ? `先保${names(resource)}护身制伤，${names(wealth)}不宜一味加重`
      : task.task === "wealth_first" ? `先用${names(wealth)}调印，${names(resource)}保留支持基础`
        : `${names(wealth)}与${names(resource)}同透，先分清彼此牵制`;
  const summary = task.task === "official_joint" ? `当前财与印分别有任务：${names(wealth)}向月令${task.monthCommand.stem}正官提供财的支持，${names(resource)}承接官的要求并支持日主。财印之间已有日主或比劫隔护，不直接将这对原局财印判为财坏印；财资官与印承接可以分工，尚不等于每一方都已足量、所有财印运都顺。`
    : task.task === "resource_first" ? `伤官当令，已有${names(wealth)}见根，而日主与${names(resource)}未见各自同类根。当前先保${names(resource)}支持日主、调节伤官输出；${names(wealth)}虽有承接产出的用途，继续加财却会牵制这项印的任务，不能沿“伤官生财”笼统判喜财。`
      : task.task === "wealth_first" ? `伤官当令，${names(resource)}已有本气根，日主也有本气根。当前先让${names(wealth)}调节印的投入，使印的支持与伤官输出相配；${names(resource)}保留基础，并非全部去掉。财目前缺根，取用先后已经明确，是否能够实际调印仍须看承接与后续合克。`
        : `${task.summary}${task.pairs.filter((pair) => pair.hasCombination && !pair.separatedByPeers).map((pair) => `${pair.wealth.stem}${pair.resource.stem}相合而未满足隔护，财与印的作用有牵连，不能同时按自由资官和自由承接来算。`).join("")}`;
  return { headline, summary: `${summary}${condition}`, primaryStems: unique(primary.map((entry) => entry.stem)), companionStems: unique(companion.map((entry) => entry.stem)), condition,
    evidence: unique([task.summary, ...task.evidence, ...task.conditions, WEALTH_RESOURCE_SCOPE_BOUNDARY, ...[...wealth, ...resource].map((entry) => entry.presenceText)]), sourceIds: [...task.sourceIds] };
}

function buildUsefulAnswer(entries: NatalUsefulEntry[], p: BaziPreliminaryAssessment, diagnosis: NatalPatternDiagnosis, respectSeasonalPrerequisite = false, wealthResourceTask?: NatalWealthResourceTask, constraints: ReadonlyMap<string, string[]> = new Map()): NatalUsefulAnswer {
  const working = getWorkingBalance(p);
  const path = diagnosis.primaryPathId;
  if (wealthResourceTask?.preferredPathId) return wealthResourceAnswer(entries, wealthResourceTask, constraints);
  if (working.focus === "wealth_moderates_resource") {
    if (path !== "resource-wealth") throw new Error("印旺用财的当前工作判断与本命路径不一致。");
    const wealth = entries.filter((entry) => G.wealth.includes(entry.tenGod) && entry.presence === "exposed_rooted");
    const prints = entries.filter((entry) => G.resource.includes(entry.tenGod) && entry.presence === "exposed_rooted");
    if (wealth.length !== 1 || prints.reduce((count, entry) => count + entry.occurrences.filter((item) => item.kind === "visible").length, 0) !== 2) throw new Error("印旺用财缺少当前已核对的一处财透根与两处印透根。");
    const names = (items: NatalUsefulEntry[]) => items.map((entry) => `${entry.stem}${entry.tenGod}`).join("、");
    const selected = [...wealth, ...prints];
    const constraints = unique(wealth.flatMap((entry) => entry.interactions.filter((item) => item.kind === "combination" || item.kind === "controlled_by").map((item) => item.text)));
    const condition = `${constraints.length ? `${constraints.join("；")}。财的裁印任务因此带有牵连，不能同时按完全自由的制印来算，也不判财印已被合去。` : "财已透有根，仍须核对实际裁印是否适量，不能仅凭有根就宣告调节完成。"}印轻财重时须转为护印，本次不把更多财或更少印都当作更好；具体调候用字另按季节与透藏阅读。`;
    return { headline: `${names(wealth)}裁印，${names(prints)}保留支持基础`,
      summary: `本盘印当令，两处印透根，自身另有本气根；当前先用已透有根的${names(wealth)}裁抑过多印的投入，让准备与支持对接实际用途。${names(prints)}仍保留学习和承接基础，重点是适量使用，并非继续加印或把印一概去掉。${condition}`,
      primaryStems: wealth.map((entry) => entry.stem), companionStems: prints.map((entry) => entry.stem), condition,
      evidence: unique([`当前主任务来自${working.version}/${working.ruleId}/${working.focus}，只对已核对的结构条件开放。`, ...working.evidence, ...working.conditions, ...diagnosis.foundation,
        ...selected.flatMap((entry) => [entry.presenceText, ...entry.interactions.flatMap((item) => [item.text, ...item.evidence])])]),
      sourceIds: unique([...working.sourceIds, ...diagnosis.sourceIds, ...selected.flatMap((entry) => entry.sourceIds)]) };
  }
  if (working.focus === "rooted_peer_mixed_authority") {
    const rooted = (gods: string[]) => entries.filter((entry) => gods.includes(entry.tenGod) && entry.presence === "exposed_rooted");
    const wealth = rooted(G.wealth), officials = rooted(["正官"]), killings = rooted(["七杀"]);
    if (!wealth.length || !officials.length || !killings.length) throw new Error("得令有根的工作判断缺少对应财、官、杀实际透根用字。");
    const names = (items: NatalUsefulEntry[]) => items.map((entry) => `${entry.stem}${entry.tenGod}`).join("、");
    const selected = [...wealth, ...officials, ...killings];
    const conditions = unique([...working.conditions, ...selected.flatMap((entry) => entry.interactions.map((item) => item.text))]);
    const condition = `财的投入同时牵动官与杀的要求；${names(officials)}与${names(killings)}未按已经取清处理，${strengthElementLabel(strengthElementForStem(officials[0]!.stem))}不作笼统增补。若有新的制约或承接用字实际透出，须核对它具体作用于官还是杀及能否发挥；原局藏字不能预先当作制化完成，日主自合也不作为合去官杀。`;
    return { headline: `${names(wealth)}承担财的任务；${names(officials)}与${names(killings)}尚未取清`,
      summary: `月令比劫与别支同类本气根提供了自身承接，${names(wealth)}也已透有根。${diagnosis.currentJudgment}在实际任务中，${names(officials)}的职责标准与${names(killings)}的急迫要求分别阅读；财能生官，也会生杀，投入不能只当作对一方的助力。${condition}`,
      primaryStems: wealth.map((entry) => entry.stem), companionStems: [...officials, ...killings].map((entry) => entry.stem), condition,
      evidence: unique([`当前角色来自${working.version}/${working.ruleId}/${working.focus}，不是新增全盘五行排序。`, ...working.evidence, ...conditions,
        ...selected.flatMap((entry) => [entry.presenceText, ...entry.interactions.flatMap((interaction) => interaction.evidence)]), ...diagnosis.foundation, ...diagnosis.blockers.flatMap((finding) => [finding.text, ...finding.evidence])]),
      sourceIds: unique([...working.sourceIds, ...diagnosis.sourceIds, ...selected.flatMap((entry) => entry.sourceIds)]) };
  }
  const actionGods: Record<string, string[]> = {
    "peer-output-wealth": G.output, "wealth-food": G.output, "food-wealth": ["食神"], "hurting-wealth": ["伤官"],
    "resource-output": G.output, "food-killings": ["食神"], "official-resource": G.resource,
    "killings-resource": G.resource, "official-wealth": G.wealth, "hurting-resource": G.resource, "resource-preservation": G.resource,
  };
  const hasRole = (entry: NatalUsefulEntry, kind: NatalUsefulRoleKind) => entry.roles.some((role) => role.kind === kind);
  const exposed = (entry: NatalUsefulEntry) => entry.presence.startsWith("exposed");
  const pathEntries = entries.filter((entry) => hasRole(entry, "path_key"));
  const wealthFocus = working.selection === "structural_rule" && working.focus === "wealth_after_output";
  const outputFocus = working.selection === "structural_rule" && working.focus === "output_after_resource";
  const preferredGods = wealthFocus ? G.wealth : outputFocus ? G.output : actionGods[path] ?? [];
  const primary = pathEntries.filter((entry) => exposed(entry) && preferredGods.includes(entry.tenGod)
    && (!(wealthFocus || outputFocus) || (entry.presence === "exposed_rooted" && hasRole(entry, "baseline_favorable"))));
  if ((wealthFocus || outputFocus) && !primary.length) throw new Error("结构取用的当前优先缺少对应已透有根用字。");
  // Authority in these paths is an object/background, not an instruction to add it.
  const objectGods = path === "food-killings" || path === "killings-resource" ? ["七杀"]
    : path === "official-resource" || path === "official-wealth" ? ["正官"] : path === "hurting-resource" ? ["伤官"] : [];
  const objects = pathEntries.filter((entry) => objectGods.includes(entry.tenGod));
  const companions = entries.filter((entry) => !primary.includes(entry) && !objects.includes(entry)
    && ((hasRole(entry, "path_key") && !preferredGods.includes(entry.tenGod)) || hasRole(entry, "seasonal_preferred")));
  const stems = (items: NatalUsefulEntry[]) => items.map((entry) => entry.stem).join("、");
  const names = (items: NatalUsefulEntry[]) => items.map((entry) => `${entry.stem}${entry.tenGod}`).join("、");
  const objectText = objects.map((entry) => diagnosis.monthCommandRole?.stem === entry.stem ? `月令${entry.stem}${entry.tenGod}`
    : `${entry.presence === "hidden_only" ? "藏" : entry.presence === "absent" ? "缺位" : ""}${entry.stem}${entry.tenGod}`).join("、");
  const task = ["peer-output-wealth", "wealth-food", "food-wealth", "hurting-wealth"].includes(path) ? "产出与生财的主环节"
    : path === "resource-output" ? "印格背景中的泄秀出口"
    : path === "food-killings" ? `调节${objectText || "七杀"}压力的食神输出`
    : path === "official-resource" || path === "killings-resource" ? `承接${objectText || "官杀"}要求、支持日主的印星环节`
    : path === "official-wealth" ? `配合${objectText || "正官"}职责的财星支持`
    : path === "hurting-resource" ? `约束${objectText || "伤官"}表达、支持日主的印星环节` : "协调印食取舍的支持环节";
  const joint = primary.filter((entry) => hasRole(entry, "seasonal_preferred"));
  const weakConflict = !respectSeasonalPrerequisite && working.direction === "support" && primary.some((entry) => hasRole(entry, "baseline_unfavorable"));
  const carrying = working.favorableElements.map(strengthElementLabel).join("、");
  const companionHeading = companions.map((entry) => {
    const duties: string[] = [];
    if (hasRole(entry, "path_key")) duties.push(G.resource.includes(entry.tenGod) ? entry.presence === "hidden_only" ? "印背景" : "印支持"
      : G.wealth.includes(entry.tenGod) ? "资源承接" : ["比肩", "劫财"].includes(entry.tenGod) ? "月令比劫背景"
        : G.output.includes(entry.tenGod) ? "食伤配合" : "官杀背景");
    if (hasRole(entry, "seasonal_preferred")) duties.push("调候考察");
    else if (hasRole(entry, "seasonal_conditional")) duties.push("条件调候");
    const duty = duties.join("与");
    return entry.presence === "absent" ? `${entry.stem}未见，保留${duty}候选` : entry.presence === "hidden_only" ? `${entry.stem}藏作${duty}` : `${entry.stem}参与${duty}`;
  }).join("、");
  const primaryHeading = path === "food-killings" ? `${names(primary)}制${diagnosis.monthCommandRole ? "月令" : ""}${stems(objects)}杀`
    : path === "official-resource" || path === "killings-resource" ? `${stems(primary)}印承接${objectText || "官杀"}要求`
    : path === "official-wealth" ? `${stems(primary)}财配合${objectText || "正官"}职责`
    : path === "hurting-resource" ? `${stems(primary)}印校正${objectText || "伤官"}表达`
    : path === "resource-preservation" ? `${stems(primary)}印参与印食取舍`
    : `${stems(primary)}${joint.length === primary.length && joint.length ? "兼顾产出与调候" : path === "resource-output" ? "负责输出" : "负责产出"}${joint.length && joint.length !== primary.length ? `，${stems(joint)}兼顾调候` : ""}`;
  const headline = wealthFocus ? `取用以${names(primary)}承接已有食神产出`
    : outputFocus ? `取用以${names(primary)}泄秀，印的支持转入实际输出`
    : primary.length ? `${weakConflict ? "先稳承接，保留" : ""}${primaryHeading}${companionHeading ? `，${companionHeading}` : ""}${primary.some((entry) => entry.presence === "exposed_unrooted") ? "，根气仍需承接" : ""}`
    : `月令背景${p.pattern.monthMainStem}${p.seasonal.preferredStems.length ? `，调候考察${p.seasonal.preferredStems.join("、")}` : "，配合按已知条件分读"}`;
  const monthOutput = pathEntries.find((entry) => entry.stem === p.pattern.monthMainStem && entry.tenGod === "食神");
  const structuralReason = wealthFocus
    ? `日主坐下本气根、别支同类根与透比共同提供承接，月令${p.pattern.monthMainStem}食神已有产出背景。${monthOutput?.presence === "hidden_only" ? `${monthOutput.stem}食神未透，仍以月令背景参与配合。` : ""}当前以已透有根的${names(primary)}承接这些产出，重点在成果的使用与兑现，不再一概追加食伤。`
    : outputFocus ? `印的透根与日主坐下本气根分别有据，当前以已透有根的${names(primary)}作为印格背景中的泄秀出口，让支持经过日主转成成果。印仍有支持作用，也可能克制输出；财官与其他用字保留各自条件，不随泄秀一并列喜。` : "";
  const lead = structuralReason || (primary.length ? `${weakConflict ? `当前先照顾${carrying}的承接，再保留` : "当前以已透的"}${names(primary)}作为${task}${joint.length ? `，其中${stems(joint)}也承担本条调候考察的任务` : ""}${diagnosis.monthCommandRole ? `；月令${diagnosis.monthCommandRole.stem}仍藏，未按透干作用` : ""}。`
    : `${p.pattern.monthMainStem}${p.pattern.monthMainTenGod}目前提供月令背景，${working.direction === "balanced" ? "扶抑中和，不另定固定喜忌" : `扶抑先照顾${carrying}的方向`}；具体配合仍按已知透藏说明。`);
  const companionText = companions.map((entry) => {
    const state = entry.presence === "hidden_only" ? "仅藏" : entry.presence === "absent" ? "原局未见" : "已透";
    const duties: string[] = [];
    if (hasRole(entry, "path_key")) duties.push(G.wealth.includes(entry.tenGod) ? exposed(entry) ? "承接产出与资源兑现" : "保留承接产出的候选"
      : G.resource.includes(entry.tenGod) ? exposed(entry) ? "提供印星支持" : "提供印的背景，未按透印发挥"
        : ["比肩", "劫财"].includes(entry.tenGod) ? "保留月令比劫背景" : G.output.includes(entry.tenGod) ? "保留食伤的结构配合" : "保留官杀的结构背景");
    const jiSummerGui = entry.stem === "癸" && p.seasonal.sourceIds.includes("preliminary-qiongtong-ji-si");
    if (hasRole(entry, "seasonal_preferred")) duties.push(`${duties.length ? "同时" : ""}作为${jiSummerGui ? "调润" : "调候"}考察字`);
    else if (hasRole(entry, "seasonal_conditional")) duties.push(`${duties.length ? "另有" : "保留"}条件调候任务`);
    return `${entry.stem}${state}，${duties.join("；")}`;
  }).join("；");
  const actionEntries = [...primary, ...companions.filter((entry) => exposed(entry) && hasRole(entry, "path_key"))];
  const unrooted = actionEntries.find((entry) => entry.presence === "exposed_unrooted");
  const constrained = actionEntries.flatMap((entry) => entry.interactions).find((interaction) => interaction.kind === "combination" || interaction.kind === "controlled_by");
  const hiddenPartners = companions.filter((entry) => !exposed(entry));
  const conditionalPartner = companions.flatMap((entry) => entry.roles.filter((role) => role.kind === "seasonal_conditional").map((role) => `${entry.stem}：${role.text}`))[0];
  const conditionBase = unrooted ? `${unrooted.stem}虽透，所选地支未见同五行藏根；先保留其任务，根气与承接改变时再判断能否持续发挥，不能按已足量有效处理。`
    : constrained ? `${constrained.text}；应先复核这项牵制，再决定怎样配合，不把相合或受克直接判成该字失效。`
    : weakConflict ? `当前承接偏弱，保护${stems(primary)}的结构任务不等于继续增加泄耗；自身支持或任务负荷改变时，要重看承接与制衡是否相配。`
    : hiddenPartners.length ? `${stems(hiddenPartners)}${hiddenPartners.every((entry) => entry.presence === "hidden_only") ? "目前仅藏" : "未成为实际透干配合"}；若以后透出，须重看${path === "resource-output" ? "印食轻重与季节需要" : "原有任务、承接与季节需要"}，不能当作已经配齐。`
    : conditionalPartner ?? (primary.length ? `先保持${stems(primary)}现有任务与承接相配；受合受制或负荷改变时再复核，同字增多不等于作用更好。` : p.seasonal.conditions[0] ?? "时柱或配合条件补齐后，再判断具体用字的主次。");
  const condition = `${conditionBase}${wealthFocus ? `若财的承接受到合克、另增食伤或官杀负担，须重看${stems(primary)}能否接住已有产出；不因当前取财就继续加大所有泄耗。` : outputFocus ? `若印的支持转为压住输出，或财官加入改变印食配合，须重看${stems(primary)}的出口是否仍顺畅；原本自身根气与印根也须分别保留。` : ""}`;
  const primarySeasonal = wealthFocus || outputFocus ? primary.flatMap((entry) => entry.roles.filter((role) => role.axis === "seasonal").map((role) => `${entry.stem}另有${role.kind === "seasonal_conditional" ? "条件调候" : "调候"}任务：${role.text.replace(/[。；;]+$/u, "")}。`)).join("") : "";
  const selected = unique([...primary, ...objects, ...companions]);
  return { headline, summary: `${lead}${companionText ? `${companionText}。` : ""}${primarySeasonal}${condition}`, primaryStems: primary.map((entry) => entry.stem), companionStems: companions.map((entry) => entry.stem), condition,
    evidence: unique([`本句只按既定路径${path}组织动作字、作用对象与配合，不另排全盘喜忌。`, ...(wealthFocus || outputFocus ? [`当前优先来自${working.version}/${working.ruleId}/${working.focus}：${working.summary}`, ...working.evidence, ...working.conditions] : []), ...selected.flatMap((entry) => [entry.presenceText, ...entry.roles.map((role) => `${entry.stem}/${role.axis}/${role.kind}：${role.text}`), ...entry.interactions.flatMap((interaction) => [interaction.text, ...interaction.evidence])]), ...diagnosis.foundation]),
    sourceIds: unique([...selected.flatMap((entry) => entry.sourceIds), ...working.sourceIds, ...p.seasonal.sourceIds, ...diagnosis.sourceIds]) };
}

function hasCheckedGuiZiPrerequisite(entries: NatalUsefulEntry[], p: BaziPreliminaryAssessment, dayStem: string, monthBranch: string): boolean {
  return dayStem === "癸" && monthBranch === "子" && p.seasonal.ruleId === "qiongtong-gui-zi-w2294674-v1"
    && p.seasonal.sourceIds.includes("preliminary-qiongtong-gui-zi")
    && entries.some((entry) => entry.stem === "丙" && entry.roles.some((role) => role.kind === "seasonal_preferred"))
    && entries.some((entry) => entry.stem === "辛" && entry.roles.some((role) => role.kind === "seasonal_conditional"));
}

/** This single checked clause supplies a prerequisite between two seasonal
 * roles, not a new strength band or a general preference for every winter chart. */
function guiZiSeasonalAnswer(entries: NatalUsefulEntry[], p: BaziPreliminaryAssessment, dayStem: string, monthBranch: string,
  original: NatalUsefulAnswer): NatalUsefulAnswer {
  const working = getWorkingBalance(p);
  if (!hasCheckedGuiZiPrerequisite(entries, p, dayStem, monthBranch)) return original;
  const bing = entries.find((entry) => entry.stem === "丙" && entry.roles.some((role) => role.kind === "seasonal_preferred"));
  const xin = entries.find((entry) => entry.stem === "辛" && entry.roles.some((role) => role.kind === "seasonal_conditional"));
  if (!bing || !xin) return original;
  const bingVisible = bing.presence === "exposed_rooted" || bing.presence === "exposed_unrooted";
  const xinVisible = xin.presence === "exposed_rooted" || xin.presence === "exposed_unrooted";
  const bingHeading = bing.presence === "exposed_rooted" ? "丙已透有根，温通支点已在" : bing.presence === "exposed_unrooted" ? "丙已透，温通仍需根气承接"
    : bing.presence === "hidden_only" ? "丙仅藏，温通线索尚未透出" : "丙未见，温通用字尚缺";
  const xinHeading = xinVisible ? "辛已透，滋扶须与丙配合" : xin.presence === "hidden_only" ? "辛仅藏，保留滋扶配合" : "辛未见，滋扶仍是候选";
  const bingState = `${bing.presenceText}${bingVisible ? bing.sameElementRoots.length ? "原局已有丙的温通支点。" : "已有丙透的线索，但其持续作用仍缺所选地支的同五行根气承接。"
    : bing.presence === "hidden_only" ? "当前只保留支内温通线索，未按丙已透发挥解释。" : "丙这一温通用字原局未见，不能由同五行线索代称丙已出现。"}`;
  const xinState = `${xin.presenceText}${xinVisible ? bing.presence === "absent" ? "不能仅因辛已透就认作温通配齐；辛的滋扶仍有配丙前提。"
    : "辛虽已透，滋扶仍须结合丙能否承担温通来读。" : xin.presence === "hidden_only" ? "辛的滋扶只保留藏干线索，不当作已透并完成配用。" : "辛这一滋扶配用字尚缺，不能叙述为已经配齐。"}`;
  const load = working.direction === "conditional" ? `当前相对旺衰工作判断为“${working.label}”；条件保留在格局喜用的角色取舍，丙的温通任务与财生官杀的负担分别阅读，辛仍只按本条配用前提保留候选。`
    : `扶抑仍按${working.label}作当前判断，${working.direction === "support" ? "印比生扶与现有泄耗负担另行对照" : working.direction === "drain" ? "泄耗制衡与日主承接另行对照" : "不因本条调候安排另定全盘固定喜忌"}；这不把丙、辛转成越多越好的字。`;
  const interactions = unique([bing, xin].flatMap((entry) => entry.interactions.map((item) => item.text)));
  const condition = ["本条先后指调候的配合前提与考察侧重，不是事情发生的先后；不因丙已出现就宣告温通完成，也不以有辛替代丙的任务。",
    `原结构条件：${original.condition}`,
    ...interactions, ...(interactions.length ? ["这些牵连仍按原条目保留，不据合冲本身宣告用字消失或调候成功。"] : [])].join("");
  const mixedAuthority = working.focus === "rooted_peer_mixed_authority";
  return { ...original, headline: mixedAuthority ? `${bingHeading}，温通为先；${xinHeading}；官杀仍须取清` : `${bingHeading}；${xinHeading}`,
    summary: `癸日子月的调候以丙的温通为先，辛的滋扶须与丙配合。${bingState}${xinState}格局上，${original.summary}${load}`,
    condition,
    evidence: unique([...original.evidence, `只匹配已核规则 ${p.seasonal.ruleId} / preliminary-qiongtong-gui-zi：丙温通与辛滋扶具有配合前提，不由基础旺衰分数倒置。`,
      bing.presenceText, xin.presenceText, `扶抑原值不变：${p.balance.supportWeight}/${p.balance.demandWeight}，${p.balance.label}。`,
      ...[bing, xin].flatMap((entry) => entry.interactions.flatMap((item) => item.evidence))]),
    sourceIds: unique([...original.sourceIds, ...p.seasonal.sourceIds]) };
}

/** An explanation of existing axes and selected actors. It does not select a
 * new path, change strength bands, evaluate dose or assign a global 喜用 score. */
export function buildNatalUsefulGuidance(revision: RevisionRecord, preliminary: BaziPreliminaryAssessment, suppliedDiagnosis?: NatalPatternDiagnosis): NatalUsefulGuidance {
  const r = revisionRecordSchema.parse(revision), p = preliminary;
  const working = getWorkingBalance(p);
  // This explicit order belongs to the checked three-summer Ji passage. Other
  // catalog lists may describe joint or conditional uses, so their array order
  // alone must not be promoted into a universal first/second ranking.
  const jiSummerOrder = r.facts.pillars.day.stem === "己" && ["巳", "午", "未"].includes(r.facts.pillars.month.branch)
    && p.seasonal.coverage === "checked_classic_clause"
    && p.sources.some(source => p.seasonal.sourceIds.includes(source.id)
      && source.provenance?.section === "三夏己土" && source.provenance.scope === "season")
    && p.seasonal.preferredStems.join("、") === "癸、丙";
  const includeHour = r.input.timePrecision !== "unknown_hour" && r.input.timePrecision !== "date_only";
  if (p.sourceBinding.revisionId !== r.id || p.sourceBinding.chartResultHash !== r.manifest.resultHash || p.sourceBinding.includeHour !== includeHour
    || p.pattern.monthMainStem !== r.facts.pillars.month.hiddenStems[0] || p.balance.dayMasterElement !== strengthElementForStem(r.facts.pillars.day.stem)) throw new Error("取用说明与命盘初判来源不匹配。");
  const diagnosis = suppliedDiagnosis ?? buildNatalPatternDiagnosis(r, p);
  if (diagnosis.sourceBinding.revisionId !== r.id || diagnosis.sourceBinding.chartResultHash !== r.manifest.resultHash || diagnosis.sourceBinding.includeHour !== includeHour) throw new Error("取用说明与格局诊断来源不匹配。");
  const path = diagnosis.primaryPathId;
  const wealthResourceTask = evaluateNatalWealthResourceTask({ facts: p.balance.structural.inputFacts, includeHour });
  if (wealthResourceTask.preferredPathId && wealthResourceTask.preferredPathId !== path) throw new Error("财印取用任务与同盘格局路径不一致。");
  if ("wealthResourceTask" in diagnosis && JSON.stringify(diagnosis.wealthResourceTask) !== JSON.stringify(wealthResourceTask)) throw new Error("财印取用任务与本命事实不一致。");
  const monthCommand = diagnosis.monthCommandRole;
  if (!PATH_GODS[path] && path !== `${p.pattern.family}-background`) throw new Error("取用说明缺少当前主路径的解释映射。");
  const positions = POSITIONS.filter((position) => includeHour || position !== "hour");
  const occurrences: NatalUsefulOccurrence[] = positions.flatMap((position) => {
    const pillar = r.facts.pillars[position];
    return [...(position === "day" ? [] : [{ position, kind: "visible" as const, branch: pillar.branch, stem: pillar.stem }]),
      ...pillar.hiddenStems.map((stem) => ({ position, kind: "hidden" as const, branch: pillar.branch, stem }))];
  });
  const god = (stem: string) => canonicalizeStrengthTenGod((LunarUtil.SHI_SHEN as Record<string, string>)[r.facts.pillars.day.stem + stem]!);
  const visible = occurrences.filter((item) => item.kind === "visible"), hidden = occurrences.filter((item) => item.kind === "hidden");
  const names = (gods: string[]) => unique(visible.filter((item) => gods.includes(god(item.stem))).map((item) => item.stem)).join("、");
  const selectedGods = PATH_GODS[path] ?? [p.pattern.monthMainTenGod];
  const taskStems = wealthResourceTask.preferredPathId ? wealthResourceTask.pairs.flatMap((pair) => [pair.wealth.stem, pair.resource.stem]) : [];
  const pathOrder = (stem: string) => { const index = selectedGods.indexOf(god(stem)); return index < 0 ? selectedGods.length : index; };
  const pathStems = unique([...occurrences.filter((item) => selectedGods.includes(god(item.stem))).map((item) => item.stem), ...taskStems])
    .sort((a, b) => Number(!visible.some((item) => item.stem === a)) - Number(!visible.some((item) => item.stem === b)) || pathOrder(a) - pathOrder(b));
  if (!PATH_GODS[path]) pathStems.splice(0, pathStems.length, p.pattern.monthMainStem);
  const rescueFindings = diagnosis.rescues.filter((item) => item.scope === "primary");
  const rescueEvidenceFor = (stem: string) => rescueFindings.filter((finding) => {
    const eligible = finding.id === "resource-protects-official" ? G.resource : ["wealth-protects-food", "wealth-protects-food-output"].includes(finding.id) ? G.wealth : finding.id === "peer-protects-resource" ? ["比肩", "劫财"] : [];
    // Existing diagnosis evidence has exact actor tokens. Membership binds the
    // candidate to a named position; group membership alone cannot invent one.
    return eligible.includes(god(stem)) && visible.some((item) => item.stem === stem && finding.evidence.includes(`${LABEL[item.position].replace("柱", "干")}${stem}（${god(stem)}）`));
  });
  const rescueStems = unique(visible.filter((item) => rescueEvidenceFor(item.stem).length > 0).map((item) => item.stem));
  const workingStems = working.focus === "rooted_peer_mixed_authority"
    ? unique(visible.filter((item) => [...G.wealth, "正官", "七杀"].includes(god(item.stem))).map((item) => item.stem)) : [];
  const stems = unique([...pathStems, ...workingStems, ...rescueStems, ...p.seasonal.preferredStems, ...p.seasonal.conditionalStems.map((item) => item.stem)]);
  const relationFacts = calculatePillarRelations({ year: r.facts.pillars.year.ganZhi, month: r.facts.pillars.month.ganZhi,
    day: r.facts.pillars.day.ganZhi, hour: includeHour ? r.facts.pillars.hour.ganZhi : r.facts.pillars.day.ganZhi }).facts
    .filter((fact) => fact.completeness === "binary" && fact.participants.length === 2 && fact.participants.every((item) => positions.includes(item.position))
      && ["stem_five_combination", "stem_clash"].includes(fact.relationType));
  const separatedPair = (a: { position: PillarPosition; stem: string }, b: { position: PillarPosition; stem: string }) => wealthResourceTask.pairs.some((pair) => pair.separatedByPeers
    && ((pair.wealth.position === a.position && pair.wealth.stem === a.stem && pair.resource.position === b.position && pair.resource.stem === b.stem)
      || (pair.resource.position === a.position && pair.resource.stem === a.stem && pair.wealth.position === b.position && pair.wealth.stem === b.stem)));
  function pathRole(stem: string): string {
    const role = god(stem);
    if (wealthResourceTask.preferredPathId) {
      const isWealth = wealthResourceTask.pairs.some((pair) => pair.wealth.stem === stem), isResource = wealthResourceTask.pairs.some((pair) => pair.resource.stem === stem);
      if (monthCommand?.tenGod === "伤官" && stem === monthCommand.stem) return "月令伤官已有输出背景，仍在藏干层；财印任务要调节这项输出与自身承接，不把月令伤官冒作自由透干";
      if (isWealth || isResource) {
        if (wealthResourceTask.task === "official_joint") return isWealth ? `资助月令${wealthResourceTask.monthCommand.stem}正官，与原局印分位使用；隔护不扩展到后来新增的财印` : "承接正官要求并支持日主，与原局财分位使用；不把所有财都当作已经破坏这项印";
        if (wealthResourceTask.task === "resource_first") return isResource ? "先保留护身与制伤的任务，虽已透而缺根，不能把需要此印说成此印已足量奏效" : "保留已有财的承接用途，但财已有根、印与自身承接薄弱，不继续把加财列作普遍优先";
        if (wealthResourceTask.task === "wealth_first") return isWealth ? "优先调节印的投入；财已透但缺根，取用方向明确而持续发挥仍有条件" : "保留已有印根提供的基础，由财调节投入，不因有印便继续增印，也不把原印全部列为忌";
        return "财印双方均保留实际作用，当前未满足分用任务的完整前提；具体隔护、相合与根气需分别判断";
      }
    }
    if (monthCommand && stem === monthCommand.stem) return `作为${r.facts.pillars.month.branch}月本气的${role}背景，${path === "food-killings" ? `与已透${names(["食神"])}食神形成制衡候选` : path === "official-wealth" ? `承接已透${names(G.wealth)}财星的资源投入候选` : `与已透${names(G.resource)}印星形成承接候选`}；月令支点已存在，未透仍不按自由天干生克解释`;
    if (monthCommand && path === "food-killings" && role === "食神") return `作为调节月令${monthCommand.stem}${monthCommand.tenGod}的食神输出，制约角色已有明确对象，实际制衡仍看根气、轻重与日主承接`;
    if (monthCommand && ["official-resource", "killings-resource"].includes(path) && G.resource.includes(role)) return `承担月令${monthCommand.stem}${monthCommand.tenGod}与日主之间的印星承接，是否充分仍看根气、财印牵制与日主受益`;
    if (monthCommand && path === "official-wealth" && G.wealth.includes(role)) return `向月令${monthCommand.stem}${monthCommand.tenGod}的职责背景提供财的支持候选，资源与责任的负担仍需相配`;
    if (["peer-output-wealth", "wealth-food", "food-wealth", "hurting-wealth"].includes(path)) return G.output.includes(role)
      ? `承担产出、生财的环节${names(G.wealth) ? `，对接${names(G.wealth)}财星` : "，财的透出仍需条件"}` : `承接${names(G.output) || "食伤"}的产出与资源兑现`;
    if (path === "food-killings") return role === "食神" ? `作为制约${names(["七杀"]) || "七杀"}的食神输出` : `由${names(["食神"]) || "食神"}制约的七杀，是责任与制衡的作用对象`;
    if (path === "resource-output") return G.output.includes(role) ? `作为日主承接${names(G.resource) || "印"}支持之后的泄秀出口` : `先支持日主，再由日主承接${names(G.output) || "食伤"}输出；印与输出之间仍有克制与轻重取舍`;
    if (path === "resource-wealth") return G.wealth.includes(role) ? `在印当令、两处印透根与自身另有本气根的条件下，裁抑${names(G.resource)}印的过多投入；财受合克时不能按自由制印解释`
      : `保留印的学习与承接基础，由已透${names(G.wealth)}财调节过多的投入；保留基础不等于继续增加印，也不把印整体列为忌`;
    if (["official-resource", "killings-resource", "hurting-resource"].includes(path)) return G.resource.includes(role)
      ? `承担${path === "hurting-resource" ? "约束伤官并支持日主" : `承接${names(path === "official-resource" ? ["正官"] : ["七杀"]) || "官杀"}并支持日主`}的印星环节`
      : path === "hurting-resource" ? "作为需要印来配合的表达与输出" : `作为需要${names(G.resource) || "印"}承接的${role}责任`;
    if (path === "official-wealth") return role === "正官" ? `承接${names(G.wealth) || "财"}所生的官星责任` : `向${names(["正官"]) || "官"}提供财的支持`;
    if (path === "resource-preservation") return G.resource.includes(role) ? "作为印食取舍中需要考察的印星支持" : "作为需与印的作用分读的食神输出";
    return `作为${p.pattern.background}的月令背景用字，尚未据此指定全盘喜忌`;
  }
  const constraintsByStem = new Map<string, string[]>();
  const entries: NatalUsefulEntry[] = stems.map((stem) => {
    const element = strengthElementForStem(stem), exact = occurrences.filter((item) => item.stem === stem), exposed = exact.filter((item) => item.kind === "visible");
    const roots = hidden.filter((item) => strengthElementForStem(item.stem) === element).map(({ kind: _kind, ...item }) => item);
    const presence: NatalUsefulEntry["presence"] = exposed.length ? roots.length ? "exposed_rooted" : "exposed_unrooted" : exact.length ? "hidden_only" : "absent";
    const where = (item: NatalUsefulOccurrence | Omit<NatalUsefulOccurrence, "kind">) => `${LABEL[item.position]}${item.branch}中${item.stem}`;
    const presenceText = `${exposed.length ? `${stem}透在${exposed.map((item) => LABEL[item.position]).join("、")}` : exact.length ? `${stem}仅藏于${exact.map(where).join("、")}` : `原局所选柱未见${stem}`}；${roots.length ? `同五行藏根见${unique(roots.map(where)).join("、")}` : "所选地支未见同五行藏根"}。`;
    const roles: NatalUsefulRole[] = [], conditions: string[] = [];
    const favorable = working.favorableElements.includes(element), unfavorable = working.unfavorableElements.includes(element);
    const dayName = `日主${r.facts.pillars.day.stem}${strengthElementLabel(p.balance.dayMasterElement)}`, stemName = `${stem}${strengthElementLabel(element)}`;
    const dayLink = ({ same_element: `${stemName}与${dayName}同类，属于比劫支持`, generates_day_master: `${stemName}生${dayName}，属于印星生扶`,
      generated_by_day_master: `${dayName}生${stemName}，属于食伤泄身`, controlled_by_day_master: `${dayName}克${stemName}，属于财星耗身`,
      controls_day_master: `${stemName}克${dayName}，属于官杀制身`, day_master_self: `${stemName}与${dayName}同字` })[strengthElementRelation(p.balance.dayMasterElement, element)];
    roles.push({ axis: "balance", kind: favorable ? "baseline_favorable" : unfavorable ? "baseline_unfavorable" : "not_fixed",
      text: `${dayLink}；${favorable ? `${strengthElementLabel(element)}是当前${working.label}判断明确优先的方向，仍须看具体配合与分量` : unfavorable ? `${strengthElementLabel(element)}在当前判断中宜避免继续加重` : "当前判断未给此五行固定喜忌，须看具体配合"}`,
      sourceIds: [...working.sourceIds] });
    if (workingStems.includes(stem)) roles.push({ axis: "balance", kind: "working_role",
      text: G.wealth.includes(god(stem)) ? "已有透根的财星参与资源投入，也会生官与生杀；其作用随职责、压力与自身承接分别判断"
        : god(stem) === "正官" ? "已透有根的正官承接职责与规则，和七杀分读；有财生官不等于官杀已经取清"
        : "已透有根的七杀带来需要制约或承接的压力，财生杀的负担另列，不能沿财生官一并判为支持",
      sourceIds: [...working.sourceIds] });
    if (pathStems.includes(stem)) roles.push({ axis: "pattern", kind: "path_key", text: pathRole(stem), sourceIds: [...diagnosis.sourceIds] });
    if (rescueStems.includes(stem)) roles.push({ axis: "pattern", kind: "rescue_candidate", text: "已有本命诊断将其列入救应候选，受合受制与是否有根的条件继续保留", sourceIds: [...diagnosis.sourceIds] });
    if (p.seasonal.preferredStems.includes(stem)) roles.push({ axis: "seasonal", kind: "seasonal_preferred",
      text: jiSummerOrder && stem === "癸" ? "三夏己土调候以癸水润土为先；这是气候用途的首取，不等于全盘水越多越好"
        : jiSummerOrder && stem === "丙" ? "三夏己土调候以丙火为癸水的次用配合，不与癸并列首取；原局已有火的背景，不据此继续增火"
          : `当前调候条目优先考察${stem}，并非该字越多越好`, sourceIds: [...p.seasonal.sourceIds] });
    for (const item of p.seasonal.conditionalStems.filter((item) => item.stem === stem)) {
      roles.push({ axis: "seasonal", kind: "seasonal_conditional", text: item.condition, sourceIds: [...p.seasonal.sourceIds] }); conditions.push(item.condition);
    }
    const interactions: NatalUsefulInteraction[] = [], separatedTexts = new Set<string>();
    for (const own of exposed) {
      for (const fact of relationFacts.filter((fact) => fact.participants.some((item) => item.position === own.position))) {
        const other = fact.participants.find((item) => item.position !== own.position)!;
        const separated = separatedPair(own, { position: other.position, stem: other.value });
        const text = `${LABEL[own.position]}${stem}与${LABEL[other.position]}${other.value}${fact.relationType === "stem_five_combination" ? separated ? "保留五合事实；本命财印有日主或比劫隔护，未按直接合绊解释" : "相合，现有作用带有牵连" : "有天干冲，具体作用需与主路径分读"}`;
        if (separated && fact.relationType === "stem_five_combination") separatedTexts.add(text);
        interactions.push({ kind: fact.relationType === "stem_five_combination" ? "combination" : "clash", text, evidence: [fact.id, fact.ruleId] });
      }
      for (const other of visible.filter((item) => item.position !== own.position)) {
        const otherElement = strengthElementForStem(other.stem);
        const separated = separatedPair(own, other);
        if (controls(otherElement, element)) {
          const text = `${LABEL[other.position]}${other.stem}可克${LABEL[own.position]}${stem}${separated ? "；本命财印有日主或比劫隔护，保留五行联系，不直接判为财坏印" : ""}`;
          if (separated) separatedTexts.add(text);
          interactions.push({ kind: "controlled_by", text, evidence: [`透干五行联系：${other.stem}${strengthElementLabel(otherElement)}克${stem}${strengthElementLabel(element)}；未量化强弱。`] });
        }
        if (controls(element, otherElement)) interactions.push({ kind: "controls", text: `${LABEL[own.position]}${stem}可克${LABEL[other.position]}${other.stem}${separated ? "；本命隔护下分别保留财印任务，未判直接损印或制印完成" : ""}`, evidence: [`透干五行联系：${stem}${strengthElementLabel(element)}克${other.stem}${strengthElementLabel(otherElement)}；未量化强弱。`] });
      }
    }
    const actualInteractions = [...new Map(interactions.map((item) => [`${item.kind}:${item.text}`, item])).values()];
    const currentConstraints = actualInteractions.filter((item) => (item.kind === "combination" || item.kind === "controlled_by") && !separatedTexts.has(item.text));
    constraintsByStem.set(stem, currentConstraints.map((item) => item.text));
    if (separatedTexts.size) conditions.push(...separatedTexts, "隔护只用于这对本命财印的实际位置，不用于未来岁运来字。");
    if (!exposed.length) {
      conditions.push(monthCommand?.stem === stem ? `月令本气${stem}${god(stem)}已经提供当令背景，不必等到透干才承认这条背景；但它仍未透，不能据此生成天干合克、自由制杀或救应。` : exact.length ? `当前只是藏干，不能按${stem}已透并自由发挥来解释；若实际岁运让${stem}透出，再结合该运完整判断看是否可用。` : `当前没有${stem}，这里只列需要考察的缺位候选；未来同字透入不自动代表已经补好。`);
      const potential = [...visible, { position: "day" as const, stem: r.facts.pillars.day.stem }].flatMap((item) => controls(strengthElementForStem(item.stem), element) ? [`${item.stem}可制${stem}`] : controls(element, strengthElementForStem(item.stem)) ? [`${stem}可制${item.stem}`] : []);
      if (potential.length) conditions.push(`若${stem}以后透出，须另看${unique(potential).join("、")}；这些是条件联系，未当作当前已发生的透干作用。`);
    } else conditions.push(`${stem}的透干作用在本命已具备出现条件；岁运同字重复不等于新增有效支持，实际何时受合、受制或得到保护应查看对应运限判断。`);
    if (monthCommand && exposed.length && pathStems.includes(stem)) conditions.push(roots.length ? `${stem}所见同五行藏根仅为承接线索，不证明制化已足量；轻重与日主承接仍保留。` : `${stem}虽已透，所选地支未见同五行藏根；角色已有依据，持续作用仍缺这项支点，不能照搬古籍原例的${path === "food-killings" ? "食强、身健或成格结论" : "成立条件或成格结论"}。`);
    if (actualInteractions.length) conditions.push("以上合、冲、克分别记录实际对象；不由关系本身宣告合去、成化或吉凶，也未计算作用先后与强度。");
    if (roots.length) conditions.push("同五行藏根是既有本地承接线索；同五行不同字不冒称该字已经透出或足量有效。");
    if (roles.some((role) => role.axis === "seasonal")) conditions.push(...p.seasonal.conditions);
    const structural = roles.find((role) => role.kind === "path_key"), workingRole = roles.find((role) => role.kind === "working_role"), seasonal = roles.find((role) => role.axis === "seasonal");
    const roleLabel = unique(roles.flatMap((role) => role.kind === "path_key" ? [monthCommand?.stem === stem ? "月令背景支点" : "格局支点"] : role.kind === "working_role" ? ["当前条件角色"] : role.kind === "rescue_candidate" ? ["救应候选"] : role.kind === "seasonal_preferred" ? [jiSummerOrder && stem === "丙" ? "调候次用" : "调候主取"] : role.kind === "seasonal_conditional" ? ["条件配用"] : [])).join(" · ");
    const distinction = structural && unfavorable ? `扶抑上不宜继续加重${strengthElementLabel(element)}，与这里保护其结构任务是两件事；不能直接把${stem}当作应被去掉的忌字。`
      : seasonal && unfavorable ? `${stem}的调候目的与当前工作判断存在取舍，不能直接列为全盘无条件喜字。` : structural && working.direction === "balanced" ? "这项结构任务来自本盘组合，当前中和判断仍不固定喜忌。" : favorable ? "这与当前扶抑所需方向一致，能否发挥仍按透藏与配合区分。" : "当前工作判断未给此字固定喜忌。";
    const taskText = (workingRole?.text ?? structural?.text ?? seasonal?.text ?? "保留救应可能").replace(/[。；;]+$/u, "");
    const introduction = monthCommand?.stem === stem ? `${stem}${god(stem)}是已存在的月令主气背景，目前未透；${taskText}。` : exposed.length ? `${stem}${god(stem)}：${taskText}。` : `${stem}${god(stem)}${exact.length ? "目前仅藏" : "原局未见"}；其候选任务是${taskText}，当前不按已经透出并发挥来解释。`;
    return { id: `useful-${stem}`, stem, tenGod: god(stem), roleLabel, presenceText, presence, occurrences: exact, sameElementRoots: roots, roles, interactions: actualInteractions,
      judgment: `${introduction}${dayLink}。${distinction}${currentConstraints.length ? `当前牵制包括${unique(currentConstraints.map((item) => item.text)).join("；")}。` : ""}`,
      conditions: unique(conditions), evidence: [`取用说明版本：${NATAL_USEFUL_GUIDANCE_VERSION}。`, presenceText, ...actualInteractions.flatMap((item) => item.evidence), ...rescueEvidenceFor(stem).flatMap((finding) => [`本命救应依据：${finding.id}`, ...finding.evidence])], sourceIds: unique(roles.flatMap((item) => item.sourceIds)) };
  });
  const baselineConflict = p.seasonal.preferredElements.some((element) => working.unfavorableElements.includes(element));
  const alternativeScenarioIds = p.balance.scenarioDirections.filter((scenario) => scenario.id !== "baseline_current_candidate" && p.seasonal.preferredElements.some((element) => scenario.unfavorableElements.includes(element))).map((scenario) => scenario.id);
  const conflictSummary = baselineConflict ? "调候优先用字与当前工作判断有取舍，需要分清季节调节与日主承接。" : alternativeScenarioIds.length
    ? "当前判断未把调候优先用字列为扶抑不利；部分原计权对照场景有不同取舍，旧法对照不替代当前判断。" : "当前已覆盖的调候优先用字与工作判断未检出方向冲突；适量与具体配合仍需分别看。";
  const balanceText = working.direction === "conditional" ? `当前相对旺衰工作判断为“${working.label}”；格局喜用继续分角色取舍，五行不列统一喜忌。${working.summary}具体角色与调候任务按下列用字分别说明。`
    : working.direction === "balanced" ? "扶抑相对中和，保留不固定喜忌；具体任务由下列结构用字与调候用字说明。"
    : `当前先取${working.favorableElements.map(strengthElementLabel).join("、")}。${working.summary}具体用字仍按下列透藏、任务与配合判断。`;
  let priorities = entries.filter((item) => item.roles.some((role) => role.kind === "path_key") && item.occurrences.some((occurrence) => occurrence.kind === "visible")).map((item) => `${item.stem}${item.tenGod}：${item.roles.find((role) => role.kind === "path_key")!.text}`);
  const conflicts = entries.filter((item) => item.roles.some((role) => role.kind === "baseline_unfavorable") && item.roles.some((role) => ["path_key", "seasonal_preferred", "seasonal_conditional"].includes(role.kind))).map((item) => `${item.stem}的扶抑方向与结构或季节任务需分读，不能合并成一个固定喜忌。`);
  if (baselineConflict || alternativeScenarioIds.length) conflicts.push(conflictSummary);
  const respectSeasonalPrerequisite = hasCheckedGuiZiPrerequisite(entries, p, r.facts.pillars.day.stem, r.facts.pillars.month.branch);
  const answer = guiZiSeasonalAnswer(entries, p, r.facts.pillars.day.stem, r.facts.pillars.month.branch, buildUsefulAnswer(entries, p, diagnosis, respectSeasonalPrerequisite, wealthResourceTask, constraintsByStem));
  if (wealthResourceTask.preferredPathId) priorities = [answer.headline, ...(answer.condition ? [answer.condition] : [])];
  if (working.focus === "rooted_peer_mixed_authority") {
    const names = (gods: readonly string[]) => entries.filter((entry) => gods.includes(entry.tenGod) && entry.presence === "exposed_rooted").map((entry) => `${entry.stem}${entry.tenGod}`).join("、");
    const bing = entries.find((entry) => entry.stem === "丙");
    priorities = [
      ...(respectSeasonalPrerequisite && bing ? [`${bing.presenceText}丙的温通任务在先，同时保留财生官杀的另一层作用。`] : [`${names(G.wealth)}已透有根：承担财的投入与承接，同时生官与生杀。`]),
      `${names(["正官"])}与${names(["七杀"])}均保留：官杀尚未取清，分别判断职责与压力，不把两者一概增补。`,
      ...entries.filter((entry) => entry.roles.some((role) => role.kind === "seasonal_conditional")).map((entry) => `${entry.stem}${entry.presence === "absent" ? "原局未见，只列条件配用候选" : entry.presence === "hidden_only" ? "仅藏，保留条件配用线索" : "已透，按条件配用"}：${entry.roles.find((role) => role.kind === "seasonal_conditional")!.text}`)
    ];
  }
  const headline = answer.headline, verdict = answer.summary;
  const seasonalText = `${p.seasonal.headline}。${conflictSummary}`;
  return { version: NATAL_USEFUL_GUIDANCE_VERSION, sourceBinding: { revisionId: r.id, chartResultHash: r.manifest.resultHash, includeHour }, primaryPathId: path,
    headline, verdict, summary: verdict, answer, priorities, entries, balanceText, seasonalText, conflicts,
    paragraphs: [`${diagnosis.currentJudgment}${entries.some((item) => item.presence === "hidden_only" || item.presence === "absent") ? "已透的支点、仅藏的线索与尚缺的候选分开看；有同五行承接，也不等于某字已在当前发挥。" : "已有用字时，关键转为能否顺畅配合与是否适量。"}`, seasonalText],
    seasonalBalanceConflict: { baseline: baselineConflict, alternativeScenarioIds, summary: conflictSummary },
    conditions: unique([...diagnosis.conditions, ...(wealthResourceTask.applicable ? wealthResourceTask.conditions : []), ...(wealthResourceTask.preferredPathId ? [WEALTH_RESOURCE_SCOPE_BOUNDARY] : []), "本层只解释已存在的判断与用字条件，不新增五行评分、固定喜忌或应期结论。", ...(!includeHour ? ["时辰未定，时柱从透藏、根与互动中全部排除。"] : [])]),
    evidence: [`取用说明版本：${NATAL_USEFUL_GUIDANCE_VERSION}；本命诊断版本：${diagnosis.version}；初判版本：${p.version}。`, ...diagnosis.evidence, working.summary, `原计权对照：${p.balance.sensitivitySummary}`],
    sourceIds: unique([...diagnosis.sourceIds, ...wealthResourceTask.sourceIds, ...working.sourceIds, ...p.balance.sourceIds, ...p.seasonal.sourceIds, ...entries.flatMap((item) => item.sourceIds)]) };
}
