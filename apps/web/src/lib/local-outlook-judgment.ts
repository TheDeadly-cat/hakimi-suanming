import { revisionRecordSchema, transitNodeSchema, transitNodeRefSchema, type RevisionRecord, type TransitNode, type TransitNodeRef } from "@hakimi/contracts";
import { LunarUtil } from "lunar-typescript";
import { calculatePillarRelations } from "@hakimi/relations-core";
import type { BaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { canonicalizeStrengthTenGod, strengthTenGodGroup, type TenGodGroup } from "../../../../packages/bazi-interpretation/src/strength-policy";
import { strengthElementForStem, strengthElementLabel, type FiveElement } from "../../../../packages/bazi-interpretation/src/strength-assessment-core";
import { OUTLOOK_RULE_BASES } from "../../../../packages/bazi-interpretation/src/outlook-classical-sources";
import { selectNatalPatternPath, type NatalMonthCommandRole } from "../../../../packages/bazi-interpretation/src/natal-pattern-path";
import { getWorkingBalance } from "../../../../packages/bazi-interpretation/src/structural-strength-assessment";
import { evaluateNatalWealthResourceTask, type NatalWealthResourceTask } from "../../../../packages/bazi-interpretation/src/natal-wealth-resource-task";
import { OUTLOOK_RESCUE_TRACE_VERSION, type OutlookRescueObject, type OutlookRescueRef, type OutlookRescueTrace, type OutlookRescueTraceBundle, type VerifyOutlookRescuesInput } from "./outlook-rescue-trace";
import { evaluateNatalStructureTasks, type NatalStructureTasks, type NatalStructureTask } from "../../../../packages/bazi-interpretation/src/natal-structure-tasks";
import { OUTLOOK_NATAL_TASK_LINKS_VERSION, type OutlookNatalTaskLinks, type OutlookNatalTaskLink } from "./outlook-natal-task-links";

export const LOCAL_OUTLOOK_JUDGMENT_VERSION = "hakimi.local-outlook-judgment/0.10.0" as const;
export const LOCAL_OUTLOOK_POLICY_VERSION = "hakimi.outlook-model/0.8.0" as const;
export const OUTLOOK_STEM_ACTIONS_VERSION = "hakimi.outlook-stem-actions/0.1.0" as const;
export interface OutlookStemAction {
  visibility: "visible" | "main_hidden"; stem: string; tenGod: string; effect: OutlookEffect;
  evidenceIndexes: number[]; blockerIndexes: number[]; satisfiedConditionIndexes: number[]; summaryBasis: boolean;
}
export interface OutlookStemActions { version: typeof OUTLOOK_STEM_ACTIONS_VERSION; items: OutlookStemAction[] }
/** Local modeling choices, not quantitative statements from the classical texts.
 * Role load only selects a stated rule branch; it is never a fortune score. */
export const LOCAL_OUTLOOK_MODEL = Object.freeze({ visible: 2, mainHidden: 2, otherHidden: 1, monthCommand: 4,
  outputWealthToSupportBoundary: 1, loadSensitivityBoundaries: [0.8, 1, 1.2] as const,
  waterMetalFloodShare: 0.65, waterPrimaryRootsForFlood: 2 });
export type OutlookAxis = "balance" | "pattern" | "seasonal";
export type OutlookEffect = "assists" | "obstructs" | "mixed" | "neutral" | "unresolved";
export type OutlookJudgmentLabel = "较顺" | "有压力" | "利弊并见" | "条件性" | "主题解读" | "暂不可判";
export interface OutlookAxisFinding {
  id: string; axis: OutlookAxis; effect: OutlookEffect; ruleId: string; pathId: string; summary: string;
  sourceIds: string[]; evidence: string[]; satisfiedConditions: string[]; unresolvedConditions: string[]; blockers: string[]; rescues: string[];
  stemActions?: OutlookStemActions;
  taskLinks?: OutlookNatalTaskLinks;
}
export interface LocalOutlookJudgment {
  version: string; policyVersion: string;
  sourceBinding: { revisionId: string; chartResultHash: string; includeHour: boolean };
  targetRef: TransitNodeRef; label: OutlookJudgmentLabel; primaryAxis: OutlookAxis | null; headline: string; summary: string;
  interval: { startInstant: string; endExclusiveInstant: string }; backgroundRefs: TransitNodeRef[];
  axes: OutlookAxisFinding[]; conflicts: string[]; conditions: string[]; coverageGaps: string[]; sourceIds: string[];
}
export interface LocalOutlookJudgmentSegment {
  id: string; branchId: "locked" | "forward" | "backward"; branchLabel: string;
  startInstant: string; endExclusiveInstant: string; judgment: LocalOutlookJudgment;
}
export interface LocalOutlookJudgmentInput {
  target: TransitNode; background?: { dayun?: TransitNode; year?: TransitNode };
  startInstant?: string; endExclusiveInstant?: string;
}
type StemItem = { stem: string; god: string; group: TenGodGroup; element: FiveElement; visible: boolean; primary: boolean; weight: number; label: string; traceObject?: OutlookRescueObject };
type Projection = { stems: StemItem[]; branches: string[] };
type Path = { id: string; title: string; basis: string; required: string[][]; protectedGroups: TenGodGroup[]; monthCommandRole: NatalMonthCommandRole | null };
const POSITIONS = ["year", "month", "day", "hour"] as const;
const LABELS = { year: "年柱", month: "月柱", day: "日柱", hour: "时柱" };
const unique = <T>(values: readonly T[]) => [...new Set(values)];
const controls = (left: FiveElement, right: FiveElement) => ({ wood: "earth", earth: "water", water: "fire", fire: "metal", metal: "wood" })[left] === right;
const hidden = (branch: string): string[] => [...((LunarUtil.ZHI_HIDE_GAN as Record<string, string[]>)[branch] ?? [])];
const labelFor = (effect: OutlookEffect): OutlookJudgmentLabel => effect === "assists" ? "较顺" : effect === "obstructs" ? "有压力" : effect === "mixed" ? "利弊并见" : effect === "unresolved" ? "条件性" : "主题解读";
const effectFor = (support: boolean, pressure: boolean): OutlookEffect => support && pressure ? "mixed" : pressure ? "obstructs" : support ? "assists" : "neutral";
const shortEffect = (effect: OutlookEffect) => ({ assists: "支持主路径", obstructs: "增加主路径压力", mixed: "支持与阻碍并存", neutral: "未形成明确方向变化", unresolved: "需要按适用条件分别判断" })[effect];
function stemItem(dayStem: string, stem: string, label: string, visible: boolean, primary: boolean, weight: number): StemItem {
  const god = canonicalizeStrengthTenGod((LunarUtil.SHI_SHEN as Record<string, string>)[dayStem + stem] ?? "");
  const group = strengthTenGodGroup(god);
  if (!group) throw new Error("综合岁运缺少可识别的天干十神。");
  return { stem, god, group, element: strengthElementForStem(stem), visible, primary, weight, label };
}
function locate(item: StemItem, origin: OutlookRescueObject["origin"], branch: string | null, hiddenIndex: number | null, monthCommand = false): StemItem {
  const visibility = monthCommand ? "month_command" : item.visible ? "visible" : item.primary ? "main_hidden" : "other_hidden";
  item.traceObject = { id: JSON.stringify([origin, visibility, hiddenIndex, item.stem]), origin, stem: item.stem, tenGod: item.god,
    group: item.group, element: item.element, label: item.label, visibility, branch, hiddenIndex };
  return item;
}
function projectNatal(revision: RevisionRecord, includeHour: boolean, trace = false): Projection {
  const stems: StemItem[] = [], branches: string[] = [], day = revision.facts.pillars.day.stem;
  for (const position of POSITIONS.filter((position) => includeHour || position !== "hour")) {
    const pillar = revision.facts.pillars[position]; branches.push(pillar.branch);
    const add = (item: StemItem, index: number | null) => stems.push(trace ? locate(item, { kind: "natal", position }, index === null ? null : pillar.branch, index) : item);
    if (position !== "day") add(stemItem(day, pillar.stem, `${LABELS[position]}透${pillar.stem}`, true, false, LOCAL_OUTLOOK_MODEL.visible), null);
    pillar.hiddenStems.forEach((stem, index) => add(stemItem(day, stem, `${LABELS[position]}${pillar.branch}藏${stem}`, false, index === 0,
      index === 0 ? LOCAL_OUTLOOK_MODEL.mainHidden : LOCAL_OUTLOOK_MODEL.otherHidden), index));
  }
  const main = revision.facts.pillars.month.hiddenStems[0]!;
  const monthItem = stemItem(day, main, `月令主气${main}（本地月令项）`, false, false, LOCAL_OUTLOOK_MODEL.monthCommand);
  stems.push(trace ? locate(monthItem, { kind: "natal", position: "month" }, revision.facts.pillars.month.branch, 0, true) : monthItem);
  return { stems, branches };
}
function projectNode(revision: RevisionRecord, node: Pick<TransitNode, "ganZhi" | "nodeType">, origin?: OutlookRescueObject["origin"]): Projection {
  const [stem, branch] = [...node.ganZhi];
  const name = node.nodeType === "dayun" ? "大运" : node.nodeType === "year" ? "流年" : "节令月";
  const stems = [stemItem(revision.facts.pillars.day.stem, stem!, `${name}${node.ganZhi}透${stem}`, true, false, LOCAL_OUTLOOK_MODEL.visible),
    ...hidden(branch!).map((value, index) => stemItem(revision.facts.pillars.day.stem, value, `${name}${node.ganZhi}藏${value}`, false, index === 0, index === 0 ? LOCAL_OUTLOOK_MODEL.mainHidden : LOCAL_OUTLOOK_MODEL.otherHidden))];
  return { branches: [branch!], stems: origin ? stems.map((item, index) => locate(item, origin, index === 0 ? null : branch!, index === 0 ? null : index - 1)) : stems };
}
const join = (...parts: Projection[]): Projection => ({ stems: parts.flatMap((part) => part.stems), branches: parts.flatMap((part) => part.branches) });
const weight = (items: readonly StemItem[], groups: readonly TenGodGroup[]) => items.filter((item) => groups.includes(item.group)).reduce((sum, item) => sum + item.weight, 0);
const rootFor = (projection: Projection, item: StemItem) => projection.stems.some((entry) => !entry.visible && entry.element === item.element);
const shown = (projection: Projection, gods: readonly string[]) => projection.stems.filter((item) => item.visible && gods.includes(item.god));
type RescueEdge = { operation: "control" | "combine"; from: StemItem; to: StemItem; lines: string[] };
type RescueSeed = {
  kind: OutlookRescueTrace["kind"]; operation: OutlookRescueTrace["operation"];
  helpers: StemItem[]; obstacles: StemItem[]; protectedObjects: StemItem[]; rootContext: Projection;
  conditionLines?: string[]; blockerLines?: string[]; evidenceLines?: string[];
  obstacleRelations?: RescueEdge[];
  counterEffects?: { from: StemItem; targets: StemItem[]; status: "present" | "conditional"; conditionLines: string[] }[];
};
type RescueRecord = { result: OutlookAxisFinding; line: string; seed: RescueSeed; constraints: RescueEdge[];
  checked: boolean; available: boolean; countsAsSupport: boolean };
function rescueCollector() {
  const records: RescueRecord[] = [];
  const object = (item: StemItem): OutlookRescueObject => {
    if (!item.traceObject) throw new Error("救应追溯缺少实际对象位置。");
    return structuredClone(item.traceObject);
  };
  const refs = (axis: OutlookAxisFinding, field: OutlookRescueRef["field"], lines: readonly string[] = []): OutlookRescueRef[] => unique(lines).map(line => {
    const index = axis[field].indexOf(line);
    if (index < 0) throw new Error("救应追溯引用的原文不存在。");
    return { axisId: axis.id, field, index };
  });
  return {
    add(record: RescueRecord) { records.push(record); },
    finish(axes: OutlookAxisFinding[]): OutlookRescueTrace[] {
      const items = records.map(({ result, line, seed, constraints, checked, available, countsAsSupport }, sequence): OutlookRescueTrace => {
        const rescueRefs = refs(result, "rescues", [line]);
        return { id: `${result.id}:rescue:${rescueRefs[0]!.index}:${sequence}`, axisId: result.id, pathId: result.pathId, kind: seed.kind, operation: seed.operation,
          helpers: seed.helpers.map(object), obstacles: seed.obstacles.map(object), protectedObjects: seed.protectedObjects.map(object),
          helperRoots: seed.helpers.map(helper => ({ helperId: object(helper).id, roots: seed.rootContext.stems
            .filter(root => !root.visible && root.element === helper.element && root.traceObject?.visibility !== "month_command").map(object) })),
          candidateStatus: !checked ? "conditional_candidate" : available ? "available_candidate" : "constrained_candidate",
          constraintCheck: checked ? "checked" : "not_evaluated", countsAsSupport,
          constraints: constraints.map(edge => ({ operation: edge.operation, from: object(edge.from), to: object(edge.to), refs: refs(result, "unresolvedConditions", edge.lines) })),
          obstacleRelations: (seed.obstacleRelations ?? []).map(edge => ({ operation: edge.operation, from: object(edge.from), to: object(edge.to), refs: refs(result, "blockers", edge.lines) })),
          counterEffects: (seed.counterEffects ?? []).map(effect => ({ operation: "generate", status: effect.status, from: object(effect.from), targets: effect.targets.map(object), refs: refs(result, "unresolvedConditions", effect.conditionLines) })),
          rescueRefs, conditionRefs: refs(result, "unresolvedConditions", seed.conditionLines), blockerRefs: refs(result, "blockers", seed.blockerLines), evidenceRefs: refs(result, "evidence", seed.evidenceLines) };
      });
      for (const axis of axes) for (let index = 0; index < axis.rescues.length; index++) {
        if (!items.some(item => item.rescueRefs.some(ref => ref.axisId === axis.id && ref.index === index))) throw new Error("原救应缺少结构化追溯。");
      }
      return items;
    }
  };
}
type RescueCollector = ReturnType<typeof rescueCollector>;
type RescueRequest = { collector: RescueCollector; seed: RescueSeed; addsSupport: boolean };
function stemCombination(left: string, right: string) {
  const a = LunarUtil.JIA_ZI.find((value) => value.startsWith(left))!, b = LunarUtil.JIA_ZI.find((value) => value.startsWith(right))!;
  return calculatePillarRelations({ year: a, month: b, day: a, hour: b }).facts.find((fact) => fact.relationType === "stem_five_combination"
    && fact.participants.length === 2 && fact.participants.some((part) => part.position === "year") && fact.participants.some((part) => part.position === "month"));
}
/** Only exposed, identified actions constrain a rescue here. A constraint does
 * not erase a stem or establish priority, combination removal or transformation. */
function separatedNatalPair(task: NatalWealthResourceTask | undefined, a: StemItem, b: StemItem): boolean {
  return Boolean(task?.pairs.some((pair) => pair.separatedByPeers
    && ((a.label === `${LABELS[pair.wealth.position]}透${pair.wealth.stem}` && b.label === `${LABELS[pair.resource.position]}透${pair.resource.stem}`)
      || (b.label === `${LABELS[pair.wealth.position]}透${pair.wealth.stem}` && a.label === `${LABELS[pair.resource.position]}透${pair.resource.stem}`))));
}
function rescueConstraints(candidate: StemItem, context: Projection, obstacle?: StemItem, task?: NatalWealthResourceTask, edges?: RescueEdge[]): string[] {
  return unique(context.stems.filter((item) => item.visible && item !== candidate && item !== obstacle).flatMap((item) => {
    if (separatedNatalPair(task, candidate, item)) return [];
    const pair = stemCombination(candidate.stem, item.stem);
    const operation = pair ? "combine" : controls(item.element, candidate.element) ? "control" : null;
    if (!operation) return [];
    const line = pair ? `${candidate.label}与${item.label}另有${candidate.stem}${item.stem}天干五合` : `${item.label}可克${candidate.label}`;
    edges?.push({ operation, from: item, to: candidate, lines: [] });
    return [line];
  }));
}
function recordConstrainedRescue(result: OutlookAxisFinding, candidate: StemItem, context: Projection, description: string, obstacle?: StemItem, task?: NatalWealthResourceTask, trace?: RescueRequest): boolean {
  const edges: RescueEdge[] = [];
  const constraints = rescueConstraints(candidate, context, obstacle, task, trace ? edges : undefined);
  result.rescues.push(`${description}${constraints.length ? "；但救应自身受牵连，只保留有条件的候选。" : "。"}`);
  if (constraints.length) result.unresolvedConditions.push(`${constraints.join("；")}；未据此删除救应天干，也未把它算作可自由完成的制约。`);
  result.evidence.push("救应可用性采用本地保守谓词：具体透干、同五行藏根及第三透干合/克逐项核对；受牵连候选不直接增加支持方向，未推断合去、作用先后或实际强度。");
  if (trace) {
    const condition = constraints.length ? result.unresolvedConditions.at(-1)! : null;
    for (const edge of edges) edge.lines = condition ? [condition] : [];
    trace.collector.add({ result, line: result.rescues.at(-1)!, seed: { ...trace.seed,
      conditionLines: [...(trace.seed.conditionLines ?? []), ...(condition ? [condition] : [])],
      evidenceLines: [...(trace.seed.evidenceLines ?? []), result.evidence.at(-1)!] }, constraints: edges,
      checked: true, available: constraints.length === 0, countsAsSupport: trace.addsSupport && constraints.length === 0 });
  }
  return constraints.length === 0;
}
/** Continue an already protected natal function through the exact background.
 * This checks concrete exposed edges; it does not vote over background gods. */
function persistentProtection(result: OutlookAxisFinding, natal: Projection, before: Projection, target: Projection, keys: StemItem[],
  options: { collector?: RescueCollector; relations?: RescueEdge[]; task?: NatalWealthResourceTask; dualFood?: boolean;
    officialPath?: boolean; allowRescue?: boolean; skip?: (cause: StemItem, key: StemItem) => boolean } = {}) {
  let support = false, pressure = false;
  const all = join(before, target), relations = options.relations ?? [];
  for (const cause of before.stems.filter(item => item.visible && item.traceObject?.origin.kind === "background")) for (const key of keys) {
    if (options.skip?.(cause, key)) continue;
    const combining = Boolean(stemCombination(cause.stem, key.stem)), controlling = controls(cause.element, key.element);
    if (!combining && !controlling) continue;
    const dual = Boolean(options.dualFood && key.god === "食神"), lines: string[] = [];
    for (const operation of [combining ? "combine" : null, controlling ? "control" : null] as const) {
      if (!operation) continue;
      const line = `${cause.label}${operation === "combine" ? `与${key.label}有${cause.stem}${key.stem}天干五合` : `可克${key.label}`}；${dual ? "该食神的泄身出口与制杀支点共受同一牵连" : `原已保护的${key.god}支点受到牵连`}，进入本段持续条件。`;
      result.blockers.push(line); lines.push(line); relations.push({ operation, from: cause, to: key, lines: [line] });
    }
    pressure = true;
    result.unresolvedConditions.push(dual ? "模型边界：背景合克只确认同一食神支点受牵，不判食神消失、七杀已经失制或合化成立；当期新增助力与这一持续条件分别保留。"
      : "模型边界：背景合克只确认原已保护用字受牵，不删除对象或根，不判合化和作用先后；当期新增助力与这一持续条件分别保留。");
    if (!controlling || options.allowRescue === false) continue;
    for (const rescuer of all.stems.filter(item => item.visible && item !== cause && (!dual || item.group === "wealth") && controls(item.element, cause.element) && rootFor(all, item))) {
      const tied = Boolean(stemCombination(rescuer.stem, cause.stem));
      if (tied && !options.task && !dual && !(options.officialPath && cause.god === "伤官" && rescuer.group === "resource")) continue;
      const condition = dual ? `${rescuer.label}约束阻食之印的候选仍须保留印的生身一面；${tied ? "合印未判合去，不能又算作自由克印" : "制印未判强度足够"}。`
        : `${rescuer.label}约束${cause.label}的候选须保留其余合克；${tied ? "相合不等于合去，也不同时算作自由克制" : "相克未判强度足够"}，不能据此宣布原用字已恢复顺畅。`;
      const counter = `${rescuer.label}同时可生原局七杀；保护泄秀与制杀支点，不等于财的另一作用已经消除。`;
      const available = recordConstrainedRescue(result, rescuer, all, `${rescuer.label}${tied ? "合" : "制"}${cause.label}，为保护${key.label}${dual ? "两项功能" : "既有作用"}的候选`, cause, options.task,
        options.collector ? { collector: options.collector, addsSupport: true, seed: { kind: dual ? "wealth_protects_food" : options.task ? "wealth_resource_protection" : "counter_obstacle", operation: tied ? "combine" : "control",
          helpers: [rescuer], obstacles: [cause], protectedObjects: [key], rootContext: all, blockerLines: lines,
          obstacleRelations: relations.filter(edge => edge.from === cause && edge.to === key), conditionLines: [condition, ...(dual ? [counter] : [])],
          counterEffects: dual ? [{ from: rescuer, targets: shown(natal, G.killing), status: "present", conditionLines: [counter] }] : [] } } : undefined);
      support ||= available; result.unresolvedConditions.push(condition, ...(dual ? [counter] : []));
    }
  }
  return { support, pressure };
}
const G = { output: ["食神", "伤官"], wealth: ["正财", "偏财"], resource: ["正印", "偏印"], official: ["正官"], killing: ["七杀"] };
function selectPath(assessment: BaziPreliminaryAssessment, natal: Projection, working = getWorkingBalance(assessment), wealthResourceTask?: NatalWealthResourceTask): Path {
  const selected = selectNatalPatternPath({ family: assessment.pattern.family, monthMainStem: assessment.pattern.monthMainStem,
    monthMainTenGod: assessment.pattern.monthMainTenGod, visibleTenGods: natal.stems.filter((item) => item.visible).map((item) => item.god),
    workingFocus: working.focus, wealthResourceTask });
  return { ...selected, title: selected.title ? `${selected.title}路径` : `${assessment.pattern.background}的保护与承接`,
    basis: selected.id.endsWith("-background") ? "outlook-basis-whole-chart" : `outlook-basis-${selected.id}` };
}
function assertNatalTaskFacts(revision: RevisionRecord, assessment: BaziPreliminaryAssessment, includeHour: boolean): void {
  const stable = (value: unknown) => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item)
    ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
  const selected = POSITIONS.filter(position => includeHour || position !== "hour");
  const expected = { pillars: Object.fromEntries(selected.map(position => [position, revision.facts.pillars[position]])) };
  if (stable(assessment.balance.structural.inputFacts) !== stable(expected)) throw new Error("本命任务所选事实与源修订不一致。");
}
function finding(axis: OutlookAxis, pathId: string, ruleId: string, summary: string, sourceIds: readonly string[]): OutlookAxisFinding {
  return { id: `${axis}:${pathId}`, axis, effect: "neutral", ruleId, pathId, summary, sourceIds: [...sourceIds], evidence: [], satisfiedConditions: [], unresolvedConditions: [], blockers: [], rescues: [] };
}
/** Machine attribution is recorded alongside the original decisions. It never
 * changes their booleans, wording, order or rescue attribution. */
function actionRecorder(target: Projection) {
  const entries = target.stems.filter((item) => item.visible || item.primary).map((item) => ({ item, support: false, pressure: false, known: false,
    evidence: [] as string[], blockers: [] as string[], satisfied: [] as string[], summaryBasis: false }));
  return {
    add(item: StemItem, effect: OutlookEffect, refs: { evidence?: string; blocker?: string; satisfied?: string; summaryBasis?: boolean } = {}) {
      const entry = entries.find((candidate) => candidate.item === item)!;
      entry.support ||= effect === "assists" || effect === "mixed"; entry.pressure ||= effect === "obstructs" || effect === "mixed";
      entry.known ||= effect !== "unresolved"; entry.summaryBasis ||= Boolean(refs.summaryBasis);
      if (refs.evidence) entry.evidence.push(refs.evidence); if (refs.blocker) entry.blockers.push(refs.blocker); if (refs.satisfied) entry.satisfied.push(refs.satisfied);
    },
    finish(result: OutlookAxisFinding): OutlookStemActions {
      const indexes = (lines: string[], original: string[]) => unique(lines.map((line) => { const index = original.indexOf(line); if (index < 0) throw new Error("作用元数据引用的原依据不存在。"); return index; }));
      return { version: OUTLOOK_STEM_ACTIONS_VERSION, items: entries.map((entry) => ({ visibility: entry.item.visible ? "visible" : "main_hidden",
        stem: entry.item.stem, tenGod: entry.item.god, effect: entry.known ? effectFor(entry.support, entry.pressure) : "unresolved",
        evidenceIndexes: indexes(entry.evidence, result.evidence), blockerIndexes: indexes(entry.blockers, result.blockers), satisfiedConditionIndexes: indexes(entry.satisfied, result.satisfiedConditions), summaryBasis: entry.summaryBasis })) };
    }
  };
}
function balanceFinding(assessment: BaziPreliminaryAssessment, working: ReturnType<typeof getWorkingBalance>, target: Projection): OutlookAxisFinding {
  const result = finding("balance", working.direction, "working-element-role", "", working.sourceIds);
  let support = false, pressure = false;
  for (const item of target.stems.filter((item) => item.visible || item.primary)) {
    const good = working.favorableElements.includes(item.element), bad = working.unfavorableElements.includes(item.element);
    support ||= good; pressure ||= bad;
    result.evidence.push(`${item.label}（${item.god}，${strengthElementLabel(item.element)}）：${good ? "当前扶抑有利" : bad ? "当前扶抑承压" : "本次扶抑未固定喜忌"}。`);
  }
  result.effect = working.direction === "conditional" ? "unresolved" : effectFor(support, pressure);
  result.summary = working.direction === "conditional" ? `当前${working.label}；本轴按具体任务取舍，不从原分数推出某一五行通用有利，格局与调候继续分别判断。`
    : working.direction === "balanced" ? "当前扶抑判断相对中和，本轴不固定方向，继续看格局与调候的具体变化。" : `按当前${working.label}判断，目标运限${shortEffect(result.effect)}。`;
  if (working.direction === "conditional") result.unresolvedConditions.push(working.band === "undetermined"
    ? "日主根气与财官杀负荷同时存在，尚未单独裁定整体强弱；当前条件判断不等同中和，也不把原计权喜忌移入本轴。"
    : `身势已按“${working.label}”作相对判断；用字任务与官杀取清仍有条件，不能由这一身势等级直接推出五行通用喜忌，也不把原计权喜忌移入本轴。`);
  result.satisfiedConditions.push(`当前扶抑方向${working.direction}；仅将目标天干与支本气放入本次方向，背景不重复投票。`);
  result.evidence.push(`旺衰工作判断：${working.version}；${working.selection}；${working.ruleId}。`);
  if (assessment.balance.direction === "conditional") result.evidence.push(`原计权对照：${assessment.balance.sensitivitySummary}`);
  return result;
}

/** The natal moderation task is not a permanent forecast that more wealth is
 * good. Actual exposed ties and a changed background are checked separately. */
function resourceWealthFinding(assessment: BaziPreliminaryAssessment, working: ReturnType<typeof getWorkingBalance>, natal: Projection, before: Projection, target: Projection, result: OutlookAxisFinding, collector?: RescueCollector): OutlookAxisFinding {
  const actions = actionRecorder(target);
  const money = shown(natal, G.wealth), prints = shown(natal, G.resource), actor = target.stems.find((item) => item.visible)!;
  const all = join(before, target), dayStem = assessment.balance.structural.facts.dayMaster.stem;
  const backgroundChanges = before.stems.filter((item) => item.visible && !natal.stems.includes(item)
    && (item.group === "wealth" || item.group === "output"));
  const tiesFor = (item: StemItem) => unique([
    ...rescueConstraints(item, all),
    ...(stemCombination(item.stem, dayStem) ? [`${item.label}与日主${dayStem}有天干五合`] : [])
  ]);
  const names = (items: readonly StemItem[]) => items.map((item) => `${item.stem}${item.god}`).join("、");
  const originalTies = unique(money.flatMap(tiesFor));
  result.sourceIds = unique([...result.sourceIds, ...working.sourceIds]);
  result.evidence.push(`当前工作规则${working.ruleId}选定${names(money)}裁印、${names(prints)}保留基础支持；不是继续增加所有财的指令。`, ...working.evidence);
  result.evidence.push(...target.stems.filter((item) => item.primary).map((item) => { const line = `${item.label}只记录地支本气与根的承接，未当作自由透干。`; actions.add(item, "unresolved", { evidence: line }); return line; }));
  if (backgroundChanges.length) result.unresolvedConditions.push(`${backgroundChanges.map((item) => item.label).join("、")}已在本段背景中透出，财食条件较原局有所改变；目标再来财时不沿用原局单财裁印直接判助力。`);
  if (originalTies.length) result.unresolvedConditions.push(`${originalTies.join("；")}；原财的裁印任务仍在，实际作用受牵连，不据此判合去或已经自由制印。`);
  let support = false, pressure = false;
  const changes: string[] = [];
  actions.add(actor, "unresolved", { summaryBasis: true });
  if (actor.group === "wealth") {
    const ties = tiesFor(actor), rooted = rootFor(all, actor);
    changes.push(`${actor.stem}${actor.god}${money.some((item) => item.stem === actor.stem) ? "原已透出，本期再现" : "本期透入"}，参与约束重复的印支持`);
    if (!rooted) result.unresolvedConditions.push(`${actor.stem}虽透，当前实际地支未见同五行根，不能直接计为有效裁印。`);
    if (ties.length) {
      changes.push(`但${ties.join("；")}，财的作用不能按完全自由来解释`);
      result.unresolvedConditions.push(...ties.map((tie) => `${tie}；合克事实不等于已经去留，也不把来财直接计为顺遂。`));
    }
    if (rooted && !ties.length && !originalTies.length && !backgroundChanges.length) {
      support = true; const condition = `${actor.stem}${actor.god}有实际根，未见具体透干合克牵制，按当前本地任务模型可助裁印。`; result.satisfiedConditions.push(condition);
      actions.add(actor, "assists", { satisfied: condition, summaryBasis: true });
      changes.push("在当前背景下，财的裁印环节得到支持；增加到何种程度合适仍须看实际承接");
    } else changes.push("本期先看财怎样真正作用到印，不把财再现直接读成财运转好");
  } else if (actor.group === "resource") {
    pressure = true;
    actions.add(actor, "obstructs", { summaryBasis: true });
    changes.push(`${actor.stem}${actor.god}加入后继续增加已有的印支持，当前重点是减少重复准备、保留实际用途`);
    for (const key of money) {
      const ties = tiesFor(key);
      if (rootFor(all, key) && !ties.length) {
        support = true;
        result.rescues.push(`${key.label}${key.god}有根且未见另合克牵制，可作为约束新增${actor.stem}${actor.god}的候选；原印的基础支持仍保留。`);
        collector?.add({ result, line: result.rescues.at(-1)!, seed: { kind: "wealth_moderates_resource", operation: "control",
          helpers: [key], obstacles: [actor], protectedObjects: prints, rootContext: all }, constraints: [], checked: true, available: true, countsAsSupport: true });
      } else result.unresolvedConditions.push(`${key.label}原有裁印任务，但${ties.length ? ties.join("；") : "当前缺少同五行根"}，不能直接认为新增支持已被调节。`);
    }
  } else if (actor.group === "peer") {
    pressure = true;
    changes.push(`${actor.stem}${actor.god}透入，可克既有${names(money)}，使裁印环节受到牵制`);
    const blocker = `${actor.label}对具体财字${names(money)}形成克制；不是把所有同类支持一概判为不利。`; result.blockers.push(blocker);
    actions.add(actor, "obstructs", { blocker, summaryBasis: true });
    const ties = rescueConstraints(actor, all);
    if (ties.length) result.unresolvedConditions.push(`${ties.join("；")}；来干自身也受牵连，克财不能按完全自由作用处理。`);
  } else if (actor.group === "output") {
    actions.add(actor, "unresolved", { summaryBasis: true });
    changes.push(`${actor.stem}${actor.god}透入，增加泄秀出口，也能生财，原先无透食伤的单财裁印条件已变化`);
    result.unresolvedConditions.push("新增食伤可能让财由轻转重，也可能提供新的输出出口；本版保留两项实际联系，未据出现即判财食越多越好。");
  } else {
    pressure = true;
    actions.add(actor, "obstructs", { summaryBasis: true });
    changes.push(`${actor.stem}${actor.god}透入，可生印并承接财的生助，原来专看财约印的任务增加了职责与压力分工`);
    result.unresolvedConditions.push("新增官杀与财印有实际生克联系，是否需要改用官印或杀印须另辨，不把多一类职责当作已经成格。");
  }
  for (const key of money) {
    const pair = stemCombination(actor.stem, key.stem);
    if (pair) {
      pressure = true;
      const blocker = `${actor.label}与承担裁印任务的${key.label}构成${actor.stem}${key.stem}天干五合，原财作用带有牵连。`; result.blockers.push(blocker);
      actions.add(actor, "obstructs", { blocker, summaryBasis: true });
      result.unresolvedConditions.push("这里保留财被合的事实，未认定合去、合化或财已消失。");
    }
  }
  const persistent = persistentProtection(result, natal, before, target, money, { collector, allowRescue: false });
  pressure ||= persistent.pressure;
  result.effect = !support && !pressure ? "unresolved" : effectFor(support, pressure);
  result.summary = `${changes.join("。") }。${result.blockers[0] ?? ""}${result.rescues[0] ?? ""}`;
  result.unresolvedConditions.push("模型边界：原局印多用财不等于后续所有财运皆吉；本地应用只按具体透干、根、牵制与实际背景区分作用，未估计力量剂量或发生概率。");
  result.evidence = unique(result.evidence); result.unresolvedConditions = unique(result.unresolvedConditions);
  result.stemActions = actions.finish(result);
  return result;
}

/** Natal placement selects the task only. Incoming stems have no natal column
 * and cannot borrow its separation; their roots, ties and protected objects
 * are evaluated in the actual target/background projection. */
function wealthResourceTaskFinding(task: NatalWealthResourceTask, natal: Projection, before: Projection, target: Projection, result: OutlookAxisFinding, collector?: RescueCollector): OutlookAxisFinding {
  const actions = actionRecorder(target), all = join(before, target), actor = target.stems.find((item) => item.visible)!;
  const pair = task.pairs[0]!;
  const natalActor = (entry: typeof pair.wealth) => natal.stems.find((item) => item.visible && item.label === `${LABELS[entry.position]}透${entry.stem}`)!;
  const wealth = natalActor(pair.wealth), resource = natalActor(pair.resource);
  const protectedItems = task.task === "resource_first" ? [resource] : task.task === "wealth_first" ? [wealth]
    : [wealth, resource, ...shown(natal, G.official)];
  const primary = task.task === "resource_first" ? resource : wealth;
  let support = false, pressure = false;
  const impacts: string[] = [];
  result.sourceIds = unique([...result.sourceIds, ...task.sourceIds]);
  result.evidence.push(task.summary, ...task.evidence);
  result.satisfiedConditions.push(`本命财印任务为${task.task}；只依据本命四柱的真实财印和间隔选定，没有将岁运来干排为第五柱。`);
  result.unresolvedConditions.push(...task.conditions);
  if (!rootFor(natal, primary)) result.unresolvedConditions.push(`本命${primary.label}${primary.god}虽为当前优先任务，原支内未见同五行根；取用方向不等于作用已经足量。`);

  for (const item of target.stems.filter((item) => item.visible || item.primary)) {
    if (!item.visible) {
      const line = `${item.label}（${item.god}）只保留支本气背景与根气，未冒充自由透干财印生克。`;
      result.evidence.push(line); actions.add(item, "neutral", { evidence: line }); continue;
    }
    let intended: "support" | "pressure" | "conditional" = "conditional";
    let action = "";
    if (task.task === "official_joint") {
      if (item.group === "wealth") { intended = "support"; action = `${item.stem}${item.god}增加资官的投入，同时会克原局${resource.stem}${resource.god}；原财印分位不能保护这个新来财`; }
      else if (item.group === "resource") { intended = "support"; action = `${item.stem}${item.god}参与承接官的要求，仍须面对现有财对新印的作用，不能直接沿原局隔护判为无碍`; }
      else if (item.god === "伤官" || item.god === "七杀") { intended = "pressure"; action = `${item.stem}${item.god}${item.god === "伤官" ? "牵动正官的职责安排，原印能否护官另看" : "加入官格后增加官杀取清问题，不能与正官叠作同一种支持"}`; }
      else action = `${item.stem}${item.god}加入官格财印分用背景，其职责、输出或同类支持与财印任务分别阅读`;
    } else if (task.task === "resource_first") {
      if (item.group === "resource") { intended = "support"; action = `${item.stem}${item.god}补入护身制伤的支持环节，但须核它有无根、是否被财克或相合牵住`; }
      else if (item.group === "wealth") { intended = "pressure"; action = `${item.stem}${item.god}继续增财并牵制需要保留的${resource.stem}${resource.god}，不能按伤官生财一律列为助力`; }
      else if (item.group === "output") { intended = "pressure"; action = `${item.stem}${item.god}继续增加食伤输出，原局优先护身制伤的承接问题仍在`; }
      else action = `${item.stem}${item.god}与护身制伤任务分别判断，${item.group === "authority" ? "官杀可生印也制身，不能仅凭生印便认作已经补足承接" : "同类支持不等于缺根之印已经得到有效保护"}`;
    } else {
      if (item.group === "wealth") { intended = "support"; action = `${item.stem}${item.god}参与调节已有印的投入；有根及未受牵连时才保留这项具体助力，不把所有财运都判顺`; }
      else if (item.group === "resource") { intended = "pressure"; action = `${item.stem}${item.god}继续增加已有印的支持与制伤作用，牵动当前以财调印的取舍`; }
      else if (item.group === "peer") { intended = "pressure"; action = `${item.stem}${item.god}可克用于调印的${wealth.stem}${wealth.god}，自身有根与继续增加比劫不是同一件事`; }
      else action = `${item.stem}${item.god}加入后${item.group === "authority" ? "生印与制身两面仍须分读" : "输出与生财的衔接仍须看实际财的承接"}，未仅凭印重用财把这一角色一并列喜`;
    }
    impacts.push(action);
    let effect: OutlookEffect = intended === "pressure" ? "obstructs" : "unresolved";
    if (intended === "support") {
      const constraints = rescueConstraints(item, all, undefined, task), rooted = rootFor(all, item);
      if (rooted && !constraints.length) {
        support = true; effect = "assists";
        const satisfied = `${item.label}${item.god}有同五行承接根，且本次未见其他透干直接合克牵制，提供当前财印任务的助力候选。`;
        result.satisfiedConditions.push(satisfied); actions.add(item, effect, { satisfied, summaryBasis: true });
      } else result.unresolvedConditions.push(`${item.label}${item.god}${rooted ? "有根" : "所见背景与目标支内未见同五行根"}${constraints.length ? `；${constraints.join("；")}` : ""}；任务可用性仍有条件，未当作自由发挥的助力。`);
    }
    pressure ||= effect === "obstructs";
    result.evidence.push(action); actions.add(item, effect, { evidence: action, summaryBasis: true });
  }

  for (const key of protectedItems) {
    const combination = stemCombination(actor.stem, key.stem);
    if (combination || controls(actor.element, key.element)) {
      pressure = true;
      const line = combination ? `${actor.label}与关键${key.label}有${actor.stem}${key.stem}天干五合；这不是原局隔位的同一对，关键${key.god}任务带有牵连。`
        : `${actor.label}可克关键${key.label}；当前保护的是${key.god}的具体任务，原局隔护不扩展到新来干。`;
      result.blockers.push(line); actions.add(actor, "obstructs", { blocker: line });
      if (combination) result.unresolvedConditions.push(`${actor.stem}${key.stem}有合的事实，不据此判合去或合化；原局用字仍完整保留。`);
      if (controls(actor.element, key.element)) for (const rescuer of before.stems.filter((item) => item.visible && controls(item.element, actor.element) && rootFor(before, item))) {
        const tied = Boolean(stemCombination(rescuer.stem, actor.stem));
        const available = recordConstrainedRescue(result, rescuer, all,
          `${rescuer.label}有根，${tied ? `与来干${actor.stem}相合，保留牵制该干的候选，不同时按自由相克或已经合去解释` : `可制约来干${actor.stem}`}，形成保护${key.stem}${key.god}的救应候选`, actor, task,
          collector ? { collector, addsSupport: true, seed: { kind: "wealth_resource_protection", operation: tied ? "combine" : "control",
            helpers: [rescuer], obstacles: [actor], protectedObjects: [key], rootContext: before, blockerLines: [line],
            obstacleRelations: [{ operation: combination ? "combine" : "control", from: actor, to: key, lines: [line] }] } } : undefined);
        support ||= available;
      }
    }
  }
  const persistent = persistentProtection(result, natal, before, target, protectedItems, { collector, task, officialPath: task.task === "official_joint" });
  support ||= persistent.support; pressure ||= persistent.pressure;
  result.effect = !support && !pressure ? "unresolved" : effectFor(support, pressure);
  result.summary = `${impacts[0] ?? task.summary}。${result.blockers[0] ?? ""}${result.rescues[0] ?? ""}`;
  if (result.rescues.length) result.summary += "救应候选不抵消已列牵制，能否足量发挥仍有条件。";
  result.evidence = unique(result.evidence); result.blockers = unique(result.blockers); result.rescues = unique(result.rescues); result.unresolvedConditions = unique(result.unresolvedConditions);
  result.stemActions = actions.finish(result);
  return result;
}

const NATAL_TASK_PATHS = { resource_food_controls_killing: "resource-output", chen_ren_resource_use: "official-resource", protect_shallow_food: "food-killings" } as const;
function taskObject(data: NatalStructureTasks, id: string, natal: Projection): OutlookRescueObject {
  const actor = data.actors.find(item => item.id === id);
  if (!actor) throw new Error("本命任务缺少实际作用对象。");
  if (actor.position === "day" && actor.visibility === "visible") {
    const item = stemItem(actor.stem, actor.stem, `日主${actor.stem}`, true, false, 0); item.god = "日主";
    return locate(item, { kind: "natal", position: "day" }, null, null).traceObject!;
  }
  const item = natal.stems.find(value => value.traceObject?.origin.kind === "natal" && value.traceObject.origin.position === actor.position
    && value.stem === actor.stem && value.traceObject.visibility === actor.visibility);
  if (!item?.traceObject) throw new Error("本命任务对象与原投影不一致。");
  return item.traceObject;
}
function finishTaskLinks(result: OutlookAxisFinding, data: NatalStructureTasks, tasks: NatalStructureTask[], natal: Projection, before: Projection, target: Projection, relations: RescueEdge[]): void {
  if (!tasks.length) return;
  const ref = (field: OutlookRescueRef["field"], line: string): OutlookRescueRef => {
    const index = result[field].indexOf(line); if (index < 0) throw new Error("任务联动依据未写入原判断。");
    return { axisId: result.id, field, index };
  };
  const items: OutlookNatalTaskLink[] = tasks.map(task => {
    const pivots = task.pivotIds.map(id => taskObject(data, id, natal)), ids = new Set(pivots.map(pivot => pivot.id));
    const functions = task.functions.map(fn => ({ operation: fn.operation, from: taskObject(data, fn.fromId, natal), to: taskObject(data, fn.toId, natal) }));
    const evidence: string[] = [];
    const functionLine = `本命作用任务：${functions.map(fn => `${fn.from.label}${fn.operation === "control" ? "克" : "生"}${fn.to.label}`).join("；")}。同一支点兼任的功能不重复计为多份助力或压力。`;
    result.evidence.push(functionLine); evidence.push(functionLine);
    const roots = pivots.map(object => {
      const matching = (projection: Projection) => projection.stems.filter(item => !item.visible && item.traceObject?.visibility !== "month_command" && item.element === object.element).map(item => {
        if (!item.traceObject) throw new Error("任务藏根缺少位置来源。"); return item.traceObject;
      });
      const natalRoots = matching(natal), backgroundRoots = matching(before).filter(root => root.origin.kind === "background"), targetRoots = matching(target);
      const line = `${object.label}的本命根：${natalRoots.map(root => root.label).join("、") || "未见"}；本段背景补入的根：${backgroundRoots.map(root => root.label).join("、") || "未见"}；目标支内的根：${targetRoots.map(root => root.label).join("、") || "未见"}。运年支根不倒写为本命原有根，藏干不当作自由透干。`;
      result.evidence.push(line); evidence.push(line);
      return { object, natal: natalRoots, background: backgroundRoots, target: targetRoots };
    });
    const edges = relations.filter(edge => edge.to.traceObject && ids.has(edge.to.traceObject.id));
    const uniqueEdges = [...new Map(edges.map(edge => [`${edge.operation}:${edge.from.traceObject!.id}>${edge.to.traceObject!.id}`, edge])).values()];
    return { id: task.id, taskId: task.kind, pivots, functions, roots,
      relations: uniqueEdges.map(edge => ({ operation: edge.operation, from: edge.from.traceObject!, to: edge.to.traceObject!, contributesPressure: true,
        refs: unique(edge.lines).map(line => ref("blockers", line)) })),
      targetActionIndexes: (result.stemActions?.items ?? []).map((_item, index) => index),
      conditionRefs: result.unresolvedConditions.map((line) => ref("unresolvedConditions", line)), evidenceRefs: evidence.map(line => ref("evidence", line)) };
  });
  result.taskLinks = structuredClone({ version: OUTLOOK_NATAL_TASK_LINKS_VERSION, natalTaskVersion: data.version, items });
  result.sourceIds = unique([...result.sourceIds, ...tasks.flatMap(task => task.sourceIds)]);
}
function patternFinding(assessment: BaziPreliminaryAssessment, working: ReturnType<typeof getWorkingBalance>, natal: Projection, before: Projection, target: Projection, path: Path, wealthResourceTask?: NatalWealthResourceTask, collector?: RescueCollector): OutlookAxisFinding {
  const basis = OUTLOOK_RULE_BASES.find((item) => item.id === path.basis)!;
  const result = finding("pattern", path.id, path.basis, "", basis.sourceIds);
  result.evidence.push(`本命预先选定${path.title}，不随目标年份改选路径。`, ...natal.stems.filter((item) => item.visible).map((item) => `${item.label}为${item.god}。`));
  if (path.monthCommandRole) {
    const monthSources = path.monthCommandRole.tenGod === "伤官" ? wealthResourceTask?.sourceIds ?? [] : ["outlook-zq-month-command", path.monthCommandRole.tenGod === "七杀" ? "outlook-zq-killing-month-example" : "outlook-zq-official-month-example"];
    result.sourceIds = unique([...result.sourceIds, ...monthSources]);
    result.evidence.push(path.monthCommandRole.tenGod === "伤官"
      ? `月令主气${path.monthCommandRole.stem}伤官提供财印任务的输出背景，未加入透干数组、自由合克或救应对象；依据为${monthSources.join("、")}。`
      : `月令主气${path.monthCommandRole.stem}${path.monthCommandRole.tenGod}提供选径背景；未加入透干数组、自由合克或救应对象。原文参照 outlook-zq-month-command/month-command-1 与 ${path.monthCommandRole.tenGod === "七杀" ? "outlook-zq-killing-month-example/month-killing-yi" : "outlook-zq-official-month-example/month-official-xue"}。`);
    result.unresolvedConditions.push(`月令${path.monthCommandRole.stem}${path.monthCommandRole.tenGod}仍是主气藏干，配合用字的透出只确立路径候选；未据此宣告成格、制化完成或日主足以承担。`);
  }
  for (const required of path.required) {
    if (path.monthCommandRole && required.includes(path.monthCommandRole.tenGod)) {
      result.satisfiedConditions.push(`本命月令主气${path.monthCommandRole.stem}为${path.monthCommandRole.tenGod}，满足这条路径的月令角色前提；不冒称${path.monthCommandRole.stem}已经透出。`);
      continue;
    }
    const visible = shown(natal, required);
    if (!visible.length) result.unresolvedConditions.push(`原局${required.join("或")}尚未透出，不能把目标新组合直接判成已成格。`);
    else if (!visible.some((item) => rootFor(natal, item))) result.unresolvedConditions.push(`${required.join("或")}虽透出，所选本命支内未见同五行承接根；本地路径前提不足。`);
    else result.satisfiedConditions.push(`${required.join("或")}在原局有具体透干及同五行藏根。`);
  }
  if (wealthResourceTask?.preferredPathId) return wealthResourceTaskFinding(wealthResourceTask, natal, before, target, result, collector);
  if (path.id === "resource-wealth") return resourceWealthFinding(assessment, working, natal, before, target, result, collector);
  const actions = actionRecorder(target);
  const natalTaskData = evaluateNatalStructureTasks({ facts: assessment.balance.structural.inputFacts, includeHour: assessment.sourceBinding.includeHour });
  const natalTasks = natalTaskData.tasks.filter(task => NATAL_TASK_PATHS[task.kind] === path.id);
  const load = (projection: Projection) => ({ carrying: weight(projection.stems, ["peer", "resource"]), financial: weight(projection.stems, ["output", "wealth"]),
    output: weight(projection.stems, ["output"]), wealth: weight(projection.stems, ["wealth"]), authority: weight(projection.stems, ["authority"]), resource: weight(projection.stems, ["resource"]) });
  const base = load(before), after = load(join(before, target));
  const heavy = base.financial > base.carrying * LOCAL_OUTLOOK_MODEL.outputWealthToSupportBoundary;
  result.evidence.push(`本地负荷项（非吉凶分数）：背景财食${base.financial}／印比承接${base.carrying}；加入目标后${after.financial}／${after.carrying}。透干2、支本气2、余气1、月令4；分界1.0属于${LOCAL_OUTLOOK_POLICY_VERSION}。`);
  const lightPaths = ["peer-output-wealth", "wealth-food", "hurting-wealth", "food-wealth"].includes(path.id);
  if (lightPaths) {
    result.satisfiedConditions.push(`当前模型归入财食${heavy ? "偏重" : "不重"}分支；与日主是否balanced分别求值。`);
    const variants = LOCAL_OUTLOOK_MODEL.loadSensitivityBoundaries.map((cutoff) => base.financial > base.carrying * cutoff);
    if (new Set(variants).size > 1) result.unresolvedConditions.push("财食/承接的0.8、1.0、1.2替代分界不一致；主句沿1.0本地模型，轻重分歧保留为条件。");
    if (path.id === "food-wealth") result.unresolvedConditions.push("食神生财的轻重沿用本地跨路径负荷模型；未引用食神取运首句异文，方向需保留这一适用条件。");
  }
  let support = false, pressure = false;
  const impacts: string[] = [];
  const godWeight = (god: string) => before.stems.filter((item) => item.god === god).reduce((sum, item) => sum + item.weight, 0);
  const foodLoad = godWeight("食神"), killingLoad = godWeight("七杀");
  if (path.id === "food-killings") {
    result.evidence.push(`食杀单独负荷：食神${foodLoad}、七杀${killingLoad}；正官未并入七杀。`);
    if (shown(natal, ["正官"]).length) result.unresolvedConditions.push("原局正官也透出，食神制杀是否仍为唯一主用及官杀取清尚有条件。");
  }
  if (["official-resource", "official-wealth", "killings-resource"].includes(path.id) && shown(natal, G.official).length && shown(natal, G.killing).length) {
    result.unresolvedConditions.push("原局正官与七杀都已透出，去留与取清尚未求定，不能把官杀同现当成纯一的官印、财官或杀印路径。");
  }
  const conditionalCarrying = working.direction === "conditional";
  if (conditionalCarrying) {
    result.sourceIds = unique([...result.sourceIds, ...working.sourceIds]);
    result.unresolvedConditions.push(working.band === "undetermined"
      ? "得令有根与财官杀透根并存；新增财官、印比的助阻依赖承接和取清，未按非偏弱自动转入身强分支。具体合克、救应与调候仍按实际对象判断。"
      : `身势按“${working.label}”判断，财官杀并见的用字任务仍须分别处理；新增财官、印比的助阻依赖承接和取清，不由身势等级自动转入固定喜忌分支。具体合克、救应与调候仍按实际对象判断。`);
  }
  const classify = (item: StemItem): "support" | "pressure" | "none" => {
    // Conditional carrying is a distinct state. Preserve identified role
    // conflicts, but do not let any support/else branch manufacture strength.
    if (conditionalCarrying) {
      if (path.id === "official-wealth" && item.visible && item.god === "七杀") {
        result.unresolvedConditions.push("官杀已经并见，目标又透七杀，增加取清与承接问题；不据此认定官杀已去留或事情必然不利。");
        return "pressure";
      }
      return "none";
    }
    if (lightPaths) {
      if (path.id === "food-wealth" && item.visible && (item.god === "正官" || item.god === "七杀" || item.god === "偏印")) return "pressure";
      if (item.group === "output" || item.group === "wealth") return heavy ? "pressure" : "support";
      if (item.group === "resource" || item.group === "peer") return heavy ? "support" : "pressure";
      // The peer/output-wealth and wealth-food texts explicitly distinguish
      // '遇官非福' from '逢煞无伤'. A hidden killing is not a visible intrusion.
      if (item.visible && item.god === "正官") return "pressure";
      if (item.visible && item.god === "七杀" && path.id === "hurting-wealth") {
        result.unresolvedConditions.push("食伤取财遇杀的作用要看财党杀与制杀条件，本版不直接套禄劫逢杀无伤或一律判凶。");
      }
      return "none";
    }
    if (path.id === "official-resource") {
      if (item.group === "resource") return base.resource > base.authority + base.output && working.direction !== "support" ? "pressure" : "support";
      if (item.god === "七杀" && item.visible) { result.unresolvedConditions.push("正官路径又见七杀透入，官杀混杂与去留未定，不把两者都当支持。"); return "pressure"; }
      if (item.god === "正官") return working.direction === "support" && base.resource < base.authority ? "pressure" : "support";
      if (item.god === "伤官" && item.visible) {
        // The protection is evaluated below against the same damaged official;
        // do not label any rooted print as free before checking its other ties.
        if (shown(before, G.resource).length) result.unresolvedConditions.push("官带伤用印需看印的实际制约与是否过重，不因官伤同现判败。");
        return "pressure";
      }
      if (item.group === "wealth") return base.resource > base.authority + base.output && working.direction !== "support" ? "support" : "pressure";
      return "none";
    }
    if (path.id === "killings-resource") {
      if (item.group === "resource" || item.group === "peer") return base.resource > base.authority + base.output && working.direction !== "support" ? "pressure" : "support";
      if (item.group === "wealth") return "pressure";
      if (item.god === "正官" && item.visible) { result.unresolvedConditions.push("杀印路径又透正官，官杀取清尚未求定。"); return "pressure"; }
      if (item.group === "output" && item.visible) result.unresolvedConditions.push("杀用印与新增食伤制杀可能争用同一作用，应分别看印化与食制，不一律判食伤为压力。");
      return "none";
    }
    if (path.id === "official-wealth") {
      if (item.group === "wealth" || item.god === "正官") return working.direction === "support" ? "pressure" : "support";
      if (item.god === "伤官" || item.god === "七杀" || item.group === "peer") return "pressure";
      return item.group === "resource" && working.direction === "support" ? "support" : "none";
    }
    if (path.id === "food-killings") {
      if (item.god === "正官" && item.visible) { result.unresolvedConditions.push("食神制杀又遇正官透入，混官改变作用对象，不能仍按原食杀比例直接定向。"); return "pressure"; }
      if (foodLoad === killingLoad && working.direction === "support") return item.group === "peer" ? "support" : item.group === "output" || item.group === "authority" ? "pressure" : "none";
      if (item.god === "食神") return foodLoad <= killingLoad ? "support" : "pressure";
      if (item.god === "七杀") return killingLoad < foodLoad && working.direction !== "support" ? "support" : "pressure";
      if (item.group === "wealth") return killingLoad < foodLoad && working.direction !== "support" ? "support" : "pressure";
      return item.god === "偏印" ? "pressure" : "none";
    }
    if (path.id === "hurting-resource") {
      if (item.group === "resource") return working.direction === "support" || base.output > base.resource ? "support" : "pressure";
      if (item.group === "output") return working.direction === "support" ? "pressure" : base.resource > base.output ? "support" : "none";
      if (item.group === "authority") return "support";
      return item.group === "wealth" ? base.resource > base.output + base.wealth && working.direction !== "support" ? "support" : "pressure" : "none";
    }
    if (path.id === "resource-output") {
      if (item.group === "output") return working.direction === "support" ? "pressure" : "support";
      if (item.group === "resource") return working.direction === "support" ? "support" : "pressure";
      return item.group === "wealth" && base.resource > base.output ? "support" : "none";
    }
    if (path.id === "resource-preservation") {
      const food = shown(natal, ["食神"]), indirect = shown(natal, ["偏印"]);
      if (food.length && indirect.length) {
        if (item.group === "wealth") return base.resource >= base.output && working.direction !== "support" ? "support" : "pressure";
        if (item.god === "偏印") return base.resource >= base.output ? "pressure" : "support";
        if (item.god === "食神") return working.direction === "support" ? "pressure" : "support";
      }
      return item.group === "resource" ? working.direction === "support" ? "support" : "pressure" : item.group === "wealth" ? "pressure" : "none";
    }
    return "none";
  };
  for (const item of target.stems.filter((item) => item.visible || item.primary)) {
    const action = classify(item); support ||= action === "support"; pressure ||= action === "pressure";
    if (item.visible && action !== "none" && path.id === "food-killings") impacts.push(
      item.god === "食神" ? `${item.stem}食神加入后${action === "support" ? "补充制杀所需的输出环节" : "继续加重原有制杀力量，承接与是否制过仍要分看"}`
        : item.group === "wealth" ? `${item.stem}${item.god}加入后可带动七杀，${action === "support" ? "补充原先偏轻的约束一方" : "既有杀的负荷随之增加"}`
          : `${item.stem}${item.god}加入后${action === "support" ? "补充这条制杀路径的承接" : "牵动食神、七杀与自身承接的配合"}`);
    else if (item.visible && action !== "none") impacts.push(action === "support"
      ? `${item.stem}${item.god}加入后${item.group === "wealth" ? "补入财的承接与兑现环节" : item.group === "output" ? "加强既有表达、产出与财路衔接" : item.group === "resource" || item.group === "peer" ? "补充日主承接任务所需的支持" : "支持既有责任与印的承接关系"}`
      : `${item.stem}${item.god}加入后${path.id === "official-resource" && item.god === "伤官" ? "使表达、提案与既定规则之间更易产生摩擦，现有印的保护要一并看" : item.group === "resource" ? "可能压住既有食伤输出，或使原本已重的支持继续堆积" : item.group === "peer" ? "与财的用途产生争用，需要食伤通关或其他保护" : item.group === "wealth" || item.group === "output" ? "扩大既有财食负荷，承接能力需要同步" : "带入更多责任与约束，牵动原有取用关系"}`);
    const line = `${item.label}（${item.god}）${item.visible ? "作为透干作用" : "只作为支内本气承接，未当成透干"}：${action === "support" ? "支持此路径分支" : action === "pressure" ? "对该分支增加阻碍或负荷" : "未单独定向"}。`;
    result.evidence.push(line); actions.add(item, action === "support" ? "assists" : action === "pressure" ? "obstructs" : "neutral", { evidence: line });
  }
  if (lightPaths && !heavy && after.financial > after.carrying) {
    pressure = true; result.blockers.push("目标虽补财食，但加入后跨过当前承接分界；产出扩展与负荷增加必须同时保留。");
  }
  // A branch that deliberately moderates excessive print must not simultaneously
  // protect every print stem as though all reduction were damage.
  const excessivePrint = !conditionalCarrying && base.resource > base.authority + base.output && working.direction !== "support";
  const protectedGroups = heavy && ["peer-output-wealth", "wealth-food", "hurting-wealth"].includes(path.id) ? ["peer", "resource"] : path.protectedGroups;
  if (heavy && protectedGroups !== path.protectedGroups) result.evidence.push("财食偏重分支转而保护印比承接；不把适量印制食同时机械记为破坏食伤。");
  const protectedItems = natal.stems.filter((item) => item.visible && protectedGroups.includes(item.group)
    && !(item.group === "resource" && excessivePrint && ["official-resource", "killings-resource", "hurting-resource", "resource-preservation"].includes(path.id)));
  const actor = target.stems.find((item) => item.visible)!;
  const protectedRelations: RescueEdge[] = [];
  for (const key of protectedItems) {
    const pair = stemCombination(actor.stem, key.stem);
    if (pair) {
      pressure = true; const blocker = `${actor.label}与关键${key.label}构成${actor.stem}${key.stem}天干五合，涉及既有${key.god}作用。`; result.blockers.push(blocker);
      protectedRelations.push({ operation: "combine", from: actor, to: key, lines: [blocker] });
      actions.add(actor, "obstructs", { blocker });
      result.evidence.push(`${actor.label}与${key.label}天干合的精确关系依据：${pair.ruleId}。`);
      result.unresolvedConditions.push(`${actor.stem}${key.stem}有合的事实，尚未判合去/合化或实际牵制强度；原作用不删除。`);
    }
    if (controls(actor.element, key.element)) {
      const rescuers = before.stems.filter((item) => item.visible && controls(item.element, actor.element) && rootFor(before, item) && !stemCombination(actor.stem, item.stem));
      // A visible rooted counteraction is a rescue candidate, never proof that
      // a historical combination has fully neutralized the incoming action.
      pressure = true; const blocker = `${actor.label}可克关键${key.label}，保护对象是${key.god}而非任意同元素。`; result.blockers.push(blocker);
      protectedRelations.push({ operation: "control", from: actor, to: key, lines: [blocker] });
      actions.add(actor, "obstructs", { blocker });
      if (rescuers.length) {
        for (const rescuer of rescuers) {
          const available = recordConstrainedRescue(result, rescuer, join(before, target),
            `${rescuer.label}有根，可制约来干${actor.stem}，形成针对同一阻碍的救应候选`, actor, undefined,
            collector ? { collector, addsSupport: true, seed: { kind: "counter_obstacle", operation: "control", helpers: [rescuer], obstacles: [actor], protectedObjects: [key], rootContext: before,
              blockerLines: [blocker], obstacleRelations: protectedRelations.filter(edge => edge.to === key),
              conditionLines: ["救应已识别具体对象与根气，但强度、先后及是否完全奏效未由出现次数证明。"] } } : undefined);
          support ||= available;
        }
        result.unresolvedConditions.push("救应已识别具体对象与根气，但强度、先后及是否完全奏效未由出现次数证明。");
      }
    }
  }
  const persistent = persistentProtection(result, natal, before, target, protectedItems, {
    collector, relations: protectedRelations,
    dualFood: natalTasks.some(task => task.kind === "resource_food_controls_killing"),
    officialPath: ["official-resource", "official-wealth"].includes(path.id),
    // The existing food branch below handles both light/heavy cases, including
    // the counterexample in which print regulates excessive food.
    skip: (cause, key) => path.id === "food-killings" && cause.group === "resource" && key.god === "食神" && controls(cause.element, key.element)
  });
  support ||= persistent.support; pressure ||= persistent.pressure;
  // Combining the actual hurting stem may protect an official, whereas being
  // combined by a third stem constrains a rescue. Neither is proof of 合去.
  if (["official-resource", "official-wealth"].includes(path.id) && actor.god === "伤官" && shown(natal, G.official).length) {
    for (const rescuer of before.stems.filter((item) => item.visible && item.group === "resource" && rootFor(before, item) && stemCombination(actor.stem, item.stem))) {
      const available = recordConstrainedRescue(result, rescuer, join(before, target),
        `${actor.stem}${rescuer.stem}之合直接牵住新增伤官，形成合伤护官候选`, actor, undefined,
        collector ? { collector, addsSupport: true, seed: { kind: "combine_output_protect_official", operation: "combine", helpers: [rescuer], obstacles: [actor], protectedObjects: shown(natal, G.official), rootContext: before,
          obstacleRelations: protectedRelations.filter(edge => edge.to.god === "正官"), blockerLines: protectedRelations.filter(edge => edge.to.god === "正官").flatMap(edge => edge.lines),
          conditionLines: ["合伤不等于已合去伤官；官仍面对伤官作用，印等救应也不同时当作可自由制伤。合的先后、争合和成化未求定。"] } } : undefined);
      support ||= available;
      result.unresolvedConditions.push("合伤不等于已合去伤官；官仍面对伤官作用，印等救应也不同时当作可自由制伤。合的先后、争合和成化未求定。");
    }
  }
  // This is a local, branch-aware action chain, not a subtraction of print
  // weight from food weight. Existing interference survives a new food stem.
  if (path.id === "food-killings") {
    const foods = shown(before, ["食神"]), prints = shown(before, G.resource);
    const killingContextPresent = shown(before, G.killing).length > 0 || path.monthCommandRole?.tenGod === "七杀";
    const protectFood = foodLoad <= killingLoad;
    result.sourceIds = unique([...result.sourceIds, "outlook-zq-success-rescue", "outlook-zq-killings-luck"]);
    if (prints.length && foods.length) {
      if (!protectFood) {
        result.unresolvedConditions.push(`现有食重杀轻，印可能调节过重之食${working.direction === "support" ? "并扶身，但承接偏弱也需另看" : "，承接基线非偏弱"}；本版不把原局透印制食一律记为破坏，适量与杀是否可承接仍未求定。`);
        result.evidence.push("食重/杀轻采用既有食杀负荷分支；印能否适量调食是另一条件，不把印自动判喜或忌。");
      } else {
        pressure = true;
        const food = foods[0]!;
        for (const print of prints) {
          const foodBlocker = `原局或背景${print.label}可制${food.label}食神，既有制杀环节先有牵制。`;
          result.blockers.push(foodBlocker);
          protectedRelations.push({ operation: "control", from: print, to: food, lines: [foodBlocker] });
          if (stemCombination(print.stem, food.stem)) result.unresolvedConditions.push(`${print.stem}${food.stem}同时有合；制食与合牵连分别保留，不据此把食神删除。`);
          const wealthRescuers = [...shown(before, G.wealth), ...(actor.group === "wealth" ? [actor] : [])]
            .filter((item) => controls(item.element, print.element) && rootFor(join(before, target), item));
          for (const rescuer of wealthRescuers) {
            const combining = Boolean(stemCombination(rescuer.stem, print.stem));
            const foodCondition = `${combining ? "合印未判合去，不能又算作自由克印" : "财制印有具体作用对象，未按同现断为救应充分"}；先后、强度及能否保住食神仍有条件。`;
            const killingCondition = `${rescuer.label}在护食同时也可生杀；既有或新增救应不免除财生杀这一相反作用。`;
            const available = recordConstrainedRescue(result, rescuer, join(before, target),
              `${rescuer.label}${combining ? "与阻食之印相合，形成合印存食" : "可制印存食"}候选：针对${print.label}，保护${food.label}`, print, undefined,
              collector ? { collector, addsSupport: true, seed: { kind: "wealth_protects_food", operation: combining ? "combine" : "control", helpers: [rescuer], obstacles: [print], protectedObjects: [food], rootContext: join(before, target), blockerLines: [foodBlocker],
                obstacleRelations: [{ operation: "control", from: print, to: food, lines: [foodBlocker] }], conditionLines: [foodCondition, ...(killingContextPresent ? [killingCondition] : [])],
                counterEffects: killingContextPresent ? [{ from: rescuer, targets: [...shown(before, G.killing), ...(!shown(before, G.killing).length && path.monthCommandRole?.tenGod === "七杀" ? natal.stems.filter(item => item.primary && item.traceObject?.origin.kind === "natal" && item.traceObject.origin.position === "month" && item.god === "七杀") : [])], status: "present", conditionLines: [killingCondition] }] : [] } } : undefined);
            support ||= available;
            result.unresolvedConditions.push(foodCondition);
            if (killingContextPresent) result.unresolvedConditions.push(killingCondition);
          }
        }
        if (actor.god === "食神") result.unresolvedConditions.push("新增食神仍面对既有印的制约，不能把重复透食直接当成制杀环节已经畅通。");
        if (actor.group === "wealth") {
          if (killingContextPresent) result.blockers.push("财同时生杀：去印护食的机会与增杀的负荷并存，不能因找到财救应就转判全顺。");
          result.unresolvedConditions.push("去印存食须连同财生杀、食杀轻重和日主承接分别判断，不按救应条数抵消阻碍。");
        }
        if (actor.god !== "食神" && actor.group !== "wealth") result.unresolvedConditions.push("目标未直接解决既有印制食；原局的制杀路径仍带这一条件。");
      }
    }
  }
  // Explicit flow rescues required by the selected route, with an actual rooted
  // intermediate rather than an unqualified 'both gods present' assertion.
  if (lightPaths && actor.group === "peer") {
    const output = before.stems.filter((item) => item.visible && item.group === "output" && rootFor(before, item));
    if (output.length) {
      result.rescues.push(`${output.map((item) => item.label).join("、")}有根，可承接比劫再转财，作为食伤通关候选。`); result.unresolvedConditions.push("比劫—食伤—财的流通与争财效应需分读，通关存在不等于争夺完全消除。");
      collector?.add({ result, line: result.rescues.at(-1)!, seed: { kind: "output_bridges_peer_wealth", operation: "flow", helpers: output, obstacles: [actor], protectedObjects: shown(before, G.wealth), rootContext: before,
        conditionLines: [result.unresolvedConditions.at(-1)!] }, constraints: [], checked: false, available: false, countsAsSupport: false });
    }
  }
  if (path.id === "food-wealth" && actor.god === "偏印") {
    const wealth = before.stems.filter((item) => item.visible && item.group === "wealth" && rootFor(before, item) && !stemCombination(actor.stem, item.stem));
    if (wealth.length) {
      for (const rescuer of wealth) recordConstrainedRescue(result, rescuer, join(before, target), `${rescuer.label}有根，可制枭护食；财是否同时助杀须另看`, actor, undefined,
        collector ? { collector, addsSupport: false, seed: { kind: "wealth_controls_owl", operation: "control", helpers: [rescuer], obstacles: [actor], protectedObjects: shown(before, ["食神"]), rootContext: before,
          obstacleRelations: protectedRelations.filter(edge => edge.to.god === "食神"), blockerLines: protectedRelations.filter(edge => edge.to.god === "食神").flatMap(edge => edge.lines),
          conditionLines: ["食神逢枭已有具体财护食候选，未据同现即判救应充分；若另透杀，财护食与财生杀可能相冲。"],
          counterEffects: [{ from: rescuer, targets: [], status: "conditional", conditionLines: ["食神逢枭已有具体财护食候选，未据同现即判救应充分；若另透杀，财护食与财生杀可能相冲。"] }] } } : undefined);
      result.unresolvedConditions.push("食神逢枭已有具体财护食候选，未据同现即判救应充分；若另透杀，财护食与财生杀可能相冲。");
    }
  }
  if (path.id.endsWith("background")) {
    result.unresolvedConditions.push(`${assessment.pattern.background}已确定，但原局未满足本版具体透干路径的必要组合；保留扶抑及调候的独立判断。`);
    result.effect = "unresolved";
  } else result.effect = conditionalCarrying && !support && !pressure ? "unresolved" : effectFor(support, pressure);
  result.evidence = unique(result.evidence); result.blockers = unique(result.blockers); result.rescues = unique(result.rescues); result.unresolvedConditions = unique(result.unresolvedConditions);
  result.summary = impacts.length ? `${impacts[0]}。${result.blockers[0] ?? ""}` : result.blockers[0] ?? `${path.title}未因目标天干形成单一助力或压力。`;
  if (path.monthCommandRole) {
    const partners = shown(natal, path.required.filter((gods) => !gods.includes(path.monthCommandRole!.tenGod)).flat());
    result.summary = `本命月令${path.monthCommandRole.stem}${path.monthCommandRole.tenGod}与${partners.map((item) => `${item.label}${item.god}`).join("、")}构成${path.title}的候选。${result.summary}`;
  }
  if (result.rescues.length) result.summary += `${result.rescues[0]}救应是否足以承接仍要保留条件。`;
  result.unresolvedConditions.push(...basis.modelingBoundary.filter((text) => /未|本地|阈值/.test(text)).map((text) => `模型边界：${text}`));
  result.stemActions = actions.finish(result);
  finishTaskLinks(result, natalTaskData, natalTasks, natal, before, target, protectedRelations);
  return result;
}

/** A verifier for the new metadata, not a replacement of a supplied judgment.
 * Call once per exact segment, with its already identity-checked nodes. */
export function createPatternActionVerifier(revision: RevisionRecord, assessment: BaziPreliminaryAssessment) {
  const parsed = revisionRecordSchema.parse(revision), working = getWorkingBalance(assessment);
  const includeHour = parsed.input.timePrecision !== "unknown_hour" && parsed.input.timePrecision !== "date_only";
  if (assessment.sourceBinding.revisionId !== parsed.id || assessment.sourceBinding.chartResultHash !== parsed.manifest.resultHash || assessment.sourceBinding.includeHour !== includeHour) throw new Error("作用元数据初判来源不一致。");
  assertNatalTaskFacts(parsed, assessment, includeHour);
  const wealthResourceTask = evaluateNatalWealthResourceTask({ facts: assessment.balance.structural.inputFacts, includeHour });
  const natal = projectNatal(parsed, includeHour, true), path = selectPath(assessment, natal, working, wealthResourceTask);
  return (axis: OutlookAxisFinding, target: Pick<TransitNode, "ganZhi" | "nodeType" | "ref">, backgrounds: readonly Pick<TransitNode, "ganZhi" | "nodeType" | "ref">[]) => {
    for (const node of [target, ...backgrounds]) {
      transitNodeRefSchema.parse(node.ref);
      if (node.ref.revisionId !== parsed.id || node.ref.chartResultHash !== parsed.manifest.resultHash || node.ref.nodeType !== node.nodeType
        || node.ref.ruleProfileDigest !== target.ref.ruleProfileDigest || node.ref.luckCycleRuleDigest !== target.ref.luckCycleRuleDigest
        || node.ref.timelineVersion !== target.ref.timelineVersion || !LunarUtil.JIA_ZI.includes(node.ganZhi)) throw new Error("作用元数据节点来源不一致。");
    }
    const expected = patternFinding(assessment, working, natal, join(natal, ...backgrounds.map((node) => projectNode(parsed, node, { kind: "background", nodeRef: node.ref }))),
      projectNode(parsed, target, { kind: "target", nodeRef: target.ref }), path, wealthResourceTask);
    if (JSON.stringify(axis) !== JSON.stringify(expected)) throw new Error("作用元数据或原结构轴与同盘同段计算不一致。");
  };
}

/** Collect explanations only while replaying the original private branches.
 * Descriptors must come from the caller's already checked exact period. This
 * function binds their complete refs and rejects any different original axis. */
export function createOutlookRescueVerifier(revision: RevisionRecord, assessment: BaziPreliminaryAssessment) {
  const parsed = revisionRecordSchema.parse(revision), working = getWorkingBalance(assessment);
  const includeHour = parsed.input.timePrecision !== "unknown_hour" && parsed.input.timePrecision !== "date_only";
  const binding = { revisionId: parsed.id, chartResultHash: parsed.manifest.resultHash, includeHour };
  const stable = (value: unknown) => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
  if (assessment.sourceBinding.revisionId !== binding.revisionId || assessment.sourceBinding.chartResultHash !== binding.chartResultHash || assessment.sourceBinding.includeHour !== includeHour
    || stable(assessment.balance.structural.sourceBinding) !== stable(binding)) throw new Error("救应追溯初判来源不一致。");
  for (const position of POSITIONS.filter(position => includeHour || position !== "hour")) {
    if (stable(assessment.balance.structural.inputFacts.pillars[position]) !== stable(parsed.facts.pillars[position])) throw new Error("救应追溯的所选柱与源修订不一致。");
  }
  const wealthResourceTask = evaluateNatalWealthResourceTask({ facts: assessment.balance.structural.inputFacts, includeHour });
  const natal = projectNatal(parsed, includeHour, true), path = selectPath(assessment, natal, working, wealthResourceTask);
  return ({ judgment, target, backgrounds }: VerifyOutlookRescuesInput): OutlookRescueTraceBundle => {
    if (judgment.version !== LOCAL_OUTLOOK_JUDGMENT_VERSION || judgment.policyVersion !== LOCAL_OUTLOOK_POLICY_VERSION || stable(judgment.sourceBinding) !== stable(binding)
      || stable(target.ref) !== stable(judgment.targetRef) || stable(backgrounds.map(node => node.ref)) !== stable(judgment.backgroundRefs)) throw new Error("救应追溯目标、背景或原判断来源不一致。");
    const nodes = [target, ...backgrounds];
    for (const node of nodes) {
      transitNodeRefSchema.parse(node.ref);
      if (!["dayun", "year", "month"].includes(node.nodeType) || node.ref.nodeType !== node.nodeType || !LunarUtil.JIA_ZI.includes(node.ganZhi)
        || node.ref.revisionId !== binding.revisionId || node.ref.chartResultHash !== binding.chartResultHash
        || node.ref.ruleProfileDigest !== target.ref.ruleProfileDigest || node.ref.luckCycleRuleDigest !== target.ref.luckCycleRuleDigest || node.ref.timelineVersion !== target.ref.timelineVersion) throw new Error("救应追溯节点身份或干支无效。");
    }
    if (new Set(nodes.map(node => stable(node.ref))).size !== nodes.length || new Set(backgrounds.map(node => node.nodeType)).size !== backgrounds.length
      || backgrounds.some(node => node.nodeType === "month" || target.nodeType === "dayun" || target.nodeType === "year" && node.nodeType !== "dayun")
      || !(Date.parse(judgment.interval.startInstant) < Date.parse(judgment.interval.endExclusiveInstant))
      || nodes.some(node => Date.parse(judgment.interval.startInstant) < Date.parse(node.ref.startInstant))) throw new Error("救应追溯分段范围或背景重复。");
    const base = { version: OUTLOOK_RESCUE_TRACE_VERSION, sourceBinding: structuredClone(binding), targetRef: structuredClone(target.ref), backgroundRefs: structuredClone(judgment.backgroundRefs), interval: structuredClone(judgment.interval) };
    if (parsed.timeCalibration.utcInstant && Date.parse(judgment.interval.endExclusiveInstant) <= Date.parse(parsed.timeCalibration.utcInstant)) {
      if (judgment.axes.length || judgment.label !== "暂不可判") throw new Error("出生前不应包含个人救应判断。");
      return { ...base, scopeConditionRefs: [], items: [] };
    }
    const collector = rescueCollector(), before = join(natal, ...backgrounds.map(node => projectNode(parsed, node, { kind: "background", nodeRef: structuredClone(node.ref) })));
    const focal = projectNode(parsed, target, { kind: "target", nodeRef: structuredClone(target.ref) });
    const expected = [patternFinding(assessment, working, natal, before, focal, path, wealthResourceTask, collector), seasonalFinding(parsed, assessment, before, focal, working.direction === "conditional", collector)];
    for (const axis of expected) {
      const matches = judgment.axes.filter(original => original.axis === axis.axis);
      if (matches.length !== 1 || JSON.stringify(matches[0]) !== JSON.stringify(axis)) throw new Error("救应追溯与同盘同段原结构或调候轴不一致。");
    }
    return { ...base, scopeConditionRefs: expected.flatMap(axis => axis.unresolvedConditions.map((_line, index) => ({ axisId: axis.id, field: "unresolvedConditions" as const, index }))), items: collector.finish(expected) };
  };
}

function seasonalFinding(revision: RevisionRecord, assessment: BaziPreliminaryAssessment, before: Projection, target: Projection, conditionalCarrying: boolean, collector?: RescueCollector): OutlookAxisFinding {
  const seasonal = assessment.seasonal;
  const result = finding("seasonal", seasonal.ruleId ?? "seasonal-observation", "natal-seasonal-stem-change", "", seasonal.sourceIds);
  if (seasonal.coverage !== "checked_classic_clause" || !seasonal.preferredStems.length) {
    result.effect = "unresolved"; result.summary = "当前只有季节背景，未用通用寒暖词汇补造岁运吉凶。";
    result.unresolvedConditions.push("本命专条未给出可执行主用，季节背景不自动成为运限方向。"); return result;
  }
  const actor = target.stems.find((item) => item.visible)!;
  const xinShen = revision.facts.pillars.day.stem === "辛" && revision.facts.pillars.month.branch === "申";
  const all = join(before, target), elementWeight = (element: FiveElement) => all.stems.filter((item) => item.element === element).reduce((sum, item) => sum + item.weight, 0);
  const total = all.stems.reduce((sum, item) => sum + item.weight, 0);
  const waterRoots = all.branches.filter((branch) => strengthElementForStem(hidden(branch)[0]!) === "water").length;
  const flooding = waterRoots >= LOCAL_OUTLOOK_MODEL.waterPrimaryRootsForFlood && total > 0
    && (elementWeight("water") + elementWeight("metal")) / total >= LOCAL_OUTLOOK_MODEL.waterMetalFloodShare;
  let support = false, pressure = false;
  const changes: string[] = [];
  for (const stem of seasonal.preferredStems) {
    const existing = before.stems.filter((item) => item.stem === stem), incoming = target.stems.filter((item) => item.stem === stem);
    const visible = existing.some((item) => item.visible), arrivingVisible = actor.stem === stem;
    const change = arrivingVisible ? visible ? "原已透而再现" : existing.length ? "原来只藏，目标转为透出" : "原局及背景缺此字，目标补入透出"
      : incoming.length ? "目标支内出现该字，不能当作透干" : "目标未新增该精确用字";
    result.evidence.push(`调候用字${stem}：${change}。原/背景位置：${existing.map((item) => item.label).join("、") || "未见"}。`);
    changes.push(arrivingVisible ? visible ? `${stem}原已透出，本期再次出现，仍看既有调候任务怎样发挥，不另算补足主用。`
      : `${stem}${existing.length ? "由藏转透" : "由缺转为透出"}，为本期新增的调候条件，具体作用仍看配合。`
      : incoming.length ? `本期只在地支内见${stem}，没有新增透出的调候用字。`
        : `本期未新增调候主取的${stem}，重点看原有${stem}是否受合克牵动。`);
    const hasCombine = Boolean(stemCombination(actor.stem, stem));
    const protectedObjects = existing.filter(item => item.visible), obstacleRelations: RescueEdge[] = [];
    if (hasCombine && visible) {
      pressure = true; result.blockers.push(`${actor.stem}与现有调候用字${stem}有天干合，作用对象已定位。`);
      if (collector) obstacleRelations.push(...protectedObjects.map(key => ({ operation: "combine" as const, from: actor, to: key, lines: [result.blockers.at(-1)!] })));
      result.unresolvedConditions.push("用字被合只表示牵连，未判已合去或调候功能消失。");
    }
    const restrains = controls(actor.element, strengthElementForStem(stem));
    if ((hasCombine || restrains) && existing.length && !visible) result.unresolvedConditions.push(`${stem}仅在支内，${actor.stem}与其潜在联系未当作透干合去或直接受制。`);
    const reverseWaterControl = xinShen && stem === "壬" && actor.stem === "戊" && flooding;
    if (restrains && visible && !reverseWaterControl) {
      pressure = true; result.blockers.push(`${actor.stem}可制约现有调候用字${stem}，应结合制约强度与救应。`);
      if (collector) obstacleRelations.push(...protectedObjects.map(key => ({ operation: "control" as const, from: actor, to: key, lines: [result.blockers.at(-1)!] })));
      const rescuers = before.stems.filter((item) => item.visible && controls(item.element, actor.element) && rootFor(before, item) && !stemCombination(actor.stem, item.stem));
      for (const rescuer of rescuers) {
        const available = recordConstrainedRescue(result, rescuer, join(before, target), `${rescuer.label}有根，可制约${actor.stem}，为保护${stem}的候选`, actor, undefined,
          collector ? { collector, addsSupport: true, seed: { kind: "seasonal_stem_protection", operation: "control", helpers: [rescuer], obstacles: [actor], protectedObjects, rootContext: before,
            obstacleRelations, blockerLines: obstacleRelations.flatMap(edge => edge.lines), conditionLines: ["调候救应的适量与先后尚有条件，不宣告阻碍已完全解除。"] } } : undefined);
        support ||= available;
        result.unresolvedConditions.push("调候救应的适量与先后尚有条件，不宣告阻碍已完全解除。");
      }
    }
    if (arrivingVisible && !visible) {
      if (xinShen && stem === "壬" && !flooding && !result.blockers.length && rootFor(all, actor)) {
        support = true; result.satisfiedConditions.push("辛申壬由藏转透/缺而补入；本地模型有水根，未进入金水偏泛代理条件，已覆盖干合克未见阻碍。");
      } else result.unresolvedConditions.push(`${stem}由缺/藏转透是实际变化，但专条适量、例外及制约条件尚未完全机器求值。`);
    }
    if (arrivingVisible && visible) result.satisfiedConditions.push(`${stem}重复出现，不按“补足主用”额外判有利。`);
  }
  if (xinShen) {
    result.evidence.push(`辛申金水偏泛代理条件：水本气支${waterRoots}处；金水负荷占比${total ? ((elementWeight("water") + elementWeight("metal")) / total).toFixed(3) : "无"}；阈值2处且0.65为本地模型，不是原文定量。`);
    if (flooding) {
      if (actor.element === "water") { pressure = true; result.blockers.push("已有水根并进入本地金水偏泛分支，目标再增水不作为调候获益。"); }
      if (actor.stem === "戊") { support = true; result.satisfiedConditions.push("金水偏泛代理条件成立时，戊的节水作用进入候选；不套用一般土阻壬水分支。"); }
    }
  } else result.unresolvedConditions.push("本版对其他日干月令记录精确用字变化与干合克，但未把出生月专条全面移植成岁运剂量判断。");
  result.effect = effectFor(support, pressure);
  if (result.effect === "neutral" && result.unresolvedConditions.length) result.effect = "unresolved";
  result.summary = result.effect === "neutral" ? "调候没有新增已验证的有利作用；既有用字再现与支内出现分别保留。" : `原局调候目标${shortEffect(result.effect)}，具体以用字新增、受制和救应区别判断。`;
  if (conditionalCarrying) result.summary = `${changes.join("")}${result.blockers[0] ?? ""}${result.rescues[0] ?? ""}`;
  return result;
}

function finish(revision: RevisionRecord, assessment: BaziPreliminaryAssessment, target: TransitNode, axes: OutlookAxisFinding[], conditions: string[]): LocalOutlookJudgment {
  const pattern = axes.find((axis) => axis.axis === "pattern")!, balance = axes.find((axis) => axis.axis === "balance")!, seasonal = axes.find((axis) => axis.axis === "seasonal")!;
  const decided = (axis: OutlookAxisFinding) => axis.effect !== "neutral" && axis.effect !== "unresolved";
  const conditionalBalance = balance.pathId === "conditional";
  const primary = pattern.pathId === "resource-wealth" && pattern.effect === "unresolved" ? pattern : decided(pattern) ? pattern
    : conditionalBalance ? decided(seasonal) || seasonal.effect === "unresolved" ? seasonal : pattern
      : balance.effect !== "neutral" ? balance : seasonal.effect !== "neutral" ? seasonal : pattern;
  const definite = axes.filter((axis) => axis.effect !== "neutral" && axis.effect !== "unresolved");
  const conflicting = definite.some((axis) => axis.effect === "assists" || axis.effect === "mixed")
    && definite.some((axis) => axis.effect === "obstructs" || axis.effect === "mixed");
  const conflicts = conflicting ? definite.map((axis) => `${axis.axis === "balance" ? "扶抑" : axis.axis === "pattern" ? "结构" : "调候"}：${axis.summary}`) : [];
  const substantiveConditions = primary.unresolvedConditions.filter((text) => !text.startsWith("模型边界："));
  let label = conflicting ? "利弊并见" as OutlookJudgmentLabel : labelFor(primary.effect);
  if (substantiveConditions.length && label !== "主题解读") label = "条件性";
  const axisName = primary.axis === "pattern" ? "结构" : primary.axis === "balance" ? "扶抑" : "调候";
  const lean = labelFor(primary.effect);
  const headline = `${target.ganZhi}${target.nodeType === "dayun" ? "大运" : target.nodeType === "year" ? "年" : "月"}：${label === "条件性" && lean !== "条件性" ? `${axisName}上${lean}，需看承接与救应` : label}`;
  const conditionSummary = substantiveConditions[0]?.includes("0.8") ? "财食轻重的替代假设有分歧，方向随承接条件变化。" : substantiveConditions[0];
  return { version: LOCAL_OUTLOOK_JUDGMENT_VERSION, policyVersion: LOCAL_OUTLOOK_POLICY_VERSION,
    sourceBinding: { revisionId: revision.id, chartResultHash: revision.manifest.resultHash, includeHour: assessment.sourceBinding.includeHour }, targetRef: target.ref,
    interval: { startInstant: target.startInstant, endExclusiveInstant: target.endExclusiveInstant }, backgroundRefs: [],
    label, primaryAxis: primary.axis, headline, summary: `${primary.summary}${conflicting ? "支持与牵制同时存在，应把可推进的部分和需要调整的部分分开。" : ""}${conditionSummary ? `关键条件：${conditionSummary}` : ""}`,
    axes, conflicts, conditions: unique([...conditions, ...substantiveConditions]),
    coverageGaps: ["负荷分界、根气代理、作用先后与轴优先级是版本化本地模型，不是古籍数字或已验收成格算法。", "合冲不自动合化或删除作用；未覆盖刑害破、完整会局及所有救应条件。", "出生月调候移用于岁运属于新增应用模型，通用用字变化覆盖不等于120种剂量规则完备。"],
    sourceIds: unique(axes.flatMap((axis) => axis.sourceIds)) };
}

/** Pure: selection is natal-first; the focal node is a change against background,
 * never a flattened vote over decade/year/month stems. */
export function buildLocalOutlookJudgment(revision: RevisionRecord, assessment: BaziPreliminaryAssessment, input: LocalOutlookJudgmentInput): LocalOutlookJudgment {
  const parsed = revisionRecordSchema.parse(revision), target = transitNodeSchema.parse(input.target);
  const includeHour = parsed.input.timePrecision !== "unknown_hour" && parsed.input.timePrecision !== "date_only";
  if (assessment.sourceBinding.revisionId !== parsed.id || assessment.sourceBinding.chartResultHash !== parsed.manifest.resultHash || assessment.sourceBinding.includeHour !== includeHour) throw new Error("综合岁运初判与源修订或时柱范围不匹配。");
  const working = getWorkingBalance(assessment);
  const backgrounds = [input.background?.dayun, input.background?.year].filter((node): node is TransitNode => Boolean(node)).map((node) => transitNodeSchema.parse(node));
  for (const node of [target, ...backgrounds]) if (node.ref.revisionId !== parsed.id || node.ref.chartResultHash !== parsed.manifest.resultHash
    || node.ref.ruleProfileDigest !== target.ref.ruleProfileDigest || node.ref.luckCycleRuleDigest !== target.ref.luckCycleRuleDigest || node.ref.timelineVersion !== target.ref.timelineVersion) throw new Error("综合岁运节点源盘或规则身份不匹配。");
  if (!["dayun", "year", "month"].includes(target.nodeType) || (input.background?.dayun && input.background.dayun.nodeType !== "dayun")
    || (input.background?.year && input.background.year.nodeType !== "year")) throw new Error("综合岁运目标或背景类型不匹配。");
  const start = input.startInstant ?? target.startInstant, end = input.endExclusiveInstant ?? target.endExclusiveInstant;
  if (!(Date.parse(start) < Date.parse(end)) || Date.parse(start) < Date.parse(target.startInstant) || Date.parse(end) > Date.parse(target.endExclusiveInstant)
    || backgrounds.some((node) => Date.parse(start) < Date.parse(node.startInstant) || Date.parse(end) > Date.parse(node.endExclusiveInstant))) throw new Error("综合岁运分段不在目标与背景交集内。");
  const conditions = [`判断区间 ${start} 至 ${end}（不含终点）；目标${target.ganZhi}，背景${backgrounds.map((node) => `${node.nodeType}:${node.ganZhi}`).join("、") || "无附加岁运背景"}。`];
  if (parsed.timeCalibration.utcInstant && Date.parse(end) <= Date.parse(parsed.timeCalibration.utcInstant)) return {
    version: LOCAL_OUTLOOK_JUDGMENT_VERSION, policyVersion: LOCAL_OUTLOOK_POLICY_VERSION,
    sourceBinding: { revisionId: parsed.id, chartResultHash: parsed.manifest.resultHash, includeHour }, targetRef: target.ref,
    interval: { startInstant: start, endExclusiveInstant: end }, backgroundRefs: backgrounds.map((node) => node.ref),
    label: "暂不可判", primaryAxis: null, headline: "出生前历法区间", summary: "本区间在出生前，不生成个人综合岁运判断。", axes: [], conflicts: [], conditions, coverageGaps: [], sourceIds: [] };
  if (parsed.timeCalibration.utcInstant && Date.parse(start) < Date.parse(parsed.timeCalibration.utcInstant)) conditions.push(`个人解释仅从出生瞬时 ${parsed.timeCalibration.utcInstant} 起适用。`);
  conditions.push(...working.conditions);
  assertNatalTaskFacts(parsed, assessment, includeHour);
  const natal = projectNatal(parsed, includeHour, true), before = join(natal, ...backgrounds.map((node) => projectNode(parsed, node, { kind: "background", nodeRef: node.ref }))),
    focal = projectNode(parsed, target, { kind: "target", nodeRef: target.ref });
  const wealthResourceTask = evaluateNatalWealthResourceTask({ facts: assessment.balance.structural.inputFacts, includeHour });
  const path = selectPath(assessment, natal, working, wealthResourceTask);
  const axes = [balanceFinding(assessment, working, focal), patternFinding(assessment, working, natal, before, focal, path, wealthResourceTask), seasonalFinding(parsed, assessment, before, focal, working.direction === "conditional")];
  if (!includeHour) conditions.push("未知时柱已从路径、负荷、调候出现和救应中排除。");
  return { ...finish(parsed, assessment, target, axes, conditions), interval: { startInstant: start, endExclusiveInstant: end }, backgroundRefs: backgrounds.map((node) => node.ref) };
}

/** Retain each chronological/sex branch instead of flattening its nodes. */
export function combineLocalOutlookJudgments(own: LocalOutlookJudgment, segments: readonly LocalOutlookJudgmentSegment[], options: { incomplete?: boolean; uncertainDirection?: boolean } = {}): LocalOutlookJudgment {
  if (!segments.length) return { ...own, ...(options.incomplete || options.uncertainDirection ? {
    label: "条件性" as const, headline: "目标自身已有判断，背景条件尚未完整",
    summary: `${own.summary}当前没有可合看的完整背景分段，整体方向保留条件。`
  } : {}), conditions: [...own.conditions, ...(options.incomplete ? ["大运背景未覆盖，主句只采用目标本身；没有补造大运。"] : []), ...(options.uncertainDirection ? ["顺逆未确定，不能将目标自身判断当作完整合看结论。"] : [])] };
  const ids = new Set<string>(), ends = new Map<string, number>();
  for (const segment of segments) {
    const judged = segment.judgment, start = Date.parse(segment.startInstant), end = Date.parse(segment.endExclusiveInstant);
    if (judged.sourceBinding.revisionId !== own.sourceBinding.revisionId || judged.sourceBinding.chartResultHash !== own.sourceBinding.chartResultHash
      || JSON.stringify(judged.targetRef) !== JSON.stringify(own.targetRef) || judged.sourceBinding.includeHour !== own.sourceBinding.includeHour
      || judged.version !== own.version || judged.policyVersion !== own.policyVersion) throw new Error("综合岁运分段来源不一致。");
    if (ids.has(segment.id) || !(start < end) || start < Date.parse(own.interval.startInstant) || end > Date.parse(own.interval.endExclusiveInstant)
      || judged.interval.startInstant !== segment.startInstant || judged.interval.endExclusiveInstant !== segment.endExclusiveInstant
      || start < (ends.get(segment.branchId) ?? -Infinity)) throw new Error("综合岁运分段区间、顺序或标识不一致。");
    ids.add(segment.id); ends.set(segment.branchId, end);
  }
  const labels = unique(segments.map((segment) => segment.judgment.label));
  const conditional = options.incomplete || options.uncertainDirection || labels.length > 1;
  const fixedEightDate = (instant: string) => new Date(Date.parse(instant) + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const first = segments[0]!.judgment;
  const descriptions = segments.map((segment) => `${fixedEightDate(segment.startInstant)}（UTC+08）起至${fixedEightDate(segment.endExclusiveInstant)}，${segment.branchLabel}：${segment.judgment.headline}`);
  const briefReason = first.axes.find((axis) => axis.axis === first.primaryAxis)?.summary.split("。")[0];
  const segmentReason = options.uncertainDirection ? "顺逆未定，各大运条件分别判断。"
    : options.incomplete ? "部分时段缺少大运覆盖，完整合看仍有条件。"
      : segments.length > 1 ? "交运改变了原有承接与救应背景，前后分段看。" : "";
  return { ...first, targetRef: own.targetRef, label: conditional ? "条件性" : first.label,
    interval: own.interval, backgroundRefs: [...new Map(segments.flatMap((segment) => segment.judgment.backgroundRefs).map((ref) => [ref.nodeId, ref])).values()],
    headline: conditional ? `${own.targetRef.nodeType === "year" ? "本年" : "本月"}按背景与交运时段分别判断` : first.headline,
    // Details stay on each segment judgment. The overview should not duplicate
    // every full explanation, especially when it is reused in yearly scenarios.
    summary: segments.length === 1 && !conditional ? first.summary : `${briefReason ? `${briefReason}。` : ""}${segmentReason}${descriptions.join("；")}。`,
    axes: segments.flatMap((segment) => segment.judgment.axes.map((axis) => {
      const id = `${segment.id}:${axis.id}`, remap = (ref: OutlookRescueRef) => ({ ...ref, axisId: id });
      return { ...axis, id, summary: `${segment.branchLabel}：${axis.summary}`,
        ...(axis.taskLinks ? { taskLinks: { ...axis.taskLinks, items: axis.taskLinks.items.map(item => ({ ...item,
          relations: item.relations.map(relation => ({ ...relation, refs: relation.refs.map(remap) })),
          conditionRefs: item.conditionRefs.map(remap), evidenceRefs: item.evidenceRefs.map(remap) })) } } : {}) };
    })),
    conflicts: unique(segments.flatMap((segment) => segment.judgment.conflicts)),
    conditions: unique([...segments.flatMap((segment) => segment.judgment.conditions), ...(options.incomplete ? ["部分时段没有大运覆盖，缺口只保留目标本身判断。"] : []), ...(options.uncertainDirection ? ["顺逆尚未确定，各分支分别回答，不替用户选定。"] : [])]),
    sourceIds: unique(segments.flatMap((segment) => segment.judgment.sourceIds)), coverageGaps: unique(segments.flatMap((segment) => segment.judgment.coverageGaps)) };
}
