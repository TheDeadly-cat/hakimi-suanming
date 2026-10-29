import { beforeAll, describe, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema, type RevisionRecord, type TransitNode } from "@hakimi/contracts";
import { withDayBoundary } from "@hakimi/rule-profiles";
import { calculateTransitSnapshot } from "@hakimi/transit-core";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildLocalOutlookJudgment, combineLocalOutlookJudgments, createPatternActionVerifier, createOutlookRescueVerifier, LOCAL_OUTLOOK_MODEL, LOCAL_OUTLOOK_JUDGMENT_VERSION, LOCAL_OUTLOOK_POLICY_VERSION, OUTLOOK_STEM_ACTIONS_VERSION, type LocalOutlookJudgment, type LocalOutlookJudgmentSegment } from "./local-outlook-judgment";

async function revisionFor(date: string, time = "08:26", sex: "male" | "female" | "unspecified" = "male") {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date, time, timePrecision: "exact_minute",
    timeZone: "Asia/Shanghai", sex, lunarLeapMonth: false,
    location: { label: "Synthetic multiaxis fixture", latitude: null, longitude: null, precision: "city" }, sourceNote: "" }, withDayBoundary("zi_start_23"));
  return storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: "11111111-1111-4111-8111-111111111111",
    caseId: "22222222-2222-4222-8222-222222222222", revisionNumber: 1, createdAt: "2026-10-16T00:00:00Z" });
}
async function targetFor(revision: RevisionRecord, year: number) {
  const snapshot = await calculateTransitSnapshot({ revision, atInstant: `${year}-07-01T04:00:00.000Z` });
  if (snapshot.slots.year.status !== "resolved") throw new Error("Expected actual annual node");
  return { target: snapshot.slots.year.node, dayun: snapshot.slots.dayun.status === "resolved" ? snapshot.slots.dayun.node : undefined };
}
function evaluate(revision: RevisionRecord, target: TransitNode, dayun?: TransitNode) {
  return buildLocalOutlookJudgment(revision, buildBaziPreliminaryAssessment(revision), {
    target, background: dayun ? { dayun } : {},
    startInstant: dayun ? new Date(Math.max(Date.parse(target.startInstant), Date.parse(dayun.startInstant))).toISOString() : target.startInstant,
    endExclusiveInstant: dayun ? new Date(Math.min(Date.parse(target.endExclusiveInstant), Date.parse(dayun.endExclusiveInstant))).toISOString() : target.endExclusiveInstant
  });
}
const axis = (judgment: LocalOutlookJudgment, name: "balance" | "pattern" | "seasonal") => judgment.axes.find((item) => item.axis === name)!;

describe("natal task continuity across exact transit backgrounds", () => {
  it("changes B's actual 2029 post-handover pattern while keeping visible Ji neutral and hidden Xin supportive", async () => {
    const r=await revisionFor("1995-05-18"),p=buildBaziPreliminaryAssessment(r),beforeInput=JSON.stringify({r,p});
    const early=await calculateTransitSnapshot({revision:r,atInstant:"2029-04-01T04:00:00.000Z"}),late=await calculateTransitSnapshot({revision:r,atInstant:"2029-07-01T04:00:00.000Z"});
    if(early.slots.year.status!=="resolved"||early.slots.dayun.status!=="resolved"||late.slots.year.status!=="resolved"||late.slots.dayun.status!=="resolved")throw new Error("Expected actual year and luck nodes");
    const first=evaluate(r,early.slots.year.node,early.slots.dayun.node),second=evaluate(r,late.slots.year.node,late.slots.dayun.node),a=axis(first,"pattern"),b=axis(second,"pattern");
    expect(a.effect).toBe("assists");expect(b.effect).toBe("mixed");
    expect(first.interval.endExclusiveInstant).toBe(second.interval.startInstant);expect(second.interval.startInstant).toBe(late.slots.dayun.node.startInstant);
    expect(b.stemActions!.items.map(item=>[item.stem,item.effect])).toEqual([["己","neutral"],["辛","assists"]]);
    expect(a.taskLinks!.items[0]!.relations).toEqual([]);
    const relation=b.taskLinks!.items[0]!.relations.find(edge=>edge.from.stem==="丁")!;
    expect(relation).toMatchObject({operation:"control",from:{origin:{kind:"background",nodeRef:late.slots.dayun.node.ref}},to:{origin:{kind:"natal",position:"month"},stem:"辛"},contributesPressure:true});
    expect(b.blockers[relation.refs[0]!.index]).toContain("泄身出口与制杀支点");expect(JSON.stringify({r,p})).toBe(beforeInput);
    const verify=createPatternActionVerifier(r,p),lateYear=late.slots.year.node,lateLuck=late.slots.dayun.node,earlyLuck=early.slots.dayun.node;verify(b,lateYear,[lateLuck]);
    const bad=structuredClone(b);bad.taskLinks!.items[0]!.relations[0]!.from.origin={kind:"target",nodeRef:late.slots.year.node.ref};
    expect(()=>verify(bad,lateYear,[lateLuck])).toThrow("作用元数据或原结构轴");
    expect(()=>verify(b,lateYear,[earlyLuck])).toThrow();
  });

  it("records Bing combining and controlling one Xin pivot with two functions, and keeps later food support constrained by Ding",async()=>{
    const r=await revisionFor("1995-05-18");
    const y26=await targetFor(r,2026),p26=axis(evaluate(r,y26.target,y26.dayun),"pattern");
    const link=p26.taskLinks!.items[0]!;expect(p26.effect).toBe("obstructs");expect(link.pivots).toHaveLength(1);expect(link.functions).toHaveLength(2);
    expect(link.relations.map(edge=>edge.operation)).toEqual(["combine","control"]);
    expect(new Set(link.relations.map(edge=>edge.to.id)).size).toBe(1);
    expect(link.functions.some(edge=>edge.operation==="control"&&edge.to.stem==="乙")).toBe(true);
    const y31=await targetFor(r,2031),p31=axis(evaluate(r,y31.target,y31.dayun),"pattern");
    expect(p31.effect).toBe("mixed");expect(p31.stemActions!.items[0]).toMatchObject({stem:"辛",effect:"assists"});
    expect(p31.taskLinks!.items[0]!.relations.some(edge=>edge.from.stem==="丁"&&edge.from.origin.kind==="background")).toBe(true);
  });

  it("keeps month Bing, year Ren and luck Ding as three different origins and verifies the original rescue chain",async()=>{
    const r=await revisionFor("1995-05-18"),p=buildBaziPreliminaryAssessment(r),s=await calculateTransitSnapshot({revision:r,atInstant:"2032-06-20T04:00:00.000Z"});
    if(s.slots.month.status!=="resolved"||s.slots.year.status!=="resolved"||s.slots.dayun.status!=="resolved")throw new Error("Expected all exact nodes");
    const month=s.slots.month.node,year=s.slots.year.node,dayun=s.slots.dayun.node;
    const j=buildLocalOutlookJudgment(r,p,{target:month,background:{dayun,year}}),pattern=axis(j,"pattern"),relations=pattern.taskLinks!.items[0]!.relations;
    expect(month.ganZhi).toBe("丙午");expect(relations.some(edge=>edge.from.stem==="丙"&&edge.from.origin.kind==="target")).toBe(true);
    expect(relations.some(edge=>edge.from.stem==="丁"&&edge.from.origin.kind==="background"&&edge.from.origin.nodeRef.nodeType==="dayun")).toBe(true);
    expect(pattern.stemActions!.items[0]).toMatchObject({stem:"丙",effect:"obstructs"});
    const trace=createOutlookRescueVerifier(r,p)({judgment:j,target:month,backgrounds:[dayun,year]});
    expect(trace.items.some(item=>item.helpers.some(helper=>helper.stem==="壬"&&helper.origin.kind==="background"&&helper.origin.nodeRef.nodeType==="year"))).toBe(true);
    expect(trace.items.every(item=>item.rescueRefs.every(ref=>j.axes.find(a=>a.id===ref.axisId)!.rescues[ref.index]))).toBe(true);
  });

  it("keeps the food rescue's contrary killing action and distinguishes natal shallow roots from a later Yin root",async()=>{
    const r=await revisionFor("1970-12-08"),n26=await targetFor(r,2026),j26=evaluate(r,n26.target,n26.dayun),p26=axis(j26,"pattern");
    expect(p26.effect).toBe("obstructs");expect(p26.rescues.join()).toContain("救应自身受牵连");expect(p26.blockers.join()).toContain("财同时生杀");
    const functions=p26.taskLinks!.items[0]!.functions;
    expect(functions.some(edge=>edge.from.stem==="庚"&&edge.to.stem==="壬"&&edge.operation==="generate")).toBe(true);
    expect(functions.some(edge=>edge.from.stem==="庚"&&edge.to.stem==="甲"&&edge.operation==="control")).toBe(true);
    const n34=await targetFor(r,2034),p34=axis(evaluate(r,n34.target,n34.dayun),"pattern"),root=p34.taskLinks!.items[0]!.roots[0]!;
    expect(p34.effect).toBe("mixed");expect(root.natal.map(r=>[r.branch,r.stem,r.visibility])).toEqual([["辰","乙","other_hidden"]]);
    expect(root.target.some(r=>r.branch==="寅"&&r.stem==="甲"&&r.visibility==="main_hidden")).toBe(true);
    expect(p34.blockers.join()).toContain("庚可制");
  });

  it("keeps rootless natal officials separate from Shen/You support while wealth still constrains Ren, and leaves unmatched paths without links",async()=>{
    const r=await revisionFor("1971-04-09","14:26");
    for(const year of [2028,2029]){const n=await targetFor(r,year),pattern=axis(evaluate(r,n.target,n.dayun),"pattern"),task=pattern.taskLinks!.items[0]!;
      const officers=task.roots.filter(root=>root.object.tenGod==="正官");expect(officers).toHaveLength(2);expect(new Set(officers.map(root=>root.object.id)).size).toBe(2);
      const rootBranches=officers.map(root=>({natal:root.natal.map(r=>r.branch),background:root.background.map(r=>r.branch),target:root.target.map(r=>r.branch)}));
      expect(rootBranches,JSON.stringify(rootBranches)).toEqual([
        {natal:[],background:["戌"],target:[year===2028?"申":"酉"]},{natal:[],background:["戌"],target:[year===2028?"申":"酉"]}
      ]);
      expect(task.relations.some(edge=>edge.to.stem==="壬"&&edge.operation==="control")).toBe(true);
      expect(pattern.effect).toBe(year===2028?"obstructs":"mixed");
    }
    const unrelated=await revisionFor("1995-08-18"),nodes=await targetFor(unrelated,2028);expect(axis(evaluate(unrelated,nodes.target,nodes.dayun),"pattern").taskLinks).toBeUndefined();
  });
});
let xin: RevisionRecord, weak: RevisionRecord, resource: RevisionRecord;
const years = new Map<number, { target: TransitNode; dayun: TransitNode | undefined; judgment: LocalOutlookJudgment }>();
beforeAll(async () => {
  [xin, weak, resource] = await Promise.all([revisionFor("1995-08-18"), revisionFor("1995-03-18"), revisionFor("1995-05-18")]);
  for (const year of [1980, 2024, 2025, 2026, 2027, 2028, 2032]) {
    const nodes = await targetFor(xin, year); years.set(year, { ...nodes, judgment: evaluate(xin, nodes.target, nodes.dayun) });
  }
});

describe("local comprehensive outlook: actual nodes and explicit rule branches", () => {
  it.each([
    ["1957-09-13", "00:26", "hurting-resource", "丁", "辛"],
    ["1982-10-02", "10:26", "hurting-wealth", "壬", "辛"],
    ["1944-08-09", "04:26", "official-resource", "壬", "庚"],
  ] as const)("keeps the natal task across actual luck/year/month without turning its hidden command into a visible actor for %s", async (date, time, path, primary, hidden) => {
    const revision = await revisionFor(date, time), p = buildBaziPreliminaryAssessment(revision), before = structuredClone({ revision, p });
    const snapshot = await calculateTransitSnapshot({ revision, atInstant: "2032-07-01T04:00:00.000Z" });
    for (const slot of [snapshot.slots.dayun, snapshot.slots.year, snapshot.slots.month]) {
      if (slot.status !== "resolved") throw new Error("Expected actual luck, year and month nodes");
      const result = buildLocalOutlookJudgment(revision, p, { target: slot.node }), pattern = axis(result, "pattern");
      expect(pattern.pathId).toBe(path); expect(pattern.evidence.join()).toContain("月令主气" + hidden);
      expect(pattern.evidence.join()).toContain("未加入透干数组");
      expect(pattern.evidence.join()).toContain(primary);
      expect(result.targetRef).toEqual(slot.node.ref);
      expect(pattern.stemActions!.items.map((item) => item.visibility)).toEqual(["visible", "main_hidden"]);
      expect(pattern.stemActions!.items[0]!.stem).toBe(slot.node.ganZhi[0]);
    }
    expect({ revision, p }).toEqual(before);
  });

  it("never lends natal separation to a real incoming wealth or print, and retains resource protection versus wealth moderation", async () => {
    const guard = await revisionFor("1957-09-13", "00:26"), moderate = await revisionFor("1982-10-02", "10:26"), official = await revisionFor("1944-08-09", "04:26");
    const guardNode = await targetFor(guard, 2032), guardPattern = axis(evaluate(guard, guardNode.target, guardNode.dayun), "pattern");
    expect(guardPattern.pathId).toBe("hurting-resource");
    expect(guardPattern.stemActions!.items[0]).toMatchObject({ stem: "壬", effect: "obstructs" });
    expect(guardPattern.blockers.join()).toContain("不是原局隔位的同一对");
    expect(guardPattern.summary).toContain("丁正印"); expect(guardPattern.summary).toContain("不能按伤官生财一律列为助力");
    const printNode = await targetFor(moderate, 2027), print = axis(evaluate(moderate, printNode.target, printNode.dayun), "pattern");
    expect(print.pathId).toBe("hurting-wealth"); expect(print.stemActions!.items[0]).toMatchObject({ stem: "丁", effect: "obstructs" });
    expect(print.summary).toContain("以财调印"); expect(print.blockers.join()).toContain("关键年柱透壬");
    const moneyNode = await targetFor(moderate, 2032), money = axis(evaluate(moderate, moneyNode.target, moneyNode.dayun), "pattern");
    expect(money.stemActions!.items[0]).toMatchObject({ stem: "壬", effect: "unresolved" });
    expect(money.unresolvedConditions.join()).toContain("天干五合"); expect(money.unresolvedConditions.join()).toContain("可克");
    const officialNode = await targetFor(official, 2028), incoming = axis(evaluate(official, officialNode.target, officialNode.dayun), "pattern");
    expect(incoming.stemActions!.items[0]).toMatchObject({ stem: "戊", effect: "obstructs" });
    expect(incoming.blockers.join()).toContain("可克关键月柱透壬");
    expect(incoming.blockers.join()).toContain("原局隔护不扩展到新来干");
  });

  it("keeps a resolved relative R3 band separate from conditional element use and unchanged actual annual effects", async () => {
    const revision = await revisionFor("2019-12-22", "11:23", "female"), assessment = buildBaziPreliminaryAssessment(revision);
    const original = structuredClone({ revision, assessment }), working = assessment.balance.structural.working;
    expect(assessment.balance).toMatchObject({ band: "weak", supportWeight: 9, demandWeight: 13 });
    expect(working).toMatchObject({ band: "balanced", direction: "conditional", focus: "rooted_peer_mixed_authority",
      label: "得令有根，强弱相对均衡", favorableElements: [], unfavorableElements: [] });
    for (const [year, patternEffect, seasonalEffect] of [[2026, "unresolved", "unresolved"], [2029, "obstructs", "unresolved"], [2032, "mixed", "mixed"]] as const) {
      const nodes = await targetFor(revision, year), result = evaluate(revision, nodes.target, nodes.dayun);
      expect(result.version).toBe(LOCAL_OUTLOOK_JUDGMENT_VERSION);
      expect(result.policyVersion).toBe(LOCAL_OUTLOOK_POLICY_VERSION);
      expect(LOCAL_OUTLOOK_POLICY_VERSION).toBe("hakimi.outlook-model/0.8.0");
      expect(result.label).toBe("条件性");
      expect(axis(result, "balance")).toMatchObject({ pathId: "conditional", effect: "unresolved" });
      expect(axis(result, "pattern")).toMatchObject({ pathId: "official-wealth", effect: patternEffect });
      expect(axis(result, "seasonal").effect).toBe(seasonalEffect);
      expect(axis(result, "balance").summary).toContain(working.label);
      expect(axis(result, "balance").unresolvedConditions.join()).toContain("身势已按");
      expect(result.axes.flatMap((item) => [item.summary, ...item.unresolvedConditions]).join()).not.toContain("尚未单独裁定整体强弱");
      expect(axis(result, "pattern").unresolvedConditions.join()).toContain("不由身势等级自动转入固定喜忌分支");
      expect(result.targetRef).toEqual(nodes.target.ref);
      expect(result.backgroundRefs).toEqual(nodes.dayun ? [nodes.dayun.ref] : []);
    }
    expect({ revision, assessment }).toEqual(original);
  });

  it("does not turn a real relatively strong R3 chart into fixed favorable elements or a normal strong-pattern branch", async () => {
    const revision = await revisionFor("1969-12-14", "11:23"), assessment = buildBaziPreliminaryAssessment(revision);
    expect(assessment.balance.structural.working).toMatchObject({ band: "strong", label: "得令有根，相对偏强",
      direction: "conditional", focus: "rooted_peer_mixed_authority", favorableElements: [], unfavorableElements: [] });
    const nodes = await targetFor(revision, 2026), result = evaluate(revision, nodes.target, nodes.dayun);
    expect(axis(result, "balance")).toMatchObject({ pathId: "conditional", effect: "unresolved" });
    expect(axis(result, "balance").summary).toContain("相对偏强");
    expect(axis(result, "pattern").unresolvedConditions.join()).toContain("不由身势等级自动转入固定喜忌分支");
    expect(axis(result, "pattern").stemActions!.items.find((item) => item.visibility === "visible")!.effect).not.toBe("assists");
  });

  it("records R4 incoming print pressure independently from the original wealth rescue and records a supported actual wealth actor", async () => {
    const revision = await revisionFor("1999-01-09", "02:26");
    const printNodes = await targetFor(revision, 2028), wealthNodes = await targetFor(revision, 2035);
    const print = axis(evaluate(revision, printNodes.target, printNodes.dayun), "pattern");
    expect(print.pathId).toBe("resource-wealth"); expect(print.effect).toBe("mixed");
    expect(print.rescues.join()).toContain("月柱透乙偏财");
    expect(print.stemActions!.version).toBe(OUTLOOK_STEM_ACTIONS_VERSION);
    expect(print.stemActions!.items.find((item) => item.visibility === "visible")).toMatchObject({ stem: "戊", tenGod: "正印", effect: "obstructs", summaryBasis: true });
    expect(print.stemActions!.items.find((item) => item.visibility === "main_hidden")!.effect).toBe("unresolved");
    const wealth = axis(evaluate(revision, wealthNodes.target, wealthNodes.dayun), "pattern"), actor = wealth.stemActions!.items.find((item) => item.visibility === "visible")!;
    expect(wealth.effect).toBe("assists"); expect(actor).toMatchObject({ stem: "乙", tenGod: "偏财", effect: "assists" });
    expect(actor.satisfiedConditionIndexes.map((index) => wealth.satisfiedConditions[index]).join()).toContain("可助裁印");
    expect(wealth.blockers).toEqual([]);
  });

  it("keeps the actual B2028 visible peer neutral while attributing support to the main hidden output", async () => {
    const nodes = await targetFor(resource, 2028), pattern = axis(evaluate(resource, nodes.target, nodes.dayun), "pattern");
    expect(pattern.effect).toBe("assists");
    const visible = pattern.stemActions!.items.find((item) => item.visibility === "visible")!, main = pattern.stemActions!.items.find((item) => item.visibility === "main_hidden")!;
    expect(visible).toMatchObject({ stem: "戊", tenGod: "劫财", effect: "neutral" });
    expect(main).toMatchObject({ stem: "庚", tenGod: "伤官", effect: "assists" });
    expect(visible.evidenceIndexes.map((index) => pattern.evidence[index]).join()).toContain("未单独定向");
    expect(main.evidenceIndexes.map((index) => pattern.evidence[index]).join()).toContain("未当成透干");
  });

  it("evaluates a real hidden month killing through the exposed food path while retaining missing-root conditions", async () => {
    const revision = await revisionFor("1995-09-21", "02:26");
    const nodes = await targetFor(revision, 2027), before = JSON.stringify({ revision, nodes });
    const result = evaluate(revision, nodes.target), pattern = axis(result, "pattern");
    expect(pattern.pathId).toBe("food-killings");
    expect(pattern.effect).not.toBe("unresolved");
    expect(pattern.summary).toContain("月令辛七杀与时柱透丁食神");
    expect(pattern.satisfiedConditions.join()).toContain("月令主气辛");
    expect(pattern.unresolvedConditions.join()).toContain("食神虽透出");
    expect(pattern.unresolvedConditions.join()).toContain("未见同五行承接根");
    expect(pattern.unresolvedConditions.join()).not.toContain("七杀尚未透出");
    expect(pattern.blockers.join()).not.toMatch(/关键(?:年柱|月柱|时柱)透辛/);
    expect(result.label).toBe("条件性");
    expect(pattern.sourceIds).toContain("outlook-zq-killing-month-example");
    expect(JSON.stringify({ revision, nodes })).toBe(before);
  });

  it("evaluates month official plus visible print but leaves a killing month with no visible partner unresolved", async () => {
    const official = await revisionFor("2000-03-11", "10:26"), empty = await revisionFor("1995-09-21", "06:26");
    const [officialNodes, emptyNodes] = await Promise.all([targetFor(official, 2027), targetFor(empty, 2027)]);
    const supported = axis(evaluate(official, officialNodes.target), "pattern");
    expect(supported.pathId).toBe("official-resource");
    expect(supported.summary).toContain("月令乙正官与时柱透丁正印");
    expect(supported.satisfiedConditions.join()).toContain("不冒称乙已经透出");
    const noPartner = axis(evaluate(empty, emptyNodes.target), "pattern");
    expect(noPartner.pathId).toBe("seven_killings-background");
    expect(noPartner.effect).toBe("unresolved");
  });

  it("a balanced peer-output-wealth chart answers distinct years without fabricating fixed balance preferences", () => {
    const good = years.get(2025)!.judgment, official = years.get(2026)!.judgment;
    expect(axis(good, "balance").effect).toBe("neutral");
    expect(axis(good, "pattern").pathId).toBe("peer-output-wealth");
    // The year's wealth support does not remove Xin-Si luck's continuing control of natal wealth.
    expect(good.label).toBe("利弊并见"); expect(official.label).toBe("有压力");
    expect(axis(good, "pattern").effect).toBe("mixed");
    expect(axis(good, "pattern").blockers.join()).toContain("大运辛巳透辛可克年柱透乙");
    expect(axis(good, "pattern").blockers.join()).toContain("大运辛巳透辛可克月柱透甲");
    expect(axis(good, "pattern").stemActions!.items[0]).toMatchObject({stem:"乙",effect:"assists"});
    expect(good.summary).toContain("财的承接"); expect(official.summary).toContain("责任与约束");
    expect(axis(official, "pattern").evidence).toContainEqual(expect.stringMatching(/透丙.*正官.*增加阻碍/));
    expect(axis(official, "pattern").evidence.join()).not.toMatch(/藏丁.*增加阻碍/);
  });

  it("incoming killing is not generically adverse: Ding pressure is specifically the existing Ren combination and remains conditional", () => {
    const result = years.get(2027)!.judgment, pattern = axis(result, "pattern");
    expect(pattern.evidence).toContainEqual(expect.stringMatching(/透丁.*七杀.*未单独定向/));
    expect(pattern.blockers.join()).toContain("丁壬"); expect(result.label).toBe("条件性");
    expect(pattern.unresolvedConditions.join()).toContain("尚未判合去/合化");
    expect(result.summary).not.toContain("。。");
  });

  it("a rooted visible rescue identifies the same blocker rather than declaring cancellation by mere coexistence", () => {
    const result = years.get(2028)!.judgment, pattern = axis(result, "pattern");
    expect(pattern.blockers.join()).toContain("戊可克关键时柱透壬");
    expect(pattern.rescues.join()).toContain("月柱透甲");
    expect(pattern.rescues.join()).toContain("制约来干戊");
    expect(pattern.unresolvedConditions.join()).toContain("是否完全奏效未由出现次数证明");
    expect(result.label).toBe("条件性");
  });

  it("already exposed seasonal Ren repeating is not an automatic favorable vote", () => {
    const seasonal = axis(years.get(2032)!.judgment, "seasonal");
    expect(seasonal.evidence.join()).toContain("原已透而再现");
    expect(seasonal.satisfiedConditions.join()).toContain("不按“补足主用”额外判有利");
    expect(seasonal.effect).not.toBe("assists");
  });

  it("mixed axis pressure is retained even when the structure axis assists", () => {
    const result = years.get(2024)!.judgment;
    expect(axis(result, "pattern").effect).toBe("mixed");
    expect(result.label).toBe("利弊并见"); expect(result.conflicts.length).toBeGreaterThan(0);
    expect(LOCAL_OUTLOOK_MODEL.loadSensitivityBoundaries).toEqual([0.8, 1, 1.2]);
    expect(axis(result, "pattern").evidence.join()).toContain("非吉凶分数");
  });

  it("actual official-resource and resource-output charts use different natal paths and facts", async () => {
    const w = await targetFor(weak, 2026), r = await targetFor(resource, 2026);
    const official = evaluate(weak, w.target, w.dayun), printOutput = evaluate(resource, r.target, r.dayun);
    expect(axis(official, "pattern").pathId).toBe("official-resource");
    expect(axis(printOutput, "pattern").pathId).toBe("resource-output");
    expect(official.summary).not.toBe(printOutput.summary);
    expect(axis(official, "pattern").sourceIds).toContain("outlook-zq-official-luck");
    expect(axis(printOutput, "pattern").sourceIds).toContain("outlook-zq-resource-luck");
  });

  it("actual food-wealth is distinct from hurting-wealth and explicitly retains the cross-path load assumption", async () => {
    const revision = await revisionFor("1990-10-18", "20:26"), nodes = await targetFor(revision, 2024);
    const result = evaluate(revision, nodes.target, nodes.dayun), pattern = axis(result, "pattern");
    expect(buildBaziPreliminaryAssessment(revision).pattern.monthMainTenGod).toBe("食神");
    expect(pattern.pathId).toBe("food-wealth");
    expect(pattern.sourceIds).toContain("outlook-zq-food-luck");
    expect(pattern.sourceIds).not.toContain("outlook-zq-hurting-luck");
    expect(pattern.evidence.join()).toMatch(/透甲.*偏印.*增加阻碍/);
    expect(pattern.rescues.join()).toContain("财是否同时助杀须另看");
    expect(pattern.unresolvedConditions.join()).toContain("本地跨路径负荷模型");
    expect(result.label).toBe("条件性");
  });

  it("actual food-control-killing excludes official weight and preserves an incoming official as a change of target", async () => {
    const revision = await revisionFor("1991-02-08", "02:26"), nodes = await targetFor(revision, 2024);
    const pattern = axis(evaluate(revision, nodes.target, nodes.dayun), "pattern");
    expect(pattern.pathId).toBe("food-killings");
    expect(pattern.evidence.join()).toContain("正官未并入七杀");
    expect(pattern.unresolvedConditions.join()).toContain("混官改变作用对象");
    expect(pattern.sourceIds).toContain("outlook-zq-food-luck");
  });

  it("a wealth stem already combined with the incoming indirect print is not also counted as a free rescue", async () => {
    const revision = await revisionFor("1998-06-07", "02:26"), nodes = await targetFor(revision, 2023);
    expect(Object.values(revision.facts.pillars).map((pillar) => pillar.ganZhi)).toEqual(["戊寅", "戊午", "乙酉", "丁丑"]);
    expect(nodes.target.ganZhi).toBe("癸卯");
    const result = evaluate(revision, nodes.target), pattern = axis(result, "pattern");
    expect(pattern.pathId).toBe("food-wealth");
    expect(pattern.blockers.join()).toContain("癸戊天干五合");
    expect(pattern.rescues.join()).not.toContain("制枭护食");
    expect(pattern.rescues.join()).not.toContain("制约来干癸");
    expect(pattern.unresolvedConditions.join()).toContain("尚未判合去/合化");
    expect(result.summary).not.toContain("he_gan_5");
    expect(pattern.evidence.join()).toContain("he_gan_5");
  });

  it("unknown-hour projection excludes cached hour facts and never treats hidden Ren as an exposed Ding-Ren combination", () => {
    // Projection boundary only: this compatibility shape is not a newly calculated
    // unknown-hour revision. Transit generation independently rejects stale hashes.
    const unknown = structuredClone(xin); unknown.input.time = null; unknown.input.timePrecision = "unknown_hour";
    const assessment = buildBaziPreliminaryAssessment(unknown), target = years.get(2027)!.target;
    const result = buildLocalOutlookJudgment(unknown, assessment, { target });
    const serialized = JSON.stringify(result.axes);
    expect(serialized).not.toContain("时柱");
    expect(axis(result, "seasonal").blockers.join()).not.toContain("天干合");
    expect(axis(result, "seasonal").unresolvedConditions.join()).toContain("仅在支内");
    expect(result.sourceBinding.includeHour).toBe(false);
    const changed = structuredClone(unknown); changed.facts.pillars.hour = structuredClone(weak.facts.pillars.hour);
    expect(buildLocalOutlookJudgment(changed, buildBaziPreliminaryAssessment(changed), { target })).toEqual(result);
  });

  it("binds exact source, target and background intersection without mutating natal facts", () => {
    const before = structuredClone(xin), nodes = years.get(2028)!;
    const result = evaluate(xin, nodes.target, nodes.dayun);
    expect(result.targetRef).toEqual(nodes.target.ref);
    expect(result.backgroundRefs).toEqual([nodes.dayun!.ref]);
    expect(result.interval.endExclusiveInstant).toBe(nodes.dayun!.endExclusiveInstant);
    expect(xin).toEqual(before);
    const wrong = buildBaziPreliminaryAssessment(xin); wrong.sourceBinding.chartResultHash = "f".repeat(64);
    expect(() => buildLocalOutlookJudgment(xin, wrong, { target: nodes.target })).toThrow("不匹配");
    expect(() => buildLocalOutlookJudgment(xin, buildBaziPreliminaryAssessment(xin), { target: nodes.target, background: { dayun: nodes.dayun! } })).toThrow("交集");
    const otherNode = structuredClone(nodes.target); otherNode.ref.revisionId = "33333333-3333-4333-8333-333333333333";
    expect(() => evaluate(xin, otherNode)).toThrow("身份不匹配");
  });

  it("birth and missing-background conditions cannot silently become an unconditional personal answer", () => {
    const born = years.get(1980)!.judgment;
    expect(born.label).toBe("暂不可判"); expect(born.axes).toEqual([]);
    const own = evaluate(xin, years.get(2025)!.target);
    expect(combineLocalOutlookJudgments(own, [], { incomplete: true }).label).toBe("条件性");
    expect(combineLocalOutlookJudgments(own, [], { uncertainDirection: true }).label).toBe("条件性");
    expect(combineLocalOutlookJudgments(own, [])).toEqual(own);
  });

  it("rejects ambiguous or forged segment timelines and formats handover dates in explicit UTC+08", async () => {
    const nodes = years.get(2028)!, own = evaluate(xin, nodes.target);
    const second = await calculateTransitSnapshot({ revision: xin, atInstant: nodes.dayun!.endExclusiveInstant });
    if (second.slots.dayun.status !== "resolved") throw new Error("expected next decade");
    const a = nodes.judgment, b = evaluate(xin, nodes.target, second.slots.dayun.node);
    const segment = (id: string, judgment: LocalOutlookJudgment): LocalOutlookJudgmentSegment => ({ id, branchId: "locked", branchLabel: "已锁定方向",
      ...judgment.interval, judgment });
    const segments = [segment("a", a), segment("b", b)], before = structuredClone(segments), combined = combineLocalOutlookJudgments(own, segments);
    expect(combined.interval).toEqual(own.interval); expect(combined.backgroundRefs).toHaveLength(2);
    expect(combined.summary).toContain("2028-12-21（UTC+08）起");
    expect(combined.axes).toHaveLength(6);
    expect(combined.summary.length).toBeLessThan(700);
    expect(combined.summary).not.toContain("dayun");
    expect(combined.summary).not.toContain(a.summary);
    expect(combined.summary).not.toContain(b.summary);
    expect(segments).toEqual(before);
    expect(combined.conditions).toEqual(expect.arrayContaining([...a.conditions, ...b.conditions]));
    expect(() => combineLocalOutlookJudgments(own, [segments[1]!, segments[0]!])).toThrow("顺序");
    expect(() => combineLocalOutlookJudgments(own, [segments[0]!, { ...segments[1]!, id: "a" }])).toThrow("标识");
    expect(() => combineLocalOutlookJudgments(own, [{ ...segments[0]!, endExclusiveInstant: own.interval.endExclusiveInstant }])).toThrow("区间");
  });
});

describe("existing disruption and conditional rescue in actual charts", () => {
  it("keeps already exposed print against needed food when another food stem arrives", async () => {
    const revision = await revisionFor("1970-12-08"), nodes = await targetFor(revision, 2024);
    const result = evaluate(revision, nodes.target), pattern = axis(result, "pattern");
    expect(pattern.pathId).toBe("food-killings");
    expect(pattern.evidence.join()).toContain("食神2、七杀8");
    expect(pattern.blockers.join()).toMatch(/原局或背景.*庚.*制.*甲.*食神/);
    expect(pattern.unresolvedConditions.join()).toContain("新增食神仍面对既有印的制约");
    expect(result.label).toBe("条件性");
  });

  it("wealth can address existing print while its support of killing remains a separate cost", async () => {
    const revision = await revisionFor("1970-12-08"), nodes = await targetFor(revision, 2026);
    const before = structuredClone(revision), result = evaluate(revision, nodes.target), pattern = axis(result, "pattern");
    expect(pattern.rescues.join()).toMatch(/丙.*制印存食.*庚.*甲/);
    expect(pattern.blockers.join()).toContain("财同时生杀");
    expect(pattern.effect).toBe("mixed"); expect(result.label).toBe("条件性");
    expect(pattern.sourceIds).toContain("outlook-zq-success-rescue");
    expect(revision).toEqual(before); expect(result.targetRef).toEqual(nodes.target.ref);
  });

  it("combining the incoming hurting stem is a distinct protection candidate, never a free print action", async () => {
    const revision = await revisionFor("1971-04-09", "14:26"), nodes = await targetFor(revision, 2027);
    const result = evaluate(revision, nodes.target, nodes.dayun), pattern = axis(result, "pattern");
    expect(pattern.pathId).toBe("official-resource");
    expect(pattern.rescues.join()).toMatch(/丁壬.*合伤护官候选/);
    expect(pattern.rescues.join()).not.toMatch(/壬.*可制约来干丁/);
    expect(pattern.unresolvedConditions.join()).toContain("合伤不等于已合去伤官");
    expect(pattern.effect).toBe("mixed"); expect(result.label).toBe("条件性");
  });

  it("a print previously restrained by exposed wealth is not an unencumbered rescue", async () => {
    const revision = await revisionFor("1971-04-09", "08:26"), nodes = await targetFor(revision, 2026);
    const pattern = axis(evaluate(revision, nodes.target), "pattern");
    expect(pattern.rescues.join()).toContain("受牵连");
    expect(pattern.unresolvedConditions.join()).toMatch(/戊.*可克.*壬/);
    expect(pattern.effect).toBe("obstructs");
    expect(pattern.unresolvedConditions.join()).toContain("未据此删除救应天干");
  });

  it("a rescue combined with the actual decade stem retains its constraint in both relevant axes", async () => {
    const nodes = await targetFor(xin, 2029), result = evaluate(xin, nodes.target, nodes.dayun);
    expect(nodes.dayun?.ganZhi).toBe("庚辰");
    const pattern = axis(result, "pattern");
    expect(pattern.unresolvedConditions.join()).toMatch(/年柱透乙.*大运庚辰透庚.*乙庚/);
    expect(pattern.rescues.join()).toContain("受牵连");
    expect(pattern.effect).toBe("obstructs");
    expect(axis(result, "seasonal").unresolvedConditions.join()).toContain("乙庚");
  });

  it("does not turn the existing-print rule into a blanket obstruction when food already exceeds killing", async () => {
    const revision = await revisionFor("1991-02-08", "02:26"), nodes = await targetFor(revision, 2026);
    const pattern = axis(evaluate(revision, nodes.target, nodes.dayun), "pattern");
    expect(pattern.evidence.join()).toContain("食神6、七杀3");
    expect(pattern.unresolvedConditions.join()).toContain("印可能调节过重之食并扶身");
    expect(pattern.blockers.join()).not.toContain("原局或背景");
    // The actual incoming 丙辛合 and its still-unresolved direct action remain;
    // this counterexample is not converted into an invented favorable year.
    expect(pattern.blockers.join()).toContain("丙辛天干五合");
    expect(pattern.effect).toBe("obstructs");
  });

  it("does not promote an unrooted print or the absence of interfering print into a rescue", async () => {
    const unrooted = await revisionFor("1982-09-08", "14:26"), a = await targetFor(unrooted, 2027);
    expect(axis(evaluate(unrooted, a.target), "pattern").rescues.join()).not.toContain("合伤护官");
    const noPrint = await revisionFor("1991-02-08", "02:26"), b = await targetFor(noPrint, 2022);
    const pattern = axis(evaluate(noPrint, b.target), "pattern");
    expect(pattern.pathId).toBe("food-killings");
    expect(pattern.rescues.join()).not.toMatch(/制印存食|合印存食/);
    expect(pattern.blockers.join()).not.toContain("原局或背景");
  });

  it("checks the incoming stem against a rescue already supplied by the real decade", async () => {
    const revision = await revisionFor("1970-12-08"), nodes = await targetFor(revision, 2052);
    expect(nodes.target.ganZhi).toBe("壬申"); expect(nodes.dayun?.ganZhi).toBe("丙申");
    const pattern = axis(evaluate(revision, nodes.target, nodes.dayun), "pattern");
    expect(pattern.rescues.join()).toMatch(/大运丙申透丙.*制印存食.*受牵连/);
    expect(pattern.unresolvedConditions.join()).toContain("流年壬申透壬可克大运丙申透丙");
    expect(pattern.effect).toBe("obstructs");
  });
});
