import { beforeAll, describe, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema, type RevisionRecord } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment, type BaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { buildNatalRelationshipFoundation } from "../../../../packages/bazi-interpretation/src/natal-relationship-foundation";
import { buildLocalAnnualOutlook, type LocalAnnualOutlook } from "./local-annual-outlook";
import { createAnnualRelationshipTimingBuilder, type AnnualRelationshipTiming } from "./annual-relationship-timing";
import { ANNUAL_RELATIONSHIP_NATAL_CONTEXT_VERSION, createAnnualRelationshipNatalContextBuilder } from "./annual-relationship-natal-context";

async function fixture(date: string, sex: "male" | "female" | "unspecified" = "male", time = "08:26") {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date, time, timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex,
    lunarLeapMonth: false, location: { label: "Synthetic natal context", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic only" }, WORKING_DEFAULT_RULE_PROFILE);
  const revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: "11111111-1111-4111-8111-111111111111", caseId: "22222222-2222-4222-8222-222222222222", revisionNumber: 1, createdAt: "2026-10-16T00:00:00Z" });
  const assessment = buildBaziPreliminaryAssessment(revision);
  return { revision, assessment, annual: await buildLocalAnnualOutlook(revision, assessment, 2026) };
}
type Fixture = { revision: RevisionRecord; assessment: BaziPreliminaryAssessment; annual: LocalAnnualOutlook };
let a: Fixture, b: Fixture, femaleA: Fixture, publicFemale: Fixture, unknownSex: Fixture, absent: Fixture, hourOnly: Fixture;
beforeAll(async () => {
  [a, b, femaleA, publicFemale, unknownSex, absent, hourOnly] = await Promise.all([
    fixture("1995-08-18"), fixture("1995-05-18"), fixture("1995-08-18", "female"), fixture("2019-12-22", "female", "11:23"),
    fixture("1995-08-18", "unspecified"), fixture("1991-07-08", "male", "06:26"), fixture("1991-07-08", "male", "16:26"),
  ]);
});
const timingFor = (f: Fixture, yearNumber = 2028, segmentIndex = 0): AnnualRelationshipTiming => {
  const year = f.annual.years.find((y) => y.year === yearNumber)!;
  return createAnnualRelationshipTimingBuilder(f.revision, f.assessment)(year, year.judgmentSegments[segmentIndex]!);
};
const read = (f: Fixture, year = 2028) => createAnnualRelationshipNatalContextBuilder(f.revision, f.assessment)(timingFor(f, year));

describe("small same-source natal context for annual relationship prose", () => {
  it("distinguishes A's visible primary wealth and authority palace from B's hidden primary wealth and output palace", () => {
    const left = read(a), right = read(b, 2032);
    expect(left.version).toBe(ANNUAL_RELATIONSHIP_NATAL_CONTEXT_VERSION);
    expect(left.dayPalace).toEqual({ ganZhi: "辛巳", branch: "巳", mainStem: "丙", mainTenGod: "正官", roleGroup: "authority" });
    expect(right.dayPalace).toEqual({ ganZhi: "己酉", branch: "酉", mainStem: "辛", mainTenGod: "食神", roleGroup: "output" });
    expect(left.lenses[0]!.primary.presence).toBe("visible");
    expect(left.lenses[0]!.primary.occurrences.filter((o) => o.visibility === "visible")).toEqual([
      { id: "month:visible:甲", position: "month", ganZhi: "甲申", stem: "甲", tenGod: "正财", visibility: "visible" },
    ]);
    expect(left.lenses[0]!.related.tenGods).toEqual(["偏财"]);
    expect(left.lenses[0]!.related.occurrences.find((o) => o.visibility === "visible")).toMatchObject({ position: "year", stem: "乙", tenGod: "偏财" });
    expect(right.lenses[0]!.primary).toMatchObject({ presence: "hidden_only", tenGods: ["正财"], occurrences: [{ id: "year:main_hidden:壬", position: "year", stem: "壬" }] });
  });

  it("keeps female primary officer and killing separate, including one only-hidden chart and a two-visible-role chart", () => {
    const hidden = read(femaleA), visible = read(publicFemale);
    expect(hidden.lenses[0]!.id).toBe("authority"); expect(hidden.lenses[0]!.primary.presence).toBe("hidden_only");
    expect(hidden.lenses[0]!.primary.occurrences).toEqual(expect.arrayContaining([expect.objectContaining({ position: "day", stem: "丙", tenGod: "正官", visibility: "main_hidden" })]));
    expect(hidden.lenses[0]!.visibleStarInteractions).toEqual([]);
    expect(visible.lenses[0]!.primary.tenGods).toEqual(["正官", "七杀"]);
    expect(visible.lenses[0]!.primary.occurrences.filter((o) => o.visibility === "visible").map((o) => [o.position, o.stem, o.tenGod])).toEqual([["year", "己", "七杀"], ["hour", "戊", "正官"]]);
    expect(visible.lenses[0]!.related).toEqual({ presence: "absent", tenGods: [], occurrences: [] });
  });

  it("records an actual missing primary/related star without manufacturing an occurrence or a prediction", () => {
    const result = read(absent);
    expect(result.lenses[0]!.primary).toEqual({ presence: "absent", tenGods: ["正财"], occurrences: [] });
    expect(result.lenses[0]!.related).toEqual({ presence: "absent", tenGods: ["偏财"], occurrences: [] });
    expect(result.lenses[0]!.visibleStarInteractions).toEqual([]);
    expect(result.dayPalace.branch).toBe("卯");
    expect(Object.keys(result)).not.toEqual(expect.arrayContaining(["score", "probability", "direction", "marriageCount"]));
  });

  it("preserves exact binary palace facts separately from visible-star stem facts and keeps source identities", () => {
    for (const f of [a, publicFemale]) {
      const foundation = buildNatalRelationshipFoundation(f.revision, f.assessment), result = read(f);
      for (const item of [...result.palaceInteractions, ...result.lenses.flatMap((l) => l.visibleStarInteractions)]) {
        const original = foundation.interactions.find((i) => i.id === item.id)!;
        expect(item).toMatchObject({ factId: original.fact.id, ruleId: original.fact.ruleId, relationType: original.fact.relationType, participants: original.fact.participants });
      }
      for (const item of result.palaceInteractions) {
        expect(item.participants.every((p) => p.component === "branch")).toBe(true); expect(item.starOccurrenceIds).toEqual([]);
      }
      for (const lens of result.lenses) for (const item of lens.visibleStarInteractions) {
        expect(item.participants.every((p) => p.component === "stem")).toBe(true);
        const ids = [...lens.primary.occurrences, ...lens.related.occurrences].filter((o) => o.visibility === "visible").map((o) => o.id);
        expect(item.starOccurrenceIds.every((id) => ids.includes(id))).toBe(true);
      }
      expect(result.sourceIds).toEqual(foundation.sources.map((source) => source.id));
      expect(result.sourceVersions).toContain(foundation.version); expect(result.sourceVersions).toContain(f.assessment.version);
    }
    expect(read(a).palaceInteractions.map((i) => i.relationType)).toEqual(expect.arrayContaining(["branch_six_combination", "branch_six_clash"]));
    expect(read(publicFemale).lenses[0]!.visibleStarInteractions.length).toBeGreaterThan(0);
  });

  it("keeps unspecified-sex lenses parallel and natal context identical across all three actual 2028 segments", () => {
    const builder = createAnnualRelationshipNatalContextBuilder(unknownSex.revision, unknownSex.assessment);
    const year = unknownSex.annual.years.find((y) => y.year === 2028)!;
    expect(year.judgmentSegments).toHaveLength(3);
    const results = year.judgmentSegments.map((_s, index) => builder(timingFor(unknownSex, 2028, index)));
    for (const result of results) {
      expect(result.lenses.map((lens) => lens.id)).toEqual(["wealth", "authority"]);
      expect(result.sourceBinding.sex).toBe("unspecified"); expect(result).toEqual(results[0]);
      expect(result.lenses[0]!.primary.presence).toBe("visible"); expect(result.lenses[1]!.primary.presence).toBe("hidden_only");
    }
  });

  it.each(["unknown_hour", "date_only"] as const)("excludes the actual hour-only star for a labelled %s selected-scope projection", (precision) => {
    expect(read(hourOnly).lenses[0]!.primary.occurrences.every((o) => o.position === "hour")).toBe(true);
    const revision = structuredClone(hourOnly.revision); revision.input.timePrecision = precision; revision.input.time = null;
    const assessment = buildBaziPreliminaryAssessment(revision), annual = structuredClone(hourOnly.annual);
    // Unit selection projection over real exact-hour intervals, not a claim
    // that the live annual engine computes unknown-birth annual nodes.
    for (const year of annual.years) for (const judgment of [year.judgment, year.ownJudgment, ...year.judgmentSegments.map((s) => s.judgment)]) if (judgment) judgment.sourceBinding.includeHour = false;
    const projected = { revision, assessment, annual }, timing = timingFor(projected, 2032), result = createAnnualRelationshipNatalContextBuilder(revision, assessment)(timing);
    expect(result.sourceBinding.includeHour).toBe(false); expect(result.lenses[0]!.primary.presence).toBe("absent");
    expect(result.lenses.flatMap((lens) => [...lens.primary.occurrences, ...lens.related.occurrences])).toEqual([]);
    expect([...result.palaceInteractions, ...result.lenses.flatMap((lens) => lens.visibleStarInteractions)].every((i) => i.participants.every((p) => p.position !== "hour"))).toBe(true);
    const changedHour = structuredClone(revision); changedHour.facts.pillars.hour = structuredClone(a.revision.facts.pillars.hour);
    expect(createAnnualRelationshipNatalContextBuilder(changedHour, buildBaziPreliminaryAssessment(changedHour))(timing)).toEqual(result);
  });

  it("rejects wrong revision, hash, hour, sex, coverage, versions and missing or duplicate lenses", () => {
    const builder = createAnnualRelationshipNatalContextBuilder(a.revision, a.assessment), original = timingFor(a);
    for (const patch of [{ revisionId: "33333333-3333-4333-8333-333333333333" }, { chartResultHash: "f".repeat(64) }, { includeHour: false }, { sex: "female" as const }]) {
      const wrong = structuredClone(original); Object.assign(wrong.sourceBinding, patch); expect(() => builder(wrong)).toThrow("来源不匹配");
    }
    const coverage = structuredClone(original); coverage.coverage = "hour_excluded"; expect(() => builder(coverage)).toThrow("来源不匹配");
    const versions = structuredClone(original); versions.sourceVersions = []; expect(() => builder(versions)).toThrow("来源不匹配");
    const missing = structuredClone(original); missing.lenses = []; expect(() => builder(missing)).toThrow("视角不匹配");
    const duplicate = structuredClone(original); duplicate.lenses.push(structuredClone(duplicate.lenses[0]!)); expect(() => builder(duplicate)).toThrow("视角不匹配");
    const wrongAssessment = structuredClone(a.assessment); wrongAssessment.sourceBinding.chartResultHash = "e".repeat(64);
    expect(() => createAnnualRelationshipNatalContextBuilder(a.revision, wrongAssessment)).toThrow("来源不匹配");
  });

  it("rejects invalid or hidden natal references masquerading as exposed-star contact", () => {
    const builder = createAnnualRelationshipNatalContextBuilder(a.revision, a.assessment), original = timingFor(a, 2030);
    const wrong = structuredClone(original), contact = wrong.lenses[0]!.signals.find((s) => s.kind === "star_stem_contact")!;
    contact.natalOccurrenceIds = ["month:main_hidden:庚"]; contact.natalPositions = ["month"];
    expect(() => builder(wrong)).toThrow("其他视角或未选");
    contact.natalOccurrenceIds = ["hour:residual_hidden:乙"]; contact.natalPositions = ["hour"];
    expect(() => builder(wrong)).toThrow("藏星当明透");
    const positions = structuredClone(original); positions.lenses[0]!.signals.find((s) => s.kind === "star_stem_contact")!.natalPositions = ["day"];
    expect(() => builder(positions)).toThrow("位置不一致");
  });

  it("does not mutate source calculations and isolates cached facts from caller mutation", () => {
    const source = structuredClone(a), timing = timingFor(source), before = structuredClone({ source, timing });
    const builder = createAnnualRelationshipNatalContextBuilder(source.revision, source.assessment), first = builder(timing), expected = structuredClone(first);
    expect({ source, timing }).toEqual(before);
    first.lenses[0]!.primary.occurrences[0]!.stem = "mutated"; first.palaceInteractions[0]!.participants[0]!.value = "mutated";
    source.revision.facts.pillars.day.branch = "mutated"; source.assessment.sourceBinding.revisionId = "mutated";
    expect(builder(timing)).toEqual(expected);
    expect(timing).toEqual(before.timing);
  });
});
