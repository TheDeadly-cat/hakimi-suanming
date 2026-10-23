import { beforeAll, describe, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema, type RevisionRecord } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildLocalAnnualOutlook, type LocalAnnualOutlook } from "./local-annual-outlook";
import { createAnnualRelationshipTimingBuilder } from "./annual-relationship-timing";
import { ANNUAL_RELATIONSHIP_TIMING_SOURCES } from "./annual-relationship-timing-sources";

async function revisionFor(date: string, sex: "male" | "female" | "unspecified" = "male", time = "08:26") {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date, time, timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex, lunarLeapMonth: false,
    location: { label: "Synthetic relationship timing", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic only" }, WORKING_DEFAULT_RULE_PROFILE);
  return storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: "11111111-1111-4111-8111-111111111111", caseId: "22222222-2222-4222-8222-222222222222", revisionNumber: 1, createdAt: "2026-10-16T00:00:00Z" });
}
let a: RevisionRecord, b: RevisionRecord, female: RevisionRecord, publicFemale: RevisionRecord, unknown: RevisionRecord;
let aa: LocalAnnualOutlook, ba: LocalAnnualOutlook, fa: LocalAnnualOutlook, pa: LocalAnnualOutlook, ua: LocalAnnualOutlook;
beforeAll(async () => {
  [a, b, female, publicFemale, unknown] = await Promise.all([revisionFor("1995-08-18"), revisionFor("1995-05-18"), revisionFor("1995-08-18", "female"), revisionFor("2019-12-22", "female", "11:23"), revisionFor("1995-08-18", "unspecified")]);
  [aa, ba, fa, pa, ua] = await Promise.all([a, b, female, publicFemale, unknown].map((r) => buildLocalAnnualOutlook(r, buildBaziPreliminaryAssessment(r), 2026)));
});
const read = (r: RevisionRecord, outlook: LocalAnnualOutlook, n: number, branch = "locked") => {
  const year = outlook.years.find((y) => y.year === n)!;
  const segment = year.judgmentSegments.find((s) => s.branchId === branch)!;
  return createAnnualRelationshipTimingBuilder(r, buildBaziPreliminaryAssessment(r))(year, segment);
};

describe("exact natal-star and palace layers within original annual segments", () => {
  it("opens a male direct-wealth window without a palace combination or clash and preserves already-visible identity", () => {
    const result = read(a, aa, 2034), lens = result.lenses[0]!;
    expect(result.triggered).toBe(true); expect(lens.id).toBe("wealth");
    expect(lens.signals.some((s) => s.source === "year" && s.kind === "palace_contact")).toBe(false);
    expect(lens.signals.find((s) => s.source === "year" && s.kind === "star_entry")).toMatchObject({ stem: "甲", tenGod: "正财", relevance: "primary_star" });
    expect(lens.signals.some((s) => s.source === "year" && s.kind === "hidden_to_visible")).toBe(false);
  });

  it("matches B's same hidden Ren precisely but treats entry and emergence as one observation layer", () => {
    const result = read(b, ba, 2032), lens = result.lenses[0]!;
    expect(lens.focus).toBe("annual_focus"); expect(lens.overlap).toBe("single_layer");
    const emergence = lens.signals.find((s) => s.kind === "hidden_to_visible" && s.source === "year")!;
    expect(emergence.stem).toBe("壬"); expect(emergence.natalOccurrenceIds).toEqual(["year:main_hidden:壬"]);
    expect(lens.signals.some((s) => s.kind === "star_stem_contact" && s.natalOccurrenceIds.includes("year:main_hidden:壬"))).toBe(false);
    expect(result.conditions.join()).toContain("本地候选组织规则");
  });

  it("keeps indirect wealth alone related and does not turn a background-only contact into a yearly event", () => {
    const related = read(b, ba, 2033);
    expect(related.lenses[0]!.signals.some((s) => s.source === "year" && s.kind === "star_entry" && s.relevance === "related_wealth")).toBe(true);
    expect(related.triggered).toBe(false);
    const background = read(a, aa, 2035), lens = background.lenses[0]!;
    expect(lens.signals.some((s) => s.source === "dayun" && s.kind === "star_stem_contact")).toBe(true);
    expect(lens.focus).toBe("background_only"); expect(lens.triggerSignalIds).toEqual([]); expect(background.triggered).toBe(false);
  });

  it("retains actual contact with exposed indirect wealth as related, never a direct-spouse identity", () => {
    const result = read(a, aa, 2030), lens = result.lenses[0]!;
    const contact = lens.signals.find((s) => s.source === "year" && s.kind === "star_stem_contact")!;
    expect(contact).toMatchObject({ relevance: "related_wealth", natalOccurrenceIds: ["year:visible:乙"], relationType: "stem_five_combination" });
    expect(contact.factId).toContain("he_gan_5"); expect(lens.triggerSignalIds).toContain(contact.id); expect(result.triggered).toBe(true);
  });

  it("keeps female officer/killing separate and distinguishes hidden emergence from an already-visible repeat", () => {
    const hidden = read(female, fa, 2026), lens = hidden.lenses[0]!;
    expect(lens.id).toBe("authority"); expect(lens.signals.find((s) => s.source === "year" && s.kind === "hidden_to_visible")).toMatchObject({ stem: "丙", tenGod: "正官", natalOccurrenceIds: ["day:main_hidden:丙"] });
    expect(lens.signals.some((s) => s.source === "year" && s.kind === "palace_contact")).toBe(false);
    const repeated = read(publicFemale, pa, 2029);
    expect(repeated.lenses[0]!.signals.find((s) => s.source === "year" && s.kind === "star_entry")).toMatchObject({ stem: "己", tenGod: "七杀" });
    expect(repeated.lenses[0]!.signals.some((s) => s.source === "year" && s.kind === "hidden_to_visible")).toBe(false);
    expect(repeated.sourceIds).toContain("relationship-timing-smt-female-luck");
  });

  it("keeps unknown-sex lenses parallel and exact 2028 forward/backward backgrounds isolated", () => {
    const year = ua.years.find((y) => y.year === 2028)!, builder = createAnnualRelationshipTimingBuilder(unknown, buildBaziPreliminaryAssessment(unknown));
    const products = year.judgmentSegments.map((segment) => ({ segment, timing: builder(year, segment) }));
    expect(products).toHaveLength(3);
    for (const { segment, timing } of products) {
      expect(timing.lenses.map((lens) => lens.id)).toEqual(["wealth", "authority"]);
      expect(timing.scope.backgroundRefs).toEqual(segment.judgment.backgroundRefs);
      expect(timing.scope.startInstant).toBe(segment.startInstant); expect(timing.scope.endExclusiveInstant).toBe(segment.endExclusiveInstant);
      for (const signal of timing.lenses.flatMap((lens) => lens.signals).filter((s) => s.source === "dayun")) expect(segment.judgment.backgroundRefs).toContainEqual(signal.nodeRef);
      expect(timing.lenses.flatMap((lens) => lens.signals).some((s) => s.source === "dayun" && s.kind === "palace_contact" && s.relationType === "branch_six_clash")).toBe(segment.branchId === "forward");
    }
    const lensOnly = read(unknown, ua, 2026, "forward");
    expect(lensOnly.lenses.find((l) => l.id === "authority")!.focus).toBe("annual_focus");
    expect(lensOnly.lenses.find((l) => l.id === "wealth")!.triggerSignalIds).toEqual([]);
  });

  it("excludes an actual hour-only star from an unknown-hour projection rather than inventing natal emergence", async () => {
    const exact = await revisionFor("1991-07-08", "male", "16:26"), unknownHour = structuredClone(exact);
    unknownHour.input.time = null; unknownHour.input.timePrecision = "unknown_hour";
    const assessment = buildBaziPreliminaryAssessment(unknownHour), outlook = await buildLocalAnnualOutlook(unknownHour, assessment, 2032);
    expect(outlook.years[0]!.transitNodeRef).toBeNull();
    expect(() => read(unknownHour, outlook, 2032)).toThrow("缺少本年原节点或区间");
    // The live annual engine does not support this unknown-hour record. This
    // separate unit projection tests selected-pillar exclusion only, retaining
    // real exact-hour boundaries, without claiming a computed unknown birth.
    const projection = structuredClone(await buildLocalAnnualOutlook(exact, buildBaziPreliminaryAssessment(exact), 2032));
    for (const year of projection.years) for (const judgment of [year.judgment, year.ownJudgment, ...year.judgmentSegments.map((segment) => segment.judgment)]) if (judgment) judgment.sourceBinding.includeHour = false;
    const originalProjection = structuredClone(projection), result = read(unknownHour, projection, 2032);
    expect(projection).toEqual(originalProjection);
    expect(result.coverage).toBe("hour_excluded");
    expect(result.lenses[0]!.signals.some((s) => s.source === "year" && s.kind === "star_entry")).toBe(true);
    expect(result.lenses.flatMap((l) => l.signals).every((s) => !s.natalPositions.includes("hour") && s.natalOccurrenceIds.every((id) => !id.startsWith("hour:")))).toBe(true);
    expect(result.lenses[0]!.signals.some((s) => s.kind === "hidden_to_visible")).toBe(false);
  });

  it("rejects cross-branch/member/ref tampering and uses the unique complete background ref rather than a same-ID decoy", () => {
    const year = ua.years.find((y) => y.year === 2028)!, segment = year.judgmentSegments[0]!, builder = createAnnualRelationshipTimingBuilder(unknown, buildBaziPreliminaryAssessment(unknown));
    const changed = structuredClone(segment); changed.branchId = "backward";
    expect(() => builder(year, changed)).toThrow();
    const wrongSource = structuredClone(year); wrongSource.judgmentSegments[0]!.judgment.sourceBinding.chartResultHash = "f".repeat(64);
    expect(() => builder(wrongSource, wrongSource.judgmentSegments[0]!)).toThrow();
    const altered = structuredClone(year); altered.dayunSegments[0]!.nodeRef.ruleProfileDigest = "f".repeat(64);
    expect(() => builder(altered, altered.judgmentSegments[0]!)).toThrow();
    const original = builder(year, segment), decoy = structuredClone(year), fake = structuredClone(decoy.dayunSegments.find((d) => d.direction === segment.branchId)!);
    fake.nodeRef.ruleProfileDigest = "e".repeat(64); fake.ganZhi = "甲子"; fake.startInstant = "2090-01-01T00:00:00.000Z"; fake.endExclusiveInstant = "2091-01-01T00:00:00.000Z";
    decoy.dayunSegments.unshift(fake);
    expect(builder(decoy, decoy.judgmentSegments[0]!)).toEqual(original);
  });

  it("preserves original judgments and resolves every source without importing a relationship fortune score", () => {
    const input = structuredClone({ a, aa }), result = read(a, aa, 2034);
    expect({ a, aa }).toEqual(input);
    expect(result.sourceIds.every((id) => ANNUAL_RELATIONSHIP_TIMING_SOURCES.some((source) => source.id === id))).toBe(true);
    expect(new Set(result.sourceVersions).size).toBe(result.sourceVersions.length);
    result.scope.targetRef.nodeId = "caller only"; result.lenses[0]!.signals[0]!.text = "caller only";
    expect({ a, aa }).toEqual(input);
  });
});
