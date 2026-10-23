import { beforeAll, describe, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema, type RevisionRecord } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildLocalAnnualOutlook, type LocalAnnualOutlook } from "./local-annual-outlook";
import { buildLocalLifeOutlook, type LocalLifeOutlook } from "./local-detailed-outlook";
import { ANNUAL_DOMAIN_READING_VERSION, buildAnnualDomainReading } from "./local-annual-domain-reading";
import type { LocalReadingAnnualDomains } from "./local-annual-domain-record";
import { buildReadingTimeline } from "./local-reading-timeline";
import { outlookDirectionCaption } from "./outlook-judgment-presentation";
import { buildReadingPriorities, LOCAL_READING_PRIORITIES_VERSION } from "./local-reading-priorities";

async function revisionFor(date: string, sex: "male" | "unspecified" = "male") {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date, time: "08:26", timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex,
    lunarLeapMonth: false, location: { label: "Synthetic reading priorities", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
  return storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: "11111111-1111-4111-8111-111111111111",
    caseId: "22222222-2222-4222-8222-222222222222", revisionNumber: 1, createdAt: "2026-10-16T00:00:00Z" });
}
let a: RevisionRecord, b: RevisionRecord, u: RevisionRecord, aa: LocalAnnualOutlook, ba: LocalAnnualOutlook, ua: LocalAnnualOutlook, early: LocalAnnualOutlook, life: LocalLifeOutlook;
let ad: LocalReadingAnnualDomains, bd: LocalReadingAnnualDomains, ud: LocalReadingAnnualDomains;
function domains(revision: RevisionRecord, annual: LocalAnnualOutlook): LocalReadingAnnualDomains {
  const assessment = buildBaziPreliminaryAssessment(revision);
  return { version: ANNUAL_DOMAIN_READING_VERSION, revisionId: revision.id, chartResultHash: revision.manifest.resultHash, includeHour: assessment.sourceBinding.includeHour,
    startYear: annual.startYear, endYear: annual.endYear, years: annual.years.map((year) => buildAnnualDomainReading({ revision, assessment, year })) };
}
beforeAll(async () => {
  [a, b, u] = await Promise.all([revisionFor("1995-08-18"), revisionFor("1995-05-18"), revisionFor("1995-08-18", "unspecified")]);
  [aa, ba, ua, early, life] = await Promise.all([buildLocalAnnualOutlook(a, buildBaziPreliminaryAssessment(a), 2026),
    buildLocalAnnualOutlook(b, buildBaziPreliminaryAssessment(b), 2026), buildLocalAnnualOutlook(u, buildBaziPreliminaryAssessment(u), 2028),
    buildLocalAnnualOutlook(a, buildBaziPreliminaryAssessment(a), 1990), buildLocalLifeOutlook(a, buildBaziPreliminaryAssessment(a), 2026, { atInstant: "2026-10-16T00:00:00Z" })]);
  [ad, bd, ud] = [domains(a, aa), domains(b, ba), domains(u, ua)];
});

describe("prioritized reading of existing years without new fortune scores", () => {
  it("retains exact original judgments, targets, versions, branch intervals and all years without mutating inputs", () => {
    const timeline = buildReadingTimeline({ revision: a, annual: aa, life }), input = { revision: a, annual: aa, life, timeline, annualDomains: ad };
    const before = JSON.stringify(input), result = buildReadingPriorities(input);
    expect(JSON.stringify(input)).toBe(before); expect(result.version).toBe(LOCAL_READING_PRIORITIES_VERSION);
    expect(result.sourceBinding).toEqual(timeline.sourceBinding); expect(result.lifeReferenceInstant).toBe(life.referenceInstant);
    expect(result.sourceVersions).toEqual(expect.arrayContaining([aa.version, life.version, timeline.version, ad.version, ...ad.years[0]!.sourceVersions]));
    const branch = result.branches[0]!;
    expect(branch.years.map((year) => year.year)).toEqual(aa.years.map((year) => year.year));
    for (const year of branch.years) for (const segment of year.segments) {
      const original = aa.years.find((item) => item.year === year.year)!.judgmentSegments.find((item) => item.id === segment.id)!;
      expect(segment.judgment).toEqual(original.judgment);
      expect([segment.startInstant, segment.endExclusiveInstant]).toEqual([original.startInstant, original.endExclusiveInstant]);
      expect(year.nodeRef).toEqual(original.judgment.targetRef);
    }
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });
  it("prioritizes A2028 and B2029's actual handovers and retains both half-open segments", () => {
    for (const [revision, annual, annualDomains, handoverYear] of [[a, aa, ad, 2028], [b, ba, bd, 2029]] as const) {
      const result = buildReadingPriorities({ revision, annual, annualDomains }), branch = result.branches[0]!;
      const selected = branch.years.find((year) => year.year === handoverYear)!;
      expect(branch.priorityYearIds[0]).toBe(selected.id);
      expect(selected.segments).toHaveLength(2);
      expect(selected.segments[0]!.endExclusiveInstant).toBe(selected.segments[1]!.startInstant);
      const turn = selected.turningPoints.find((item) => item.kind === "handover")!;
      expect(turn.atInstant).toBe(selected.segments[1]!.startInstant);
      expect(selected.selectionReasons.some((reason) => reason.kind === "handover" && reason.turningPointId === turn.id)).toBe(true);
      expect(selected.selectionReasons.find((reason) => reason.kind === "handover")!.text).toContain("不代表自动转好");
      expect(branch.priorityYearIds.length).toBeLessThanOrEqual(5); expect(new Set(branch.priorityYearIds).size).toBe(branch.priorityYearIds.length);
      const changes = branch.priorityYearIds.map((id) => branch.years.find((year) => year.id === id)!).filter((year) => year.turningPoints.length);
      // A support/pressure starting year may also have a change; only the first
      // three priority slots are allocated to change-year ranking.
      expect(changes.length).toBeGreaterThan(0);
    }
  });
  it("keeps unknown sex as parallel one-segment forward and two-segment backward readings for 2028", () => {
    const result = buildReadingPriorities({ revision: u, annual: ua, annualDomains: ud });
    expect(result.branches.map((branch) => branch.id)).toEqual(["forward", "backward"]);
    const forward = result.branches[0]!.years[0]!, backward = result.branches[1]!.years[0]!;
    expect([forward.segments.length, backward.segments.length]).toEqual([1, 2]);
    expect(forward.caption).toContain("利弊并见"); expect(backward.caption).toContain("有压力");
    for (const branch of result.branches) for (const year of branch.years) for (const segment of year.segments) {
      const source = ua.years.find((item) => item.year === year.year)!.judgmentSegments.find((item) => item.id === segment.id)!;
      expect(segment.branchId).toBe(branch.id); expect(segment.caption).toBe(outlookDirectionCaption(source.judgment, null));
      expect(segment.judgment.backgroundRefs).toEqual(source.judgment.backgroundRefs);
    }
  });
  it("retains conditional labels even where the existing primary axis supplies a support or pressure clue", () => {
    const result = buildReadingPriorities({ revision: a, annual: aa }), branch = result.branches[0]!;
    const conditional = branch.years.flatMap((year) => year.segments).filter((segment) => segment.judgment.label === "条件性" && ["assists", "obstructs"].includes(segment.primaryEffect!));
    expect(conditional.length).toBeGreaterThan(0);
    for (const segment of conditional) {
      expect(segment.category).toBe("conditional"); expect(segment.caption).toBe(outlookDirectionCaption(segment.judgment, null));
      expect(segment.caption).not.toBe("较顺"); expect(segment.caption).not.toBe("有压力");
    }
    // This actual window has no pure primary support clue. Do not manufacture
    // a favorable year just to populate both reading-priority categories.
    expect(branch.years.flatMap((year) => year.selectionReasons).some((item) => item.kind === "support_start")).toBe(false);
    const reason = branch.years.flatMap((year) => year.selectionReasons).find((item) => item.kind === "pressure_start")!;
    const selected = branch.years.flatMap((year) => year.segments).find((segment) => segment.id === reason.segmentIds[0])!;
    expect(reason.text).toContain(selected.caption);
    const supportive = buildReadingPriorities({ revision: b, annual: ba }).branches[0]!;
    const supportYear = supportive.years.find((year) => year.year === 2028)!;
    expect(supportYear.categories).toEqual(["conditional"]);
    expect(supportYear.segments[0]!.primaryEffect).toBe("assists");
    expect(supportYear.caption).toBe("结构上较顺，需看承接与救应");
    expect(supportYear.selectionReasons.find((item) => item.kind === "support_start")!.text).toContain("有条件的支持");
  });
  it("explains an actual same-caption axis change with the original before/after reasons", () => {
    const reading = buildReadingPriorities({ revision: u, annual: ua });
    const year = reading.branches.find((branch) => branch.id === "backward")!.years.find((item) => item.year === 2030)!;
    const turn = year.turningPoints.find((point) => point.kind === "judgment_change")!;
    expect(turn.before.caption).toBe(turn.after.caption);
    const reason = year.selectionReasons.find((item) => item.turningPointId === turn.id)!;
    expect(reason.text).toContain(`总体表述仍为“${turn.after.caption}”`);
    expect(reason.text).toContain("调候由受阻变为未固定方向");
    expect(reason.text).toContain(turn.before.reason.split("。")[0]! + "。");
    expect(reason.text).toContain(turn.after.reason.split("。")[0]! + "。");
    expect(reason.text).not.toContain(`前段“${turn.before.caption}”，后段“${turn.after.caption}”`);
    expect(year.turningPoints).toEqual(buildReadingTimeline({ revision: u, annual: ua }).turningPoints.filter((point) => point.branchId === "backward" && point.year === 2030));
  });
  it("keeps real B2030 proposal and B2032 realization themes attached to their own original segments", () => {
    const branch = buildReadingPriorities({ revision: b, annual: ba, annualDomains: bd }).branches[0]!;
    const one = branch.years.find((year) => year.year === 2030)!.segments[0]!.domains.find((domain) => domain.id === "career")!;
    const two = branch.years.find((year) => year.year === 2032)!.segments[0]!.domains.find((domain) => domain.id === "career")!;
    expect(one.headline).toContain("提案"); expect(two.headline).toContain("验收"); expect(one.summary).not.toBe(two.summary);
    expect(one.summary).toBe(bd.years.find((year) => year.year === 2030)!.branches[0]!.segments[0]!.domains.find((domain) => domain.id === "career")!.summary);
    expect(one.examples).not.toEqual(two.examples);
    expect(one.examples).toEqual(bd.years.find((year) => year.year === 2030)!.branches[0]!.segments[0]!.domains.find((domain) => domain.id === "career")!.examples);
  });
  it("deeply preserves every domain's prose and age in each original handover or parallel segment", () => {
    for (const [revision, annual, annualDomains] of [[a, aa, ad], [b, ba, bd], [u, ua, ud]] as const) {
      const original = JSON.stringify(annualDomains), reading = buildReadingPriorities({ revision, annual, annualDomains });
      for (const branch of reading.branches) for (const year of branch.years) for (const segment of year.segments) {
        const source = annualDomains.years.find((item) => item.year === year.year)!.branches.find((item) => item.id === branch.id)!.segments.find((item) => item.id === segment.id)!;
        expect([segment.personalStartInstant, segment.ageStage, segment.ageLabel]).toEqual([source.personalStartInstant, source.ageStage, source.ageLabel]);
        for (const domain of segment.domains) {
          const { sourceVersions: _versions, ...content } = domain;
          expect(content).toEqual(source.domains.find((item) => item.id === domain.id));
          expect(domain.examples).not.toBe(source.domains.find((item) => item.id === domain.id)!.examples);
          expect(domain.conditions).not.toBe(source.domains.find((item) => item.id === domain.id)!.conditions);
          // Domain content carries no new direction inferred from the overall caption.
          expect(domain).not.toHaveProperty("direction"); expect(domain).not.toHaveProperty("effect");
        }
      }
      reading.branches[0]!.years[0]!.segments[0]!.domains[0]!.examples.push("mutate returned view only");
      expect(JSON.stringify(annualDomains)).toBe(original);
    }
  });
  it("keeps absent domains explicit and retains before-birth emptiness and child context when supplied", () => {
    const absent = buildReadingPriorities({ revision: a, annual: aa });
    expect(absent.branches.flatMap((branch) => branch.years.flatMap((year) => year.segments)).every((segment) =>
      segment.domains.length === 0 && segment.personalStartInstant === null && segment.ageStage === null && segment.ageLabel === null)).toBe(true);
    const earlyDomains = domains(a, early), reading = buildReadingPriorities({ revision: a, annual: early, annualDomains: earlyDomains });
    expect(reading.branches[0]!.years.find((year) => year.year === 1990)!.segments).toEqual([]);
    const firstLuck = reading.branches[0]!.years.find((year) => year.year === 1998)!;
    expect(firstLuck.segments).toHaveLength(2);
    expect(firstLuck.segments.every((segment) => segment.ageStage === "young_child")).toBe(true);
    expect(firstLuck.segments[0]!.domains.map((domain) => domain.title).join()).not.toMatch(/事业|收入|婚姻/);
    expect(firstLuck.segments[0]!.endExclusiveInstant).toBe(firstLuck.segments[1]!.startInstant);
  });
  it("rejects altered examples, obstacles, conditions, evidence, attribution or age despite matching original node metadata", () => {
    for (const change of [
      (source: LocalReadingAnnualDomains) => { source.years[0]!.branches[0]!.segments[0]!.domains[0]!.examples[0] = "unbound event"; },
      (source: LocalReadingAnnualDomains) => { source.years[0]!.branches[0]!.segments[0]!.domains[0]!.obstacles.push("unbound pressure"); },
      (source: LocalReadingAnnualDomains) => { source.years[0]!.branches[0]!.segments[0]!.domains[2]!.conditions = []; },
      (source: LocalReadingAnnualDomains) => { source.years[0]!.branches[0]!.segments[0]!.domains[0]!.evidence.push("unbound basis"); },
      (source: LocalReadingAnnualDomains) => { source.years[0]!.branches[0]!.segments[0]!.domains[0]!.sourceIds.push("unbound-source"); },
      (source: LocalReadingAnnualDomains) => { source.years[0]!.branches[0]!.segments[0]!.ageStage = "young_child"; },
      (source: LocalReadingAnnualDomains) => { source.years[0]!.branches[0]!.segments[0]!.ageLabel = "child context"; },
      (source: LocalReadingAnnualDomains) => {
        const segment = source.years[0]!.branches[0]!.segments[0]!;
        segment.personalStartInstant = new Date(Date.parse(segment.personalStartInstant) + 1000).toISOString();
      }
    ]) {
      const changed = structuredClone(bd); change(changed);
      expect(() => buildReadingPriorities({ revision: b, annual: ba, annualDomains: changed })).toThrow("完整领域原文、年龄或个人区间");
    }
  });
  it("preserves before-birth and first-luck gaps and does not invent years missing from the input", () => {
    const first = buildReadingPriorities({ revision: a, annual: early }).branches[0]!;
    const birthBefore = first.years.find((year) => year.year === 1990)!;
    expect(birthBefore.categories).toEqual(["unavailable"]); expect(birthBefore.segments).toEqual([]);
    expect(first.priorityYearIds).not.toContain(birthBefore.id);
    const initialLuck = first.years.find((year) => year.year === 1998)!;
    expect(initialLuck.gaps.some((gap) => gap.kind === "missing_background")).toBe(true);
    expect(initialLuck.segments[0]!.judgment.backgroundRefs).toEqual([]);
    expect(initialLuck.segments[0]!.endExclusiveInstant).toBe("1998-12-20T20:58:00.000Z");
    const missing = buildReadingPriorities({ revision: b, annual: { ...ba, years: ba.years.filter((year) => year.year !== 2029) } }).branches[0]!;
    expect(missing.years.some((year) => year.year === 2029)).toBe(false);
    expect(missing.gaps.some((gap) => gap.year === 2029 && gap.kind === "unavailable_year")).toBe(true);
    expect(missing.years.find((year) => year.year === 2030)!.turningPoints).toEqual([]);
  });
  it("rejects mismatched supplied timeline, judgment policy, domain version or cross-branch domain instead of attaching it", () => {
    const timeline = buildReadingTimeline({ revision: a, annual: aa }); timeline.summary += "旧或改写内容";
    expect(() => buildReadingPriorities({ revision: a, annual: aa, timeline })).toThrow("阶段脉络");
    const alteredAnnual = structuredClone(aa); Object.assign(alteredAnnual.years[0]!.judgmentSegments[0]!.judgment, { policyVersion: "unsupported/9" });
    expect(() => buildReadingPriorities({ revision: a, annual: alteredAnnual })).toThrow("判断版本");
    const wrongVersions = structuredClone(bd); wrongVersions.years[0]!.sourceVersions.push("unsupported/9");
    expect(() => buildReadingPriorities({ revision: b, annual: ba, annualDomains: wrongVersions })).toThrow("来源版本");
    const wrongBranch = structuredClone(ud); wrongBranch.years[0]!.branches[0]!.segments[0]!.branchId = "backward";
    expect(() => buildReadingPriorities({ revision: u, annual: ua, annualDomains: wrongBranch })).toThrow("分支、分段");
    const wrongTime = structuredClone(ad); wrongTime.years[0]!.branches[0]!.segments[0]!.startInstant = "2026-01-01T00:00:00Z";
    expect(() => buildReadingPriorities({ revision: a, annual: aa, annualDomains: wrongTime })).toThrow("分支、分段");
  });
});
