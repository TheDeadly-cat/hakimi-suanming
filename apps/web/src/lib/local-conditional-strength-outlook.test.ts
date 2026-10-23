import { beforeAll, describe, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema, type RevisionRecord } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment, type BaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { getWorkingBalance } from "../../../../packages/bazi-interpretation/src/structural-strength-assessment";
import { buildLocalAnnualOutlook, type LocalAnnualOutlook } from "./local-annual-outlook";
import { buildLocalLifeOutlook, buildLocalMonthlyOutlook } from "./local-detailed-outlook";

let revision: RevisionRecord, assessment: BaziPreliminaryAssessment, annual: LocalAnnualOutlook;
beforeAll(async () => {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date: "2019-12-22", time: "11:23",
    timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex: "female", lunarLeapMonth: false,
    location: { label: "Synthetic public-pillar comparison", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic, no biographical assertions" }, WORKING_DEFAULT_RULE_PROFILE);
  revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: "11111111-1111-4111-8111-111111111111",
    caseId: "22222222-2222-4222-8222-222222222222", revisionNumber: 1, createdAt: "2026-10-16T00:00:00Z" });
  assessment = buildBaziPreliminaryAssessment(revision);
  annual = await buildLocalAnnualOutlook(revision, assessment, 2026);
});

describe("conditional structural carrying reaches actual annual, decade and monthly judgments", () => {
  it("does not turn the preserved weak raw score into universal metal/water benefits or fire/earth pressure", () => {
    expect(Object.values(revision.facts.pillars).map((pillar) => pillar.ganZhi)).toEqual(["己亥", "丙子", "癸巳", "戊午"]);
    expect([assessment.balance.supportWeight, assessment.balance.demandWeight, assessment.balance.band]).toEqual([9, 13, "weak"]);
    expect(getWorkingBalance(assessment).direction).toBe("conditional");
    expect(getWorkingBalance(assessment).band).toBe("balanced");
    expect(annual.years).toHaveLength(10);
    for (const year of annual.years) {
      for (const judgment of [year.ownJudgment, ...year.judgmentSegments.map((segment) => segment.judgment)].filter((item) => item !== null)) {
        const balance = judgment!.axes.find((axis) => axis.axis === "balance")!;
        expect(balance.effect).toBe("unresolved");
        expect(balance.summary).toContain(getWorkingBalance(assessment).label);
        expect(balance.evidence.join()).not.toMatch(/当前扶抑有利|当前扶抑承压/);
        expect(balance.summary).not.toContain("相对中和");
        expect(balance.unresolvedConditions.join()).not.toContain("尚未单独裁定整体强弱");
      }
    }
    const metalWater = annual.years.find((year) => year.year === 2032)!;
    expect(metalWater.yearInfluence.direction).toBe("主题解读");
    expect(metalWater.yearInfluence.evidence.join()).toContain("不固定定喜忌");
  });

  it("keeps real mixed-authority and stem-interaction findings while not treating conditional as strong", () => {
    const fire = annual.years.find((year) => year.year === 2026)!.ownJudgment!;
    const mixed = annual.years.find((year) => year.year === 2029)!.ownJudgment!;
    const peer = annual.years.find((year) => year.year === 2032)!.ownJudgment!;
    const firePattern = fire.axes.find((axis) => axis.axis === "pattern")!;
    expect(firePattern.pathId).toBe("official-wealth");
    expect(firePattern.evidence.join()).not.toMatch(/透丙.*支持此路径分支/);
    expect(fire.axes.find((axis) => axis.axis === "seasonal")!.evidence.join()).toContain("丙");
    expect(fire.primaryAxis).toBe("seasonal");
    expect(fire.summary).toContain("丙原已透出，本期再次出现");
    expect(fire.summary).not.toContain("不从原分数推出");
    expect(mixed.axes.find((axis) => axis.axis === "pattern")!.evidence.join()).toMatch(/透己.*增加阻碍/);
    expect(mixed.axes.find((axis) => axis.axis === "pattern")!.unresolvedConditions.join()).toContain("目标又透七杀");
    expect(peer.axes.find((axis) => axis.axis === "pattern")!.blockers.join()).toMatch(/壬.*丙/);
    expect(peer.axes.find((axis) => axis.axis === "pattern")!.effect).not.toBe("assists");
  });

  it("uses the same conditional balance in whole life and twelve real solar-term months", async () => {
    const before = JSON.stringify({ revision, assessment });
    const [life, monthly] = await Promise.all([buildLocalLifeOutlook(revision, assessment, 2026), buildLocalMonthlyOutlook(revision, assessment, 2026)]);
    expect(life.decades.length).toBeGreaterThanOrEqual(8); expect(monthly.months).toHaveLength(12);
    const judgments = [...life.decades.map((item) => item.judgment), ...monthly.months.flatMap((month) => [month.ownJudgment, ...month.judgmentSegments.map((segment) => segment.judgment)])].filter((item) => item !== null);
    expect(judgments.length).toBeGreaterThan(20);
    for (const judgment of judgments) {
      const balance = judgment!.axes.find((axis) => axis.axis === "balance");
      if (balance) expect(balance.effect).toBe("unresolved");
    }
    expect(JSON.stringify({ revision, assessment })).toBe(before);
  });
});
