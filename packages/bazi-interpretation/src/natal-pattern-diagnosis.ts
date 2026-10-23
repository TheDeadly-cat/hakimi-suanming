import { revisionRecordSchema, type RevisionRecord } from "@hakimi/contracts";
import { calculatePillarRelations } from "@hakimi/relations-core";
import type { BaziPreliminaryAssessment } from "./preliminary-assessment";
import { canonicalizeStrengthTenGod } from "./strength-policy";
import { strengthElementForStem, type PillarPosition } from "./strength-assessment-core";
import { OUTLOOK_CLASSICAL_SOURCES, OUTLOOK_CLASSICAL_SOURCES_VERSION } from "./outlook-classical-sources";
import { selectNatalPatternPath, type NatalMonthCommandRole } from "./natal-pattern-path";
import { getWorkingBalance } from "./structural-strength-assessment";
import { NATAL_AUTHORITY_SOURCES } from "./natal-authority-sources";
import { evaluateNatalWealthResourceTask, type NatalWealthResourceTask } from "./natal-wealth-resource-task";
import { NATAL_WEALTH_RESOURCE_SOURCES } from "./natal-wealth-resource-sources";

export const NATAL_PATTERN_DIAGNOSIS_VERSION = "hakimi.natal-pattern-diagnosis/0.5.0" as const;
export interface NatalPatternFinding {
  id: string;
  text: string;
  sourceId: string;
  passageIds: string[];
  evidence: string[];
  scope: "primary" | "alternative";
}
export interface NatalPatternDiagnosis {
  version: typeof NATAL_PATTERN_DIAGNOSIS_VERSION;
  sourceBinding: { revisionId: string; chartResultHash: string; includeHour: boolean };
  primaryPathId: string;
  primaryCandidateId: string | null;
  monthCommandRole: NatalMonthCommandRole | null;
  wealthResourceTask: NatalWealthResourceTask;
  status: "basis_present" | "obstructed" | "rescue_candidate" | "background_only";
  headline: string;
  currentJudgment: string;
  foundation: string[];
  blockers: NatalPatternFinding[];
  rescues: NatalPatternFinding[];
  conditions: string[];
  paths: { id: string; label: string; role: "primary" | "alternative" }[];
  careerImplication: string;
  wealthImplication: string;
  evidence: string[];
  sourceIds: string[];
}
type Stem = { position: PillarPosition; stem: string; god: string };
const POSITIONS: PillarPosition[] = ["year", "month", "day", "hour"];
const LABEL = { year: "年干", month: "月干", day: "日干", hour: "时干" };
const G = { output: ["食神", "伤官"], wealth: ["正财", "偏财"], resource: ["正印", "偏印"] };
const where = (s: Stem) => `${LABEL[s.position]}${s.stem}（${s.god}）`;
const unique = <T>(items: readonly T[]): T[] => [...new Set(items)];
const SUCCESS = "outlook-zq-success-rescue";

/** A qualitative diagnosis, not a new strength score or a declaration of 成格.
 * Monthly-family priority deliberately matches the selected outlook path.
 * Visible actors and same-element hidden roots remain separate facts. */
export function buildNatalPatternDiagnosis(revision: RevisionRecord, assessment: BaziPreliminaryAssessment): NatalPatternDiagnosis {
  const r = revisionRecordSchema.parse(revision);
  const includeHour = r.input.timePrecision !== "unknown_hour" && r.input.timePrecision !== "date_only";
  if (assessment.sourceBinding.revisionId !== r.id || assessment.sourceBinding.chartResultHash !== r.manifest.resultHash
    || assessment.sourceBinding.includeHour !== includeHour || assessment.pattern.monthMainStem !== r.facts.pillars.month.hiddenStems[0]
    || assessment.balance.dayMasterElement !== strengthElementForStem(r.facts.pillars.day.stem)) throw new Error("本命格局诊断与初判来源不匹配。");
  const positions = POSITIONS.filter((p) => includeHour || p !== "hour");
  const visible: Stem[] = positions.filter((p) => p !== "day").map((position) => ({ position, stem: r.facts.pillars[position].stem, god: canonicalizeStrengthTenGod(r.facts.pillars[position].stemTenGod) }));
  const hidden = positions.flatMap((position) => r.facts.pillars[position].hiddenStems.map((stem, i) => ({ position, stem, god: canonicalizeStrengthTenGod(r.facts.pillars[position].branchTenGods[i]!) })));
  const shown = (gods: readonly string[]) => visible.filter((s) => gods.includes(s.god));
  const roots = (s: Stem) => hidden.filter((h) => strengthElementForStem(h.stem) === strengthElementForStem(s.stem));
  const facts = calculatePillarRelations({ year: r.facts.pillars.year.ganZhi, month: r.facts.pillars.month.ganZhi,
    day: r.facts.pillars.day.ganZhi, hour: includeHour ? r.facts.pillars.hour.ganZhi : r.facts.pillars.day.ganZhi }).facts
    .filter((f) => f.relationType === "stem_five_combination" && f.completeness === "binary" && f.participants.every((p) => positions.includes(p.position)));
  const wealthResourceTask = evaluateNatalWealthResourceTask({ facts: r.facts, includeHour });
  const separatedPair = (a: Stem, b: Stem) => wealthResourceTask.pairs.find((pair) => pair.separatedByPeers
    && ((pair.wealth.position === a.position && pair.wealth.stem === a.stem && pair.resource.position === b.position && pair.resource.stem === b.stem)
      || (pair.wealth.position === b.position && pair.wealth.stem === b.stem && pair.resource.position === a.position && pair.resource.stem === a.stem)));
  // Keep the relation facts above intact. A qualified natal financial/resource
  // pair with intervening peer stems is not treated as a free direct tie.
  // This exception never applies to an incoming luck/year/month stem.
  const combines = (a: Stem, b: Stem) => separatedPair(a, b) ? undefined
    : facts.find((f) => f.participants.some((p) => p.position === a.position) && f.participants.some((p) => p.position === b.position));
  const allStems = [...visible, { position: "day" as const, stem: r.facts.pillars.day.stem, god: "日主" }];
  const thirdTies = (rescuer: Stem, harmful: Stem) => allStems.filter((other) => other.position !== rescuer.position && other.position !== harmful.position && combines(rescuer, other));
  const family = assessment.pattern.family;
  const working = getWorkingBalance(assessment);
  const selectedPath = selectNatalPatternPath({ family, monthMainStem: assessment.pattern.monthMainStem, monthMainTenGod: assessment.pattern.monthMainTenGod, visibleTenGods: visible.map((item) => item.god), workingFocus: working.focus, wealthResourceTask });
  const { id: path, candidateId: candidate, required, monthCommandRole } = selectedPath;
  const title = selectedPath.title || `${assessment.pattern.background}的透藏分工`;

  const foundation = [`月令主气${assessment.pattern.monthMainStem}为${assessment.pattern.monthMainTenGod}，保留${assessment.pattern.background}作为主背景。`];
  const conditions = ["主次按月令背景与实际透干排列，是本地选径方式；不以候选数量证明成格，也不替代全局轻重、清浊和作用先后的判断。"];
  if (wealthResourceTask.applicable) {
    foundation.push(wealthResourceTask.summary);
    conditions.push(...wealthResourceTask.conditions);
    for (const pair of wealthResourceTask.pairs.filter((item) => item.separatedByPeers)) foundation.push(
      `${LABEL[pair.wealth.position]}${pair.wealth.stem}${pair.wealth.tenGod}与${LABEL[pair.resource.position]}${pair.resource.stem}${pair.resource.tenGod}之间，实际隔着${pair.intervening.map((actor) => `${LABEL[actor.position]}${actor.stem}${actor.tenGod}`).join("、")}；本条分别读财与印的任务，不把这对原局财印直接当作财坏印。${pair.hasCombination ? "原丁壬等五合关系事实仍保留，此处按限定隔护区别直接合绊，不宣告合化或对象消失。" : ""}`);
  }
  if (monthCommandRole) conditions.push(`月令主气${monthCommandRole.stem}${monthCommandRole.tenGod}提供本命路径背景；它仍在藏干层，不加入透干合克或自由救应对象。配合用字须另有实际透干，根气、轻重和成败条件继续分别判断。`);
  for (const gods of required) {
    const entries = shown(gods);
    if (monthCommandRole && gods.includes(monthCommandRole.tenGod)) {
      foundation.push(`月令${r.facts.pillars.month.branch}的主气${monthCommandRole.stem}为${monthCommandRole.tenGod}，提供这条路径的当令背景；原局未透${monthCommandRole.stem}，不写成天干已透。`);
      continue;
    }
    if (entries.length) foundation.push(entries.map((s) => `${where(s)}已透${roots(s).length ? `，所选支内另见${roots(s).map((h) => `${r.facts.pillars[h.position].branch}中${h.stem}`).join("、")}同五行藏根` : "，所选支内未见同五行藏根"}`).join("；") + "。");
    else conditions.push(`${gods.join("或")}未透：${hidden.filter((s) => gods.includes(s.god)).map((s) => `${r.facts.pillars[s.position].branch}中${s.stem}（${s.god}）`).join("、") || "所选柱无相应藏干"}，只作为背景，不能当作自由作用的透干。`);
  }
  const blockers: NatalPatternFinding[] = [], rescues: NatalPatternFinding[] = [];
  const finding = (list: NatalPatternFinding[], id: string, text: string, passageIds: string[], evidence: string[], sourceId = SUCCESS, scope: "primary" | "alternative" = "primary") => list.push({ id, text: scope === "alternative" ? `官路径备选条件：${text}` : text, sourceId, passageIds, evidence, scope });
  // A combination with the harmful actor can be a rescue candidate. A third
  // stem's combination constrains that candidate; neither erases any stem.
  function rescue(id: string, rescuer: Stem, harmful: Stem, text: string, passageIds: string[], combinedText?: string, scope: "primary" | "alternative" = "primary") {
    const tie = combines(rescuer, harmful), others = thirdTies(rescuer, harmful), rooted = roots(rescuer).length > 0;
    const limitation = `${others.length ? `但${where(rescuer)}同时与${others.map(where).join("、")}有五合牵连，不能作为不受制的救应。` : ""}${rooted ? "同五行藏根提供承接线索，尚不等于足量有效。" : "该救应干未见同五行藏根，持续作用缺少这项支点。"}`;
    finding(rescues, id, `${tie ? combinedText ?? `${where(rescuer)}与${where(harmful)}相合，可保留牵制该忌神的候选；不同时把它当作自由生克。` : text}${limitation}`, passageIds,
      [where(rescuer), where(harmful), ...(tie ? [`天干五合事实 ${tie.id}；仅认相合，不判合去或合化。`] : []), ...others.map((s) => `第三干牵连：${where(s)}；事实 ${combines(rescuer, s)!.id}`)], SUCCESS, scope);
  }
  const official = shown(["正官"]), hurting = shown(["伤官"]), food = shown(["食神"]), killing = shown(["七杀"]), prints = shown(G.resource), money = shown(G.wealth);
  // R3 already validates these visible roles and their separate roots. This
  // diagnosis does not rejudge strength or remove an actor after a combination.
  const mixedAuthority = working.focus === "rooted_peer_mixed_authority";
  const dayMaster = allStems.find((item) => item.position === "day")!;
  const selfCombinedAuthorities = mixedAuthority ? [...official, ...killing].filter((actor) => combines(actor, dayMaster)) : [];
  const selfCombinationStatements = selfCombinedAuthorities.map((actor) => `${where(actor)}与日主${dayMaster.stem}自合，本身自合不为合去，${actor.stem}${actor.god}仍保留在当前作用中。`);
  const authorityBackground = assessment.pattern.background.replace(/背景$/u, "");
  if (mixedAuthority) {
    if (family !== "peer" || !money.length || !official.length || !killing.length) throw new Error("官杀取清诊断缺少已核对的比劫月令与财官杀透干。");
    foundation.push(`${money.map(where).join("、")}同时生${official.map(where).join("、")}与${killing.map(where).join("、")}；财生官的配合没有排除财生杀的另一条作用。`, ...selfCombinationStatements);
    finding(blockers, "peer-authorities-not-cleared", `${official.map(where).join("、")}与${killing.map(where).join("、")}并透且各有藏根，当前官杀尚未取清；财生官兼带七杀，不能只按清官主线定论。`, ["lujie-authority-clearing"],
      [...official, ...killing, ...money].map(where), "natal-zq-lujie-authority-clearing");
    conditions.push("官杀未取清是当前用官路径的具体障碍，不直接等于全盘凶断；取清须另核真正作用于官或杀的制约及配合，不能以日主自合代替去官留杀。", "原局食伤与印均未透，支内所藏只保留制化线索，不当作已经完成取清或印化。");
    if (selfCombinedAuthorities.length) conditions.push("日主本身与官杀相合，只确认本身自合不为合去；未据此判断合化，也不把相合另算为官杀已经自由发挥或退出。");
  }
  if (official.length && hurting.length) {
    const scope = ["official-resource", "official-wealth"].includes(path) ? "primary" : "alternative";
    finding(blockers, "official-hurting", `${hurting.map(where).join("、")}与${official.map(where).join("、")}并透，若采用维护官的职责路径，二者存在直接牵制。`, ["success-rescue-2"], [...hurting, ...official].map(where), SUCCESS, scope);
    for (const h of hurting) for (const p of prints) rescue("resource-protects-official", p, h,
      `${where(p)}可作为制约伤官、保护官的救应候选。`, combines(p, h) ? ["success-rescue-2", "success-rescue-10"] : ["success-rescue-2"],
      `${where(p)}与${where(h)}相合，保留“合伤护官”候选，不能据此宣布伤官已被合去，也不另计一次自由印制伤。`, scope);
    if (!prints.length) conditions.push("原局没有印透出，不能把藏印直接当作已经护住官的救应。");
    if (family !== "peer" && prints.some((p) => hurting.some((h) => combines(p, h)))) conditions.push("合伤条原文专述建禄月劫用官；本盘仅借其作用区别解释相合候选，未据此宣告其他月令已经获救成格。");
    if (path === "resource-output") conditions.push("印格泄秀与用官护官需要分清：采用泄秀主线时，不能同时把全部食伤都当成应被清除的忌神。");
  }
  if (path === "resource-output") for (const output of shown(G.output)) for (const p of prints) {
    const combination = combines(output, p);
    if (combination) finding(blockers, "output-resource-combined", `${where(output)}与${where(p)}相合，泄秀所依靠的输出与支持彼此牵连，不能同时按二者完全自由发挥来解释。当前保留作用有条件，不判输出消失，也不将备选护官救应算作泄秀主线获救。`, ["resource-luck-4"], [where(output), where(p), `天干五合事实 ${combination.id}；相合牵连为本地事实解释，原文只提供印用食伤需区分条件的依据。`], "outlook-zq-resource-luck");
  }
  if (food.length && (killing.length || monthCommandRole?.tenGod === "七杀")) {
    if (path !== "food-killings") conditions.push(`另见${food.map(where).join("、")}与${killing.map(where).join("、")}构成食神制杀候选；本次仍以${title}为主，制杀与印化不叠算为两份已经成立的优势。`);
    if (path === "food-killings") {
      for (const p of prints) finding(blockers, "resource-controls-food", `${where(p)}对${food.map(where).join("、")}有克制关系；印虽能支持日主，却也会牵制当前制杀所依靠的食神，食制与印化不能同时算作已奏效。`, ["success-rescue-11", "success-rescue-5"], [where(p), ...food.map(where)]);
      for (const p of prints) for (const w of money) rescue("wealth-protects-food", w, p, `${where(w)}可作为去印存食的候选。`, ["success-rescue-5"]);
      if (money.length) conditions.push(`${money.map(where).join("、")}使食神的产出流向财，再由财生杀，这是两条实际生克联系，未据此把财列为普遍阻碍。outlook-zq-food-luck/food-luck-2“若食太重而煞輕，印運最利，逢財反吉矣”是相反的有条件利财分支；当前未判食杀轻重，不把该前提当成已满足。`);
      conditions.push("尚未以新的数值阈值判定食重杀轻或杀重食轻；助食、助杀与扶身应分支处理，不能只靠透干各一枚就宣布制衡完成。");
      if (prints.length) conditions.push("这里指出印对食神的实际牵制，不等于印在全局一定有害；若食太重而杀轻，原书另有用印或用财分支，当前没有把该轻重条件冒充已满足。");
    }
  }
  const dependsOnPrint = ["official-resource", "killings-resource", "hurting-resource", "resource-preservation"].includes(path);
  if (path === "resource-wealth") {
    foundation.push(`当前结构已核对印当令、另支日主本气根、两处印透根与一处财透根；${money.map(where).join("、")}的当前任务是裁抑过多印的投入，${prints.map(where).join("、")}保留知识和支持的基础。`);
    conditions.push("印旺用财只在本次明确的身根、印根和财根条件下成立为取用方向；印轻财重时反须护印，不能把所有财克印都当成有利。这里选出任务，不证明财已制印成功，也不以印多便把所有印列为忌。");
    conditions.push(...working.conditions);
    for (const w of money) {
      for (const other of allStems) if (other.position !== w.position && combines(w, other)) finding(blockers, "moderating-wealth-combined", `${where(w)}与${where(other)}相合，裁印所依靠的财同时受到牵连；保留财制印的任务，但不能又把它当作完全自由的制印，也不判财或印已被合去。`, ["resource-wealth-moderation", "resource-wealth-opposite"], [where(w), where(other), `天干五合事实 ${combines(w, other)!.id}；合的约束是当前事实解释，不以古文代称已合化。`], "outlook-zq-resource-wealth");
      for (const peer of shown(["比肩", "劫财"])) finding(blockers, "peer-controls-moderating-wealth", `${where(peer)}克${where(w)}，会牵制当前用于裁印的财；自身根气与另增比劫的作用不能等同。`, ["resource-wealth-moderation"], [where(peer), where(w)], "outlook-zq-resource-wealth");
    }
  }
  if (dependsOnPrint && money.length && prints.length) {
    const threateningWealth = money.filter((w) => prints.some((p) => !separatedPair(w, p)));
    for (const w of money) for (const p of prints) if (!separatedPair(w, p)) {
      const tie = ["official-resource", "hurting-resource"].includes(path) ? combines(w, p) : undefined;
      finding(blockers, "wealth-controls-key-resource", tie
        ? `${where(w)}与${where(p)}相合，财印所承担的两项作用受到牵连；不能将它们同时当作自由辅官或扶身，也不据此删除财印。`
        : `${where(w)}克${where(p)}，当前所依靠的印受到财的牵制；经营资源与保留支持不能直接合并成同一项利好。`,
        tie && path === "official-resource" ? ["official-wealth-resource-combined"] : ["success-rescue-12", "success-rescue-4"],
        [where(w), where(p), ...(tie ? [`天干五合事实 ${tie.id}；本对未满足限定隔护条件。`] : [])],
        tie && path === "official-resource" ? "natal-zq-official-wealth-resource-combined" : SUCCESS);
    }
    for (const w of threateningWealth) for (const peer of shown(["比肩", "劫财"])) rescue("peer-protects-resource", peer, w, `${where(peer)}可作为制财存印的候选。`, ["success-rescue-4"]);
  }
  if (["peer-output-wealth", "wealth-food", "food-wealth", "hurting-wealth"].includes(path)) {
    for (const p of shown(["偏印"])) if (food.length) {
      finding(blockers, "owl-controls-food", `${where(p)}与${food.map(where).join("、")}相克，稳定产出的支点受到牵制。`, ["success-rescue-8"], [where(p), ...food.map(where)]);
      for (const w of money) rescue("wealth-protects-food-output", w, p, `${where(w)}可作为制枭护食的候选。`, ["success-rescue-9"]);
    }
    for (const w of money) for (const other of allStems) if (other.position !== w.position && combines(w, other)) {
      finding(blockers, "wealth-combined", `${where(w)}与${where(other)}相合，成果转成资源这一环带有牵连，不能按完全自由的财来解释兑现。`, ["success-rescue-6"], [where(w), where(other), `天干五合事实 ${combines(w, other)!.id}`, ...(hurting.length ? [] : ["原句特指伤官生财；本处只借财受合的作用区别作本地类比，不据此判食神格败。"])]);
    }
  }
  if (official.length && killing.length) conditions.push(`${official.map(where).join("、")}与${killing.map(where).join("、")}同透，官杀取清仍需独立判断，不能把两类责任简单相加为优势。`);
  if (path === "resource-output") conditions.push("印用食伤还须分清印轻与印重；当前只确定月令印背景和输出出口，未把印当令等同印已足量，也未把有财直接判为有利。");
  if (path === "hurting-resource") conditions.push(wealthResourceTask.task === "resource_first"
    ? "当前是伤官财重带印的护印任务，原局印未见同类根，不能宣称有根印制伤已经完成；本条给出取用先后，不把缺根的印当作足量支持。"
    : "伤官配印还要求伤官旺、印有根；同五行藏根仅是本地承接线索，不能替代旺衰与受损程度的整体判断。");
  const references: Record<string, [string, string]> = {
    "resource-wealth": ["outlook-zq-resource-wealth", "resource-wealth-moderation"],
    "resource-output": ["outlook-zq-resource-luck", "resource-luck-4"],
    "resource-preservation": [SUCCESS, "success-rescue-4"],
    "food-killings": ["outlook-zq-killings-luck", "killings-luck-1"],
    "killings-resource": ["outlook-zq-killings-luck", "killings-luck-3"],
    "official-resource": ["outlook-zq-official-luck", hurting.length ? "official-luck-3" : "official-luck-2"],
    "official-wealth": ["outlook-zq-official-luck", "official-luck-1"],
    "peer-output-wealth": ["outlook-zq-peer-luck", "peer-luck-1"],
    "wealth-food": ["outlook-zq-wealth-luck", "wealth-luck-1"],
    "food-wealth": [SUCCESS, "success-rescue-7"],
    "hurting-resource": [SUCCESS, "success-rescue-13"],
    "hurting-wealth": ["outlook-zq-hurting-luck", "hurting-luck-1"]
  };
  const [basisSource, basisPassage] = references[path] ?? ["outlook-zq-luck", "luck-2"];
  const primaryBlockers = blockers.filter((f) => f.scope === "primary"), primaryRescues = rescues.filter((f) => f.scope === "primary");
  const status = primaryBlockers.length ? primaryRescues.length ? "rescue_candidate" : "obstructed" : path.endsWith("-background") ? "background_only" : "basis_present";
  const commandStatement = monthCommandRole ? `月令${monthCommandRole.stem}${monthCommandRole.tenGod}当令，${shown(required.filter((group) => !group.includes(monthCommandRole.tenGod)).flat()).map(where).join("、")}已透，构成${title}的具体候选。藏${monthCommandRole.stem}与透出的配合用字分层看，轻重与根气条件仍保留。` : "";
  const taskKind = wealthResourceTask.task;
  const taskJudgment = taskKind === "official_joint" ? `正官当令，当前财印分位并用：${money.map(where).join("、")}资助官的职责，${prints.map(where).join("、")}护官并承接日主。${wealthResourceTask.summary}其他官杀、食伤或合克条件仍按各自对象判断，不因财印分位宣告全盘无碍。`
    : taskKind === "resource_first" ? `伤官生财兼带印，当前先护${prints.map(where).join("、")}，支持日主并调节过多的输出负担。${wealthResourceTask.summary}已有财仍承担产出的承接，先后次序以支持能够接上为前提，不再一概把更多财列为首选。`
      : taskKind === "wealth_first" ? `伤官财印兼用，当前先用${money.map(where).join("、")}调节已有印的投入，让准备接到实际用途。${wealthResourceTask.summary}${prints.map(where).join("、")}保留支持与方法的作用，不把印全数清除，也不据此许诺财运已经兑现。` : "";
  const currentJudgment = mixedAuthority ? `${authorityBackground}，财生官兼带七杀。${money.map(where).join("、")}同时生${official.map(where).join("、")}与${killing.map(where).join("、")}，官杀尚未取清。${selfCombinationStatements.join("")}${killing.map(where).join("、")}仍需单独辨别制化，原局所藏食伤或印未按已经透出奏效处理。`
    : taskJudgment ? `${taskJudgment}${primaryBlockers[0]?.text ?? ""}${primaryRescues[0]?.text ?? ""}`
    : path === "resource-wealth" ? `本盘以${money.map(where).join("、")}裁印为当前主任务：印当令且两处透根，自身另有本气根，重点已从继续增加支持转为让支持适量、对接实际用途。${prints.map(where).join("、")}仍是学习与承接基础，不一概去印。${primaryBlockers[0]?.text ?? "已透有根的财提供了这一调节支点，是否适量仍随完整配合判断。"}`
    : commandStatement ? `${commandStatement}${primaryBlockers[0]?.text ?? ""}${primaryRescues[0]?.text ?? ""}`
    : `${assessment.pattern.background}先按${title}组织。${primaryBlockers.length ? primaryBlockers[0]!.text : required.length ? "已具备上述透藏支点，可作为当前能力发展的组织方向。" : "当前以月令及透藏分工为主，尚无足够可见作用链来确立更具体的路径。"}${primaryRescues.length ? primaryRescues[0]!.text : primaryBlockers.length ? "本次保留这一具体阻碍，未把潜在藏干当作已经解除问题。" : ""}`;
  const careerImplication = taskKind === "official_joint" ? "做事更适合把实际投入与方法支持放在同一套明确要求中：一边提供完成所需的条件，一边把规则、学习和经验接到执行。两者各有分工，增加投入不必然挤掉准备；若现实中已有工作，也可对照资源协调与专业支持怎样一起帮助承担职责。"
    : taskKind === "resource_first" ? "已有表达、尝试与需要处理的事项较多，先让方法、示范或帮助接回自己的承接能力。继续接更多事情容易把有限精力分散；把正在做的一部分理解清、做稳，再决定能否扩大，是当前更明确的先后。"
      : taskKind === "wealth_first" ? "已有准备与支持较多，更需要由实际用途决定哪些继续保留。把已经理解的方法用于一件具体事情，让使用者的回应决定下一步；重点是让准备进入应用，而不是继续把每个环节补得更厚。"
        : path === "resource-wealth" ? "事业上的重点是用明确的实际需求筛选准备：哪些资料、训练和协助正在帮助完成，哪些已经超过任务需要。以有限的时间和资源确定应用范围，让积累服务于一件可确认的事情；不因印旺就否定学习，也不把压缩准备误作跳过必要依据。"
    : official.length && hurting.length ? "事业上，提出改法与承担既有职责需要同一套依据来连接。先让方法、标准和验收相互支持；若学习支持同时牵住表达，就要保留验证与沟通的空间，不能只凭有印便认定冲突已经解决。"
    : path === "food-killings" && prints.length ? "事业上，处理紧迫要求有方法制约与支持承接两种路线。当前支持环节也会压住方法输出，先分清哪些准备确实帮助完成、哪些准备使执行停住，避免把两条路线都当作现成优势。"
    : path === "food-killings" && money.length ? "事业上，稳定方法已经面对紧迫要求，资源机会又会带来新的要求。评价一项机会时，要同时看它补足了交付条件，还是把更多任务送回原本吃紧的环节。"
    : path === "resource-output" ? "事业先围绕知识怎样变成可用方法来展开。已有理解要留下说明、作品或可重复步骤；其他制杀或官印候选只作为不同承担方式的比较，不取代这一月令主线。"
    : blockers.length ? `事业的着力点仍在${title}，但要把“${blockers[0]!.text}”落到任务分工上：分别确认谁提供支持、哪里形成产出、哪一步承接责任。` : `事业可先沿${title}组织能力训练，把已见支点变成可检验的完成过程，再逐步扩大职责。`;
  const wealthImplication = taskKind === "official_joint" ? "财在这条主线中承担资助职责的角色，印保留方法、知识和承接支持；两者在当前分位条件下可以分别发挥作用。现实里可对照投入是否确实支持既定事项、方法是否帮助把事情完成，不能仅凭财印同见就推定收入增加。"
    : taskKind === "resource_first" ? "已有资源与输出事项会继续消耗承接能力，当前先为学习、工具与必要帮助留出条件。新机会与新投入要看能否减轻原有负担；把全部注意力放在扩大回报，可能让需要的支持更难补上。"
      : taskKind === "wealth_first" ? "财的当前任务是把已有支持引向实际用途，让准备有取舍、有使用反馈。原局财缺少同类根，仍须核实实际可支配的时间、用品与承接对象；这是一项优先任务，不等于已经得到回报或裁印已经完成。"
        : path === "resource-wealth" ? `财在这里先承担裁印的调节任务：把时间、工具和投入落实到真实用途，减少准备层层增加却没有使用的部分。${primaryBlockers.some((item) => item.id === "moderating-wealth-combined") ? "财与印相合也使投入与支持相互牵连，需要分清哪些安排能调整、哪些仍有共同约束。" : "已有财根提供实际承接线索，投入仍应有用途和限度。"}这不等于已有收入或任意经营都会获利；印轻财重时须另走护印分支。`
    : path === "food-killings" && money.length ? "资源在这里有双重作用：它能接住成果，也可能继续推高要处理的要求。因此先比较新增资源与新增责任是否对应，不把有财直接读成经营越多越好。"
    : dependsOnPrint && money.length ? "资源经营会占用本盘所依靠的学习、工具或协助。先保住支持如何持续提供，再讨论扩大对象；资金和任务增多本身不能替代承接条件。"
    : path === "resource-output" ? "资源联系先来自知识能否被实际使用，而不是先以制杀或经营规模作为优势。印轻时不能任由经营消耗支持，印重时则要避免一直准备却没有成果；本次保留这两种不同条件。"
    : blockers.some((b) => b.id === "wealth-combined") ? "资源兑现还牵连共同安排或其他职责。应把成果归属、使用权限与持续维护分别说清；相合只提示连接有条件，不直接表示已经得到或失去财富。"
    : blockers.length ? "资源安排应优先保护上述受阻环节需要的时间、工具和协作，让支持能真正接到交付；不能把机会增加当作结构问题已经解除。" : `资源宜接在${title}能够持续发挥之后，先核实投入、完成与认可之间的连接。`;
  const sourceIds = unique([SUCCESS, basisSource, ...wealthResourceTask.sourceIds, ...(selfCombinedAuthorities.length ? ["natal-zq-self-combination-not-removal"] : []), ...(monthCommandRole ? ["outlook-zq-month-command", ...(monthCommandRole.tenGod === "伤官" ? wealthResourceTask.sourceIds : [monthCommandRole.tenGod === "七杀" ? "outlook-zq-killing-month-example" : "outlook-zq-official-month-example"])] : []), ...(path === "food-killings" && money.length ? ["outlook-zq-food-luck"] : []), ...blockers.map((f) => f.sourceId), ...rescues.map((f) => f.sourceId)]);
  const evidence = [`诊断版本 ${NATAL_PATTERN_DIAGNOSIS_VERSION}；古籍资料 ${OUTLOOK_CLASSICAL_SOURCES_VERSION}；主路径 ${path}。`, ...foundation,
    `本地选径的条件参照 ${basisSource}/${basisPassage}：${OUTLOOK_CLASSICAL_SOURCES.find((s) => s.id === basisSource)?.passages.find((p) => p.id === basisPassage)?.text ?? "按本地选径保留条件"}；原句的轻重与用神前提未据同现自动判为成立。`,
    ...[...blockers, ...rescues].flatMap((f) => [f.text, ...f.evidence, ...f.passageIds.map((id) => `${f.sourceId}/${id}：${OUTLOOK_CLASSICAL_SOURCES.find((s) => s.id === f.sourceId)?.passages.find((p) => p.id === id)?.text ?? NATAL_AUTHORITY_SOURCES.find((s) => s.id === f.sourceId)?.excerpt ?? NATAL_WEALTH_RESOURCE_SOURCES.find((s) => s.id === f.sourceId)?.excerpt ?? ""}`)]),
    ...(wealthResourceTask.applicable ? [...wealthResourceTask.evidence, ...NATAL_WEALTH_RESOURCE_SOURCES.filter((source) => wealthResourceTask.sourceIds.includes(source.id)).map((source) => `${source.id}：${source.excerpt}；${source.locator}`)] : []),
    ...selfCombinedAuthorities.map((actor) => `${where(actor)}与日主${dayMaster.stem}；天干五合事实 ${combines(actor, dayMaster)!.id}；natal-zq-self-combination-not-removal：${NATAL_AUTHORITY_SOURCES.find((source) => source.id === "natal-zq-self-combination-not-removal")!.excerpt}。仅本身自合不作合去，不据此评价其他干的合去或合化。`),
    ...(monthCommandRole ? [monthCommandRole.tenGod === "伤官"
      ? `月令${monthCommandRole.stem}伤官仍是主气藏干，未冒作透干；财印任务来源 ${wealthResourceTask.sourceIds.join("、")}，不从配印或取财名称宣告成格。`
      : `月令路径依据 outlook-zq-month-command/month-command-1；原例 ${monthCommandRole.tenGod === "七杀" ? "outlook-zq-killing-month-example/month-killing-yi" : "outlook-zq-official-month-example/month-official-xue"}仅证实月令官杀可参与路径，不移植其贵格结论。`] : []),
    ...conditions, "仅对所选柱真实透干作作用候选；同五行藏根是承接线索，不证明力量足量。未新增轻重分数、合化判定或人生层次。"];
  return { version: NATAL_PATTERN_DIAGNOSIS_VERSION, sourceBinding: { revisionId: r.id, chartResultHash: r.manifest.resultHash, includeHour }, primaryPathId: path, primaryCandidateId: candidate, monthCommandRole, wealthResourceTask,
    status, headline: mixedAuthority ? `${authorityBackground}，财生官兼带七杀：官杀尚未取清`
      : taskKind === "official_joint" ? `正官财印分位：资官与承接分别取用${primaryBlockers.length ? "，另有作用待协调" : ""}`
        : taskKind === "resource_first" ? "伤官财重带印：先护印、再承接财"
          : taskKind === "wealth_first" ? "伤官印重带财：先让财调节印的投入"
            : `${title}：${status === "rescue_candidate" ? "有阻碍，也有条件性的救应" : status === "obstructed" ? "支点与受阻环节并存" : status === "basis_present" ? "支点已见，按作用分工" : "先读月令与透藏"}`,
    currentJudgment, foundation, blockers, rescues, conditions: unique(conditions), paths: [{ id: path, label: title, role: "primary" }, ...assessment.pattern.candidates.filter((c) => c.id !== candidate).map((c) => ({ id: c.id, label: c.label, role: "alternative" as const }))],
    careerImplication, wealthImplication, evidence: unique(evidence), sourceIds };
}
