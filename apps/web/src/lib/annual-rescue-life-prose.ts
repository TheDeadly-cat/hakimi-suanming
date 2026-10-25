import type { OutlookRescueObject, OutlookRescueRef, OutlookRescueTrace, OutlookRescueTraceBundle } from "./outlook-rescue-trace";

export const ANNUAL_RESCUE_LIFE_PROSE_VERSION = "hakimi.annual-rescue-life-prose/0.2.1" as const;
export interface AnnualRescueLifeGroup {
  id: string;
  text: string;
  traceIds: string[];
  rescueRefs: OutlookRescueRef[];
  basisRefs: OutlookRescueRef[];
  explainedConditionRefs: OutlookRescueRef[];
  explainedBlockerRefs: OutlookRescueRef[];
}
export interface AnnualRescueLifeProse {
  version: typeof ANNUAL_RESCUE_LIFE_PROSE_VERSION;
  groups: AnnualRescueLifeGroup[];
}
const unique = <T>(items: readonly T[]) => [...new Set(items)];
export const rescueRefKey = (ref: OutlookRescueRef) => `${ref.axisId}:${ref.field}:${ref.index}`;
const refs = (items: readonly OutlookRescueRef[]) => [...new Map(items.map(item => [rescueRefKey(item), item])).values()];
const objects = (items: readonly OutlookRescueObject[]) => [...new Map(items.map(item => [item.id, item])).values()];
const objectKey = (items: readonly OutlookRescueObject[]) => items.map(item => item.id).sort();

function role(items: readonly OutlookRescueObject[], use: "helper" | "obstacle" | "protected"): string {
  return unique(items.map(item => {
    if (item.group === "resource") return use === "obstacle" ? "不断追加的准备或指导" : "必要的说明、指导与练习条件";
    if (item.group === "output") return use === "obstacle" ? "新表达或改法的范围"
      : item.tenGod === "食神" ? "已经熟悉的做法与持续完成" : "已有表达、改法与实际尝试";
    if (item.group === "wealth") return use === "obstacle"
      ? item.tenGod === "正财" ? "原约定确认与继续履行所占的配套" : "新增用途与投入的占用"
      : "实际用途与已有投入安排";
    if (item.group === "peer") return use === "obstacle" ? "各自参与与共同使用的安排" : "各自承担的范围与共同分工";
    return use === "obstacle" ? "集中要求与完成标准" : "已经明确的要求与按约完成";
  })).join("、");
}

// These three producers describe the same physical protection chain from
// different rule perspectives. Their original axis refs remain distinct.
const family = (item: OutlookRescueTrace) => ["counter_obstacle", "seasonal_stem_protection", "wealth_resource_protection"].includes(item.kind)
  ? "specific-protection" : item.kind;
function chainKey(item: OutlookRescueTrace): string {
  return JSON.stringify({ family: family(item), operation: item.operation,
    obstacles: objectKey(item.obstacles), protected: objectKey(item.protectedObjects),
    helpers: unique(item.helpers.map(helper => helper.group)).sort(),
    candidateStatus: item.candidateStatus, checked: item.constraintCheck, countsAsSupport: item.countsAsSupport,
    // Combining the obstacle with a protected object must not become control.
    obstacleRelations: unique(item.obstacleRelations.map(edge => JSON.stringify([edge.operation, edge.from.id, edge.to.id]))).sort(),
    counterEffects: unique(item.counterEffects.map(effect => JSON.stringify([effect.operation, effect.status, objectKey(effect.targets)]))).sort() });
}

function chainMeaning(item: OutlookRescueTrace, helpers: readonly OutlookRescueObject[]): string {
  const protectedRole = role(item.protectedObjects, "protected"), obstacleRole = role(item.obstacles, "obstacle");
  if (item.kind === "wealth_controls_owl" && !item.protectedObjects.length) return "明确的实际用途有机会收住不断增加的准备或指导。不过，这条配合自身尚未确认哪一项熟悉做法会直接受益，不能据此说原有事情已经推进。";
  if (item.kind === "output_bridges_peer_wealth") return "把各自已有的本领用到一件能共同完成的事情上，是这里的衔接线索；成果怎样使用、各自分到什么，仍需另行落实，不能认为分配上的牵扯已经消失。";
  if (item.kind === "wealth_moderates_resource") return "明确的实际用途有机会收拢继续增加的准备，让已经会做的部分进入使用；需要的资料、方法和帮助仍要保留。";
  if (item.kind === "combine_output_protect_official") return "与既定要求冲突的表达或改法，有被牵回可配合范围的空间，让已经明确的要求仍能按步骤落实；相互牵连还不等于冲突已经消失。";
  if (item.kind === "wealth_protects_food" || item.kind === "wealth_controls_owl") return item.operation === "combine"
    ? "实际用途与不断变动的准备需要先协调起来，才有机会减少它们对熟悉做法的干扰，让原有解决步骤继续；协调形成的牵连还不能当作干扰已经消失。"
    : "明确的实际需要有机会限制不断变动的指导或准备，让熟悉的做法和原有解决步骤留有继续发挥的空间。";
  const hasCombination = item.obstacleRelations.some(edge => edge.operation === "combine"), hasControl = item.obstacleRelations.some(edge => edge.operation === "control");
  const occupied = item.obstacles.some(object => object.group === "wealth" && object.tenGod === "正财") ? "这部分配套占用" : "这部分新增占用";
  const obstacleRelation = hasCombination
    ? `${obstacleRole}与${protectedRole}相互牵连${hasControl ? "，也在挤压后者的发挥空间" : ""}。`
    : `${obstacleRole}正在挤压${protectedRole}。`;
  return obstacleRelation + (item.operation === "combine"
    ? `可缓和的线索在${role(helpers, "helper")}：把受牵的安排重新协调到一起，为${protectedRole}留下位置；这不是把原来的阻碍直接消掉。`
    : `可缓和的线索在${role(helpers, "helper")}：收住${occupied}，给${protectedRole}留下位置。`);
}

function availability(items: readonly OutlookRescueTrace[]): string {
  const first = items[0]!;
  if (first.constraintCheck === "not_evaluated") return "这条连接自身还有哪些牵制尚未充分核清，不能先当作已经可以顺利发挥。";
  if (first.candidateStatus === "constrained_candidate") {
    const edges = items.flatMap(item => item.constraints);
    const helperIds = new Set(items.flatMap(item => item.helpers.map(helper => helper.id)));
    const descriptions = unique(edges.map(edge => {
      const other = helperIds.has(edge.from.id) ? edge.to : edge.from;
      return edge.operation === "combine"
        ? `可用于缓冲的条件还与${role([other], "obstacle")}相互牵连，不能独立调配`
        : `${role([edge.from], "obstacle")}也在限制这些缓冲条件`;
    }));
    return `这份缓冲本身也受限制：${descriptions.length ? descriptions.join("；") : "可用条件仍受其他安排牵动"}。原来的压力尚不能据此视为已经解除。`;
  }
  if (first.candidateStatus === "conditional_candidate" || !first.countsAsSupport) return "这里保留的是一条可尝试的配合，是否能真正接上仍有条件，不能单凭它认定压力已经缓解。";
  return "原判断保留这条有利配合，能缓和多少仍取决于实际落实，原有负担不会因此自动消失。";
}

function counterMeaning(items: readonly OutlookRescueTrace[]): string {
  const effects = items.flatMap(item => item.counterEffects);
  const statements: string[] = [];
  if (effects.some(effect => effect.status === "present")) statements.push("同一份投入也连着新增或更集中的要求；保护熟悉做法与增加要处理的事情同时存在，不能只看缓冲的一面。");
  if (effects.some(effect => effect.status === "conditional")) statements.push("新增投入是否还会带来更多要求，需要结合实际配合另看，当前不能把这项可能性当成已经发生。");
  return statements.join("");
}

/** Only consumes verified structural objects; never infers a person, event,
 * operation or availability from the original prose. Grouping is local to this
 * exact bundle; it changes display only, never the original judgment. */
export function buildAnnualRescueLifeProse(bundle: OutlookRescueTraceBundle): AnnualRescueLifeProse {
  const grouped = new Map<string, OutlookRescueTrace[]>();
  for (const item of bundle.items) {
    if (!item.helpers.length || !item.obstacles.length || !item.rescueRefs.length) throw new Error("救应生活解释缺少实际对象或原句引用。");
    // The producer may retain an uncounted owl-control candidate before a
    // visible food object is established. That is an incomplete benefit, not
    // a missing trace; do not invent a protected object or an effective rescue.
    const owlCandidateWithoutProtectedObject = item.kind === "wealth_controls_owl"
      && !item.countsAsSupport && !item.obstacleRelations.length;
    if (item.kind !== "output_bridges_peer_wealth" && !owlCandidateWithoutProtectedObject && !item.protectedObjects.length) throw new Error("救应生活解释缺少被保护的对象。");
    const key = chainKey(item); grouped.set(key, [...(grouped.get(key) ?? []), item]);
  }
  const groups = [...grouped.values()].map((items, index): AnnualRescueLifeGroup => {
    const edges = items.flatMap(item => [...item.constraints, ...item.obstacleRelations]);
    const counterRefs = items.flatMap(item => item.counterEffects.flatMap(effect => effect.refs));
    return { id: `rescue-life-${index + 1}`, text: [chainMeaning(items[0]!, objects(items.flatMap(item => item.helpers))), availability(items), counterMeaning(items)].filter(Boolean).join(""),
      traceIds: unique(items.map(item => item.id)), rescueRefs: refs(items.flatMap(item => item.rescueRefs)),
      basisRefs: refs(items.flatMap(item => [...item.rescueRefs, ...item.conditionRefs, ...item.blockerRefs, ...item.evidenceRefs,
        ...item.constraints.flatMap(edge => edge.refs), ...item.obstacleRelations.flatMap(edge => edge.refs), ...item.counterEffects.flatMap(effect => effect.refs)])),
      explainedConditionRefs: refs(edges.flatMap(edge => edge.refs).filter(ref => ref.field === "unresolvedConditions")),
      explainedBlockerRefs: refs([...items.flatMap(item => item.obstacleRelations.flatMap(edge => edge.refs)), ...counterRefs].filter(ref => ref.field === "blockers")) };
  });
  return { version: ANNUAL_RESCUE_LIFE_PROSE_VERSION, groups };
}
