import { beforeAll, describe, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema, type RevisionRecord } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment, type BaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildLocalAnnualOutlook, type LocalAnnualOutlook } from "./local-annual-outlook";
import { ANNUAL_DOMAIN_READING_VERSION, buildAnnualDomainReading } from "./local-annual-domain-reading";
import type { LocalReadingAnnualDomains } from "./local-annual-domain-record";
import { buildReadingAnnualEvents, annualEventFeedbackText, describeReadingAnnualEvents, type LocalReadingAnnualEvents } from "./local-annual-event-record";
import { buildReadingPriorities } from "./local-reading-priorities";
import { priorityEventKey, projectPriorityAnnualEvents } from "./priority-annual-events";

let revision: RevisionRecord, assessment: BaziPreliminaryAssessment, annual: LocalAnnualOutlook;
let annualDomains: LocalReadingAnnualDomains, events: LocalReadingAnnualEvents;
beforeAll(async () => {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date: "1995-08-18", time: "08:26",
    timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex: "unspecified", lunarLeapMonth: false,
    location: { label: "Synthetic relationship record branches", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
  revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: "11111111-1111-4111-8111-111111111111",
    caseId: "22222222-2222-4222-8222-222222222222", revisionNumber: 1, createdAt: "2026-10-16T00:00:00Z" });
  assessment = buildBaziPreliminaryAssessment(revision); annual = await buildLocalAnnualOutlook(revision, assessment, 2026);
  annualDomains = { version: ANNUAL_DOMAIN_READING_VERSION, revisionId: revision.id, chartResultHash: revision.manifest.resultHash,
    includeHour: true, startYear: annual.startYear, endYear: annual.endYear,
    years: annual.years.map((year) => buildAnnualDomainReading({ revision, assessment, year })) };
  events = buildReadingAnnualEvents({ revision, assessment, annual, annualDomains });
});

describe("relationship background facts survive priority preview, feedback and complete report", () => {
  it("preserves distinct forward background and each backward handover segment in every presentation", () => {
    const original = JSON.stringify(events), reading = events.years.find((year) => year.year === 2028)!;
    const forward = reading.branches.find((branch) => branch.id === "forward")!, backward = reading.branches.find((branch) => branch.id === "backward")!;
    expect(forward.segments).toHaveLength(1); expect(backward.segments).toHaveLength(2);
    const getRelation = (segment: typeof forward.segments[number]) => segment.items.find((item) => item.domain === "relationship")!;
    const focus = getRelation(forward.segments[0]!);
    expect(focus.origin.relationFactIds.some((id) => id.startsWith("dayun:"))).toBe(true);
    expect(backward.segments[0]!.endExclusiveInstant).toBe("2028-12-20T20:58:00.000Z");
    expect(backward.segments[1]!.startInstant).toBe(backward.segments[0]!.endExclusiveInstant);
    const expectedBackgroundFacts = [
      ["year:stem_clash|binary|chong_gan_4:乙辛|year:辛|month:乙"],
      ["year:stem_five_combination|binary|he_gan_5:乙庚|year:庚|month:乙", "month:stem_clash|binary|chong_gan_4:甲庚|year:庚|month:甲"]
    ];
    for (const [index, segment] of backward.segments.entries()) {
      const item = getRelation(segment), ref = segment.backgroundRefs[0]!;
      // The previous palace-only negative is retained for palace facts. New
      // exposed-star contacts must match this exact decade and no other one.
      expect(item.origin.relationFactIds.filter((id) => id.startsWith("dayun:"))).toEqual(expectedBackgroundFacts[index]!.map((fact) => `dayun:${ref.nodeId}:${fact}`));
      expect(item.relationshipTiming!.lenses.flatMap((lens) => lens.signals).filter((signal) => signal.source === "dayun" && signal.kind === "palace_contact")).toEqual([]);
      expect(ref.manualDirection).toBe("backward");
      // Exact professional facts moved out of the opening answer, but remain
      // complete and bound to this period in the displayed/saved reasoning.
      const reasoning = item.why.join("\n");
      expect(reasoning).toContain(index === 0 ? "同段辛巳大运背景干辛与原局年柱明透乙偏财有天干冲" : "同段庚辰大运背景干庚与原局年柱明透乙偏财有天干五合");
      if (index === 1) expect(reasoning).toContain("同段庚辰大运背景干庚与原局月柱明透甲正财有天干冲");
      expect(item.summary).not.toMatch(/同段辛巳大运|同段庚辰大运|明透星干/u);
      expect(reasoning).not.toContain(index === 0 ? "同段庚辰大运" : "同段辛巳大运");
      expect(reasoning).not.toContain("同段丁亥大运");
      expect(item.summary).not.toBe(focus.summary);
    }
    expect(focus.origin.relationFactIds.filter((id) => id.startsWith("dayun:"))).toEqual([
      `dayun:${forward.segments[0]!.backgroundRefs[0]!.nodeId}:day:branch_six_clash|binary|chong:巳亥|year:亥|month:巳`
    ]);
    expect(focus.why.join("\n")).not.toContain("同段辛巳大运"); expect(focus.why.join("\n")).not.toContain("同段庚辰大运");
    const projected = projectPriorityAnnualEvents(buildReadingPriorities({ revision, annual, annualDomains }), events);
    const report = describeReadingAnnualEvents(events, { revision, assessment, annual, annualDomains }).join("\n");
    for (const branch of reading.branches) for (const segment of branch.segments) {
      const item = getRelation(segment), feedback = annualEventFeedbackText(reading, branch, segment, item);
      const timing = item.relationshipTiming!;
      expect(timing.scope).toMatchObject({ branchId: branch.id, segmentId: segment.id, startInstant: segment.startInstant, endExclusiveInstant: segment.endExclusiveInstant, backgroundRefs: segment.backgroundRefs });
      for (const signal of timing.lenses.flatMap((lens) => lens.signals).filter((signal) => signal.source === "dayun")) expect(segment.backgroundRefs).toContainEqual(signal.nodeRef);
      const forbiddenBackgrounds = branch.id === "forward" ? ["辛巳", "庚辰"] : segment === backward.segments[0] ? ["丁亥", "庚辰"] : ["丁亥", "辛巳"];
      for (const ganZhi of forbiddenBackgrounds) {
        expect(feedback).not.toContain(`同段${ganZhi}大运`); expect(feedback).not.toContain(`同段大运${ganZhi}`);
      }
      expect(projected.get(priorityEventKey(2028, branch.id, segment.id))!.items.flatMap((group) => group.members)).toContainEqual(item);
      for (const value of [item.summary, ...item.examples, ...item.why, ...item.evidence.filter((line) => line.startsWith("关系分层")), JSON.stringify(item.origin)]) {
        expect(feedback).toContain(value); expect(report).toContain(value);
      }
      for (const ref of segment.backgroundRefs) expect(report).toContain(JSON.stringify(ref));
    }
    expect(JSON.stringify(events)).toBe(original);
  });

  it("rejects copying a background attribution into another branch or changing its source before saving", () => {
    const source = { revision, assessment, annual, annualDomains };
    const changed = structuredClone(events), reading = changed.years.find((year) => year.year === 2028)!;
    const forward = reading.branches.find((branch) => branch.id === "forward")!.segments[0]!.items.find((item) => item.domain === "relationship")!;
    const backward = reading.branches.find((branch) => branch.id === "backward")!.segments[0]!.items.find((item) => item.domain === "relationship")!;
    backward.summary = forward.summary; backward.evidence = [...forward.evidence]; backward.origin.relationFactIds = [...forward.origin.relationFactIds];
    expect(() => describeReadingAnnualEvents(changed, source)).toThrow("年度应事情境与本次分支、分段、背景或原判断不一致");
    const changedRef = structuredClone(events);
    changedRef.years.find((year) => year.year === 2028)!.branches.find((branch) => branch.id === "forward")!.segments[0]!.backgroundRefs[0]!.nodeId += "-wrong";
    expect(() => describeReadingAnnualEvents(changedRef, source)).toThrow("年度应事情境与本次分支、分段、背景或原判断不一致");
  });
});
