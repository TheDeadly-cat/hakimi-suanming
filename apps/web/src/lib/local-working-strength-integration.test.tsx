import { beforeAll, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema, type RevisionRecord, type ResearchNoteRecord } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { interpretBaziChart } from "@hakimi/bazi-interpretation";
import { buildBaziPreliminaryAssessment, type BaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { getWorkingBalance } from "../../../../packages/bazi-interpretation/src/structural-strength-assessment";
import { buildBaziComprehensiveReading } from "../../../../packages/bazi-interpretation/src/comprehensive-reading";
import { buildLocalAnnualOutlook, type LocalAnnualOutlook } from "./local-annual-outlook";
import { buildLocalLifeOutlook, buildLocalMonthlyOutlook, type LocalLifeOutlook, type LocalMonthlyOutlook } from "./local-detailed-outlook";
import { buildLocalReadingSnapshot } from "./local-reading-record";
import { packReadingSnapshot, unpackReadingSnapshot } from "./local-reading-snapshot-codec";
import { ChartReadingWorkbench } from "../components/chart-reading-workbench";
import { buildReadingSynthesis } from "./local-reading-synthesis";
import { buildStructuredReadingFeedback, buildReadingFeedbackReview, readingFeedbackSource } from "./local-reading-feedback";
import { buildLocalPersonalReading } from "./local-personal-reading";

async function revisionFor(date: string, time: string, sex: "male" | "female" = "male") {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date, time, timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex,
    lunarLeapMonth: false, location: { label: "Synthetic working-strength chain", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic, not historical birth evidence" }, WORKING_DEFAULT_RULE_PROFILE);
  return storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: crypto.randomUUID(), revisionNumber: 1, createdAt: "2026-10-16T00:00:00Z" });
}
let revision: RevisionRecord, assessment: BaziPreliminaryAssessment, annual: LocalAnnualOutlook, life: LocalLifeOutlook, monthly: LocalMonthlyOutlook;
beforeAll(async () => {
  revision = await revisionFor("1907-03-15", "02:26"); assessment = buildBaziPreliminaryAssessment(revision);
  [annual, life, monthly] = await Promise.all([buildLocalAnnualOutlook(revision, assessment, 1934), buildLocalLifeOutlook(revision, assessment, 1936), buildLocalMonthlyOutlook(revision, assessment, 1936)]);
});

describe("working strength stays consistent across current reading surfaces", () => {
  it("keeps resolved relative strength and conditional use consistent through chapters, synthesis and personal-source binding", async () => {
    const source = await revisionFor("2019-12-22", "11:23", "female"), p = buildBaziPreliminaryAssessment(source);
    const comprehensive = buildBaziComprehensiveReading(source, p), guidance = comprehensive.usefulGuidance!;
    const synthesis = buildReadingSynthesis({ revision: source, assessment: p, comprehensive, life: null });
    expect(p.balance.structural.working).toMatchObject({ direction: "conditional", focus: "rooted_peer_mixed_authority", band: "balanced" });
    expect(p.balance.structural.working.label).toContain("强弱相对均衡");
    expect(p.balance.band).toBe("weak"); expect(p.balance.supportWeight).toBe(9); expect(p.balance.demandWeight).toBe(13);
    expect(guidance.answer.headline).toContain("丙已透有根"); expect(guidance.answer.headline).toContain("辛未见");
    expect(guidance.answer.summary).toContain("戊正官的职责标准与己七杀的急迫要求");
    expect(synthesis.summary).toBe(comprehensive.chapters.find((chapter) => chapter.id === "overview")!.verdict);
    expect(synthesis.keyPoints!.find((point) => point.id === "useful")!.text).toBe(guidance.answer.headline);
    expect([synthesis.summary, ...synthesis.sections.flatMap((section) => section.paragraphs)].join("\n"))
      .not.toMatch(/当前先取金、水|当前判断相对中和|扶抑仍按偏弱|先补承接能力，再增加任务/);
    const body = buildLocalReadingSnapshot(p, null, { sourceRevision: source, comprehensive, synthesis });
    for (const value of [p.version, comprehensive.version, guidance.version, synthesis.version, guidance.answer.headline,
      guidance.answer.summary, guidance.entries.find((entry) => entry.stem === "己")!.judgment]) expect(body).toContain(value);

    const choice = { id: "chapter-useful_elements", label: "取用解读", originalConclusion: guidance.answer.summary,
      sourceVersions: [comprehensive.version, guidance.version] };
    const oldVersions = ["hakimi.bazi-comprehensive-reading/0.8.0", "hakimi.natal-useful-guidance/0.6.0"];
    const makeNote = (text: string, review: boolean): ResearchNoteRecord => ({ schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: source.caseId,
      anchor: { kind: "revision", revisionId: source.id }, bodyFormat: "markdown", body: text, tags: ["解读反馈", ...(review ? ["解读复核"] : [])],
      sourceRefs: [], lifecycle: "active", editVersion: 1, createdAt: review ? "2026-10-16T02:01:00Z" : "2026-10-16T02:00:00Z", updatedAt: review ? "2026-10-16T02:01:00Z" : "2026-10-16T02:00:00Z" });
    const root = makeNote(buildStructuredReadingFeedback(p, { subjectId: choice.id, subjectLabel: choice.label,
      originalConclusion: choice.originalConclusion, sourceVersions: oldVersions, rating: "unverified", actualSituation: "合成来源隔离检查。", requestedRevision: "合成旧版个人修订。" }), false);
    const review = makeNote(await buildReadingFeedbackReview(root, null, readingFeedbackSource(p, oldVersions),
      { state: "revised", notes: "合成明确采用动作。", revisedConclusion: "合成旧版个人修订。", occurredAt: "软件验证" }), true);
    const before = JSON.stringify([root, review]);
    const personal = await buildLocalPersonalReading({ revision: source, assessment: p, choices: [choice], records: [root, review] });
    expect(personal.entries).toEqual([]); expect(personal.issues.join()).toContain("解读版本与当前内容不同");
    expect(JSON.stringify([root, review])).toBe(before);
  });

  it("preserves the actual weak raw result but uses only the explicit structural wealth direction for years, decades and months", () => {
    expect(Object.values(revision.facts.pillars).map((pillar) => pillar.ganZhi)).toEqual(["丁未", "癸卯", "癸亥", "癸丑"]);
    expect(assessment.balance.band).toBe("weak"); expect(assessment.balance.supportWeight).toBe(8); expect(assessment.balance.demandWeight).toBe(15);
    expect(assessment.balance.structural.raw).toEqual(interpretBaziChart(revision.facts, { includeHour: true }).strength);
    const working = getWorkingBalance(assessment);
    expect(working.selection).toBe("structural_rule"); expect(working.direction).toBe("drain"); expect(working.favorableElements).toEqual(["fire"]); expect(working.unfavorableElements).toEqual([]);
    const woodEarth = annual.years.find((year) => year.year === 1934)!, fireWater = annual.years.find((year) => year.year === 1936)!;
    expect(woodEarth.yearGanZhi).toBe("甲戌"); expect(woodEarth.yearInfluence.direction).toBe("主题解读");
    expect(fireWater.yearGanZhi).toBe("丙子"); expect(fireWater.yearInfluence.direction).toBe("较顺");
    expect(fireWater.ownJudgment!.axes.find((axis) => axis.axis === "balance")!.effect).toBe("assists");
    expect(fireWater.scenarioBranches.some((branch) => branch.id.includes(":raw-") && branch.direction !== fireWater.scenarioBranches.find((current) => current.id.endsWith(":working"))!.direction)).toBe(true);
    for (const judgment of [...annual.years.flatMap((year) => [year.ownJudgment!, ...year.judgmentSegments.map((segment) => segment.judgment)]),
      ...life.decades.map((decade) => decade.judgment!), ...monthly.months.flatMap((month) => [month.ownJudgment!, ...month.judgmentSegments.map((segment) => segment.judgment)])]) {
      const balance = judgment.axes.find((axis) => axis.axis === "balance")!;
      expect(balance.pathId).toBe("drain"); expect(balance.evidence).toContain(`旺衰工作判断：${working.version}；${working.selection}；${working.ruleId}。`);
      expect(balance.unresolvedConditions.some((text) => text.includes("权重场景"))).toBe(false);
    }
    expect(life.decades.every((decade) => decade.headline === decade.judgment!.headline)).toBe(true);
    expect(monthly.months.every((month) => month.judgmentSegments.every((segment) => segment.startInstant === segment.judgment.interval.startInstant && segment.endExclusiveInstant === segment.judgment.interval.endExclusiveInstant))).toBe(true);
  });

  it("does not turn structural drain into a generic output-wealth-authority preference for the actual resource rule", async () => {
    const source = await revisionFor("2018-03-15", "00:26"), p = buildBaziPreliminaryAssessment(source), working = getWorkingBalance(p);
    expect(working.focus).toBe("output_after_resource"); expect(working.favorableElements).toEqual(["earth"]); expect(working.unfavorableElements).toEqual([]);
    const years = (await buildLocalAnnualOutlook(source, p, 2032)).years;
    expect(years[0]!.yearGanZhi).toBe("壬子"); expect(years[0]!.yearInfluence.direction).toBe("主题解读");
    expect(years[1]!.yearGanZhi).toBe("癸丑"); expect(years[1]!.yearInfluence.direction).toBe("较顺");
    expect(years[0]!.ownJudgment!.axes.find((axis) => axis.axis === "balance")!.effect).toBe("neutral");
  });

  it("shows the working answer first and retains raw weak numbers only as labelled comparison", async () => {
    render(<ChartReadingWorkbench revision={revision} caseName="合成结构旺衰" assessment={assessment} />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain(getWorkingBalance(assessment).label);
    await userEvent.click(screen.getByRole("button", { name: /扶抑/ }));
    expect(screen.getByText(getWorkingBalance(assessment).summary).closest("details:not([open])")).toBeNull();
    const references = screen.getByText("当前扶抑参考").closest("div")!;
    expect(references.querySelector("dd")!.textContent).toBe("火");
    const comparison = screen.getByText("原计权对照").closest("details")!;
    expect(comparison.open).toBe(false); expect(within(comparison).getByText(assessment.balance.baselineSummary)).toBeTruthy();
    expect(comparison.textContent).toContain("支持侧 8；泄耗克侧 15");
  });

  it("saves the complete structural record once, retains raw evidence, and round trips without changing storage limits", async () => {
    const body = buildLocalReadingSnapshot(assessment, annual, { life, monthly });
    expect(body.match(/结构旺衰完整记录：/gu)).toHaveLength(1);
    const full = body.split("\n").find((line) => line.startsWith("结构旺衰完整记录："))!;
    expect(JSON.parse(full.slice("结构旺衰完整记录：".length))).toEqual(assessment.balance.structural);
    expect(body).toContain("## 原计权对照"); expect(body).toContain(getWorkingBalance(assessment).summary);
    const packed = await packReadingSnapshot(body); expect(packed.length).toBeLessThanOrEqual(200_000); expect(await unpackReadingSnapshot(packed)).toBe(body);
    console.info(JSON.stringify({ probe: "structural-raw-current-full-years-life-months", characters: body.length, storedCharacters: packed.length, maximum: 200000 }));
  });

  it("rejects edited working direction and old judge policy even with the same chart hash", async () => {
    const changed = structuredClone(assessment); changed.balance.structural.working.direction = "support";
    await expect(buildLocalAnnualOutlook(revision, changed, 1934)).rejects.toThrow(/结构工作/);
    expect(() => buildLocalReadingSnapshot(changed, annual)).toThrow(/结构工作/);
    const stale = structuredClone(annual); Object.assign(stale.years[0]!.ownJudgment!, { policyVersion: "hakimi.outlook-model/0.3.0" });
    expect(() => buildLocalReadingSnapshot(assessment, stale)).toThrow(/规则版本/);
  });

  it("excludes a cached hour from a new unknown-hour projection instead of keeping the stronger known-hour result", async () => {
    const unknown = structuredClone(revision); unknown.input.timePrecision = "unknown_hour"; unknown.input.time = null;
    const p = buildBaziPreliminaryAssessment(unknown), working = getWorkingBalance(p);
    expect(p.sourceBinding.includeHour).toBe(false); expect(p.balance.structural.inputFacts.pillars.hour).toBeUndefined();
    expect(working.selection).toBe("raw_fallback");
    const result = await buildLocalAnnualOutlook(unknown, p, 1934);
    // The existing transit engine cannot issue a timed snapshot for this
    // unknown-hour projection; do not borrow its previously known-hour node.
    expect(result.years.every((year) => year.label === "暂不可判" && year.ownJudgment === null && year.judgmentSegments.length === 0)).toBe(true);
  });
});
