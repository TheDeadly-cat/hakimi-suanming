import { beforeAll, describe, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema, type RevisionRecord, type TransitNode } from "@hakimi/contracts";
import { withDayBoundary } from "@hakimi/rule-profiles";
import { calculateTransitSnapshot } from "@hakimi/transit-core";
import { buildBaziPreliminaryAssessment, type BaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildLocalMonthlyOutlook, type LocalMonthlyPeriod } from "./local-detailed-outlook";
import { buildDetailedPersonalizedContent } from "./local-detailed-personalization";
import { buildLocalOutlookJudgment } from "./local-outlook-judgment";
import { strengthTenGodGroup } from "../../../../packages/bazi-interpretation/src/strength-policy";

let revision: RevisionRecord, assessment: BaziPreliminaryAssessment, node: TransitNode, month: LocalMonthlyPeriod;
beforeAll(async () => {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date: "1995-08-18", time: "08:26", timePrecision: "exact_minute",
    timeZone: "Asia/Shanghai", sex: "male", lunarLeapMonth: false, location: { label: "Synthetic content binding", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, withDayBoundary("zi_start_23"));
  revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: "11111111-1111-4111-8111-111111111111", caseId: "22222222-2222-4222-8222-222222222222", revisionNumber: 1, createdAt: "2026-10-16T00:00:00Z" });
  assessment = buildBaziPreliminaryAssessment(revision);
  month = (await buildLocalMonthlyOutlook(revision, assessment, 2028)).months.find((item) => item.label === "大雪月")!;
  const snapshot = await calculateTransitSnapshot({ revision, atInstant: month.startInstant });
  if (snapshot.slots.month.status !== "resolved") throw new Error("Expected actual month node");
  node = snapshot.slots.month.node;
});
const input = () => ({ revision, assessment, node, judgment: month.judgment!, judgmentSegments: month.judgmentSegments, facts: [], horizon: "month" as const });

describe("personalized detailed prose boundaries", () => {
  async function resourceInput(atInstant: string, horizon: "month" | "decade" = "month", date = "2018-11-19", time = "14:26") {
    const chart = await calculateChart({ ...revision.input, date, time }, withDayBoundary("zi_start_23"));
    const r = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: revision.id, caseId: revision.caseId,
      revisionNumber: 1, createdAt: revision.createdAt });
    const p = buildBaziPreliminaryAssessment(r), snapshot = await calculateTransitSnapshot({ revision: r, atInstant });
    const slot = horizon === "month" ? snapshot.slots.month : snapshot.slots.dayun;
    if (slot.status !== "resolved") throw new Error("Expected actual resource wealth node");
    return { revision: r, assessment: p, node: slot.node, judgment: buildLocalOutlookJudgment(r, p, { target: slot.node }), horizon, facts: [] };
  }

  it("explains actual wealth, resource, peer, output and authority targets without substituting a generic learning route", async () => {
    const seen = new Set<string>();
    const task = { wealth: "让财参与裁印", resource: "重复准备能否被财调节", peer: "比劫会牵动用于裁印的财", output: "食伤生财能否帮助调节", authority: "官杀会改变财与印的配合" };
    for (let m = 1; m <= 12; m++) {
      const value = await resourceInput(`2040-${String(m).padStart(2, "0")}-15T00:00:00Z`), original = structuredClone(value);
      const pattern = value.judgment.axes.find((axis) => axis.axis === "pattern")!, group = strengthTenGodGroup(value.node.stemTenGod);
      if (group === null) throw new Error("Actual monthly node must have a recognized ten-god group");
      const result = buildDetailedPersonalizedContent(value), career = result.themes[0]!.text, wealth = result.themes[1]!.text;
      expect(pattern.pathId).toBe("resource-wealth");
      expect(result.age.stage).toBe("adult");
      expect(career).toContain(task[group]);
      expect(career).toContain(`${value.node.ganZhi.slice(0, 1)}${value.node.stemTenGod}`);
      expect([...result.paragraphs, ...result.themes.map((theme) => theme.text)].join()).not.toContain("undefined");
      expect(career).toContain(pattern.summary);
      expect(wealth).toContain(pattern.summary);
      expect(career).not.toContain("围绕学习支持与能力积累展开");
      expect(result.themes[2]!.text).not.toMatch(/裁印|印旺用财/);
      expect(value).toEqual(original); seen.add(group);
    }
    expect([...seen].sort()).toEqual(["authority", "output", "peer", "resource", "wealth"]);
  });

  it("names Ding seven-killings from the actual Ding-Mao decade ganZhi", async () => {
    const value = await resourceInput("2026-10-16T00:00:00Z", "decade", "1999-01-09", "02:26");
    expect(value.node.ganZhi).toBe("丁卯");
    expect(value.node.stemTenGod).toBe("七杀");
    const result = buildDetailedPersonalizedContent(value);
    expect(result.age.stage).toBe("adult");
    expect(result.themes[0]!.text).toContain("这一步大运的丁七杀");
    expect(result.themes[1]!.text).toContain("丁七杀");
    expect(JSON.stringify(result)).not.toContain("undefined");
  });

  it.each(["assists", "obstructs", "mixed", "neutral", "unresolved"] as const)("retains the supplied %s effect and full original explanation in the new prose branch", async (effect) => {
    // Prose-only effect variations: these do not claim new calculated judgments.
    const value = await resourceInput("2040-06-15T00:00:00Z", "decade");
    value.judgment.axes = value.judgment.axes.map((axis) => axis.axis === "pattern" ? { ...axis, effect, summary: "保留原判断中明确的目标字与限制。" } : axis);
    const text = buildDetailedPersonalizedContent(value).themes[0]!.text;
    expect(text).toContain("保留原判断中明确的目标字与限制。");
    expect(text).toContain(effect === "assists" ? "提供了助力" : effect === "obstructs" ? "受到牵制" : effect === "mixed" ? "同时保留可用配合与具体牵制" : "尚未形成明确助阻");
  });

  it("keeps child, unknown-age and relationship wording outside the adult resource wealth interpretation", async () => {
    const value = await resourceInput("2026-06-15T00:00:00Z"), child = buildDetailedPersonalizedContent(value);
    expect(child.age.stage).toBe("youth");
    expect(child.themes.map((item) => item.text).join()).not.toMatch(/裁印|费用|对价|新增职责/);
    const oldPath = structuredClone(value);
    oldPath.judgment.axes = oldPath.judgment.axes.map((axis) => axis.axis === "pattern" ? { ...axis, pathId: "resource-preservation" } : axis);
    expect(child.themes[2]!.text).toBe(buildDetailedPersonalizedContent(oldPath).themes[2]!.text);
    const unknown = structuredClone(value); unknown.revision.timeCalibration.utcInstant = null;
    const unknownResult = buildDetailedPersonalizedContent(unknown);
    expect(unknownResult.age.stage).toBe("unknown");
    expect(unknownResult.themes.map((item) => item.text).join()).not.toMatch(/裁印|孩子|岗位|收入增减/);
  });

  it("retains the exact source objects and both actual handover segments", () => {
    const value = input(), before = structuredClone(value), result = buildDetailedPersonalizedContent(value);
    expect(value).toEqual(before);
    expect(result.themes[0]!.text).toContain("辛巳大运"); expect(result.themes[0]!.text).toContain("庚辰大运");
    expect(result.themes[0]!.text).toContain("2028-12-21");
    expect(result.evidence.join()).toContain(node.ref.nodeId);
  });
  it("rejects unchanged node ids paired with forged full references, intervals or direction branches", () => {
    const wrongRef = structuredClone(input()); wrongRef.judgment.targetRef.ruleProfileDigest = "a".repeat(64);
    expect(() => buildDetailedPersonalizedContent(wrongRef)).toThrow("完整目标引用");
    const wrongInterval = structuredClone(input()); wrongInterval.judgmentSegments[0]!.judgment.interval.endExclusiveInstant = node.endExclusiveInstant;
    expect(() => buildDetailedPersonalizedContent(wrongInterval)).toThrow("区间");
    const wrongDirection = structuredClone(input()); wrongDirection.judgmentSegments[0]!.branchId = "forward";
    expect(() => buildDetailedPersonalizedContent(wrongDirection)).toThrow("顺逆背景");
    const duplicate = structuredClone(input()); duplicate.judgmentSegments[1]!.id = duplicate.judgmentSegments[0]!.id;
    expect(() => buildDetailedPersonalizedContent(duplicate)).toThrow("标识");
  });
  it("missing calibration uses neutral life language and never implies a successful unknown-hour calculation", () => {
    // Legacy calibration boundary only: actual unknown-hour candidate selection
    // remains upstream and is not silently replaced by this cached exact chart.
    const value = structuredClone(input()); value.revision.timeCalibration.utcInstant = null;
    const result = buildDetailedPersonalizedContent(value), text = [...result.paragraphs, ...result.themes.map((theme) => theme.text)].join();
    expect(result.age.stage).toBe("unknown");
    expect(result.age.segments).toEqual([]);
    expect(text).not.toMatch(/孩子|亲子|儿童|家人提供|照料者|岗位|客户/);
    const badHour = structuredClone(input()); badHour.assessment.sourceBinding.includeHour = false;
    expect(() => buildDetailedPersonalizedContent(badHour)).toThrow("时柱范围");
  });
});
