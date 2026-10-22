import { expect, it } from "vitest";
import { buildAnnualRescueLifeProse } from "./annual-rescue-life-prose";
import { OUTLOOK_RESCUE_TRACE_VERSION, type OutlookRescueObject, type OutlookRescueTrace, type OutlookRescueTraceBundle } from "./outlook-rescue-trace";

// Declared synthetic objects exercise editorial distinctions only. Real dated
// calculations and source/interval verification are tested by the producer and reader.
const obj = (id: string, group: OutlookRescueObject["group"], tenGod: string): OutlookRescueObject => ({
  id, group, tenGod, origin: { kind: "natal", position: "year" }, stem: "甲", element: "wood",
  label: id, visibility: "visible", branch: null, hiddenIndex: null
});
const helper = obj("helper-1", "wealth", "正财"), obstacle = obj("obstacle-1", "resource", "正印"), protectedObject = obj("protected-1", "output", "伤官");
function trace(id: string, changes: Partial<OutlookRescueTrace> = {}): OutlookRescueTrace {
  return { id, axisId: id, pathId: "resource-output", kind: "counter_obstacle", operation: "control",
    helpers: [helper], obstacles: [obstacle], protectedObjects: [protectedObject], helperRoots: [],
    candidateStatus: "available_candidate", constraintCheck: "checked", countsAsSupport: true, constraints: [],
    obstacleRelations: [{ operation: "control", from: obstacle, to: protectedObject, refs: [{ axisId: id, field: "blockers", index: 0 }] }],
    counterEffects: [], rescueRefs: [{ axisId: id, field: "rescues", index: 0 }], conditionRefs: [], blockerRefs: [], evidenceRefs: [], ...changes };
}
function prose(items: OutlookRescueTrace[]) {
  // This pure formatter only consumes bundle.items. Binding deliberately is not
  // asserted here; its verifier has separate real-source coverage.
  return buildAnnualRescueLifeProse({ version: OUTLOOK_RESCUE_TRACE_VERSION, items } as OutlookRescueTraceBundle);
}

it("shares one physical protection chain across axes without losing any original reference or helper constraint", () => {
  const restrictor = obj("third", "peer", "比肩"), secondHelper = { ...helper, id: "helper-2", origin: { kind: "natal" as const, position: "month" as const } };
  const first = trace("pattern", { candidateStatus: "constrained_candidate", countsAsSupport: false,
    constraints: [{ operation: "control", from: restrictor, to: helper, refs: [{ axisId: "pattern", field: "unresolvedConditions", index: 0 }] }] });
  const second = trace("seasonal", { kind: "seasonal_stem_protection", helpers: [secondHelper], candidateStatus: "constrained_candidate", countsAsSupport: false,
    constraints: [{ operation: "combine", from: restrictor, to: secondHelper, refs: [{ axisId: "seasonal", field: "unresolvedConditions", index: 2 }] }] });
  const before = structuredClone([first, second]), result = prose([first, second]);
  expect(result.groups).toHaveLength(1);
  expect(result.groups[0]!.traceIds).toEqual(["pattern", "seasonal"]);
  expect(result.groups[0]!.rescueRefs).toEqual([...first.rescueRefs, ...second.rescueRefs]);
  expect(result.groups[0]!.explainedConditionRefs).toEqual([...first.constraints[0]!.refs, ...second.constraints[0]!.refs]);
  expect(result.groups[0]!.text).toContain("也在限制"); expect(result.groups[0]!.text).toContain("相互牵连，不能独立调配");
  expect(result.groups[0]!.text).not.toMatch(/四重|加倍|压力已经解除|甲/);
  expect([first, second]).toEqual(before);
});

it("keeps different protected positions, control/combine edges, and rescue availability separate", () => {
  const original = trace("base");
  const otherPosition = trace("position", { protectedObjects: [{ ...protectedObject, id: "protected-2", origin: { kind: "natal", position: "hour" } }] });
  const combination = trace("combination", { obstacleRelations: [{ operation: "combine", from: obstacle, to: protectedObject, refs: [] }] });
  const constrained = trace("constrained", { candidateStatus: "constrained_candidate", countsAsSupport: false });
  expect(prose([original, otherPosition, combination, constrained]).groups).toHaveLength(4);
  expect(prose([combination]).groups[0]!.text).toContain("相互牵连");
  expect(prose([combination]).groups[0]!.text).not.toContain("正在挤压");
  const both = trace("both", { obstacleRelations: [...original.obstacleRelations, ...combination.obstacleRelations] });
  expect(prose([both]).groups[0]!.text).toContain("相互牵连，也在挤压后者的发挥空间");
});

it("does not turn unexamined flow or a candidate excluded from support into an effective rescue", () => {
  const flow = trace("flow", { kind: "output_bridges_peer_wealth", operation: "flow", protectedObjects: [],
    constraintCheck: "not_evaluated", candidateStatus: "conditional_candidate", countsAsSupport: false });
  expect(prose([flow]).groups[0]!.text).toContain("自身还有哪些牵制尚未充分核清");
  expect(prose([flow]).groups[0]!.text).not.toContain("原判断保留这条有利配合");
  const candidate = trace("candidate", { kind: "wealth_controls_owl", countsAsSupport: false });
  expect(prose([candidate]).groups[0]!.text).toContain("是否能真正接上仍有条件");
});

it("retains an actual counter-effect and keeps a conditional one conditional", () => {
  const target = obj("killing", "authority", "七杀");
  const present = trace("present", { kind: "wealth_protects_food", counterEffects: [{ operation: "generate", status: "present", from: helper, targets: [target], refs: [] }] });
  const conditional = trace("conditional", { kind: "wealth_controls_owl", counterEffects: [{ operation: "generate", status: "conditional", from: helper, targets: [], refs: [] }] });
  expect(prose([present]).groups[0]!.text).toContain("保护熟悉做法与增加要处理的事情同时存在");
  expect(prose([conditional]).groups[0]!.text).toContain("当前不能把这项可能性当成已经发生");
  expect(prose([conditional]).groups[0]!.text).not.toContain("同时存在");
});


it("keeps regular-wealth confirmation distinct from new-use pressure without changing rescue references or availability", () => {
  const regular = obj("wealth-obstacle", "wealth", "正财"), opportunity = { ...regular, tenGod: "偏财" };
  const help = obj("peer-help", "peer", "比肩"), protectedResource = obj("protected-resource", "resource", "正印");
  const make = (wealth: OutlookRescueObject) => trace("joint", { kind: "wealth_resource_protection", helpers: [help], obstacles: [wealth], protectedObjects: [protectedResource],
    obstacleRelations: [{ operation: "control", from: wealth, to: protectedResource, refs: [{ axisId: "joint", field: "blockers", index: 0 }] }],
    candidateStatus: "constrained_candidate", countsAsSupport: false });
  const a = make(regular), b = make(opportunity), before = structuredClone([a,b]), old = prose([b]), next = prose([a]);
  expect(next.groups[0]!.text).toContain("原约定确认与继续履行所占的配套");
  expect(next.groups[0]!.text).toContain("收住这部分配套占用");
  expect(next.groups[0]!.text).not.toContain("新增用途");
  expect(old.groups[0]!.text).toContain("新增用途与投入的占用");
  expect(old.groups[0]!.text).toContain("收住这部分新增占用");
  expect(next.groups[0]!.text).toContain("原来的压力尚不能据此视为已经解除");
  expect(next.groups.map(({text,...rest})=>rest)).toEqual(old.groups.map(({text,...rest})=>rest));
  expect([a,b]).toEqual(before);
});
