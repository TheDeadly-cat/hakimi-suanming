import { beforeAll, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema, type RevisionRecord } from "@hakimi/contracts";
import { withDayBoundary } from "@hakimi/rule-profiles";
import { calculateTransitSnapshot } from "@hakimi/transit-core";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildLocalOutlookJudgment, createOutlookRescueVerifier } from "./local-outlook-judgment";
import { buildLocalAnnualOutlookRange } from "./local-annual-outlook";
import { OUTLOOK_RESCUE_TRACE_VERSION, type OutlookRescueRef, type VerifyOutlookRescuesInput } from "./outlook-rescue-trace";

const revisions = new Map<string, RevisionRecord>();
beforeAll(async () => {
  for (const [id, date, time, sex] of [
    ["a", "1995-08-18", "08:26", "male"], ["unknown", "1995-08-18", "08:26", "unspecified"],
    ["r4", "1999-01-09", "02:26", "male"], ["official", "1971-04-09", "14:26", "male"],
    ["food", "1970-12-08", "08:26", "male"], ["food-wealth", "1990-10-18", "20:26", "male"],
    ["protect", "1957-09-13", "00:26", "male"], ["no-print", "1991-02-08", "02:26", "male"],
    ["same-stem", "1998-06-07", "02:26", "male"]
  ] as const) {
    const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date, time, timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex,
      lunarLeapMonth: false, location: { label: "Synthetic rescue trace", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, withDayBoundary("zi_start_23"));
    revisions.set(id, storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: crypto.randomUUID(), revisionNumber: 1, createdAt: "2026-10-17T00:00:00Z" }));
  }
}, 60_000);
async function actual(id: string, year: number, withBackground = true) {
  const revision = revisions.get(id)!, assessment = buildBaziPreliminaryAssessment(revision);
  const snapshot = await calculateTransitSnapshot({ revision, atInstant: `${year}-07-01T04:00:00.000Z` });
  if (snapshot.slots.year.status !== "resolved") throw new Error("Missing actual year");
  const target = snapshot.slots.year.node, dayun = withBackground && snapshot.slots.dayun.status === "resolved" ? snapshot.slots.dayun.node : undefined;
  const judgment = buildLocalOutlookJudgment(revision, assessment, { target, background: dayun ? { dayun } : {},
    startInstant: dayun ? new Date(Math.max(Date.parse(target.startInstant), Date.parse(dayun.startInstant))).toISOString() : target.startInstant,
    endExclusiveInstant: dayun ? new Date(Math.min(Date.parse(target.endExclusiveInstant), Date.parse(dayun.endExclusiveInstant))).toISOString() : target.endExclusiveInstant });
  const input = { judgment, target, backgrounds: dayun ? [dayun] : [] };
  return { revision, assessment, input, trace: createOutlookRescueVerifier(revision, assessment)(input) };
}
function original(input: VerifyOutlookRescuesInput, ref: OutlookRescueRef) {
  return input.judgment.axes.find(axis => axis.id === ref.axisId)![ref.field][ref.index];
}

it("records every existing rescue family at its calculation site and preserves complete original indexes", async () => {
  const kinds = new Set<string>();
  for (const [id, year, background] of [["r4", 2028, false], ["protect", 2032, true], ["a", 2028, true], ["a", 2030, true], ["official", 2027, true], ["food", 2026, false], ["food-wealth", 2024, true]] as const) {
    const { revision, assessment, input, trace } = await actual(id, year, background), before = structuredClone({ revision, assessment, input });
    expect(trace.version).toBe(OUTLOOK_RESCUE_TRACE_VERSION);
    expect(trace.targetRef).toEqual(input.judgment.targetRef); expect(trace.backgroundRefs).toEqual(input.judgment.backgroundRefs); expect(trace.interval).toEqual(input.judgment.interval);
    for (const axis of input.judgment.axes) for (let index = 0; index < axis.rescues.length; index++) expect(trace.items.some(item => item.rescueRefs.some(ref => ref.axisId === axis.id && ref.index === index))).toBe(true);
    for (const item of trace.items) {
      kinds.add(item.kind); expect(item.helpers.every(helper => helper.visibility === "visible")).toBe(true);
      expect(item.helperRoots.every(root => root.roots.length > 0 && root.roots.every(value => ["main_hidden", "other_hidden"].includes(value.visibility)))).toBe(true);
      for (const object of [...item.helpers, ...item.obstacles, ...item.protectedObjects, ...item.helperRoots.flatMap(root => root.roots), ...item.counterEffects.flatMap(edge => edge.targets)]) {
        if (object.origin.kind !== "natal") continue;
        const pillar = revision.facts.pillars[object.origin.position];
        expect(object.stem).toBe(object.visibility === "visible" ? pillar.stem : pillar.hiddenStems[object.hiddenIndex!]);
        if (object.visibility !== "visible") expect(object.hiddenIndex).not.toBeNull();
      }
      for (const ref of [...item.rescueRefs, ...item.conditionRefs, ...item.blockerRefs, ...item.evidenceRefs, ...item.constraints.flatMap(edge => edge.refs), ...item.counterEffects.flatMap(edge => edge.refs)]) expect(original(input, ref)).toBeTruthy();
    }
    createOutlookRescueVerifier(revision, assessment)(input); expect({ revision, assessment, input }).toEqual(before);
  }
  expect([...kinds].sort()).toEqual(["wealth_moderates_resource", "wealth_resource_protection", "counter_obstacle", "combine_output_protect_official", "wealth_protects_food", "output_bridges_peer_wealth", "wealth_controls_owl", "seasonal_stem_protection"].sort());
});

it("keeps unknown-direction helpers and their own constraints separate across the exact 2028 handover", async () => {
  const revision = revisions.get("unknown")!, assessment = buildBaziPreliminaryAssessment(revision);
  const annual = await buildLocalAnnualOutlookRange(revision, assessment, 2028, 2028), year = annual.years[0]!, verify = createOutlookRescueVerifier(revision, assessment);
  expect(year.judgmentSegments).toHaveLength(3);
  for (const segment of year.judgmentSegments) {
    const trace = verify({ judgment: segment.judgment, target: { nodeType: "year", ganZhi: year.yearGanZhi!, ref: year.transitNodeRef! },
      backgrounds: segment.judgment.backgroundRefs.map(ref => ({ nodeType: "dayun", ganZhi: year.dayunSegments.find(part => JSON.stringify(part.nodeRef) === JSON.stringify(ref))!.ganZhi, ref })) });
    if (segment.branchId !== "backward") continue;
    const relevant = trace.items.filter(item => item.protectedObjects.some(object => object.stem === "壬"));
    expect(relevant).toHaveLength(4);
    expect(new Set(relevant.map(item => item.helpers[0]!.id)).size).toBe(2);
    for (const item of relevant) {
      expect(item.candidateStatus).toBe("constrained_candidate"); expect(item.countsAsSupport).toBe(false);
      expect(item.protectedObjects).toEqual(expect.arrayContaining([expect.objectContaining({ stem: "壬", visibility: "visible", origin: { kind: "natal", position: "hour" } })]));
      const helper = item.helpers[0]!, incoming = item.constraints.find(edge => edge.from.origin.kind === "background")!;
      expect(incoming.from.origin).toEqual({ kind: "background", nodeRef: segment.judgment.backgroundRefs[0] });
      if (incoming.from.stem === "辛") expect(incoming.operation).toBe("control");
      else { expect(incoming.from.stem).toBe("庚"); expect(incoming.operation).toBe(helper.stem === "乙" ? "combine" : "control"); }
    }
  }
});

it("distinguishes the helper action from the original combination and keeps rescue support conditional", async () => {
  const { trace, input } = await actual("protect", 2032);
  const item = trace.items.find(value => value.kind === "wealth_resource_protection")!;
  expect(item.operation).toBe("control"); expect(item.helpers[0]!.stem).toBe("己"); expect(item.obstacles[0]!.stem).toBe("壬");
  expect(item.obstacleRelations).toEqual(expect.arrayContaining([expect.objectContaining({ operation: "combine", from: expect.objectContaining({ stem: "壬" }), to: expect.objectContaining({ stem: "丁" }) })]));
  expect(original(input, item.rescueRefs[0]!)).toContain("救应候选");
  const combined = (await actual("official", 2027)).trace.items.find(value => value.kind === "combine_output_protect_official")!;
  expect(combined.operation).toBe("combine"); expect(combined.obstacles[0]!.tenGod).toBe("伤官"); expect(combined.protectedObjects.every(object => object.tenGod === "正官" && object.visibility === "visible")).toBe(true);
});

it("does not merge the same visible stem in different original pillars", async () => {
  const { trace } = await actual("same-stem", 2032, false);
  const helpers = trace.items.filter(item => item.kind === "counter_obstacle" && item.helpers[0]!.stem === "戊").map(item => item.helpers[0]!);
  expect(helpers).toHaveLength(2); expect(new Set(helpers.map(item => item.id)).size).toBe(2);
  expect(helpers.map(item => item.origin)).toEqual([{ kind: "natal", position: "year" }, { kind: "natal", position: "month" }]);
});

it("does not turn flow or an uncounted owl rescue into new support, and separates present killing from a conditional warning", async () => {
  const flow = (await actual("a", 2030)).trace.items.find(item => item.kind === "output_bridges_peer_wealth")!;
  expect(flow).toMatchObject({ candidateStatus: "conditional_candidate", constraintCheck: "not_evaluated", countsAsSupport: false });
  const owl = (await actual("food-wealth", 2024)).trace.items.find(item => item.kind === "wealth_controls_owl")!;
  expect(owl.countsAsSupport).toBe(false); expect(owl.counterEffects[0]).toMatchObject({ status: "conditional", targets: [] });
  const food = (await actual("food", 2026, false)).trace.items.find(item => item.kind === "wealth_protects_food")!;
  expect(food.counterEffects[0]!.status).toBe("present"); expect(food.counterEffects[0]!.targets.length).toBeGreaterThan(0);
  expect(food.counterEffects[0]!.targets.every(object => object.tenGod === "七杀")).toBe(true);
});

it("rejects wrong exact refs, reordered backgrounds, altered axes and selected natal facts", async () => {
  const { revision, assessment, input } = await actual("a", 2028);
  const verify = createOutlookRescueVerifier(revision, assessment);
  for (const mutate of [
    (value: VerifyOutlookRescuesInput) => { value.target.ref.manualDirection = "forward"; },
    (value: VerifyOutlookRescuesInput) => { value.backgrounds = []; },
    (value: VerifyOutlookRescuesInput) => { value.judgment.interval.startInstant = "2000-01-01T00:00:00.000Z"; },
    (value: VerifyOutlookRescuesInput) => { value.target.ganZhi = "甲子"; },
    (value: VerifyOutlookRescuesInput) => { value.judgment.axes.find(axis => axis.axis === "pattern")!.rescues.push("forged"); },
    (value: VerifyOutlookRescuesInput) => { value.judgment.axes.find(axis => axis.axis === "seasonal")!.effect = "neutral"; }
  ]) { const changed = structuredClone(input); mutate(changed); expect(() => verify(changed)).toThrow(); }
  const wrong = structuredClone(assessment); wrong.balance.structural.inputFacts.pillars.month.stem = "丙";
  expect(() => createOutlookRescueVerifier(revision, wrong)).toThrow("结构旺衰：月柱干支或位置不一致");
  const snapshot = await calculateTransitSnapshot({ revision, atInstant: "2028-07-01T04:00:00.000Z" });
  if (snapshot.slots.month.status !== "resolved" || snapshot.slots.year.status !== "resolved" || snapshot.slots.dayun.status !== "resolved") throw new Error("Missing actual nodes");
  const target = snapshot.slots.month.node, dayun = snapshot.slots.dayun.node, year = snapshot.slots.year.node;
  const judgment = buildLocalOutlookJudgment(revision, assessment, { target, background: { dayun, year } });
  expect(() => verify({ judgment, target, backgrounds: [year, dayun] })).toThrow("背景");
  expect(verify({ judgment, target, backgrounds: [dayun, year] }).targetRef).toEqual(target.ref);
});

it("keeps unknown-hour selected-pillar projection and before-birth absence explicit", async () => {
  const source = await actual("a", 2028, false), unknown = structuredClone(source.revision);
  // Selected-pillar projection only; this is not a newly computed unknown-hour transit.
  unknown.input.time = null; unknown.input.timePrecision = "unknown_hour";
  const assessment = buildBaziPreliminaryAssessment(unknown), target = source.input.target;
  const judgment = buildLocalOutlookJudgment(unknown, assessment, { target });
  const trace = createOutlookRescueVerifier(unknown, assessment)({ judgment, target, backgrounds: [] });
  expect(trace.sourceBinding.includeHour).toBe(false); expect(JSON.stringify(trace)).not.toContain('"position":"hour"');
  const changed = structuredClone(unknown); changed.facts.pillars.hour = structuredClone(revisions.get("food")!.facts.pillars.hour);
  expect(createOutlookRescueVerifier(changed, buildBaziPreliminaryAssessment(changed))({ judgment, target, backgrounds: [] })).toEqual(trace);
  const born = await actual("a", 1980, false); expect(born.trace.items).toEqual([]); expect(born.input.judgment.label).toBe("暂不可判");
  const noRescue = await actual("no-print", 2022, false); expect(noRescue.trace.items).toEqual([]);
});
